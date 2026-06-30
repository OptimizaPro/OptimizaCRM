from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("integrations", "0008_voicekbsource_updated_at_alter_voicekbsource_id_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="GoogleDriveToken",
            fields=[
                ("id",            models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("organization",  models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization", verbose_name="Organización")),
                ("access_token",  models.TextField()),
                ("refresh_token", models.TextField(blank=True)),
                ("token_expiry",  models.DateTimeField(null=True, blank=True)),
                ("connected_at",  models.DateTimeField(auto_now_add=True)),
                ("updated_at",    models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "google_drive_tokens",
            },
        ),
        migrations.CreateModel(
            name="DriveDocument",
            fields=[
                ("id",            models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("organization",  models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="+", to="accounts.organization", verbose_name="Organización")),
                ("entity_type",   models.CharField(max_length=20, choices=[("lead", "Lead"), ("customer", "Cliente"), ("opportunity", "Oportunidad")])),
                ("entity_id",     models.CharField(max_length=100)),
                ("drive_file_id", models.CharField(max_length=200)),
                ("name",          models.CharField(max_length=500)),
                ("mime_type",     models.CharField(max_length=200, blank=True)),
                ("web_view_link", models.URLField(max_length=1000, blank=True)),
                ("icon_link",     models.URLField(max_length=500, blank=True)),
                ("created_at",    models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table":  "drive_documents",
                "ordering":  ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="drivedocument",
            constraint=models.UniqueConstraint(
                fields=["organization", "entity_type", "entity_id", "drive_file_id"],
                name="unique_drive_doc_per_entity",
            ),
        ),
    ]
