"""
Optimiza-CRM – Notifications views
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.middleware import get_current_organization
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names  = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        org = get_current_organization()
        if not org:
            return Notification.objects.none()
        return Notification.objects.filter(organization=org, user=self.request.user)

    @action(detail=True, methods=["patch"], url_path="read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        org = get_current_organization()
        updated = Notification.objects.filter(
            organization=org, user=request.user, is_read=False
        ).update(is_read=True)
        return Response({"marked_read": updated})
