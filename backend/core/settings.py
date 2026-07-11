"""
Optimiza-CRM – Django settings
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Security ────────────────────────────────────────────────────────────────

SECRET_KEY    = config("SECRET_KEY", default="django-insecure-change-me-in-production")
DEBUG         = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS       = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", default="http://localhost:3000", cast=Csv())
BACKEND_PUBLIC_URL  = config("BACKEND_PUBLIC_URL", default="http://localhost:8000")
FRONTEND_URL        = config("FRONTEND_URL", default="http://localhost:3000")

# ─── Google Drive OAuth ───────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = config("GOOGLE_CLIENT_ID",     default="")
GOOGLE_CLIENT_SECRET = config("GOOGLE_CLIENT_SECRET", default="")
GOOGLE_REDIRECT_URI  = config("GOOGLE_REDIRECT_URI",  default="http://localhost:8000/api/v1/drive/callback/")

# ─── Applications ─────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
    "django_celery_results",
    # Our apps
    "apps.accounts",
    "apps.crm",
    "apps.integrations",
    "apps.content",
    "apps.analytics",
    "apps.ai_integration",
    "apps.notifications",
    "apps.automation",
    "apps.billing",
    "apps.forms",
    "apps.campaigns",
    "apps.voice_plans",
    "apps.kb",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.OrganizationMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# ─── Database ─────────────────────────────────────────────────────────────────

USE_SQLITE = config("USE_SQLITE", default=True, cast=bool)

if USE_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE":   "django.db.backends.postgresql",
            "NAME":     config("DB_NAME",     default="optimizacrm"),
            "USER":     config("DB_USER",     default="postgres"),
            "PASSWORD": config("DB_PASSWORD", default=""),
            "HOST":     config("DB_HOST",     default="localhost"),
            "PORT":     config("DB_PORT",     default="5432"),
        }
    }

# ─── Auth ─────────────────────────────────────────────────────────────────────

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ─── Internationalisation ─────────────────────────────────────────────────────

LANGUAGE_CODE = "es"
TIME_ZONE     = "America/Guatemala"
USE_I18N      = True
USE_TZ        = True

# ─── Static & Media ───────────────────────────────────────────────────────────

STATIC_URL       = "/static/"
STATIC_ROOT      = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL        = "/media/"
MEDIA_ROOT       = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ─── CORS ─────────────────────────────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-organization-id",
]

# ─── REST Framework ───────────────────────────────────────────────────────────

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.StandardPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# ─── JWT ──────────────────────────────────────────────────────────────────────

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":    timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME":   timedelta(days=7),
    "ROTATE_REFRESH_TOKENS":    True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES":        ("Bearer",),
}

# ─── API docs (drf-spectacular) ───────────────────────────────────────────────

SPECTACULAR_SETTINGS = {
    "TITLE":       "Optimiza-CRM API",
    "DESCRIPTION": "API REST para Optimiza-CRM — OptimizaPro © 2025",
    "VERSION":     "1.0.0",
}

# ─── Celery ───────────────────────────────────────────────────────────────────

CELERY_BROKER_URL        = config("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND    = "django-db"
CELERY_ACCEPT_CONTENT    = ["json"]
CELERY_TASK_SERIALIZER   = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE          = TIME_ZONE

# ─── AI providers (fallback env keys for local dev / BYOK per org in prod) ───

GROQ_API_KEY   = config("GROQ_API_KEY",   default="")
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
GEMINI_API_KEY = config("GEMINI_API_KEY", default="")

# ─── Recurrente – Payment gateway ─────────────────────────────────────────────

RECURRENTE_API_KEY        = config("RECURRENTE_API_KEY",        default="")
RECURRENTE_SECRET_KEY     = config("RECURRENTE_SECRET_KEY",     default="")
RECURRENTE_WEBHOOK_SECRET = config("RECURRENTE_WEBHOOK_SECRET", default="")
RECURRENTE_ENV            = config("RECURRENTE_ENV",            default="sandbox")
FRONTEND_URL              = config("FRONTEND_URL",              default="http://localhost:3000")

# ─── Google Drive OAuth ───────────────────────────────────────────────────────

GOOGLE_CLIENT_ID     = config("GOOGLE_CLIENT_ID",     default="")
GOOGLE_CLIENT_SECRET = config("GOOGLE_CLIENT_SECRET", default="")
GOOGLE_REDIRECT_URI  = config("GOOGLE_REDIRECT_URI",  default="http://localhost:8000/api/v1/drive/callback/")

# ─── Django Unfold Admin ───────────────────────────────────────────────────────

from django.templatetags.static import static  # noqa: E402
from django.urls import reverse_lazy             # noqa: E402

UNFOLD = {
    "SITE_TITLE":  "OptimizaCRM",
    "SITE_HEADER": "OptimizaCRM",
    "SITE_URL":    "/",
    "SITE_LOGO":   lambda request: static("logo.png"),
    "LOGIN_LOGO":  lambda request: static("logo.png"),
    "SHOW_HISTORY":      True,
    "SHOW_VIEW_ON_SITE": False,
    "THEME":       "dark",   # forzar modo oscuro siempre
    "ENVIRONMENT": "core.utils.admin_environment_callback",
    "STYLES": [
        lambda request: static("admin/css/optimizacrm.css"),
    ],
    "COLORS": {
        # Slate — fondo oscuro idéntico al dashboard del CRM
        "base": {
            "50":  "oklch(98.5% .003 247.9)",   # slate-50
            "100": "oklch(96.8% .007 248.2)",   # slate-100
            "200": "oklch(92.9% .013 255.5)",   # slate-200
            "300": "oklch(86.9% .022 253.1)",   # slate-300
            "400": "oklch(70.4% .040 256.8)",   # slate-400
            "500": "oklch(55.4% .046 257.4)",   # slate-500
            "600": "oklch(44.6% .043 257.3)",   # slate-600
            "700": "oklch(37.1% .044 257.3)",   # slate-700
            "800": "oklch(27.9% .041 260.0)",   # slate-800
            "900": "oklch(20.8% .042 265.7)",   # slate-900
            "950": "oklch(12.9% .042 264.7)",   # slate-950
        },
        # Naranja — color de marca OptimizaPro (#EA580C = orange-600)
        "primary": {
            "50":  "oklch(98.0% .016 73.7)",    # orange-50
            "100": "oklch(95.4% .038 75.2)",    # orange-100
            "200": "oklch(90.1% .076 70.7)",    # orange-200
            "300": "oklch(83.7% .128 66.3)",    # orange-300
            "400": "oklch(75.0% .183 55.9)",    # orange-400  #fb923c
            "500": "oklch(70.5% .213 47.6)",    # orange-500  #f97316
            "600": "oklch(64.6% .222 41.1)",    # orange-600  #ea580c ← principal
            "700": "oklch(55.3% .195 38.4)",    # orange-700  #c2410c
            "800": "oklch(47.0% .157 37.3)",    # orange-800  #9a3412
            "900": "oklch(40.8% .123 38.7)",    # orange-900  #7c2d12
            "950": "oklch(26.6% .079 36.3)",    # orange-950  #431407
        },
        # Tipografía ajustada al tema oscuro
        "font": {
            "subtle-light":    "var(--color-base-500)",
            "subtle-dark":     "var(--color-base-400)",
            "default-light":   "var(--color-base-700)",
            "default-dark":    "var(--color-base-200)",
            "important-light": "var(--color-base-900)",
            "important-dark":  "var(--color-base-50)",
        },
    },
    "SIDEBAR": {
        "show_search":            True,
        "show_all_applications":  False,
        "navigation": [
            {
                "title": "CRM",
                "separator": True,
                "collapsible": True,
                "items": [
                    {"title": "Leads",          "icon": "person_raised_hand", "link": reverse_lazy("admin:crm_lead_changelist")},
                    {"title": "Clientes",       "icon": "group",              "link": reverse_lazy("admin:crm_customer_changelist")},
                    {"title": "Oportunidades",  "icon": "trending_up",        "link": reverse_lazy("admin:crm_opportunity_changelist")},
                    {"title": "Tareas",         "icon": "task_alt",           "link": reverse_lazy("admin:crm_task_changelist")},
                    {"title": "Actividades",    "icon": "timeline",           "link": reverse_lazy("admin:crm_activity_changelist")},
                    {"title": "Pipelines",      "icon": "account_tree",       "link": reverse_lazy("admin:crm_pipelinetemplate_changelist")},
                ],
            },
            {
                "title": "Facturación",
                "separator": True,
                "collapsible": True,
                "items": [
                    {"title": "Planes",          "icon": "sell",         "link": reverse_lazy("admin:billing_plan_changelist")},
                    {"title": "Add-ons",         "icon": "extension",    "link": reverse_lazy("admin:billing_addon_changelist")},
                    {"title": "Suscripciones",   "icon": "credit_card",  "link": reverse_lazy("admin:billing_subscription_changelist")},
                    {"title": "Eventos webhook", "icon": "webhook",      "link": reverse_lazy("admin:billing_billingevent_changelist")},
                ],
            },
            {
                "title": "Organización",
                "separator": True,
                "collapsible": True,
                "items": [
                    {"title": "Organizaciones", "icon": "corporate_fare",  "link": reverse_lazy("admin:accounts_organization_changelist")},
                    {"title": "Usuarios",       "icon": "manage_accounts", "link": reverse_lazy("admin:accounts_user_changelist")},
                    {"title": "Membresías",     "icon": "badge",           "link": reverse_lazy("admin:accounts_membership_changelist")},
                    {"title": "Auditoría",      "icon": "history",         "link": reverse_lazy("admin:accounts_auditlog_changelist")},
                ],
            },
            {
                "title": "Automatización",
                "separator": True,
                "collapsible": True,
                "items": [
                    {"title": "Reglas",          "icon": "bolt",          "link": reverse_lazy("admin:automation_automationrule_changelist")},
                    {"title": "Notificaciones",  "icon": "notifications", "link": reverse_lazy("admin:notifications_notification_changelist")},
                ],
            },
            {
                "title": "Integraciones",
                "separator": True,
                "collapsible": True,
                "items": [
                    {"title": "Integraciones",  "icon": "cable",         "link": reverse_lazy("admin:integrations_integration_changelist")},
                    {"title": "Mensajes",       "icon": "chat",          "link": reverse_lazy("admin:integrations_message_changelist")},
                    {"title": "Logs",           "icon": "receipt_long",  "link": reverse_lazy("admin:integrations_integrationlog_changelist")},
                ],
            },
            {
                "title": "Analytics",
                "separator": True,
                "collapsible": True,
                "items": [
                    {"title": "Metas de ventas", "icon": "flag",      "link": reverse_lazy("admin:analytics_salesgoal_changelist")},
                    {"title": "Reportes",        "icon": "bar_chart", "link": reverse_lazy("admin:analytics_report_changelist")},
                ],
            },
            {
                "title": "Agente de Voz IA",
                "separator": True,
                "collapsible": True,
                "items": [
                    {"title": "Planes de Voz",      "icon": "mic",          "link": reverse_lazy("admin:voice_plans_voiceplan_changelist")},
                    {"title": "Setup — Tiers",       "icon": "build",        "link": reverse_lazy("admin:voice_plans_voicesetupplan_changelist")},
                    {"title": "FAQs",                "icon": "help",         "link": reverse_lazy("admin:voice_plans_voicefaq_changelist")},
                    {"title": "Estadísticas",        "icon": "bar_chart",    "link": reverse_lazy("admin:voice_plans_voicestat_changelist")},
                ],
            },
            {
                "title": "Contenido web",
                "separator": True,
                "collapsible": True,
                "items": [
                    {"title": "Contenido", "icon": "web", "link": reverse_lazy("admin:content_sitecontent_changelist")},
                ],
            },
        ],
    },
}

# ─── Email — Brevo SMTP ───────────────────────────────────────────────────────

EMAIL_BACKEND       = config("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST          = config("EMAIL_HOST",     default="smtp-relay.brevo.com")
EMAIL_PORT          = config("EMAIL_PORT",     default=587, cast=int)
EMAIL_USE_TLS       = config("EMAIL_USE_TLS",  default=True, cast=bool)
EMAIL_HOST_USER     = config("BREVO_SMTP_LOGIN",  default="")
EMAIL_HOST_PASSWORD = config("BREVO_SMTP_KEY",    default="")
DEFAULT_FROM_EMAIL  = config("DEFAULT_FROM_EMAIL", default="noreply@optimizacrm.com")
SERVER_EMAIL        = DEFAULT_FROM_EMAIL

# ─── Producción — Static files (WhiteNoise) ───────────────────────────────────

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ─── Producción — Cloudflare R2 (Media / uploads) ────────────────────────────

R2_ACCOUNT_ID        = config("R2_ACCOUNT_ID",        default="")
R2_ACCESS_KEY_ID     = config("R2_ACCESS_KEY_ID",     default="")
R2_SECRET_ACCESS_KEY = config("R2_SECRET_ACCESS_KEY", default="")
R2_BUCKET_NAME       = config("R2_BUCKET_NAME",       default="")
R2_PUBLIC_URL        = config("R2_PUBLIC_URL",        default="")

if R2_BUCKET_NAME:
    INSTALLED_APPS.append("storages")
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }
    AWS_ACCESS_KEY_ID      = R2_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY  = R2_SECRET_ACCESS_KEY
    AWS_STORAGE_BUCKET_NAME = R2_BUCKET_NAME
    AWS_S3_ENDPOINT_URL    = f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    AWS_S3_CUSTOM_DOMAIN   = R2_PUBLIC_URL.replace("https://", "") if R2_PUBLIC_URL else None
    AWS_DEFAULT_ACL        = None
    AWS_S3_FILE_OVERWRITE  = False
    AWS_QUERYSTRING_AUTH   = False
    MEDIA_URL              = f"{R2_PUBLIC_URL}/"
