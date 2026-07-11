"""
Add VoiceWidget.knowledge_base_v2 — nullable FK to the shared KnowledgeBase.
Existing VoiceWidget.knowledge_base (OneToOne → VoiceKnowledgeBase) is kept
for backward compatibility; voice_views will prefer knowledge_base_v2 when set.
"""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("integrations", "0014_alter_drivedocument_id_alter_googledrivetoken_id_and_more"),
        ("kb",           "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="voicewidget",
            name="knowledge_base_v2",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="voice_widgets",
                to="kb.knowledgebase",
                verbose_name="Base de conocimiento compartida",
            ),
        ),
    ]
