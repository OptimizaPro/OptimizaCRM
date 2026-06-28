"""
OptimizaCRM – Content admin: editor CMS de dos paneles
"""

import json
from django.contrib import admin, messages
from django.http import JsonResponse
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from unfold.admin import ModelAdmin as UnfoldModelAdmin

from .models import SiteContent, DEFAULT_CONTENT
from .cms_schema import SECTIONS, SECTION_MAP


@admin.register(SiteContent)
class SiteContentAdmin(UnfoldModelAdmin):
    list_display = ("key", "updated_at")

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path("editor/",       self.admin_site.admin_view(self.cms_editor),   name="content_sitecontent_editor"),
            path("editor/save/",  self.admin_site.admin_view(self.cms_save),     name="content_sitecontent_save"),
        ]
        return custom + urls

    def changelist_view(self, request, extra_context=None):
        # Redirigir la lista estándar directamente al editor CMS
        return redirect("admin:content_sitecontent_editor")

    # ── GET: renderiza el editor ──────────────────────────────────────────────

    def cms_editor(self, request):
        section_key  = request.GET.get("section", SECTIONS[0]["key"])
        section_meta = SECTION_MAP.get(section_key, SECTIONS[0])
        content      = SiteContent.get_section(section_key)

        # Clonar la estructura inyectando el valor de cada campo
        import copy
        active = copy.deepcopy(section_meta)
        for group in active["groups"]:
            for field in group["fields"]:
                raw = content.get(field["key"], "")
                if field["type"] == "json":
                    field["value"] = json.dumps(raw, ensure_ascii=False, indent=2)
                else:
                    field["value"] = raw if raw is not None else ""

        context = {
            **self.admin_site.each_context(request),
            "title":    "Contenido Web",
            "sections": SECTIONS,
            "active":   active,
            "opts":     self.model._meta,
        }
        return TemplateResponse(request, "admin/content/sitecontent_editor.html", context)

    # ── POST: guarda la sección vía AJAX ─────────────────────────────────────

    @method_decorator(csrf_protect)
    def cms_save(self, request):
        if request.method != "POST":
            return JsonResponse({"ok": False, "error": "Método no permitido"}, status=405)

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"ok": False, "error": "JSON inválido"}, status=400)

        section_key = body.get("section")
        fields_data = body.get("data", {})

        if section_key not in SECTION_MAP:
            return JsonResponse({"ok": False, "error": "Sección desconocida"}, status=400)

        section_meta = SECTION_MAP[section_key]

        # Parsear campos JSON y validar
        parsed = {}
        for group in section_meta["groups"]:
            for field in group["fields"]:
                key = field["key"]
                raw = fields_data.get(key, "")
                if field["type"] == "json":
                    try:
                        parsed[key] = json.loads(raw)
                    except json.JSONDecodeError as e:
                        return JsonResponse({"ok": False, "error": f"JSON inválido en «{field['label']}»: {e}"}, status=400)
                else:
                    parsed[key] = raw

        obj, _ = SiteContent.objects.get_or_create(key=section_key, defaults={"data": {}})
        obj.data = parsed
        obj.updated_by = request.user
        obj.save()

        return JsonResponse({"ok": True, "message": "Cambios guardados correctamente."})
