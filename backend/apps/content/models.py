"""
Optimiza-CRM – CMS / Site Content models
Copyright (c) 2024-2025 Nelson Alvarez / OptimizaPro
"""

from django.conf import settings
from django.db import models

DEFAULT_CONTENT = {
    "hero": {
        "badge":             "Plataforma CRM con IA",
        "headline":          "Cierra más negocios con Inteligencia Artificial",
        "subheadline":       "Optimiza-CRM combina capacidades CRM empresariales con IA de vanguardia para ayudar a tu equipo de ventas a trabajar de forma más inteligente, cerrar más rápido y aumentar los ingresos.",
        "cta_primary":       "Empieza Gratis",
        "cta_primary_href":  "/register",
        "cta_secondary":     "Ver Características",
        "cta_secondary_href": "/features",
        "trust_signals":     ["Sin tarjeta de crédito", "Prueba gratuita 14 días", "Seguridad empresarial"],
        "features_headline":    "Todo lo que necesitas para escalar tus ventas",
        "features_subheadline": "Diseñado para equipos que exigen rendimiento, seguridad e inteligencia.",
        "feature_cards": [
            {"title": "Lead Scoring con IA",        "description": "Puntúa y prioriza leads automáticamente con reglas inteligentes y modelos de IA."},
            {"title": "Gestión de Pipeline",         "description": "Tableros kanban visuales con etapas personalizables y arrastrar y soltar."},
            {"title": "Previsión de Ingresos",       "description": "Predicciones de ingresos con IA y niveles de confianza."},
            {"title": "Multi-Tenant SaaS",           "description": "Multi-tenancy empresarial con aislamiento completo de datos."},
            {"title": "Automatización",              "description": "Automatiza tareas repetitivas y céntrate en cerrar negocios."},
            {"title": "Seguridad Empresarial",       "description": "Cumplimiento RGPD con cifrado de extremo a extremo."},
        ],
        "cta_section_headline": "¿Listo para transformar tus ventas?",
        "cta_section_text":     "Únete a los equipos de ventas que ya usan Optimiza-CRM para cerrar más negocios.",
        "cta_section_button":   "Comenzar Gratis",
    },
    "pricing": {
        "badge":       "Sin permanencia · Cancela cuando quieras",
        "headline":    "Precios pensados para LATAM",
        "subheadline": "Gestiona leads, automatiza seguimientos y cierra más negocios. Precio fijo por organización, con IA integrable y 14 días de prueba gratis.",
    },
    "features_page": {
        "headline":    "Funcionalidades potentes para equipos de ventas modernos",
        "subheadline": "Todo lo que necesitas para gestionar leads, cerrar negocios y aumentar ingresos.",
        "modules": [
            {"title": "Gestión de Leads",       "items": ["Captura de leads", "Lead scoring", "Nutrición de leads", "Segmentación"]},
            {"title": "Gestión de Oportunidades", "items": ["Etapas de pipeline", "Seguimiento de negocios", "Análisis de ganados/perdidos", "Previsión"]},
            {"title": "Módulo IA",              "items": ["Predicción de churn", "Previsión de ingresos", "Análisis de sentimiento", "Follow-up IA"]},
            {"title": "Analítica e Informes",   "items": ["Informes de ingresos", "Rendimiento del equipo", "Pipeline analytics", "Dashboards personalizados"]},
            {"title": "Tareas y Calendario",    "items": ["Gestión de tareas", "Sincronización de calendario", "Recordatorios", "Programador de reuniones"]},
            {"title": "Comunicación",           "items": ["Integración de email", "WhatsApp", "Bandeja de entrada unificada", "Plantillas de mensajes"]},
        ],
    },
    "general": {
        "site_name":     "Optimiza-CRM",
        "tagline":       "El CRM con IA que cierra más negocios.",
        "contact_email": "hola@optimizapro.com",
        "support_email": "soporte@optimizapro.com",
        "social_links": [
            {"name": "Twitter / X", "url": ""},
            {"name": "LinkedIn",    "url": ""},
        ],
    },
    "nosotros": {
        "badge":       "Nuestra historia",
        "headline":    "Construido por alguien que vivió el problema",
        "subheadline": "Más de 10 años gestionando negocios en LATAM nos enseñaron que las herramientas existentes son demasiado complejas, demasiado caras o simplemente no entienden nuestra realidad. OptimizaCRM nació para cambiar eso.",
        "quote_text":   "Las PYMEs de LATAM merecen las mismas herramientas de ventas que las grandes empresas. Sin la complejidad ni los precios prohibitivos.",
        "quote_author": "Nelson Alvarez",
        "quote_role":   "Founder, OptimizaPro",
        "mission_label":       "Nuestra misión",
        "mission_headline":    "Democratizar el CRM para PYMEs latinoamericanas",
        "mission_subheadline": "Creemos que cualquier empresa, sin importar su tamaño, merece tener acceso a herramientas de ventas inteligentes que realmente funcionen.",
        "mission_stats": [
            {"value": "40+",  "label": "PYMEs investigadas"},
            {"value": "2026", "label": "Año de lanzamiento"},
            {"value": "LATAM","label": "Mercado objetivo"},
        ],
        "values_label":    "Lo que nos guía",
        "values_headline": "Nuestros valores",
        "values": [
            {"title": "Obsesión por el resultado",  "description": "No construimos funcionalidades por construirlas. Cada decisión de producto se mide por su impacto real en el negocio del cliente."},
            {"title": "IA con propósito",           "description": "La inteligencia artificial no es un adorno. La integramos donde realmente ahorra tiempo, reduce errores y aumenta ingresos."},
            {"title": "Confianza ante todo",        "description": "Los datos de tus clientes son el activo más valioso de tu empresa. Seguridad empresarial desde el primer día, sin excepciones."},
            {"title": "Hecho para LATAM",           "description": "Entendemos la realidad de las PYMEs latinoamericanas: equipos pequeños, recursos ajustados y necesidad de resultados rápidos."},
        ],
        "founder_name": "Nelson Alvarez",
        "founder_role": "Founder & Developer, OptimizaPro",
        "founder_bio": [
            "Más de 8 años liderando equipos de ventas y operaciones en sectores como Real Estate, Hospitality y Retail en Guatemala y Centroamérica.",
            "Esa experiencia en el mundo real —con CRMs que no encajaban, procesos manuales y datos dispersos— fue el catalizador para construir OptimizaCRM.",
        ],
        "founder_stack": ["Next.js 15", "Django 5", "PostgreSQL", "IA Generativa", "Railway", "Multi-tenant"],
        "milestones": [
            {"year": "2024", "label": "Idea y validación",  "detail": "Investigación de mercado con 40+ PYMEs en Guatemala y Centroamérica."},
            {"year": "2025", "label": "Desarrollo del MVP", "detail": "Construcción del core: CRM, lead scoring con IA, pipeline y automatizaciones."},
            {"year": "2026", "label": "Lanzamiento",        "detail": "Primeros clientes beta. Iteración rápida basada en feedback real del mercado."},
            {"year": "→",    "label": "Escala regional",    "detail": "Expansión a México, Colombia y el resto de LATAM con verticales específicos."},
        ],
        "cta_headline":       "¿Listo para transformar tus ventas?",
        "cta_text":           "Únete a los primeros equipos que están cerrando más negocios con OptimizaCRM.",
        "cta_primary":        "Empezar gratis",
        "cta_primary_href":   "/register",
        "cta_secondary":      "Ver características",
        "cta_secondary_href": "/features",
    },
    "contacto": {
        "badge":       "Hablemos",
        "headline":    "¿Tienes preguntas? Estamos aquí",
        "subheadline": "Cuéntanos sobre tu negocio y te ayudamos a evaluar si OptimizaCRM es la herramienta que necesitas. Sin presión, sin ventas agresivas.",
        "email":           "hola@optimizacrm.com",
        "email_detail":    "Respuesta en menos de 24 h",
        "whatsapp":        "+502 XXXX XXXX",
        "whatsapp_href":   "https://wa.me/502XXXXXXXX",
        "whatsapp_detail": "Lunes a viernes · 9h–18h",
        "response_time":   "< 24 horas",
        "form_headline": "Envíanos un mensaje",
        "form_subtext":  "Te respondemos en menos de 24 horas hábiles.",
        "contact_reasons": [
            "Quiero probar OptimizaCRM en mi empresa",
            "Tengo dudas sobre precios o planes",
            "Necesito una demo personalizada",
            "Soy partner o quiero revenderte",
            "Tengo una pregunta técnica",
            "Otro",
        ],
        "faq_headline": "Preguntas frecuentes",
        "faqs": [
            {"q": "¿Cuánto tiempo tarda la configuración inicial?", "a": "Menos de 5 minutos. Creas tu cuenta, invitas a tu equipo y empiezas a registrar leads de inmediato. No necesitas contratar un consultor."},
            {"q": "¿Mis datos están seguros?",                      "a": "Sí. Cada organización tiene sus datos completamente aislados (arquitectura multi-tenant). Usamos JWT, HTTPS y cumplimiento OWASP desde el primer día."},
            {"q": "¿Puedo migrar desde otro CRM?",                  "a": "Ofrecemos importación de contactos y leads vía CSV. Para migraciones más complejas, contáctanos y lo gestionamos juntos."},
            {"q": "¿Hay soporte en español?",                       "a": "100%. El producto está diseñado para LATAM y todo el soporte se da en español. Sin bots, sin respuestas genéricas en inglés."},
        ],
        "demo_headline": "¿Prefieres ver el producto en acción?",
        "demo_text":     "Agenda una demo personalizada de 30 minutos y te mostramos cómo OptimizaCRM puede adaptarse a tu equipo.",
        "demo_cta_text": "Probar gratis 14 días",
        "demo_cta_href": "/register",
    },
    "privacidad": {
        "headline":        "Política de Privacidad",
        "last_updated":    "23 de junio de 2026",
        "commitment_text": "Compromiso simple: tus datos son tuyos. No los vendemos, no los usamos para publicidad de terceros y puedes eliminarlos cuando quieras. Esta política explica exactamente qué recopilamos y por qué.",
        "section_recopilamos": "Recopilamos la información que nos proporcionas al registrarte (nombre, email, empresa), los datos que introduces en la plataforma (leads, clientes, actividades) y datos de uso técnico (IP, navegador, páginas visitadas) para mejorar el servicio.",
        "section_usamos":      "Usamos tu información exclusivamente para prestar el servicio, enviarte comunicaciones relacionadas con tu cuenta, mejorar la plataforma y cumplir con obligaciones legales. Nunca usamos tus datos para publicidad de terceros.",
        "section_seguridad":   "Tus datos se almacenan en servidores seguros con cifrado en tránsito (HTTPS/TLS) y en reposo. Seguimos las mejores prácticas OWASP y realizamos auditorías de seguridad periódicas.",
        "section_retencion":   "Conservamos tus datos mientras mantengas una cuenta activa. Al cancelar, tus datos permanecen disponibles para exportar durante 30 días, después de los cuales se eliminan permanentemente.",
        "section_terceros":    "Compartimos datos únicamente con proveedores de infraestructura (Railway), email transaccional (Brevo) e IA (OpenAI, Anthropic) bajo contratos de procesamiento de datos. Nunca vendemos datos a terceros.",
        "section_cookies":     "Usamos cookies estrictamente necesarias para la autenticación y funcionamiento del servicio. No usamos cookies de seguimiento ni publicidad.",
        "section_derechos":    "Tienes derecho a acceder, rectificar, eliminar y exportar tus datos en cualquier momento desde la configuración de tu cuenta o contactándonos.",
        "section_menores":     "OptimizaCRM no está dirigido a menores de 18 años. No recopilamos conscientemente datos de menores. Si detectamos un registro de menor de edad, eliminaremos la cuenta.",
        "section_cambios":     "Te notificaremos por email con 15 días de antelación ante cambios materiales en esta política. El uso continuado del servicio tras la notificación implica aceptación.",
        "legal_email": "legal@optimizacrm.com",
    },
    "terminos": {
        "headline":     "Términos y Condiciones",
        "last_updated": "23 de junio de 2026",
        "key_cards": [
            {"emoji": "✅", "title": "Prueba gratis",     "desc": "14 días sin tarjeta de crédito."},
            {"emoji": "🔓", "title": "Sin permanencia",   "desc": "Cancela cuando quieras, sin penalización."},
            {"emoji": "🇬🇹", "title": "Ley guatemalteca", "desc": "Jurisdicción: Ciudad de Guatemala."},
        ],
        "section_servicio":  "OptimizaCRM es una plataforma SaaS de gestión de relaciones con clientes (CRM) con inteligencia artificial, diseñada para equipos de ventas de PYMEs en LATAM. El servicio incluye gestión de leads, pipeline de ventas, automatizaciones, comunicaciones multicanal y funcionalidades de IA.",
        "section_cuenta": [
            "Debes proporcionar información veraz y actualizada al registrarte.",
            "Eres responsable de mantener la confidencialidad de tus credenciales.",
            "Debes notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta.",
            "Una cuenta representa una organización. No puedes transferirla a terceros sin nuestro consentimiento.",
            "Debes ser mayor de 18 años o tener autorización de tu empresa para aceptar estos términos.",
        ],
        "section_pagos":     "Los precios vigentes se publican en /precios. Todos los planes de pago se facturan en USD por adelantado al inicio de cada período.",
        "section_reembolso": "Ofrecemos 14 días de prueba gratuita sin tarjeta de crédito. Una vez iniciada la suscripción de pago, no ofrecemos reembolsos por períodos ya facturados, salvo fallo técnico imputable a OptimizaCRM que impida el uso por más de 48 horas o cobro duplicado.",
        "section_uso_prohibido": [
            "Usar el servicio para actividades ilegales o fraudulentas.",
            "Enviar spam o comunicaciones no solicitadas a través de la plataforma.",
            "Intentar acceder a datos de otras organizaciones o vulnerar la seguridad.",
            "Realizar ingeniería inversa o copiar el software.",
            "Revender o sublicenciar el acceso sin autorización expresa.",
            "Sobrecargar la infraestructura (DDoS, scraping masivo, etc.).",
        ],
        "section_responsabilidad": [
            "Pérdidas de negocio o ingresos derivadas del uso o imposibilidad de uso del servicio.",
            "Decisiones de negocio tomadas basándose en las funcionalidades de IA.",
            "Daños indirectos, incidentales o consecuentes.",
        ],
        "legal_email":   "legal@optimizacrm.com",
        "support_email": "soporte@optimizacrm.com",
    },
}


class SiteContent(models.Model):
    SECTION_CHOICES = [
        ("hero",          "Inicio — Hero & Características"),
        ("pricing",       "Precios"),
        ("features_page", "Página de Características"),
        ("general",       "Configuración General"),
        ("nosotros",      "Nosotros"),
        ("contacto",      "Contacto"),
        ("privacidad",    "Política de Privacidad"),
        ("terminos",      "Términos y Condiciones"),
    ]

    key        = models.CharField(max_length=50, unique=True, choices=SECTION_CHOICES)
    data       = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="content_edits",
    )

    class Meta:
        db_table = "site_content"

    def __str__(self):
        return self.get_key_display()

    @classmethod
    def get_section(cls, key: str) -> dict:
        """Return stored content merged on top of defaults."""
        defaults = DEFAULT_CONTENT.get(key, {})
        try:
            stored = cls.objects.get(key=key).data
            return {**defaults, **stored}
        except cls.DoesNotExist:
            return defaults
