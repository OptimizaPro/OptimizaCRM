import secrets
import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="InviteToken",
            fields=[
                ("id",         models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("email",      models.EmailField()),
                ("role",       models.CharField(default="sales_executive", max_length=50)),
                ("token",      models.CharField(default=secrets.token_urlsafe, max_length=64, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at",    models.DateTimeField(blank=True, null=True)),
                ("invited_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="sent_invites",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("organization", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="invite_tokens",
                    to="accounts.organization",
                )),
            ],
            options={"db_table": "invite_tokens"},
        ),
    ]
