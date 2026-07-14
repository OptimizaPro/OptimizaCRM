from django.db import migrations

FAQS = [
    {
        "question": "¿Necesito contratar algún servicio externo de voz o IA por separado?",
        "answer": "No. OptimizaCRM gestiona toda la infraestructura por ti. Solo activas el agente, configuras su base de conocimiento y listo. Nos encargamos de toda la parte técnica.",
        "sort_order": 0,
        "is_active": True,
    },
    {
        "question": "¿El agente habla en español natural?",
        "answer": "Sí. Integramos los mejores motores de síntesis de voz e IA del mercado, seleccionados específicamente para español latinoamericano. Los clientes frecuentemente no detectan que están hablando con una IA en las primeras interacciones.",
        "sort_order": 1,
        "is_active": True,
    },
    {
        "question": "¿Qué pasa cuando el agente no sabe responder algo?",
        "answer": "El agente reconoce sus límites y transfiere automáticamente a un agente humano vía WhatsApp, incluyendo un resumen de la conversación para que el equipo tenga contexto completo.",
        "sort_order": 2,
        "is_active": True,
    },
    {
        "question": "¿Los leads que captura el agente van directo a mi CRM?",
        "answer": "Sí. Cada lead calificado por el agente aparece automáticamente en tu pipeline de OptimizaCRM con nombre, email, teléfono, motivo de contacto y resumen de la conversación.",
        "sort_order": 3,
        "is_active": True,
    },
    {
        "question": "¿Puedo personalizar lo que dice el agente?",
        "answer": "Completamente. Configuras el nombre del agente, su saludo inicial, despedida, información de tu empresa, productos, precios, horarios y preguntas de calificación. También puedes importar la KB desde una URL o PDF.",
        "sort_order": 4,
        "is_active": True,
    },
    {
        "question": "¿Qué sucede cuando se agotan los minutos del mes?",
        "answer": "Recibes alertas al 80% y 100% del límite. Los minutos adicionales se cobran a $0.08–0.10/min según tu plan. Puedes actualizar a un plan superior en cualquier momento.",
        "sort_order": 5,
        "is_active": True,
    },
    {
        "question": "¿El agente de voz está incluido en los planes de CRM?",
        "answer": "Durante los 14 días de prueba gratuita incluimos 1 agente con 100 minutos para que puedas probarlo. Pasado el trial, es un servicio adicional. Los planes de Voz-AI incluyen Voz Starter (1 agente y 300 minutos), Voz Pro (3 agentes, 1.000 min) y Voz Enterprise (5 agentes, 5.000 min).",
        "sort_order": 6,
        "is_active": True,
    },
]


def seed_faqs(apps, schema_editor):
    VoiceFAQ = apps.get_model("voice_plans", "VoiceFAQ")
    if VoiceFAQ.objects.exists():
        return
    for faq in FAQS:
        VoiceFAQ.objects.create(**faq)


def unseed_faqs(apps, schema_editor):
    pass  # no revertimos datos de seed


class Migration(migrations.Migration):

    dependencies = [
        ("voice_plans", "0006_fix_business_plan"),
    ]

    operations = [
        migrations.RunPython(seed_faqs, unseed_faqs),
    ]
