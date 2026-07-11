"""
Optimiza-CRM – Shared Knowledge Base
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro

Org-level KB shared across all channels (voice agent, chatbot, etc.)
"""

import uuid
from django.db import models
from core.models import TenantModel


class KnowledgeBase(TenantModel):
    """Base de conocimiento compartida por organización (canal-agnóstica)."""

    company_info            = models.TextField(blank=True, verbose_name="Sobre la empresa")
    products_services       = models.TextField(blank=True, verbose_name="Productos y servicios")
    pricing                 = models.TextField(blank=True, verbose_name="Precios y planes")
    faqs                    = models.TextField(blank=True, verbose_name="Preguntas frecuentes")
    working_hours           = models.CharField(max_length=500, blank=True, verbose_name="Horario de atención")
    contact_info            = models.TextField(blank=True, verbose_name="Información de contacto")
    appointment_rules       = models.TextField(blank=True, verbose_name="Reglas de citas")
    qualification_questions = models.JSONField(default=list, blank=True, verbose_name="Preguntas de calificación")
    whatsapp_number         = models.CharField(max_length=30, blank=True, verbose_name="WhatsApp de escalado")

    class Meta:
        db_table     = "knowledge_bases"
        verbose_name = "Base de conocimiento"
        verbose_name_plural = "Bases de conocimiento"

    def __str__(self):
        return f"KB – {self.organization.name}"


class KBSource(TenantModel):
    """Fuente importada a la base de conocimiento (URL o archivo)."""

    SOURCE_URL  = "url"
    SOURCE_FILE = "file"
    SOURCE_TYPES = [
        (SOURCE_URL,  "URL"),
        (SOURCE_FILE, "Archivo"),
    ]

    knowledge_base = models.ForeignKey(
        KnowledgeBase, on_delete=models.CASCADE,
        related_name="sources", verbose_name="Base de conocimiento",
    )
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPES, verbose_name="Tipo")
    name        = models.CharField(max_length=500, verbose_name="Nombre / URL")
    char_count  = models.PositiveIntegerField(default=0, verbose_name="Caracteres extraídos")
    created_at  = models.DateTimeField(auto_now_add=True, verbose_name="Importado el")

    class Meta:
        db_table = "kb_sources"
        ordering = ["-created_at"]
        verbose_name = "Fuente de KB"
        verbose_name_plural = "Fuentes de KB"

    def __str__(self):
        return f"{self.get_source_type_display()}: {self.name[:60]}"


class KBChunk(TenantModel):
    """
    Fragmento de texto de la KB listo para búsqueda semántica.
    El embedding se almacena como JSON (lista de floats, 1536 dims OpenAI).
    Se regenera cuando la KB cambia vía tarea Celery.
    """

    SECTION_LABELS = {
        "company_info":            "Sobre la empresa",
        "products_services":       "Productos y servicios",
        "pricing":                 "Precios y planes",
        "faqs":                    "Preguntas frecuentes",
        "working_hours":           "Horario de atención",
        "contact_info":            "Información de contacto",
        "appointment_rules":       "Reglas de citas",
        "qualification_questions": "Preguntas de calificación",
    }

    knowledge_base = models.ForeignKey(
        KnowledgeBase, on_delete=models.CASCADE,
        related_name="chunks", verbose_name="Base de conocimiento",
    )
    section     = models.CharField(max_length=50, verbose_name="Sección KB")
    chunk_index = models.PositiveSmallIntegerField(default=0, verbose_name="Índice")
    text        = models.TextField(verbose_name="Texto del fragmento")
    embedding   = models.TextField(blank=True, verbose_name="Embedding JSON")  # JSON float array
    embedded_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de embedding")

    class Meta:
        db_table = "kb_chunks"
        ordering = ["section", "chunk_index"]
        unique_together = [("knowledge_base", "section", "chunk_index")]
        verbose_name = "Fragmento KB"
        verbose_name_plural = "Fragmentos KB"

    def __str__(self):
        return f"{self.section}[{self.chunk_index}] – {self.text[:60]}"
