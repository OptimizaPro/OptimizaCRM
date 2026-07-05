"""
Optimiza-CRM – Accounts URLs
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, MeView, ChangePasswordView,
    OrganizationViewSet, AuditLogViewSet, AdminUsersView, AdminOrganizationsView,
)

router = DefaultRouter()
router.register("organizations", OrganizationViewSet, basename="organization")
router.register("audit-logs",    AuditLogViewSet,     basename="audit-log")

urlpatterns = [
    path("auth/register/",        RegisterView.as_view(),       name="register"),
    path("auth/login/",           LoginView.as_view(),          name="login"),
    path("auth/logout/",          LogoutView.as_view(),         name="logout"),
    path("auth/refresh/",         TokenRefreshView.as_view(),   name="token_refresh"),
    path("auth/me/",              MeView.as_view(),             name="me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("admin/users/",                AdminUsersView.as_view(),          name="admin-users"),
    path("admin/users/<uuid:user_id>/", AdminUsersView.as_view(),          name="admin-user-detail"),
    path("admin/organizations/",        AdminOrganizationsView.as_view(),  name="admin-organizations"),
    path("", include(router.urls)),
]
