"""
Optimiza-CRM – Accounts views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404

from core.permissions import IsOrgAdmin, IsReadOnlyOrAbove
from core.middleware import get_current_organization
from .models import Organization, Membership, AuditLog
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    OrganizationSerializer, MembershipSerializer, AuditLogSerializer,
    AdminUserSerializer,
)

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh    = RefreshToken.for_user(user)
        membership = user.memberships.select_related("organization").first()
        return Response({
            "user":         UserSerializer(user).data,
            "organization": OrganizationSerializer(membership.organization).data if membership else None,
            "tokens": {
                "access":  str(refresh.access_token),
                "refresh": str(refresh),
            },
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if not user:
            return Response({"error": "Credenciales incorrectas."}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"error": "Cuenta desactivada."}, status=status.HTTP_403_FORBIDDEN)

        refresh     = RefreshToken.for_user(user)
        memberships = MembershipSerializer(
            user.memberships.select_related("organization").filter(is_active=True), many=True
        ).data

        AuditLog.objects.create(
            user=user, action="login", resource_type="user",
            resource_id=str(user.id),
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response({
            "user":        UserSerializer(user).data,
            "memberships": memberships,
            "tokens": {
                "access":  str(refresh.access_token),
                "refresh": str(refresh),
            },
        })


class LogoutView(APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data.get("refresh"))
            token.blacklist()
        except Exception:
            pass
        return Response({"message": "Sesión cerrada correctamente."})


class MeView(APIView):
    def get(self, request):
        org  = get_current_organization()
        data = UserSerializer(request.user).data
        if org:
            data["current_organization"] = OrganizationSerializer(org).data
            try:
                m = Membership.objects.get(user=request.user, organization=org, is_active=True)
                data["role"] = m.role
            except Membership.DoesNotExist:
                pass
        return Response(data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    def post(self, request):
        current_password = request.data.get("current_password")
        new_password     = request.data.get("new_password")

        if not current_password or not new_password:
            return Response({"error": "Se requieren current_password y new_password."}, status=400)
        if not request.user.check_password(current_password):
            return Response({"error": "La contraseña actual es incorrecta."}, status=400)
        if len(new_password) < 8:
            return Response({"error": "La nueva contraseña debe tener al menos 8 caracteres."}, status=400)

        request.user.set_password(new_password)
        request.user.save()
        return Response({"message": "Contraseña actualizada correctamente."})


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class   = OrganizationSerializer
    permission_classes = [IsAuthenticated, IsReadOnlyOrAbove]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Organization.objects.none()
        if not self.request.user.is_authenticated:
            return Organization.objects.none()
        org_ids = Membership.objects.filter(
            user=self.request.user, is_active=True
        ).values_list("organization_id", flat=True)
        return Organization.objects.filter(id__in=org_ids)

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        organization = self.get_object()

        if request.method == "GET":
            memberships = Membership.objects.filter(organization=organization).select_related("user")
            return Response(MembershipSerializer(memberships, many=True).data)

        if not IsOrgAdmin().has_permission(request, self):
            return Response({"error": "Sin permisos."}, status=403)

        email = request.data.get("email")
        role  = request.data.get("role", "sales_executive")
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": request.data.get("first_name", ""),
                "last_name":  request.data.get("last_name", ""),
            },
        )
        if created:
            user.set_unusable_password()
            user.save()

        membership, mem_created = Membership.objects.get_or_create(
            user=user, organization=organization, defaults={"role": role}
        )
        if not mem_created:
            membership.role      = role
            membership.is_active = True
            membership.save()

        return Response(MembershipSerializer(membership).data, status=201)

    @action(detail=True, methods=["patch", "delete"], url_path=r"members/(?P<membership_id>[^/.]+)")
    def member_detail(self, request, pk=None, membership_id=None):
        if not IsOrgAdmin().has_permission(request, self):
            return Response({"error": "Sin permisos."}, status=403)

        organization = self.get_object()
        membership   = get_object_or_404(Membership, id=membership_id, organization=organization)

        if request.method == "DELETE":
            if membership.role == "org_admin":
                admin_count = Membership.objects.filter(
                    organization=organization, role="org_admin", is_active=True
                ).count()
                if admin_count <= 1:
                    return Response({"error": "No puedes eliminar al único administrador."}, status=400)
            membership.is_active = False
            membership.save()
            return Response(status=204)

        role = request.data.get("role")
        if role:
            membership.role = role
            membership.save()
        return Response(MembershipSerializer(membership).data)


class AdminUsersView(APIView):
    """
    GET  /admin/users/         — list users (staff: all platform; org_admin: own org only)
    PATCH /admin/users/<id>/   — update user fields (staff only)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        search        = request.GET.get("search", "").strip()
        plan_filter   = request.GET.get("plan", "").strip()
        status_filter = request.GET.get("status", "").strip()

        if request.user.is_staff:
            # Superadmin: all platform users
            qs = (
                User.objects
                .prefetch_related("memberships__organization")
                .order_by("-created_at")
            )
        else:
            # Org-scoped: only members of the current organization
            org = get_current_organization()
            if not org:
                return Response({"error": "Organización requerida."}, status=400)

            try:
                membership = Membership.objects.get(
                    user=request.user, organization=org, is_active=True
                )
            except Membership.DoesNotExist:
                return Response({"error": "Sin permisos."}, status=403)

            if membership.role not in ("org_admin", "sales_manager"):
                return Response({"error": "Sin permisos."}, status=403)

            member_ids = Membership.objects.filter(
                organization=org, is_active=True
            ).values_list("user_id", flat=True)

            qs = (
                User.objects
                .filter(id__in=member_ids)
                .prefetch_related("memberships__organization")
                .order_by("-created_at")
            )

        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        if status_filter == "active":
            qs = qs.filter(is_active=True)
        elif status_filter == "inactive":
            qs = qs.filter(is_active=False)
        elif status_filter == "staff":
            qs = qs.filter(is_staff=True)

        if plan_filter:
            qs = qs.filter(
                memberships__organization__plan=plan_filter,
                memberships__is_active=True,
            ).distinct()

        serializer = AdminUserSerializer(qs, many=True)
        return Response({"count": qs.count(), "results": serializer.data})

    def post(self, request):
        if not request.user.is_staff:
            return Response({"error": "Sin permisos."}, status=403)

        email = (request.data.get("email") or "").strip()
        if not email:
            return Response({"error": "El email es requerido."}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({"error": "Ya existe un usuario con ese email."}, status=400)

        user = User(
            email      = email,
            first_name = request.data.get("first_name", ""),
            last_name  = request.data.get("last_name",  ""),
            phone      = request.data.get("phone",      ""),
            is_staff   = bool(request.data.get("is_staff", False)),
            is_active  = bool(request.data.get("is_active", True)),
        )
        password = request.data.get("password", "")
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()

        # Optionally create membership if org_id + role provided
        org_id = request.data.get("org_id")
        role   = request.data.get("role", "sales_executive")
        if org_id:
            org = Organization.objects.filter(id=org_id).first()
            if org:
                Membership.objects.get_or_create(
                    user=user, organization=org,
                    defaults={"role": role, "is_active": True},
                )

        return Response(AdminUserSerializer(user).data, status=201)

    def patch(self, request, user_id):
        if not request.user.is_staff:
            return Response({"error": "Sin permisos."}, status=403)

        user = get_object_or_404(User, id=user_id)

        allowed = {"is_active", "is_staff", "first_name", "last_name", "phone"}
        for field, value in request.data.items():
            if field in allowed:
                setattr(user, field, value)
        user.save()

        # Create or update membership when org_id + role provided
        org_id = request.data.get("org_id")
        role   = request.data.get("role")
        if org_id and role:
            org = Organization.objects.filter(id=org_id).first()
            if org:
                membership, _ = Membership.objects.get_or_create(
                    user=user, organization=org,
                    defaults={"role": role, "is_active": True},
                )
                membership.role      = role
                membership.is_active = True
                membership.save()

        return Response(AdminUserSerializer(user).data)

    def delete(self, request, user_id):
        if not request.user.is_staff:
            return Response({"error": "Sin permisos."}, status=403)

        user = get_object_or_404(User, id=user_id)
        if user.pk == request.user.pk:
            return Response({"error": "No puedes eliminarte a ti mismo."}, status=400)

        user.delete()
        return Response(status=204)


class AdminOrganizationsView(APIView):
    """GET /admin/organizations/ — staff-only list of all organizations."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Sin permisos."}, status=403)
        orgs = Organization.objects.filter(is_active=True).order_by("name")
        return Response(OrganizationSerializer(orgs, many=True).data)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return AuditLog.objects.none()
        return AuditLog.objects.filter(organization=org)
