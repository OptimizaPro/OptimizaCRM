"""
Optimiza-CRM – Analytics views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsReadOnlyOrAbove, CanWriteCRM
from core.middleware import get_current_organization
from apps.crm.models import Lead, Customer, Opportunity, Task, Activity
from .models import Report, SalesGoal
from .serializers import ReportSerializer, SalesGoalSerializer


class DashboardView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def get(self, request):
        org = get_current_organization()
        if not org:
            return Response({"error": "Sin contexto de organización."}, status=400)

        now         = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        leads        = Lead.objects.filter(organization=org)
        customers    = Customer.objects.filter(organization=org)
        opportunities = Opportunity.objects.filter(organization=org)
        tasks        = Task.objects.filter(organization=org)

        won_opps  = opportunities.filter(stage="won")
        lost_opps = opportunities.filter(stage="lost")
        open_opps = opportunities.exclude(stage__in=["won", "lost"])

        total_revenue   = won_opps.aggregate(total=Sum("amount"))["total"] or 0
        monthly_revenue = won_opps.filter(won_at__gte=month_start).aggregate(total=Sum("amount"))["total"] or 0
        pipeline_value  = open_opps.aggregate(total=Sum("amount"))["total"] or 0

        total_leads     = leads.count()
        converted_leads = leads.filter(status="converted").count()
        conversion_rate = (converted_leads / total_leads * 100) if total_leads else 0

        win_count  = won_opps.count()
        loss_count = lost_opps.count()
        win_rate   = (win_count / (win_count + loss_count) * 100) if (win_count + loss_count) else 0

        return Response({
            "revenue": {
                "total":          float(total_revenue),
                "monthly":        float(monthly_revenue),
                "pipeline_value": float(pipeline_value),
            },
            "sales": {
                "total_leads":        total_leads,
                "converted_leads":    converted_leads,
                "open_opportunities": open_opps.count(),
                "won_deals":          win_count,
                "lost_deals":         loss_count,
            },
            "conversion": {
                "lead_conversion_rate": round(conversion_rate, 2),
                "win_rate":             round(win_rate, 2),
            },
            "customers": {
                "total":   customers.count(),
                "active":  customers.filter(status="active").count(),
                "at_risk": customers.filter(churn_risk__gte=0.7).count(),
            },
            "tasks": {
                "pending":               tasks.filter(status="pending").count(),
                "overdue":               tasks.filter(status="pending", due_date__lt=now).count(),
                "completed_this_month":  tasks.filter(status="completed", completed_at__gte=month_start).count(),
            },
            "recent_activities": list(
                Activity.objects.filter(organization=org)
                .select_related("user")[:5]
                .values("id", "activity_type", "subject", "created_at", "user__email")
            ),
        })


class RevenueAnalyticsView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def get(self, request):
        org    = get_current_organization()
        period = request.query_params.get("period", "monthly")
        now    = timezone.now()
        data   = []

        for i in range(12):
            if period == "weekly":
                start = now - timedelta(weeks=i + 1)
                end   = now - timedelta(weeks=i)
                label = start.strftime("%Y-W%W")
            else:
                month = now.month - i
                year  = now.year
                while month <= 0:
                    month += 12
                    year  -= 1
                start = now.replace(year=year, month=month, day=1)
                end   = start.replace(month=month + 1, day=1) if month < 12 else start.replace(year=year + 1, month=1, day=1)
                label = start.strftime("%Y-%m")

            revenue = Opportunity.objects.filter(
                organization=org, stage="won",
                won_at__gte=start, won_at__lt=end,
            ).aggregate(total=Sum("amount"))["total"] or 0

            data.append({"period": label, "revenue": float(revenue)})

        return Response({"data": list(reversed(data))})


class PipelineAnalyticsView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def get(self, request):
        org    = get_current_organization()
        stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]
        funnel = []
        for stage in stages:
            opps = Opportunity.objects.filter(organization=org, stage=stage)
            funnel.append({
                "stage": stage,
                "count": opps.count(),
                "value": float(opps.aggregate(total=Sum("amount"))["total"] or 0),
            })
        return Response({"funnel": funnel})


class TeamPerformanceView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    def get(self, request):
        org = get_current_organization()
        from apps.accounts.models import Membership  # noqa: PLC0415

        now   = timezone.now()
        year  = int(request.query_params.get("year",  now.year))
        month = int(request.query_params.get("month", now.month))

        members     = Membership.objects.filter(organization=org, is_active=True).select_related("user")
        performance = []
        for m in members:
            user = m.user
            won  = Opportunity.objects.filter(organization=org, assigned_to=user, stage="won")
            won_month = won.filter(won_at__year=year, won_at__month=month)
            leads_all = Lead.objects.filter(organization=org, assigned_to=user)

            revenue_total = float(won.aggregate(total=Sum("amount"))["total"] or 0)
            revenue_month = float(won_month.aggregate(total=Sum("amount"))["total"] or 0)
            deals_month   = won_month.count()

            # Goal for this month
            goal = SalesGoal.objects.filter(
                organization=org, user=user, period="monthly", year=year, month=month,
            ).first()
            target_revenue = float(goal.target_revenue) if goal else 0
            target_deals   = goal.target_deals if goal else 0
            attainment_pct = round((revenue_month / target_revenue * 100), 1) if target_revenue else None

            performance.append({
                "user_id":          str(user.id),
                "name":             user.full_name,
                "role":             m.role,
                "leads_assigned":   leads_all.count(),
                "leads_converted":  leads_all.filter(status="converted").count(),
                "deals_won":        won.count(),
                "deals_won_month":  deals_month,
                "revenue":          revenue_total,
                "revenue_month":    revenue_month,
                "tasks_completed":  Task.objects.filter(organization=org, assigned_to=user, status="completed").count(),
                "target_revenue":   target_revenue,
                "target_deals":     target_deals,
                "attainment_pct":   attainment_pct,
            })
        return Response({"team": performance, "year": year, "month": month})


class SalesGoalViewSet(viewsets.ModelViewSet):
    serializer_class   = SalesGoalSerializer
    permission_classes = [IsReadOnlyOrAbove]

    def get_queryset(self):
        org = get_current_organization()
        qs  = SalesGoal.objects.filter(organization=org).select_related("user")
        if uid := self.request.query_params.get("user"):
            qs = qs.filter(user_id=uid)
        return qs

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=get_current_organization())


class StagesSummaryView(APIView):
    """Rich pipeline stage breakdown with weighted forecast and close rates."""
    permission_classes = [IsReadOnlyOrAbove]

    def get(self, request):
        org    = get_current_organization()
        stages = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]
        now    = timezone.now()

        all_opps = Opportunity.objects.filter(organization=org)
        won_all  = all_opps.filter(stage="won")
        lost_all = all_opps.filter(stage="lost")
        closed   = won_all.count() + lost_all.count()
        win_rate = round(won_all.count() / closed * 100, 1) if closed else 0

        result = []
        for stage in stages:
            opps  = all_opps.filter(stage=stage)
            count = opps.count()
            value = float(opps.aggregate(total=Sum("amount"))["total"] or 0)
            avg_prob = float(opps.aggregate(avg=Avg("probability"))["avg"] or 0)
            result.append({
                "stage":            stage,
                "count":            count,
                "value":            value,
                "avg_deal_size":    round(value / count, 2) if count else 0,
                "weighted_value":   round(value * avg_prob / 100, 2),
                "avg_probability":  round(avg_prob, 1),
            })

        # Month-by-month close rate (last 6 months)
        close_rates = []
        for i in range(6):
            m = now.month - i
            y = now.year
            while m <= 0:
                m += 12; y -= 1
            new_leads  = Lead.objects.filter(organization=org, created_at__year=y, created_at__month=m).count()
            won_month  = won_all.filter(won_at__year=y, won_at__month=m).count()
            close_rates.append({
                "period":     f"{y}-{m:02d}",
                "new_leads":  new_leads,
                "deals_won":  won_month,
                "close_rate": round(won_month / new_leads * 100, 1) if new_leads else 0,
            })

        return Response({
            "stages":      result,
            "win_rate":    win_rate,
            "close_rates": list(reversed(close_rates)),
        })


class ReportViewSet(viewsets.ModelViewSet):
    serializer_class   = ReportSerializer
    permission_classes = [IsReadOnlyOrAbove]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return Report.objects.none()
        return Report.objects.filter(organization=org)

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [CanWriteCRM()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(organization=get_current_organization(), created_by=self.request.user)

    @action(detail=True, methods=["get"], url_path="export")
    def export_report(self, request, pk=None):
        return Response(
            {"error": "La exportación de reportes estará disponible próximamente."},
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )
