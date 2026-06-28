"""
Optimiza-CRM – Automation app config
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.apps import AppConfig


class AutomationConfig(AppConfig):
    name = "apps.automation"

    def ready(self):
        import apps.automation.signals  # noqa: F401
