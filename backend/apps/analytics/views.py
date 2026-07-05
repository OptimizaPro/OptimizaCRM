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
from .models import Report, SalesGoal, TeamGoal
from .serializers import ReportSerializer, SalesGoalSerializer, TeamGoalSerializer


class DashboardView(APIView):
    permission_classes = [IsReadOnlyOrAbove]

    PERIOD_OPTIONS  = ("month", "quarter", "year")
    COMPARE_OPTIONS = ("previous", "yoy")

    PERIOD_LABELS = {
        "month":   "Este mes",
        "quarter": "Este trimestre",
        "year":    "Este año",
    }

    # Human-readable label for the comparison window shown in the frontend
    COMPARE_LABELS = {
        ("month",   "previous"): "mes anterior",
        ("month",   "yoy"):      "jun. año anterior",   # overridden dynamically
        ("quarter", "previous"): "trimestre anterior",
        ("quarter", "yoy"):      "mismo trimestre año anterior",
        ("year",    "previous"): "año anterior",
        ("year",    "yoy"):      "año anterior",         # identical for "year"
    }

    def _period_bounds(self, period, compare, now):
        """
        Returns (cur_start, cur_end, prev_start, prev_end).

        compare="previous" — rolling previous period (MoM / QoQ / YoY rolling)
        compare="yoy"      — same calendar window exactly one year back
                             Uses elapsed days so partial periods are fair.
        """
        zero = dict(hour=0, minute=0, second=0, microsecond=0)

        # ── Current period start ──────────────────────────────────────────
        if period == "quarter":
            q_start_month = ((now.month - 1) // 3) * 3 + 1
            cur_start     = now.replace(month=q_start_month, day=1, **zero)
        elif period == "year":
            cur_start = now.replace(month=1, day=1, **zero)
        else:  # month
            cur_start = now.replace(day=1, **zero)

        cur_end = now  # always open-ended at "now"

        # ── Previous period bounds ────────────────────────────────────────
        if compare == "yoy":
            # Same calendar window, exactly 1 year earlier.
            # prev_end mirrors elapsed days so partial periods are comparable.
            prev_start = cur_start.replace(year=cur_start.year - 1)
            prev_end   = now.replace(year=now.year - 1)

        else:  # previous
            if period == "quarter":
                pq_month = q_start_month - 3
                pq_year  = now.year
                if pq_month <= 0:
                    pq_month += 12
                    pq_year  -= 1
                prev_start = now.replace(year=pq_year, month=pq_month, day=1, **zero)
                prev_end   = cur_start

            elif period == "year":
                prev_start = cur_start.replace(year=now.year - 1)
                prev_end   = cur_start

            else:  # month
                last_of_prev = cur_start - timedelta(days=1)
                prev_start   = last_of_prev.replace(day=1, **zero)
                prev_end     = cur_start

        return cur_start, cur_end, prev_start, prev_end

    def _compare_label(self, period, compare, now):
        """Dynamic label e.g. 'jun. 2024' for month+yoy."""
        if compare == "yoy":
            if period == "month":
                return now.replace(year=now.year - 1).strftime("%b. %Y")
            if period == "quarter":
                q = ((now.month - 1) // 3) + 1
                return f"Q{q} {now.year - 1}"
            return str(now.year - 1)
        return self.COMPARE_LABELS.get((period, compare), "período anterior")

    def _pct(self, current, previous):
        """Percentage change; None when previous is 0 (undefined)."""
        if not previous:
            return None
        return round((current - previous) / previous * 100, 1)

    def _metric(self, current, previous):
        change = self._pct(current, previous)
        if change is None:
            trend = "neutral"
        elif change > 0:
            trend = "up"
        elif change < 0:
            trend = "down"
        else:
            trend = "neutral"
        return {
            "value":    current,
            "previous": previous,
            "change":   change,
            "trend":    trend,
        }

    def get(self, request):
        org = get_current_organization()
        if not org:
            return Response({"error": "Sin contexto de organización."}, status=400)

        period  = request.query_params.get("period",  "month")
        compare = request.query_params.get("compare", "previous")
        if period  not in self.PERIOD_OPTIONS:  period  = "month"
        if compare not in self.COMPARE_OPTIONS: compare = "previous"

        now = timezone.now()
        cur_start, cur_end, prev_start, prev_end = self._period_bounds(period, compare, now)

        leads         = Lead.objects.filter(organization=org)
        customers     = Customer.objects.filter(organization=org)
        opportunities = Opportunity.objects.filter(organization=org)
        tasks         = Task.objects.filter(organization=org)

        won_opps  = opportunities.filter(stage="won")
        lost_opps = opportunities.filter(stage="lost")
        open_opps = opportunities.exclude(stage__in=["won", "lost"])

        # ── All-time totals (backward-compatible) ─────────────────────────
        total_revenue   = won_opps.aggregate(total=Sum("amount"))["total"] or 0
        pipeline_value  = open_opps.aggregate(total=Sum("amount"))["total"] or 0
        total_leads     = leads.count()
        converted_leads = leads.filter(status="converted").count()
        conversion_rate = (converted_leads / total_leads * 100) if total_leads else 0
        win_count  = won_opps.count()
        loss_count = lost_opps.count()
        win_rate   = (win_count / (win_count + loss_count) * 100) if (win_count + loss_count) else 0

        # ── Period-scoped metrics ─────────────────────────────────────────

        # Revenue won in period
        cur_rev  = float(won_opps.filter(won_at__gte=cur_start,  won_at__lt=cur_end).aggregate(t=Sum("amount"))["t"] or 0)
        prev_rev = float(won_opps.filter(won_at__gte=prev_start, won_at__lt=prev_end).aggregate(t=Sum("amount"))["t"] or 0)

        # New leads created in period
        cur_leads  = leads.filter(created_at__gte=cur_start,  created_at__lt=cur_end).count()
        prev_leads = leads.filter(created_at__gte=prev_start, created_at__lt=prev_end).count()

        # Deals won in period
        cur_won  = won_opps.filter(won_at__gte=cur_start,  won_at__lt=cur_end).count()
        prev_won = won_opps.filter(won_at__gte=prev_start, won_at__lt=prev_end).count()

        # New customers in period
        cur_cust  = customers.filter(created_at__gte=cur_start,  created_at__lt=cur_end).count()
        prev_cust = customers.filter(created_at__gte=prev_start, created_at__lt=prev_end).count()

        # Tasks completed in period
        cur_tasks  = tasks.filter(status="completed", completed_at__gte=cur_start,  completed_at__lt=cur_end).count()
        prev_tasks = tasks.filter(status="completed", completed_at__gte=prev_start, completed_at__lt=prev_end).count()

        # Conversion rate in period (leads created in period that were converted)
        cur_leads_conv  = leads.filter(created_at__gte=cur_start,  created_at__lt=cur_end,  status="converted").count()
        prev_leads_conv = leads.filter(created_at__gte=prev_start, created_at__lt=prev_end, status="converted").count()
        cur_conv_rate   = round((cur_leads_conv  / cur_leads  * 100), 2) if cur_leads  else 0
        prev_conv_rate  = round((prev_leads_conv / prev_leads * 100), 2) if prev_leads else 0

        return Response({
            "period":        period,
            "period_label":  self.PERIOD_LABELS[period],
            "compare":       compare,
            "compare_label": self._compare_label(period, compare, now),
            # ── All-time / aggregate (unchanged shape) ───────────────────
            "revenue": {
                "total":          float(total_revenue),
                "monthly":        cur_rev,          # kept for backward compat; now = period revenue
                "pipeline_value": float(pipeline_value),
                "period":         self._metric(cur_rev, prev_rev),
            },
            "sales": {
                "total_leads":        total_leads,
                "converted_leads":    converted_leads,
                "open_opportunities": open_opps.count(),
                "won_deals":          win_count,
                "lost_deals":         loss_count,
                "period_leads":       self._metric(cur_leads, prev_leads),
                "period_won":         self._metric(cur_won,   prev_won),
            },
            "conversion": {
                "lead_conversion_rate": round(conversion_rate, 2),
                "win_rate":             round(win_rate, 2),
                "period_conversion":    self._metric(cur_conv_rate, prev_conv_rate),
            },
            "customers": {
                "total":      customers.count(),
                "active":     customers.filter(status="active").count(),
                "at_risk":    customers.filter(churn_risk__gte=0.7).count(),
                "period_new": self._metric(cur_cust, prev_cust),
            },
            "tasks": {
                "pending":             tasks.filter(status="pending").count(),
                "overdue":             tasks.filter(status="pending", due_date__lt=now).count(),
                "completed_this_month": cur_tasks,   # kept for backward compat
                "period_done":         self._metric(cur_tasks, prev_tasks),
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

        now     = timezone.now()
        year    = int(request.query_params.get("year",    now.year))
        month   = int(request.query_params.get("month",   now.month))
        team_id = request.query_params.get("team_id")

        members = Membership.objects.filter(organization=org, is_active=True).select_related("user")

        if team_id:
            from apps.crm.models import TeamMembership  # noqa: PLC0415
            team_user_ids = TeamMembership.objects.filter(
                team_id=team_id, team__organization=org,
            ).values_list("user_id", flat=True)
            members = members.filter(user_id__in=team_user_ids)
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
        # Team-level goal (independent of individual goals)
        team_goal_data = None
        if team_id:
            tg = TeamGoal.objects.filter(
                organization=org, team_id=team_id, year=year, month=month,
            ).first()
            if tg:
                team_goal_data = {
                    "target_revenue": float(tg.target_revenue),
                    "target_deals":   tg.target_deals,
                }

        return Response({"team": performance, "team_goal": team_goal_data, "year": year, "month": month})


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


class TeamGoalView(APIView):
    """
    GET  /analytics/team-goal/?team_id=&year=&month=  — fetch goal (or null)
    PUT  /analytics/team-goal/                         — upsert goal
    """
    permission_classes = [IsReadOnlyOrAbove]

    def get(self, request):
        org     = get_current_organization()
        team_id = request.query_params.get("team_id")
        year    = request.query_params.get("year",  timezone.now().year)
        month   = request.query_params.get("month", timezone.now().month)
        if not team_id:
            return Response({"error": "team_id requerido."}, status=400)
        tg = TeamGoal.objects.filter(
            organization=org, team_id=team_id, year=year, month=month,
        ).first()
        return Response(TeamGoalSerializer(tg).data if tg else None)

    def put(self, request):
        if not CanWriteCRM().has_permission(request, self):
            return Response({"error": "Sin permisos."}, status=403)
        org     = get_current_organization()
        team_id = request.data.get("team_id")
        year    = request.data.get("year")
        month   = request.data.get("month")
        if not all([team_id, year, month]):
            return Response({"error": "team_id, year y month son requeridos."}, status=400)
        tg, _ = TeamGoal.objects.update_or_create(
            organization=org, team_id=team_id, year=int(year), month=int(month),
            defaults={
                "target_revenue": request.data.get("target_revenue", 0),
                "target_deals":   request.data.get("target_deals", 0),
            },
        )
        return Response(TeamGoalSerializer(tg).data)


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
