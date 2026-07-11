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
            {"title": "SaaS multicliente",           "description": "Multiusuarios empresarial con aislamiento completo de datos."},
            {"title": "Automatización",              "description": "Automatiza tareas repetitivas y céntrate en cerrar negocios."},
            {"title": "Seguridad Empresarial",       "description": "Cumplimiento con leyes de protección de datos en LATAM (LGPD, Ley 25.326, Ley 1581) y estándares internacionales como el RGPD, con cifrado de extremo a extremo."},
        ],
        "cta_section_headline": "¿Listo para transformar tus ventas?",
        "cta_section_text":     "Únete a los equipos de ventas que ya usan OptimizaCRM para cerrar más negocios.",
        "cta_section_button":   "Comenzar Gratis",
    },
    "pricing": {
        "badge":                    "Sin permanencia · Cancela cuando quieras",
        "headline":                 "Precios pensados para LATAM",
        "headline_highlight":       "LATAM",
        "headline_highlight_color": "orange",
        "subheadline":              "Gestiona leads, automatiza seguimientos y cierra más negocios. Precio fijo por organización, con IA integrable y 14 días de prueba gratis.",
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
    "servicios_whatsapp": {
        "hero": {
            "badge":              "Servicio de configuración profesional",
            "headline":           "WhatsApp Business API",
            "headline_highlight": "sin complicaciones",
            "subheadline":        "La configuración de Meta Business Suite puede ser engorrosa — verificaciones, documentos, tokens, webhooks... Nosotros lo hacemos por ti. Tu empresa lista en 48–72 horas.",
            "trust_strip": [
                {"icon": "Shield",        "text": "Garantía de devolución"},
                {"icon": "Clock",         "text": "48–72 h hábiles"},
                {"icon": "MessageCircle", "text": "Soporte durante el proceso"},
            ],
        },
        "price_card": {
            "label":   "Precio del servicio",
            "price":   199,
            "bullets": [
                "Setup completo de Meta Business Suite",
                "Webhook conectado a tu CRM",
                "Prueba funcional incluida",
                "Documentación entregada",
            ],
            "cta_label":    "Contratar ahora",
            "cta_loading":  "Redirigiendo…",
            "footer_text":  "¿Tienes dudas antes de contratar?",
            "footer_href":  "/contacto",
            "footer_label": "Escríbenos →",
        },
        "includes": [
            {
                "icon":  "Shield",
                "title": "Creación y verificación de Meta Business Suite",
                "desc":  "Te guiamos en la creación de tu cuenta empresarial y el proceso de verificación oficial con Meta.",
            },
            {
                "icon":  "Phone",
                "title": "Registro del número de teléfono",
                "desc":  "Configuramos el número dedicado a WhatsApp Business. El número no puede tener WhatsApp personal activo.",
            },
            {
                "icon":  "Key",
                "title": "Obtención de credenciales permanentes",
                "desc":  "Phone Number ID y Access Token de larga duración. Sin tokens temporales de 24h que caducan.",
            },
            {
                "icon":  "Webhook",
                "title": "Configuración del webhook con el CRM",
                "desc":  "Conectamos Meta con tu cuenta de OptimizaCRM para recibir y enviar mensajes en tiempo real.",
            },
            {
                "icon":  "TestTube",
                "title": "Prueba completa de envío y recepción",
                "desc":  "Verificamos que la integración funciona correctamente antes de darlo por finalizado.",
            },
            {
                "icon":  "FileText",
                "title": "Documentación para tu equipo",
                "desc":  "Recibes un resumen del proceso y los datos de configuración para tu referencia futura.",
            },
        ],
        "for_whom": {
            "headline":           "¿Para quién es",
            "headline_highlight": "este servicio?",
            "items": [
                "No tienes cuenta verificada en Meta Business Suite y no sabes por dónde empezar.",
                "Intentaste configurarlo y te perdiste entre apps, permisos y tokens de Meta.",
                "Prefieres que alguien lo haga bien desde el principio y dedicar tu tiempo al negocio.",
                "Tu equipo de ventas necesita WhatsApp integrado en el CRM cuanto antes.",
            ],
            "guarantee_title": "Garantía de resultado",
            "guarantee_text":  "Si al finalizar el servicio la integración de WhatsApp con tu CRM no está funcionando, te devolvemos el importe íntegro. Sin preguntas, sin burocracia.",
            "guarantee_note":  "¿Ya tienes OptimizaCRM? Escríbenos por el chat y empezamos hoy.",
        },
        "faqs": [
            {
                "q": "¿Qué necesito tener antes de contratar?",
                "a": "Un número de teléfono que NO tenga WhatsApp instalado (puede ser un número nuevo o una línea fija). Si ya usas ese número con WhatsApp personal, habría que desvincularlo primero.",
            },
            {
                "q": "¿Cuánto tarda el proceso?",
                "a": "Entre 48 y 72 horas hábiles desde que recibes la confirmación de pago. La verificación de Meta puede tomar más tiempo si hay documentación pendiente — en ese caso te acompañamos hasta completarla.",
            },
            {
                "q": "¿Qué pasa si Meta rechaza la verificación de mi empresa?",
                "a": "Es poco frecuente si la documentación está en orden. Si ocurre, te indicamos exactamente qué se necesita y lo reintentamos sin coste adicional. Si finalmente no es posible completarlo, te devolvemos el importe íntegro.",
            },
            {
                "q": "¿Necesito tener ya una cuenta en OptimizaCRM?",
                "a": "Sí, la integración final se realiza sobre tu cuenta activa del CRM. Si aún no tienes una, puedes iniciar la prueba gratuita de 14 días antes de contratar este servicio.",
            },
            {
                "q": "¿Incluye el número de teléfono?",
                "a": "No. El número debe ser tuyo (puede ser una línea móvil nueva o un número fijo). Nosotros nos encargamos de registrarlo y configurarlo en Meta Business.",
            },
            {
                "q": "¿Qué ocurre después de la configuración?",
                "a": "Tu equipo podrá gestionar conversaciones de WhatsApp directamente desde la bandeja unificada del CRM. Si en el futuro necesitas cambiar algo, el proceso queda documentado.",
            },
        ],
        "cta": {
            "headline":       "Tu equipo en WhatsApp\nen menos de 72 horas",
            "subheadline":    "Pago único. Sin suscripción. Sin sorpresas.",
            "secondary_label": "Tengo una pregunta",
            "secondary_href":  "/contacto",
        },
    },
    "servicios_implementacion": {
        "hero": {
            "badge":        "Servicios de implementación",
            "headline":           "La diferencia entre instalar un CRM y",
            "headline_highlight": "adoptarlo de verdad.",
            "subheadline":  "Configuramos OptimizaCRM a medida de tu negocio para que tu equipo empiece a vender más desde el primer día — sin curvas de aprendizaje largas ni frustraciones técnicas.",
            "cta_primary":      "Ver planes",
            "cta_primary_href": "#planes",
            "cta_secondary":      "Hablar con el equipo",
            "cta_secondary_href": "/contacto",
        },
        "why_cards": [
            {
                "icon": "TrendingUp",
                "title": "El 70% de los CRM fracasan",
                "desc":  "No por el software — sino por una implementación deficiente o nula. La configuración inicial marca la diferencia.",
            },
            {
                "icon": "Clock",
                "title": "Semanas de diferencia",
                "desc":  "Un equipo que arranca bien desde el principio tarda semanas menos en ver resultados que uno que aprende solo.",
            },
            {
                "icon": "Users",
                "title": "Adopción real del equipo",
                "desc":  "Cuando la herramienta está adaptada a tus procesos, tu equipo la usa. Cuando no, acaba siendo un gasto más.",
            },
        ],
        "tiers": [
            {
                "key":     "arranque",
                "name":    "Arranque",
                "tagline": "Para equipos pequeños que quieren empezar bien desde el primer día.",
                "price":   499,
                "days":    "7 días hábiles",
                "popular": False,
                "cta":     "Empezar con Arranque",
                "features": [
                    {"text": "Configuración completa de la cuenta y organización",         "highlight": False},
                    {"text": "Alta de hasta 2 usuarios con roles definidos",               "highlight": False},
                    {"text": "2 embudos de venta (pipelines) personalizados",              "highlight": False},
                    {"text": "Integración de WhatsApp Business o Email (uno a elección)",  "highlight": True},
                    {"text": "Importación de hasta 500 contactos / leads",                 "highlight": False},
                    {"text": "3 plantillas de mensajes personalizadas",                    "highlight": False},
                    {"text": "Sesión de capacitación inicial (2 h)",                       "highlight": True},
                    {"text": "Guía de uso para tu equipo",                                 "highlight": False},
                ],
            },
            {
                "key":     "impulso",
                "name":    "Impulso",
                "tagline": "Para equipos que ya saben lo que quieren y necesitan más potencia desde el arranque.",
                "price":   999,
                "days":    "14 días hábiles",
                "popular": True,
                "cta":     "Empezar con Impulso",
                "features": [
                    {"text": "Todo lo del plan Arranque",                                  "highlight": False},
                    {"text": "Hasta 6 usuarios configurados con permisos a medida",        "highlight": False},
                    {"text": "Hasta 5 pipelines con etapas y criterios personalizados",    "highlight": False},
                    {"text": "WhatsApp + Email integrados",                                "highlight": True},
                    {"text": "Hasta 5 automatizaciones (seguimiento, tareas, alertas)",   "highlight": True},
                    {"text": "Lead Scoring IA activado y calibrado a tu negocio",          "highlight": True},
                    {"text": "Importación de hasta 3.000 contactos con limpieza básica",  "highlight": False},
                    {"text": "Dashboard y reportes configurados",                           "highlight": False},
                    {"text": "2 sesiones de seguimiento (30 días post-lanzamiento)",       "highlight": True},
                ],
            },
            {
                "key":     "escala",
                "name":    "Escala",
                "tagline": "Para empresas con procesos complejos que necesitan una implementación a su medida.",
                "price":   None,
                "days":    "A convenir",
                "popular": False,
                "cta":     "Solicitar propuesta",
                "features": [
                    {"text": "Todo lo del plan Impulso",                                   "highlight": False},
                    {"text": "Usuarios ilimitados según plan contratado",                  "highlight": False},
                    {"text": "Múltiples pipelines y flujos de trabajo complejos",          "highlight": False},
                    {"text": "Automatizaciones avanzadas a medida",                        "highlight": True},
                    {"text": "Migración completa desde CRM anterior",                      "highlight": True},
                    {"text": "Integraciones personalizadas (ERP, e-commerce, etc.)",      "highlight": False},
                    {"text": "Capacitación por equipos y departamentos",                   "highlight": False},
                    {"text": "Acompañamiento de adopción 60 días",                        "highlight": True},
                    {"text": "Soporte prioritario con SLA definido",                       "highlight": False},
                ],
            },
        ],
        "steps": [
            {
                "icon":  "CalendarCheck",
                "title": "1. Reservas tu servicio",
                "desc":  "Eliges el nivel, completas el pago y recibes confirmación con el enlace para agendar la sesión de inicio.",
            },
            {
                "icon":  "Settings",
                "title": "2. Sesión de kickoff",
                "desc":  "Entendemos tu negocio, tus procesos de venta y los objetivos que quieres alcanzar con el CRM.",
            },
            {
                "icon":  "Rocket",
                "title": "3. Implementación",
                "desc":  "Configuramos todo según lo acordado. Tú trabajas tranquilo mientras nosotros preparamos tu CRM.",
            },
            {
                "icon":  "CheckCircle",
                "title": "4. Entrega y capacitación",
                "desc":  "Revisamos juntos todo lo implementado, formamos a tu equipo y resolvemos cualquier ajuste final.",
            },
        ],
        "comparison": [
            {"item": "Usuarios configurados",           "arranque": "Hasta 2",   "impulso": "Hasta 6",                          "escala": "Ilimitados"},
            {"item": "Pipelines",                       "arranque": "2",         "impulso": "5",                                "escala": "A medida"},
            {"item": "Importación de contactos",        "arranque": "500",       "impulso": "3.000",                            "escala": "Completa"},
            {"item": "Automatizaciones",                "arranque": "—",         "impulso": "5",                                "escala": "A medida"},
            {"item": "Lead Scoring IA",                 "arranque": "—",         "impulso": "✓",                                "escala": "✓"},
            {"item": "WhatsApp + Email integrados",     "arranque": "Uno",       "impulso": "Ambos",                            "escala": "Ambos"},
            {"item": "Plantillas de mensajes",          "arranque": "3",         "impulso": "Incluidas en automatizaciones",    "escala": "A medida"},
            {"item": "Dashboard y reportes",            "arranque": "Base",      "impulso": "Personalizado",                    "escala": "Avanzado"},
            {"item": "Migración desde otro CRM",        "arranque": "—",         "impulso": "Básica",                           "escala": "Completa"},
            {"item": "Sesiones de seguimiento",         "arranque": "1 (kickoff)", "impulso": "3",                              "escala": "Continuo"},
            {"item": "Acompañamiento post-lanzamiento", "arranque": "—",         "impulso": "30 días",                          "escala": "60 días"},
            {"item": "Plazo de entrega",                "arranque": "5 días",    "impulso": "10 días",                          "escala": "A convenir"},
        ],
        "faqs": [
            {
                "q": "¿Necesito tener ya un plan de OptimizaCRM para contratar la implementación?",
                "a": "No es obligatorio contratarlo antes, pero sí necesitas tenerlo activo para que podamos configurar tu cuenta. Puedes iniciar la prueba gratuita de 14 días y contratar la implementación a la vez — los días de prueba no corren hasta que tú lo actives.",
            },
            {
                "q": "¿Qué pasa si mi equipo tiene más usuarios de los incluidos en el nivel?",
                "a": "El número de usuarios que configuramos es el del servicio contratado. Si tienes más, puedes subir al nivel Impulso o Escala, o contratar usuarios adicionales en tu plan. Lo discutimos en el kickoff y buscamos la mejor opción para ti.",
            },
            {
                "q": "¿Puedo combinar Arranque ahora y subir a Impulso después?",
                "a": "Sí. Si ya completaste el Arranque y quieres ampliar, te hacemos un precio de diferencia — no pagas de cero otra vez. El trabajo ya hecho cuenta.",
            },
            {
                "q": "¿Qué necesito preparar antes del kickoff?",
                "a": "Idealmente: una lista de tus clientes/leads en Excel o CSV, las etapas de tu proceso de venta y acceso al número de teléfono para WhatsApp. No es imprescindible tenerlo todo perfecto — en el kickoff lo organizamos juntos.",
            },
            {
                "q": "¿Los 7 días / 14 días son garantizados?",
                "a": "Son los plazos estándar bajo condiciones normales. Si hay retrasos por factores externos (verificación de Meta, accesos pendientes por tu parte, etc.) te avisamos de inmediato y ajustamos el calendario.",
            },
            {
                "q": "¿Qué garantía tienen?",
                "a": "Si al finalizar la implementación algo no funciona como acordamos en el kickoff, lo corregimos sin coste adicional. Nuestro objetivo es que tu equipo esté operativo y usando el CRM desde el primer día.",
            },
        ],
        "cta": {
            "headline":    "Tu equipo operativo esta misma semana.",
            "subheadline": "Reserva tu implementación hoy y en 7 días hábiles tienes el CRM configurado, tu equipo formado y listo para cerrar más ventas.",
            "primary_label": "Empezar con Impulso",
            "primary_href":  "/contacto?servicio=impulso",
            "secondary_label": "Tengo dudas, hablemos",
            "secondary_href":  "/contacto",
        },
        "trust_strip": [
            {"icon": "Shield",        "text": "Garantía de entrega"},
            {"icon": "MessageCircle", "text": "Soporte en español"},
            {"icon": "Globe",         "text": "Servicio remoto en LATAM"},
            {"icon": "Zap",           "text": "Sin permanencia adicional"},
        ],
    },
    "servicios_implementacion_voz": {
        "hero": {
            "badge":              "Servicio de configuración profesional",
            "headline":           "Tu Agente de Voz IA",
            "headline_highlight": "listo en 48 horas",
            "subheadline":        "Configuramos tu agente desde cero — base de conocimiento, flujos de calificación, voz personalizada e integración con tu CRM. Tú solo tienes que encenderlo.",
            "cta_primary":        "Ver planes",
            "cta_primary_href":   "#planes",
            "cta_secondary":      "Hablar con el equipo",
            "cta_secondary_href": "/contacto",
            "trust_strip": [
                {"icon": "Shield",        "text": "Garantía de funcionamiento"},
                {"icon": "Clock",         "text": "48–72 h hábiles"},
                {"icon": "MessageCircle", "text": "Soporte en español"},
            ],
        },
        "tiers": [
            {
                "key":     "starter",
                "name":    "Setup Starter",
                "tagline": "Para empresas que quieren un agente operativo rápido con lo esencial configurado.",
                "price":   299,
                "days":    "48 horas hábiles",
                "popular": False,
                "cta":     "Contratar Setup Starter",
                "features": [
                    {"text": "Configuración completa de 1 agente de voz",           "highlight": False},
                    {"text": "Base de conocimiento desde tu web o documento",        "highlight": True},
                    {"text": "Saludo, despedida y flujo de conversación inicial",    "highlight": False},
                    {"text": "Hasta 5 preguntas de calificación de leads",           "highlight": False},
                    {"text": "Integración con CRM (captura de leads automática)",   "highlight": True},
                    {"text": "Prueba funcional y ajuste fino",                       "highlight": False},
                    {"text": "Documentación de configuración entregada",             "highlight": False},
                ],
            },
            {
                "key":     "pro",
                "name":    "Setup Pro",
                "tagline": "Para equipos que necesitan múltiples agentes, flujos avanzados y una experiencia de marca.",
                "price":   599,
                "days":    "5 días hábiles",
                "popular": True,
                "cta":     "Contratar Setup Pro",
                "features": [
                    {"text": "Todo lo del Setup Starter",                                      "highlight": False},
                    {"text": "Hasta 3 agentes configurados",                                   "highlight": True},
                    {"text": "Múltiples bases de conocimiento (por producto, área o idioma)", "highlight": False},
                    {"text": "Flujos de calificación avanzados a medida de tu negocio",       "highlight": True},
                    {"text": "Escalado automático a humano vía WhatsApp configurado",         "highlight": True},
                    {"text": "Agenda de citas integrada con tu calendario",                    "highlight": False},
                    {"text": "1 sesión de ajuste post-lanzamiento (15 días)",                  "highlight": True},
                ],
            },
            {
                "key":     "enterprise",
                "name":    "Setup Enterprise",
                "tagline": "Para empresas con múltiples departamentos, flujos complejos o más de 3 agentes activos.",
                "price":   None,
                "days":    "A convenir",
                "popular": False,
                "cta":     "Solicitar propuesta",
                "features": [
                    {"text": "Todo lo del Setup Pro",                                          "highlight": False},
                    {"text": "Agentes ilimitados según plan contratado",                       "highlight": False},
                    {"text": "Voz personalizada de marca",                                     "highlight": True},
                    {"text": "Flujos multi-departamento y multi-idioma",                       "highlight": False},
                    {"text": "Integraciones avanzadas (ERP, e-commerce, sistema propio)",     "highlight": True},
                    {"text": "Capacitación al equipo operativo",                               "highlight": False},
                    {"text": "Acompañamiento de adopción 30 días",                            "highlight": True},
                    {"text": "Soporte prioritario con SLA definido",                           "highlight": False},
                ],
            },
        ],
        "includes": [
            {"icon": "Mic",        "title": "Configuración del agente", "desc": "Nombre, personalidad, saludo, despedida y tono de voz. El agente suena como parte de tu equipo, no como un robot genérico."},
            {"icon": "Brain",      "title": "Base de conocimiento",     "desc": "Importamos la información de tu empresa desde tu web, PDFs o documentos. El agente responde solo con lo que tú le enseñas."},
            {"icon": "Target",     "title": "Flujo de calificación",    "desc": "Configuramos las preguntas clave para identificar leads de calidad y filtrar consultas que no aplican."},
            {"icon": "Plug",       "title": "Integración al CRM",       "desc": "Cada conversación genera un lead automático con nombre, contacto, motivo y resumen de la llamada directo a tu pipeline."},
            {"icon": "Calendar",   "title": "Agenda de citas",          "desc": "Si tu flujo incluye agendar, conectamos el agente con tu calendario para que las citas se registren sin intervención humana."},
            {"icon": "TestTube",   "title": "Prueba y ajuste fino",     "desc": "Probamos el agente con llamadas reales antes de activarlo. Si algo no suena bien, lo ajustamos hasta que quede perfecto."},
        ],
        "faqs": [
            {"q": "¿Necesito tener ya un plan de Agente de Voz IA activo?", "a": "Sí, la configuración se realiza sobre tu cuenta activa. Puedes iniciar la prueba gratuita de 14 días y contratar el setup simultáneamente — los días de trial no corren hasta que actives el agente."},
            {"q": "¿Cuánto tarda el proceso?", "a": "El Setup Starter está listo en 48 horas hábiles. El Setup Pro en 5 días hábiles. Para Enterprise el plazo lo acordamos en el kickoff según la complejidad."},
            {"q": "¿Qué necesito preparar antes de empezar?", "a": "Idealmente: información de tu empresa (web, PDF, documento Word), las preguntas clave que quieres que haga el agente y acceso al calendario si quieres agenda automática. Si no tienes todo perfecto, lo construimos juntos en el kickoff."},
            {"q": "¿El agente puede atender en varios idiomas?", "a": "Sí, en el Setup Enterprise configuramos agentes multi-idioma. Para Starter y Pro el agente se configura en un idioma principal (español latinoamericano por defecto)."},
            {"q": "¿Qué garantía tienen?", "a": "Si al finalizar el setup el agente no responde correctamente según lo acordado, lo ajustamos sin coste adicional hasta que funcione como se espera."},
        ],
        "cta": {
            "headline":       "Tu agente de voz operativo esta misma semana.",
            "subheadline":    "Configúralo hoy y empieza a capturar leads desde el primer día — sin que tu equipo intervenga.",
            "primary_label":  "Contratar Setup Pro",
            "primary_href":   "/contacto?servicio=voz-pro",
            "secondary_label": "Tengo dudas, hablemos",
            "secondary_href":  "/contacto",
        },
        "trust_strip": [
            {"icon": "Shield",        "text": "Garantía de funcionamiento"},
            {"icon": "MessageCircle", "text": "Soporte en español"},
            {"icon": "Globe",         "text": "Servicio remoto en LATAM"},
            {"icon": "Zap",           "text": "Sin permanencia adicional"},
        ],
    },
    "voz_ia": {
        "hero_badge":      "Agente de Voz IA — disponible ahora",
        "hero_headline":   "Tu recepcionista con IA que nunca descansa",
        "hero_subheadline": (
            "Atiende llamadas, califica leads y agenda citas en automático las 24 horas. "
            "En español natural. Sin fricción. Integrado directo a tu CRM."
        ),
        "cta_primary_text":    "Probar gratis 14 días",
        "cta_primary_href":    "/register",
        "cta_secondary_text":  "Ver demo en vivo",
        "trial_note":          "Sin tarjeta de crédito · 1 agente + 100 min incluidos en el trial",
        "pricing_badge":       "Planes de Voz IA",
        "pricing_headline":    "Precio fijo, sin sorpresas",
        "pricing_subheadline": "Minutos extra: $0.08–0.10/min según plan. Sin contratos anuales obligatorios.",
        "annual_discount_pct": 20,
        "roi_human_salary":    "$519/mes",
        "roi_human_benefits":  "$200/mes",
        "roi_human_vacation":  "$100/mes",
        "roi_human_total":     "~$820/mes",
        "roi_multiplier":      "16×",
    },
    "guatemala": {
        "hero_badge":          "Diseñado para empresas en Guatemala",
        "hero_headline":       "CRM con Inteligencia Artificial para Guatemala",
        "hero_subheadline":    (
            "Gestiona leads, WhatsApp y tu pipeline de ventas con IA. "
            "Agente de voz 24/7 en español. Factura Electrónica FEL incluida. "
            "La herramienta que las PYMEs guatemaltecas necesitaban."
        ),
        "trust_signals": [
            "14 días gratis",
            "Sin tarjeta de crédito",
            "FEL para la SAT de Guatemala",
            "Soporte en español",
        ],
        "cta_primary_text":    "Empezar gratis — 14 días",
        "cta_primary_href":    "/register",
        "cta_secondary_text":  "Ver precios →",
        "cta_secondary_href":  "/precios",
        # Intro
        "intro_headline": "El CRM con IA que entiende el mercado guatemalteco",
        "intro_text": (
            "La mayoría de los CRM en el mercado están diseñados para EE.UU. o España. "
            "OptimizaCRM nació para Centroamérica y LATAM: precios en USD accesibles para PYMEs, "
            "soporte en español de Guatemala, integración con WhatsApp (el canal #1 de comunicación "
            "empresarial en el país) y facturación FEL nativa."
        ),
        # Sección CRM
        "crm_badge":       "CRM con IA · WhatsApp · Guatemala",
        "crm_headline":    "Todo lo que necesitas para vender más en Guatemala",
        "crm_subheadline": "Desde el primer contacto en WhatsApp hasta la factura FEL, sin salir de una sola plataforma.",
        # Sección WhatsApp
        "whatsapp_headline": "WhatsApp es el canal #1 en Guatemala. Úsalo en tu CRM.",
        "whatsapp_text": (
            "Tus clientes ya están en WhatsApp. Con OptimizaCRM, cada mensaje llega a un inbox "
            "centralizado, se vincula al lead correspondiente y queda en el historial del CRM. "
            "Sin cambiar entre apps."
        ),
        "whatsapp_features": [
            "Responde desde el CRM sin abrir el celular",
            "Historial completo de conversaciones por cliente",
            "Automatiza respuestas a preguntas frecuentes",
            "Notifica a tu equipo cuando llega un lead nuevo",
            "El agente de voz IA transfiere a WhatsApp cuando necesitas escalación humana",
        ],
        # Sección Agente de Voz
        "voz_badge":       "Agente de Voz IA · Guatemala",
        "voz_headline":    "Tu recepcionista con inteligencia artificial que nunca duerme",
        "voz_subheadline": (
            "Atiende llamadas, califica leads y agenda citas automáticamente, 24 horas al día. "
            "En español natural, sin que tus clientes noten la diferencia."
        ),
        # Sección FEL
        "fel_headline": "Factura Electrónica FEL incluida en todos los planes para Guatemala",
        "fel_text": (
            "OptimizaCRM emite Facturas Electrónicas en Línea (FEL) que cumplen con los "
            "requisitos de la SAT (Superintendencia de Administración Tributaria) de Guatemala. "
            "Tus clientes reciben su factura automáticamente al cerrar una venta. "
            "Sin sistemas externos, sin integraciones adicionales, sin costo extra."
        ),
        "fel_badges": [
            "Régimen General SAT",
            "FEL conforme Acuerdo 49-2018",
            "Envío automático al cliente",
        ],
        # FAQs
        "faqs": [
            {
                "q": "¿Qué es un CRM con inteligencia artificial para Guatemala?",
                "a": "Un CRM con IA es un software de gestión de clientes que usa inteligencia artificial para calificar leads automáticamente, predecir qué contactos tienen más probabilidad de cerrar y automatizar seguimientos. OptimizaCRM está diseñado para el mercado guatemalteco: emite FEL, soporta tu equipo en español y tiene precios accesibles para PYMEs.",
            },
            {
                "q": "¿El CRM se integra con WhatsApp en Guatemala?",
                "a": "Sí. OptimizaCRM incluye un inbox multicanal con WhatsApp Business integrado. Recibe, responde y gestiona conversaciones de WhatsApp directamente desde el CRM, con historial vinculado a cada lead o cliente. Sin cambiar entre apps.",
            },
            {
                "q": "¿Qué es un agente de voz con IA y para qué sirve?",
                "a": "Es una recepcionista virtual que atiende llamadas automáticamente, 24/7. Habla en español natural, responde preguntas sobre tu empresa, califica leads y agenda citas. Ideal para empresas guatemaltecas que no quieren perder llamadas fuera de horario.",
            },
            {
                "q": "¿OptimizaCRM emite Factura Electrónica FEL?",
                "a": "Sí. Todos los planes incluyen emisión de FEL para clientes en Guatemala, cumpliendo los requisitos de la SAT. No necesitas un sistema externo de facturación.",
            },
            {
                "q": "¿Cuánto cuesta el CRM con IA en Guatemala?",
                "a": "Los planes inician desde $19 USD/mes por organización (no por usuario). Incluye CRM completo con IA, WhatsApp integrado y FEL. El agente de voz IA está disponible desde $149 USD/mes adicionales. 14 días de prueba gratis, sin tarjeta de crédito.",
            },
            {
                "q": "¿El agente de voz entiende el español guatemalteco?",
                "a": "Sí. El agente está optimizado para el español latinoamericano, incluyendo el acento y vocabulario guatemalteco. Responde de forma natural y contextual.",
            },
            {
                "q": "¿Puedo probar el CRM gratis en Guatemala?",
                "a": "Sí. 14 días de prueba gratuita sin tarjeta de crédito. Incluye acceso completo al CRM, pipeline, WhatsApp, lead scoring con IA y 100 minutos del agente de voz.",
            },
        ],
        # CTA final
        "cta_final_headline":       "Empieza a vender más con IA hoy mismo",
        "cta_final_subheadline":    "14 días gratis. Sin tarjeta de crédito. CRM + WhatsApp + Agente de Voz IA + FEL.",
        "cta_final_primary_text":   "Crear cuenta gratis",
        "cta_final_primary_href":   "/register",
        "cta_final_secondary_text": "Hablar con el equipo",
        "cta_final_secondary_href": "/contacto",
        "cta_final_note":           "¿Preguntas? Escríbenos por WhatsApp o al formulario de contacto. Respuesta en menos de 24 h.",
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

    # ── Landing page activation toggles ──────────────────────────────────────
    "landings_config": {
        "voz_ia":                    True,
        "guatemala":                 True,
        "servicios_whatsapp":        True,
        "servicios_implementacion":  True,
        "servicios_implementacion_voz": True,
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
        ("privacidad",                "Política de Privacidad"),
        ("terminos",                  "Términos y Condiciones"),
        ("servicios_whatsapp",             "Servicios — Setup WhatsApp Business"),
        ("servicios_implementacion",       "Servicios — Implementación CRM"),
        ("servicios_implementacion_voz",   "Servicios — Setup Agente de Voz IA"),
        ("voz_ia",                         "Agente de Voz IA — Landing"),
        ("guatemala",                      "CRM para Guatemala — Landing"),
        ("landings_config",                "Activación de Landings"),
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
