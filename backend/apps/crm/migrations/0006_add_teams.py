"""Add Team and TeamMembership models."""

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0005_lead_outbound_consent"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Team",
            fields=[
                ("id",           models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at",   models.DateTimeField(auto_now_add=True)),
                ("updated_at",   models.DateTimeField(auto_now=True)),
                ("organization", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="%(class)ss", to="accounts.organization")),
                ("name",         models.CharField(max_length=100)),
                ("description",  models.TextField(blank=True)),
                ("color",        models.CharField(default="#f97316", max_length=7)),
            ],
            options={"db_table": "teams", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="TeamMembership",
            fields=[
                ("id",        models.AutoField(primary_key=True, serialize=False)),
                ("role",      models.CharField(choices=[("leader", "Líder"), ("member", "Miembro")], default="member", max_length=20)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("team",      models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="crm.team")),
                ("user",      models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="team_memberships", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "team_memberships", "unique_together": {("team", "user")}},
        ),
    ]
