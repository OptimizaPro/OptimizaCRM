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
import logging
from django.conf import settings as django_settings
from django.db.models import Q

_email_logger = logging.getLogger(__name__)
from django.shortcuts import get_object_or_404
from django.utils import timezone

from core.permissions import IsOrgAdmin, IsReadOnlyOrAbove
from core.middleware import get_current_organization
from .models import Organization, Membership, AuditLog, InviteToken
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    OrganizationSerializer, MembershipSerializer, AuditLogSerializer,
    AdminUserSerializer,
)

User = get_user_model()


def _send_invite_email(to_email: str, subject: str, body: str, org=None) -> None:
    """Send invite email via Brevo, using org's own key when configured."""
    from apps.integrations.brevo import send_org_email
    send_org_email(org, to_email, subject, body)


def _generate_verification_token(user) -> str:
    """Generate a new email verification token, save it, and return the token."""
    import secrets as _secrets
    token = _secrets.token_urlsafe(32)
    user.email_verification_token   = token
    user.email_verification_sent_at = timezone.now()
    user.save(update_fields=["email_verification_token", "email_verification_sent_at"])
    return token


def _send_verification_email(user, org=None) -> None:
    """Send the email verification link to the user."""
    from django.conf import settings as _s
    from apps.integrations.brevo import send_org_email

    token        = _generate_verification_token(user)
    frontend_url = getattr(_s, "FRONTEND_URL", "https://optimizacrm.com")
    verify_url   = f"{frontend_url}/verify-email?token={token}"
    name         = user.first_name or user.email

    subject = "Verifica tu cuenta de OptimizaCRM"
    body_text = (
        f"Hola {name},\n\n"
        "Gracias por registrarte en OptimizaCRM. Para activar tu cuenta, visita el siguiente enlace:\n\n"
        f"{verify_url}\n\n"
        "Este enlace expira en 24 horas.\n\n"
        "Si no creaste esta cuenta, ignora este mensaje.\n\n"
        "— El equipo de OptimizaCRM"
    )
    body_html = f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#e2e8f0;border-radius:12px">
  <h2 style="color:#fb923c;margin-top:0">Verifica tu cuenta</h2>
  <p>Hola <strong>{name}</strong>,</p>
  <p>Gracias por registrarte en <strong>OptimizaCRM</strong>. Haz clic en el botón para activar tu cuenta:</p>
  <a href="{verify_url}"
     style="display:inline-block;margin:20px 0;padding:14px 28px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
    Verificar mi cuenta
  </a>
  <p style="color:#94a3b8;font-size:13px">Este enlace expira en 24 horas. Si no creaste esta cuenta, ignora este mensaje.</p>
  <hr style="border-color:#1e293b;margin:24px 0">
  <p style="color:#475569;font-size:12px">© OptimizaCRM · OptimizaPro</p>
</div>
"""
    send_org_email(org, user.email, subject, body_text, body_html)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        membership = user.memberships.select_related("organization").first()
        org = membership.organization if membership else None
        _send_verification_email(user, org=org)
        return Response({
            "email_verified": False,
            "email":          user.email,
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
        if not user.email_verified and not user.is_staff:
            return Response(
                {"error": "Debes verificar tu email antes de iniciar sesión.", "code": "email_not_verified"},
                status=status.HTTP_403_FORBIDDEN,
            )

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

        email = request.data.get("email", "").strip().lower()
        role  = request.data.get("role", "sales_executive")

        if not email:
            return Response({"error": "El email es requerido."}, status=400)

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

        # Create magic link invite token (invalidate previous ones for same email+org)
        InviteToken.objects.filter(
            organization=organization, email=email, used_at__isnull=True
        ).update(expires_at=timezone.now())

        invite = InviteToken.objects.create(
            organization=organization,
            email=email,
            role=role,
            invited_by=request.user,
            expires_at=timezone.now() + timezone.timedelta(days=7),
        )

        frontend_url = getattr(django_settings, "FRONTEND_URL", "https://optimizacrm.com")
        invite_url   = f"{frontend_url}/accept-invite?token={invite.token}"

        subject = f"Te han invitado a unirte a {organization.name} en OptimizaCRM"
        body    = (
            f"Hola,\n\n"
            f"{request.user.full_name} te ha invitado a unirte a {organization.name} en OptimizaCRM.\n\n"
            f"Haz clic en el siguiente enlace para activar tu cuenta:\n{invite_url}\n\n"
            f"Este enlace expira en 7 días.\n\n"
            f"Si no esperabas esta invitación, puedes ignorar este mensaje."
        )
        _send_invite_email(email, subject, body, org=organization)

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
    """
    GET  /admin/organizations/           — staff-only list of all organizations.
    PATCH /admin/organizations/<org_id>/ — staff-only plan override.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Sin permisos."}, status=403)
        orgs = Organization.objects.filter(is_active=True).order_by("name")
        return Response(OrganizationSerializer(orgs, many=True).data)

    def patch(self, request, org_id=None):
        if not request.user.is_staff:
            return Response({"error": "Sin permisos."}, status=403)

        org = get_object_or_404(Organization, id=org_id)

        new_plan   = request.data.get("plan")
        new_status = request.data.get("status", "active")

        VALID_PLANS = {"free", "basico", "pro", "equipo", "enterprise"}
        VALID_STATUSES = {"trialing", "active", "past_due", "canceled", "unpaid"}

        if new_plan and new_plan not in VALID_PLANS:
            return Response({"error": f"Plan inválido: {new_plan}"}, status=400)
        if new_status not in VALID_STATUSES:
            return Response({"error": f"Estado inválido: {new_status}"}, status=400)

        if new_plan:
            org.plan = new_plan
            org.save(update_fields=["plan", "updated_at"])

            # Sync subscription
            try:
                from apps.billing.models import Subscription
                sub, _ = Subscription.objects.get_or_create(organization=org)
                sub.plan   = new_plan
                sub.status = new_status
                sub.save(update_fields=["plan", "status", "updated_at"])
            except Exception as exc:
                print(f"[ADMIN] Could not sync subscription for org {org_id}: {exc}", flush=True)

        return Response(OrganizationSerializer(org).data)


class AcceptInviteView(APIView):
    """POST /auth/accept-invite/ — activate account from magic link token."""
    permission_classes = [AllowAny]

    def get(self, request):
        """Validate token without activating — used to prefill email on the form."""
        token = request.query_params.get("token", "")
        invite = InviteToken.objects.filter(token=token).select_related("organization").first()
        if not invite or not invite.is_valid:
            return Response({"error": "El enlace es inválido o ha expirado."}, status=400)
        return Response({
            "email":             invite.email,
            "organization_name": invite.organization.name,
            "role":              invite.role,
        })

    def post(self, request):
        token      = request.data.get("token", "")
        password   = request.data.get("password", "")
        first_name = request.data.get("first_name", "").strip()
        last_name  = request.data.get("last_name", "").strip()

        if not token or not password:
            return Response({"error": "Token y contraseña son requeridos."}, status=400)
        if len(password) < 8:
            return Response({"error": "La contraseña debe tener al menos 8 caracteres."}, status=400)

        invite = InviteToken.objects.filter(token=token).select_related("organization").first()
        if not invite or not invite.is_valid:
            return Response({"error": "El enlace es inválido o ha expirado."}, status=400)

        user = User.objects.filter(email=invite.email).first()
        if not user:
            return Response({"error": "Usuario no encontrado."}, status=400)

        user.set_password(password)
        if first_name:
            user.first_name = first_name
        if last_name:
            user.last_name = last_name
        # Email ownership proven via invite link — mark as verified
        user.email_verified           = True
        user.email_verification_token = None
        user.save()

        # Mark token as used
        invite.used_at = timezone.now()
        invite.save(update_fields=["used_at"])

        # Auto-login: return JWT tokens
        refresh = RefreshToken.for_user(user)
        membership = user.memberships.filter(
            organization=invite.organization, is_active=True
        ).first()

        return Response({
            "user":         UserSerializer(user).data,
            "organization": OrganizationSerializer(invite.organization).data,
            "tokens": {
                "access":  str(refresh.access_token),
                "refresh": str(refresh),
            },
            "membership": MembershipSerializer(membership).data if membership else None,
        })


class VerifyEmailView(APIView):
    """GET /auth/verify-email/?token=<token> — confirm email and activate account."""
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token", "").strip()
        if not token:
            return Response({"error": "Token requerido."}, status=400)

        user = User.objects.filter(email_verification_token=token).first()
        if not user:
            return Response({"error": "El enlace es inválido o ya fue utilizado."}, status=400)

        # Check expiry (24 hours)
        if user.email_verification_sent_at:
            delta = timezone.now() - user.email_verification_sent_at
            if delta.total_seconds() > 86400:
                return Response({"error": "El enlace ha expirado. Solicita un nuevo correo de verificación."}, status=400)

        user.email_verified           = True
        user.email_verification_token = None
        user.save(update_fields=["email_verified", "email_verification_token"])

        return Response({"message": "Email verificado correctamente. Ya puedes iniciar sesión."})


class ResendVerificationView(APIView):
    """POST /auth/resend-verification/ — resend verification email."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"error": "El email es requerido."}, status=400)

        user = User.objects.filter(email=email).first()
        # Always return 200 to avoid email enumeration
        if not user or user.email_verified:
            return Response({"message": "Si el email existe y no está verificado, recibirás un nuevo enlace."})

        # Rate limit: minimum 60 seconds between resends
        if user.email_verification_sent_at:
            delta = timezone.now() - user.email_verification_sent_at
            if delta.total_seconds() < 60:
                return Response({"error": "Espera al menos 60 segundos antes de solicitar otro correo."}, status=429)

        membership = user.memberships.select_related("organization").first()
        org = membership.organization if membership else None
        _send_verification_email(user, org=org)
        return Response({"message": "Si el email existe y no está verificado, recibirás un nuevo enlace."})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsOrgAdmin]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return AuditLog.objects.none()
        return AuditLog.objects.filter(organization=org)
