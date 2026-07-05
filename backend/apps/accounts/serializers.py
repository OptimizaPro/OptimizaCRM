"""
Optimiza-CRM – Accounts serializers
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import Organization, Membership, AuditLog

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model  = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "phone", "avatar", "created_at", "is_staff"]
        read_only_fields = ["id", "created_at", "is_staff"]


class RegisterSerializer(serializers.Serializer):
    email             = serializers.EmailField()
    password          = serializers.CharField(write_only=True, validators=[validate_password])
    first_name        = serializers.CharField(max_length=100)
    last_name         = serializers.CharField(max_length=100)
    organization_name = serializers.CharField(max_length=255)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con este email.")
        return value

    def create(self, validated_data):
        from django.utils.text import slugify

        org_name  = validated_data.pop("organization_name")
        password  = validated_data.pop("password")
        user      = User.objects.create_user(password=password, **validated_data)

        base_slug = slugify(org_name)[:80] or "org"
        slug, counter = base_slug, 1
        while Organization.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        organization = Organization.objects.create(name=org_name, slug=slug)
        Membership.objects.create(user=user, organization=organization, role="org_admin")
        return user


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Organization
        fields = [
            "id", "name", "slug", "plan", "settings", "logo",
            "website", "industry", "size", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class MembershipSerializer(serializers.ModelSerializer):
    user         = UserSerializer(read_only=True)
    organization = OrganizationSerializer(read_only=True)

    class Meta:
        model  = Membership
        fields = ["id", "user", "organization", "role", "is_active", "joined_at"]
        read_only_fields = ["id", "joined_at"]


class AdminUserSerializer(serializers.ModelSerializer):
    """Staff-only serializer: includes primary membership/org/plan info."""

    full_name    = serializers.ReadOnlyField()
    organization = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "avatar", "created_at", "is_staff", "is_active",
            "organization",
        ]
        read_only_fields = ["id", "created_at", "full_name"]

    def get_organization(self, obj):
        membership = (
            obj.memberships.filter(is_active=True)
            .select_related("organization")
            .order_by("joined_at")
            .first()
        )
        if not membership:
            return None
        org = membership.organization
        return {
            "id":            str(org.id),
            "name":          org.name,
            "plan":          org.plan,
            "slug":          org.slug,
            "is_active":     org.is_active,
            "role":          membership.role,
            "joined_at":     membership.joined_at,
            "membership_id": str(membership.id),
        }


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model  = AuditLog
        fields = [
            "id", "user_email", "action", "resource_type",
            "resource_id", "details", "ip_address", "created_at",
        ]
