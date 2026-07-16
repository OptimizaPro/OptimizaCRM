"""
Optimiza-CRM – Accounts models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

import uuid
import secrets
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email      = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name  = models.CharField(max_length=100, blank=True)
    phone      = models.CharField(max_length=20, blank=True)
    avatar     = models.ImageField(upload_to="avatars/", blank=True, null=True)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    def __str__(self):
        return self.email


class Organization(models.Model):
    PLAN_CHOICES = [
        ("free",       "Free"),
        ("basico",     "Básico"),
        ("pro",        "Professional"),
        ("equipo",     "Equipo"),
        ("enterprise", "Enterprise"),
    ]

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name     = models.CharField(max_length=255)
    slug     = models.SlugField(max_length=100, unique=True)
    plan     = models.CharField(max_length=50, choices=PLAN_CHOICES, default="free")
    settings = models.JSONField(default=dict, blank=True)
    logo     = models.ImageField(upload_to="logos/", blank=True, null=True)
    website  = models.URLField(blank=True)
    industry = models.CharField(max_length=100, blank=True)
    size     = models.CharField(max_length=50, blank=True)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "organizations"

    def __str__(self):
        return self.name


class Membership(models.Model):
    ROLE_CHOICES = [
        ("org_admin",       "Administrador"),
        ("sales_manager",   "Gerente de Ventas"),
        ("sales_executive", "Ejecutivo de Ventas"),
        ("viewer",          "Solo lectura"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="memberships")
    role         = models.CharField(max_length=50, choices=ROLE_CHOICES, default="sales_executive")
    is_active    = models.BooleanField(default=True)
    joined_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table     = "memberships"
        unique_together = ["user", "organization"]

    def __str__(self):
        return f"{self.user.email} @ {self.organization.name} ({self.role})"


class InviteToken(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="invite_tokens")
    email        = models.EmailField()
    role         = models.CharField(max_length=50, default="sales_executive")
    token        = models.CharField(max_length=64, unique=True, default=secrets.token_urlsafe)
    invited_by   = models.ForeignKey("User", on_delete=models.SET_NULL, null=True, related_name="sent_invites")
    created_at   = models.DateTimeField(auto_now_add=True)
    expires_at   = models.DateTimeField()
    used_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "invite_tokens"

    @property
    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()

    def __str__(self):
        return f"Invite {self.email} → {self.organization.name}"


class AuditLog(models.Model):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="audit_logs")
    organization  = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True, blank=True)
    action        = models.CharField(max_length=50)
    resource_type = models.CharField(max_length=50)
    resource_id   = models.CharField(max_length=100, blank=True)
    details       = models.JSONField(default=dict, blank=True)
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    user_agent    = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} on {self.resource_type} by {self.user}"
