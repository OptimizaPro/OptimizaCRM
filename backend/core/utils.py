"""
Optimiza-CRM – Utility helpers
"""

from django.conf import settings


def admin_environment_callback(request):
    """Badge de entorno visible en el sidebar de Unfold."""
    if settings.DEBUG:
        return {"name": "Desarrollo", "color": "yellow"}
    return {"name": "Producción", "color": "red"}
