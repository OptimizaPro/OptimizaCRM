"""
Data migration: copy existing VoiceKnowledgeBase + VoiceKBSource records
into the new shared KnowledgeBase / KBSource tables, and link each
VoiceWidget to the new KB via knowledge_base_v2.

Depends on integrations 0015 (which adds VoiceWidget.knowledge_base_v2).
"""

from django.db import migrations


def _migrate_voice_kb_to_shared(apps, schema_editor):
    VoiceKnowledgeBase = apps.get_model("integrations", "VoiceKnowledgeBase")
    VoiceKBSource      = apps.get_model("integrations", "VoiceKBSource")
    VoiceWidget        = apps.get_model("integrations", "VoiceWidget")
    KnowledgeBase      = apps.get_model("kb", "KnowledgeBase")
    KBSource           = apps.get_model("kb", "KBSource")

    for voice_kb in VoiceKnowledgeBase.objects.select_related("organization").all():
        # Create (or get) org-level KnowledgeBase
        kb, created = KnowledgeBase.objects.get_or_create(
            organization=voice_kb.organization,
            defaults={
                "company_info":            voice_kb.company_info,
                "products_services":       voice_kb.products_services,
                "pricing":                 voice_kb.pricing,
                "faqs":                    voice_kb.faqs,
                "working_hours":           voice_kb.working_hours,
                "contact_info":            voice_kb.contact_info,
                "appointment_rules":       voice_kb.appointment_rules,
                "qualification_questions": voice_kb.qualification_questions,
                "whatsapp_number":         voice_kb.whatsapp_number,
            },
        )

        # Copy sources
        if created:
            for src in VoiceKBSource.objects.filter(knowledge_base=voice_kb):
                KBSource.objects.create(
                    organization   = src.organization,
                    knowledge_base = kb,
                    source_type    = src.source_type,
                    name           = src.name,
                    char_count     = src.char_count,
                )

        # Link all VoiceWidgets that used this VoiceKnowledgeBase
        VoiceWidget.objects.filter(knowledge_base=voice_kb).update(knowledge_base_v2=kb)


def _reverse(apps, schema_editor):
    # Clearing knowledge_base_v2 is enough for reversal
    VoiceWidget = apps.get_model("integrations", "VoiceWidget")
    VoiceWidget.objects.update(knowledge_base_v2=None)
    apps.get_model("kb", "KnowledgeBase").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("kb",           "0001_initial"),
        ("integrations", "0015_voicewidget_knowledge_base_v2"),
    ]

    operations = [
        migrations.RunPython(_migrate_voice_kb_to_shared, _reverse),
    ]
