"""Migration 0003 — TeamGoal model"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0002_add_sales_goal"),
        ("crm",       "0006_add_teams"),
    ]

    operations = [
        migrations.CreateModel(
            name="TeamGoal",
            fields=[
                ("id",             models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at",     models.DateTimeField(auto_now_add=True)),
                ("updated_at",     models.DateTimeField(auto_now=True)),
                ("organization",   models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="%(class)s_set", to="accounts.organization")),
                ("team",           models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="goals", to="crm.team")),
                ("year",           models.IntegerField()),
                ("month",          models.IntegerField(help_text="1-12")),
                ("target_revenue", models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ("target_deals",   models.IntegerField(default=0)),
            ],
            options={
                "db_table":        "team_goals",
                "ordering":        ["-year", "-month"],
                "unique_together": {("organization", "team", "year", "month")},
            },
        ),
    ]
