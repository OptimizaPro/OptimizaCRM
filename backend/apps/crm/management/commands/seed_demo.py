"""
Optimiza-CRM – Demo data seeder
Usage: python manage.py seed_demo [--org <slug>] [--clear]
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
import random

from apps.accounts.models import Organization, User
from apps.crm.models import (
    Lead, Customer, Opportunity, Task, Activity, PipelineTemplate, PipelineStage
)


# ─── Datos demo ───────────────────────────────────────────────────────────────

LEADS = [
    ("Carlos",    "Mendoza",    "cmendoza@textilesgt.com",    "+502 5555-1001", "Textiles GT",          "sales_manager",  "web",      "qualified",  72),
    ("María",     "López",      "mlopez@ferreteriapaz.com",   "+502 5555-1002", "Ferretería La Paz",    "owner",          "referral", "new",        45),
    ("Roberto",   "Cifuentes",  "rcifuentes@agroexport.gt",   "+502 5555-1003", "AgroExport S.A.",      "director",       "event",    "contacted",  58),
    ("Ana",       "Barrios",    "abarrios@clinicasalud.com",  "+502 5555-1004", "Clínica Salud Total",  "admin",          "social",   "new",        30),
    ("Diego",     "Fuentes",    "dfuentes@constructoragt.com","+502 5555-1005", "Constructora GT",      "ceo",            "cold_call","lost",        0),
    ("Lucía",     "Morales",    "lmorales@hotelverdeazul.com","+502 5555-1006", "Hotel Verde Azul",     "gm",             "referral", "qualified",  81),
    ("Jorge",     "Castillo",   "jcastillo@distribuidora5.com","+502 5555-1007","Distribuidora 5E",     "sales_manager",  "web",      "contacted",  50),
    ("Patricia",  "Ramírez",    "pramirez@educatech.gt",      "+502 5555-1008", "EducaTech GT",         "director",       "event",    "new",        20),
    ("Fernando",  "Velásquez",  "fvelasquez@logisticagt.com", "+502 5555-1009", "Logística GT Express", "coo",            "web",      "qualified",  65),
    ("Sofía",     "Ordóñez",    "sordonez@restaurantes5.com", "+502 5555-1010", "Grupo 5 Restaurantes", "owner",          "social",   "contacted",  40),
    ("Andrés",    "Chávez",     "achavez@segurosalpha.com",   "+502 5555-1011", "Seguros Alpha",        "vp_sales",       "referral", "qualified",  77),
    ("Daniela",   "Monzón",     "dmonzon@farmaciacentral.com","+502 5555-1012", "Farmacia Central",     "ceo",            "web",      "new",        25),
]

CUSTOMERS = [
    ("Inversiones Altiplano S.A.",  "info@altiplano.com",    "+502 2222-0101", "Inversiones Altiplano", "active",   0.08, 24500),
    ("Retail GT Sociedad Anónima",  "ops@retailgt.com",      "+502 2222-0102", "Retail GT",             "active",   0.12, 18900),
    ("Exportaciones del Norte",     "ventas@expnorte.com",   "+502 2222-0103", "Exportaciones del Norte","active",  0.05, 42000),
    ("Corporación Familia Pérez",   "contacto@cfperez.com",  "+502 2222-0104", "Corp. Familia Pérez",   "active",   0.22, 9800),
    ("TechSoluciones Guatemala",    "hola@techsol.gt",       "+502 2222-0105", "TechSoluciones",        "active",   0.09, 31200),
    ("Grupo Hotelero Pacífico",     "reservas@ghpacifico.com","+502 2222-0106","Grupo Hotelero Pacífico","inactive", 0.45, 5600),
    ("Agroindustrias San Marcos",   "admin@agrosm.com",      "+502 2222-0107", "Agroindustrias SM",     "active",   0.07, 56000),
    ("Clínicas Bienestar",          "info@clinicasbien.com", "+502 2222-0108", "Clínicas Bienestar",    "active",   0.03, 14300),
    ("Educación Continua GT",       "cursos@educagt.com",    "+502 2222-0109", "Educación Continua GT", "churned",  0.88, 2100),
    ("Constructora Horizonte",      "obra@horizonte.gt",     "+502 2222-0110", "Constructora Horizonte","active",   0.15, 78000),
]

OPPORTUNITIES = [
    ("Implementación CRM Textiles",          "new",         8500,  20, 30),
    ("Módulo ventas Ferretería La Paz",       "contacted",   4200,  40, 20),
    ("CRM completo AgroExport",              "qualified",   18000, 60, 45),
    ("Automatizaciones Hotel Verde Azul",    "proposal",    6500,  75, 15),
    ("Pipeline ventas Distribuidora 5E",     "negotiation", 9800,  85, 10),
    ("Licencias anuales TechSoluciones",     "won",         12000, 100, 0),
    ("Onboarding Clínicas Bienestar",        "won",         3500,  100, 0),
    ("Integración ERP Agroindustrias SM",    "proposal",    22000, 70, 30),
    ("CRM + Reportes Constructora Horizonte","negotiation", 15000, 80, 20),
    ("Plan Pro Educación Continua GT",       "lost",        4800,  0,  0),
    ("Módulo IA Grupo Hotelero Pacífico",    "qualified",   11000, 55, 40),
    ("Actualización plan Retail GT",         "contacted",   6000,  35, 25),
]

TASKS = [
    ("Llamar a Carlos Mendoza para demo",                    "high",   "pending",     2),
    ("Enviar propuesta a Hotel Verde Azul",                  "urgent", "pending",     1),
    ("Seguimiento contrato AgroExport",                      "high",   "in_progress", 3),
    ("Preparar presentación Constructora Horizonte",         "medium", "pending",     5),
    ("Revisar integración ERP Agroindustrias",               "medium", "in_progress", 7),
    ("Onboarding inicial TechSoluciones",                    "high",   "completed",  -3),
    ("Cotización licencias adicionales Retail GT",           "low",    "pending",    10),
    ("Reunión de kick-off Clínicas Bienestar",               "urgent", "completed",  -1),
    ("Análisis de churn Educación Continua GT",              "high",   "pending",     4),
    ("Actualizar datos de contacto Distribuidora 5E",        "low",    "completed",  -5),
]

ACTIVITIES = [
    ("call",    "Llamada de prospección — interés confirmado",     "lead"),
    ("email",   "Envío de brochure y precios",                    "lead"),
    ("meeting", "Demo del producto vía Zoom",                     "lead"),
    ("note",    "Cliente solicita módulo de automatizaciones",    "opportunity"),
    ("call",    "Seguimiento post-demo, preguntas técnicas",      "opportunity"),
    ("email",   "Propuesta formal enviada",                       "opportunity"),
    ("meeting", "Reunión presencial en oficinas del cliente",     "opportunity"),
    ("note",    "Negociacion de precio — descuento del 10%",     "opportunity"),
    ("call",    "Confirmación de cierre de contrato",             "customer"),
    ("email",   "Bienvenida y credenciales de acceso enviadas",  "customer"),
    ("meeting", "Sesión de onboarding completada",               "customer"),
    ("note",    "Cliente satisfecho, recomienda a dos contactos","customer"),
    ("call",    "Check-in mensual de satisfacción",              "customer"),
    ("email",   "Reporte de uso mensual enviado",                "customer"),
    ("note",    "Solicitud de funcionalidad adicional registrada","customer"),
]


class Command(BaseCommand):
    help = "Siembra datos demo en la organización especificada"

    def add_arguments(self, parser):
        parser.add_argument("--org", type=str, default=None, help="Slug de la organización")
        parser.add_argument("--clear", action="store_true", help="Eliminar datos CRM existentes antes de sembrar")

    def handle(self, *args, **options):
        # ── Organización ──
        org_slug = options["org"]
        if org_slug:
            try:
                org = Organization.objects.get(slug=org_slug)
            except Organization.DoesNotExist:
                self.stderr.write(f"Organización '{org_slug}' no encontrada.")
                return
        else:
            org = Organization.objects.first()
            if not org:
                self.stderr.write("No hay organizaciones. Regístrate primero.")
                return

        self.stdout.write(f"Organización: {org.name}")
        user = User.objects.filter(memberships__organization=org).first()

        # ── Limpiar ──
        if options["clear"]:
            Activity.objects.filter(organization=org).delete()
            Task.objects.filter(organization=org).delete()
            Opportunity.objects.filter(organization=org).delete()
            Customer.objects.filter(organization=org).delete()
            Lead.objects.filter(organization=org).delete()
            PipelineTemplate.objects.filter(organization=org).delete()
            self.stdout.write("Datos anteriores eliminados.")

        now = timezone.now()

        # ── Pipeline ──
        pipeline, _ = PipelineTemplate.objects.get_or_create(
            organization=org,
            name="Pipeline de Ventas",
            defaults={"pipeline_type": "sales", "color": "#EA580C", "is_default": True},
        )
        stages_data = [
            #  name            slug           order  prob  sla_h  is_won  is_lost
            ("Nuevo",        "new",         0,  10,  24,   False, False),
            ("Contactado",   "contacted",   1,  25,  48,   False, False),
            ("Calificado",   "qualified",   2,  50,  72,   False, False),
            ("Propuesta",    "proposal",    3,  70,  72,   False, False),
            ("Negociacion",  "negotiation", 4,  85,  48,   False, False),
            ("Ganado",       "won",         5,  100, None, True,  False),
            ("Perdido",      "lost",        6,  0,   None, False, True),
        ]
        for name, slug, order, prob, sla_h, is_won, is_lost in stages_data:
            PipelineStage.objects.get_or_create(
                pipeline=pipeline, slug=slug,
                defaults={"name": name, "order": order, "probability": prob, "sla_hours": sla_h, "is_won": is_won, "is_lost": is_lost},
            )
        self.stdout.write(f"  Pipeline '{pipeline.name}' con {len(stages_data)} etapas OK")

        # ── Leads ──
        leads = []
        for fn, ln, email, phone, company, title, source, status, score in LEADS:
            lead, _ = Lead.objects.get_or_create(
                organization=org, email=email,
                defaults={
                    "first_name": fn, "last_name": ln, "phone": phone,
                    "company": company, "title": title, "source": source,
                    "status": status, "score": score, "assigned_to": user,
                },
            )
            leads.append(lead)
        self.stdout.write(f"  {len(leads)} leads OK")

        # ── Customers ──
        customers = []
        for name, email, phone, company, status, churn, ltv in CUSTOMERS:
            cust, _ = Customer.objects.get_or_create(
                organization=org, email=email,
                defaults={
                    "name": name, "phone": phone, "company": company,
                    "status": status, "churn_risk": churn, "lifetime_value": ltv,
                    "assigned_to": user,
                },
            )
            customers.append(cust)
        self.stdout.write(f"  {len(customers)} clientes OK")

        # ── Opportunities ──
        opps = []
        for i, (title, stage, amount, prob, days_to_close) in enumerate(OPPORTUNITIES):
            customer = customers[i % len(customers)]
            lead     = leads[i % len(leads)]
            close_date = (now + timedelta(days=days_to_close)).date() if days_to_close > 0 else now.date()
            won_at  = now - timedelta(days=random.randint(1, 30)) if stage == "won"  else None
            lost_at = now - timedelta(days=random.randint(1, 30)) if stage == "lost" else None
            opp, _ = Opportunity.objects.get_or_create(
                organization=org, title=title,
                defaults={
                    "customer": customer, "lead": lead, "assigned_to": user,
                    "pipeline_template": pipeline, "stage": stage,
                    "amount": amount, "probability": prob,
                    "expected_close_date": close_date,
                    "won_at": won_at, "lost_at": lost_at,
                },
            )
            opps.append(opp)
        self.stdout.write(f"  {len(opps)} oportunidades OK")

        # ── Tasks ──
        tasks = []
        for title, priority, status, days_offset in TASKS:
            due = now + timedelta(days=days_offset)
            completed_at = now + timedelta(days=days_offset) if status == "completed" else None
            task, _ = Task.objects.get_or_create(
                organization=org, title=title,
                defaults={
                    "assigned_to": user, "created_by": user,
                    "priority": priority, "status": status,
                    "due_date": due, "completed_at": completed_at,
                },
            )
            tasks.append(task)
        self.stdout.write(f"  {len(tasks)} tareas OK")

        # ── Activities ──
        act_count = 0
        for i, (act_type, subject, related_to) in enumerate(ACTIVITIES):
            if related_to == "lead" and leads:
                rel_obj = leads[i % len(leads)]
                rel_type = "lead"
                rel_id   = rel_obj.id
            elif related_to == "opportunity" and opps:
                rel_obj  = opps[i % len(opps)]
                rel_type = "opportunity"
                rel_id   = rel_obj.id
            else:
                rel_obj  = customers[i % len(customers)]
                rel_type = "customer"
                rel_id   = rel_obj.id

            _, created = Activity.objects.get_or_create(
                organization=org, subject=subject,
                defaults={
                    "user": user, "activity_type": act_type,
                    "related_type": rel_type, "related_id": rel_id,
                    "body": f"Actividad registrada automáticamente — {subject}",
                },
            )
            if created:
                act_count += 1
        self.stdout.write(f"  {act_count} actividades OK")

        self.stdout.write(self.style.SUCCESS(f"\nDemo lista en '{org.name}'. A explorar!"))
