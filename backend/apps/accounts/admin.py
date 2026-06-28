"""
Optimiza-CRM – Accounts admin (django-unfold)
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin as UnfoldModelAdmin
from .models import User, Organization, Membership, AuditLog


@admin.register(User)
class UserAdmin(UnfoldModelAdmin, BaseUserAdmin):
    list_display   = ("email", "first_name", "last_name", "is_active", "is_staff", "created_at")
    ordering       = ("email",)
    search_fields  = ("email", "first_name", "last_name")
    list_filter    = ("is_active", "is_staff", "is_superuser")
    fieldsets      = (
        (None,           {"fields": ("email", "password")}),
        ("Información",  {"fields": ("first_name", "last_name", "phone", "avatar")}),
        ("Permisos",     {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas",       {"fields": ("created_at", "updated_at")}),
    )
    add_fieldsets  = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),
    )
    readonly_fields = ("created_at", "updated_at")


@admin.register(Organization)
class OrganizationAdmin(UnfoldModelAdmin):
    list_display    = ("name", "slug", "plan", "is_active", "created_at")
    search_fields   = ("name", "slug")
    list_filter     = ("plan", "is_active")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Membership)
class MembershipAdmin(UnfoldModelAdmin):
    list_display    = ("user", "organization", "role", "is_active", "joined_at")
    list_filter     = ("role", "is_active")
    search_fields   = ("user__email", "organization__name")
    readonly_fields = ("joined_at",)


@admin.register(AuditLog)
class AuditLogAdmin(UnfoldModelAdmin):
    list_display    = ("action", "resource_type", "user", "organization", "ip_address", "created_at")
    list_filter     = ("action", "resource_type")
    search_fields   = ("user__email", "resource_type", "resource_id")
    readonly_fields = ("user", "organization", "action", "resource_type", "resource_id",
                       "details", "ip_address", "user_agent", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
