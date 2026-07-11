"""
Optimiza-CRM – Knowledge Base URL conf
"""

from django.urls import path
from .views import (
    kb_manage,
    kb_scrape_url,
    kb_import_file,
    kb_sources,
    kb_source_delete,
)

urlpatterns = [
    path("kb/manage/",              kb_manage,       name="kb-manage"),
    path("kb/scrape-url/",          kb_scrape_url,   name="kb-scrape-url"),
    path("kb/import-file/",         kb_import_file,  name="kb-import-file"),
    path("kb/sources/",             kb_sources,      name="kb-sources"),
    path("kb/sources/<uuid:source_id>/", kb_source_delete, name="kb-source-delete"),
]
