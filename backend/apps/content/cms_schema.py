"""
OptimizaCRM — CMS field schema
Define cómo se renderiza cada sección en el editor de Contenido Web del admin.
"""

SECTIONS = [
    {
        "key":   "hero",
        "label": "Inicio",
        "desc":  "Hero, CTAs y tarjetas de la página principal",
        "icon":  "home",
        "groups": [
            {
                "label": None,
                "cols":  2,
                "fields": [
                    {"key": "badge",             "label": "Badge",                  "hint": "Texto pequeño sobre el titular",          "type": "text",     "col": 1},
                    {"key": "cta_primary",       "label": "CTA principal — texto",  "hint": "",                                        "type": "text",     "col": 1},
                    {"key": "headline",          "label": "Titular principal (H1)", "hint": "",                                        "type": "text",     "col": 2},
                    {"key": "subheadline",       "label": "Subtítulo",              "hint": "",                                        "type": "textarea", "col": 2},
                    {"key": "cta_primary_href",  "label": "CTA principal — enlace", "hint": "",                                        "type": "text",     "col": 1},
                    {"key": "cta_secondary",     "label": "CTA secundario — texto", "hint": "",                                        "type": "text",     "col": 1},
                    {"key": "cta_secondary_href","label": "CTA secundario — enlace","hint": "",                                        "type": "text",     "col": 2},
                    {"key": "trust_signals",     "label": "Señales de confianza",   "hint": 'Array JSON — ej. ["Sin tarjeta de crédito", "14 días gratis"]', "type": "json", "col": 2},
                ],
            },
            {
                "label": "SECCIÓN DE CARACTERÍSTICAS",
                "cols":  1,
                "fields": [
                    {"key": "features_headline",    "label": "Título de la sección",           "hint": "",                                          "type": "text",     "col": 1},
                    {"key": "features_subheadline", "label": "Subtítulo de la sección",        "hint": "",                                          "type": "textarea", "col": 1},
                    {"key": "feature_cards",        "label": "Tarjetas de características",    "hint": "Array JSON — objetos {title, description}", "type": "json",     "col": 1},
                ],
            },
            {
                "label": "BANNER CTA INFERIOR",
                "cols":  1,
                "fields": [
                    {"key": "cta_section_headline", "label": "Título",           "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_section_text",     "label": "Texto",            "hint": "", "type": "textarea", "col": 1},
                    {"key": "cta_section_button",   "label": "Texto del botón",  "hint": "", "type": "text",     "col": 1},
                ],
            },
        ],
    },
    {
        "key":   "pricing",
        "label": "Precios",
        "desc":  "Hero, titular y subtítulo de la sección de precios",
        "icon":  "payments",
        "groups": [
            {
                "label": None,
                "cols":  1,
                "fields": [
                    {"key": "badge",       "label": "Badge",     "hint": "Texto pequeño sobre el titular (ej. Sin permanencia · Cancela cuando quieras)", "type": "text",     "col": 1},
                    {"key": "headline",    "label": "Titular",   "hint": "",                                                                              "type": "text",     "col": 1},
                    {"key": "subheadline", "label": "Subtítulo", "hint": "",                                                                              "type": "textarea", "col": 1},
                ],
            },
        ],
    },
    {
        "key":   "features_page",
        "label": "Características",
        "desc":  "Módulos y funciones de /features",
        "icon":  "grid_view",
        "groups": [
            {
                "label": None,
                "cols":  1,
                "fields": [
                    {"key": "headline",    "label": "Titular",   "hint": "", "type": "text",     "col": 1},
                    {"key": "subheadline", "label": "Subtítulo", "hint": "", "type": "textarea", "col": 1},
                    {"key": "modules",     "label": "Módulos",   "hint": "Array JSON — objetos {title, items[]}", "type": "json", "col": 1},
                ],
            },
        ],
    },
    {
        "key":   "general",
        "label": "General",
        "desc":  "Configuración general del sitio",
        "icon":  "settings",
        "groups": [
            {
                "label": None,
                "cols":  2,
                "fields": [
                    {"key": "site_name",       "label": "Nombre del sitio",  "hint": "", "type": "text", "col": 1},
                    {"key": "tagline",         "label": "Tagline",           "hint": "", "type": "text", "col": 1},
                    {"key": "contact_email",   "label": "Email de contacto", "hint": "", "type": "text", "col": 1},
                    {"key": "support_email",   "label": "Email de soporte",  "hint": "", "type": "text", "col": 1},
                    {"key": "social_twitter",  "label": "Twitter / X URL",   "hint": "", "type": "text", "col": 1},
                    {"key": "social_linkedin", "label": "LinkedIn URL",      "hint": "", "type": "text", "col": 1},
                ],
            },
        ],
    },
    {
        "key":   "nosotros",
        "label": "Nosotros",
        "desc":  "Página Sobre Nosotros — historia y equipo",
        "icon":  "groups",
        "groups": [
            {
                "label": None,
                "cols":  2,
                "fields": [
                    {"key": "badge",       "label": "Badge",          "hint": "Texto pequeño sobre el titular",        "type": "text",     "col": 1},
                    {"key": "headline",    "label": "Titular (H1)",   "hint": "",                                      "type": "text",     "col": 2},
                    {"key": "subheadline", "label": "Subtítulo",      "hint": "",                                      "type": "textarea", "col": 2},
                ],
            },
            {
                "label": "CITA DESTACADA",
                "cols":  2,
                "fields": [
                    {"key": "quote_text",   "label": "Cita",           "hint": "",  "type": "textarea", "col": 2},
                    {"key": "quote_author", "label": "Autor",           "hint": "",  "type": "text",     "col": 1},
                    {"key": "quote_role",   "label": "Cargo del autor", "hint": "",  "type": "text",     "col": 1},
                ],
            },
            {
                "label": "MISIÓN",
                "cols":  2,
                "fields": [
                    {"key": "mission_label",       "label": "Etiqueta",    "hint": "",                                         "type": "text",     "col": 1},
                    {"key": "mission_headline",    "label": "Titular",     "hint": "",                                         "type": "text",     "col": 2},
                    {"key": "mission_subheadline", "label": "Subtítulo",   "hint": "",                                         "type": "textarea", "col": 2},
                    {"key": "mission_stats",       "label": "Estadísticas","hint": "Array JSON — objetos {value, label}",      "type": "json",     "col": 2},
                ],
            },
            {
                "label": "VALORES",
                "cols":  1,
                "fields": [
                    {"key": "values_label",    "label": "Etiqueta de sección", "hint": "",                                              "type": "text", "col": 1},
                    {"key": "values_headline", "label": "Titular",             "hint": "",                                              "type": "text", "col": 1},
                    {"key": "values",          "label": "Valores",             "hint": "Array JSON — objetos {title, description}",     "type": "json", "col": 1},
                ],
            },
            {
                "label": "FUNDADOR",
                "cols":  2,
                "fields": [
                    {"key": "founder_name",  "label": "Nombre",           "hint": "",                                   "type": "text", "col": 1},
                    {"key": "founder_role",  "label": "Cargo",            "hint": "",                                   "type": "text", "col": 1},
                    {"key": "founder_bio",   "label": "Biografía",        "hint": "Array JSON de párrafos de texto",    "type": "json", "col": 2},
                    {"key": "founder_stack", "label": "Stack tecnológico","hint": 'Array JSON — ej. ["Next.js 15", "Django 5"]', "type": "json", "col": 2},
                ],
            },
            {
                "label": "HITOS",
                "cols":  1,
                "fields": [
                    {"key": "milestones", "label": "Hitos", "hint": "Array JSON — objetos {year, label, detail}", "type": "json", "col": 1},
                ],
            },
            {
                "label": "CTA FINAL",
                "cols":  2,
                "fields": [
                    {"key": "cta_headline",       "label": "Titular CTA",             "hint": "", "type": "text",     "col": 2},
                    {"key": "cta_text",           "label": "Texto CTA",               "hint": "", "type": "textarea", "col": 2},
                    {"key": "cta_primary",        "label": "CTA principal — texto",   "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_primary_href",   "label": "CTA principal — enlace",  "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_secondary",      "label": "CTA secundario — texto",  "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_secondary_href", "label": "CTA secundario — enlace", "hint": "", "type": "text",     "col": 1},
                ],
            },
        ],
    },
    {
        "key":   "contacto",
        "label": "Contacto",
        "desc":  "Página de contacto — canales y FAQ",
        "icon":  "mail",
        "groups": [
            {
                "label": None,
                "cols":  2,
                "fields": [
                    {"key": "badge",       "label": "Badge",      "hint": "", "type": "text",     "col": 1},
                    {"key": "headline",    "label": "Titular H1", "hint": "", "type": "text",     "col": 2},
                    {"key": "subheadline", "label": "Subtítulo",  "hint": "", "type": "textarea", "col": 2},
                ],
            },
            {
                "label": "CANALES DE CONTACTO",
                "cols":  2,
                "fields": [
                    {"key": "email",            "label": "Email directo",      "hint": "",                                "type": "text", "col": 1},
                    {"key": "email_detail",     "label": "Email — detalle",    "hint": "ej. Respuesta en menos de 24 h", "type": "text", "col": 1},
                    {"key": "whatsapp",         "label": "WhatsApp — número",  "hint": "ej. +502 XXXX XXXX",            "type": "text", "col": 1},
                    {"key": "whatsapp_href",    "label": "WhatsApp — enlace",  "hint": "ej. https://wa.me/502XXXXXXXX", "type": "text", "col": 1},
                    {"key": "whatsapp_detail",  "label": "WhatsApp — horario", "hint": "ej. Lunes a viernes · 9h–18h", "type": "text", "col": 1},
                    {"key": "response_time",    "label": "Tiempo de respuesta","hint": "ej. < 24 horas",               "type": "text", "col": 1},
                ],
            },
            {
                "label": "FORMULARIO",
                "cols":  2,
                "fields": [
                    {"key": "form_headline",     "label": "Título del formulario",  "hint": "",                                                                  "type": "text",     "col": 1},
                    {"key": "form_subtext",      "label": "Subtexto",               "hint": "",                                                                  "type": "text",     "col": 1},
                    {"key": "contact_reasons",   "label": "Razones de contacto",    "hint": 'Array JSON — ej. ["Quiero una demo", "Tengo dudas sobre precios"]', "type": "json",     "col": 2},
                ],
            },
            {
                "label": "PREGUNTAS FRECUENTES",
                "cols":  1,
                "fields": [
                    {"key": "faq_headline", "label": "Título FAQ", "hint": "",                                  "type": "text", "col": 1},
                    {"key": "faqs",         "label": "FAQs",       "hint": "Array JSON — objetos {q, a}",      "type": "json", "col": 1},
                ],
            },
            {
                "label": "DEMO CTA",
                "cols":  2,
                "fields": [
                    {"key": "demo_headline",  "label": "Titular demo",    "hint": "", "type": "text",     "col": 2},
                    {"key": "demo_text",      "label": "Texto demo",      "hint": "", "type": "textarea", "col": 2},
                    {"key": "demo_cta_text",  "label": "Texto del botón", "hint": "", "type": "text",     "col": 1},
                    {"key": "demo_cta_href",  "label": "Enlace del botón","hint": "", "type": "text",     "col": 1},
                ],
            },
        ],
    },
    {
        "key":   "privacidad",
        "label": "Privacidad",
        "desc":  "Política de privacidad",
        "icon":  "privacy_tip",
        "groups": [
            {
                "label": None,
                "cols":  2,
                "fields": [
                    {"key": "headline",         "label": "Titular",                 "hint": "",                               "type": "text",     "col": 1},
                    {"key": "last_updated",     "label": "Última actualización",    "hint": "ej. 23 de junio de 2026",       "type": "text",     "col": 1},
                    {"key": "commitment_text",  "label": "Texto de compromiso",     "hint": "Párrafo inicial destacado",      "type": "textarea", "col": 2},
                ],
            },
            {
                "label": "CONTENIDO DE SECCIONES",
                "cols":  1,
                "fields": [
                    {"key": "section_recopilamos", "label": "Información que recopilamos",  "hint": "", "type": "textarea", "col": 1},
                    {"key": "section_usamos",      "label": "Cómo usamos tu información",   "hint": "", "type": "textarea", "col": 1},
                    {"key": "section_seguridad",   "label": "Almacenamiento y seguridad",   "hint": "", "type": "textarea", "col": 1},
                    {"key": "section_retencion",   "label": "Retención de datos",           "hint": "", "type": "textarea", "col": 1},
                    {"key": "section_terceros",    "label": "Compartición con terceros",    "hint": "", "type": "textarea", "col": 1},
                    {"key": "section_cookies",     "label": "Cookies",                      "hint": "", "type": "textarea", "col": 1},
                    {"key": "section_derechos",    "label": "Tus derechos",                 "hint": "", "type": "textarea", "col": 1},
                    {"key": "section_menores",     "label": "Menores de edad",              "hint": "", "type": "textarea", "col": 1},
                    {"key": "section_cambios",     "label": "Cambios en esta política",     "hint": "", "type": "textarea", "col": 1},
                ],
            },
            {
                "label": "CONTACTO LEGAL",
                "cols":  2,
                "fields": [
                    {"key": "legal_email", "label": "Email de contacto legal", "hint": "", "type": "text", "col": 1},
                ],
            },
        ],
    },
    {
        "key":   "terminos",
        "label": "Términos",
        "desc":  "Términos y condiciones de uso",
        "icon":  "gavel",
        "groups": [
            {
                "label": None,
                "cols":  2,
                "fields": [
                    {"key": "headline",     "label": "Titular",                  "hint": "",                          "type": "text", "col": 1},
                    {"key": "last_updated", "label": "Última actualización",     "hint": "ej. 23 de junio de 2026",  "type": "text", "col": 1},
                    {"key": "key_cards",    "label": "Tarjetas clave",           "hint": "Array JSON — objetos {emoji, title, desc}", "type": "json", "col": 2},
                ],
            },
            {
                "label": "CONTENIDO DE SECCIONES",
                "cols":  1,
                "fields": [
                    {"key": "section_servicio",        "label": "Descripción del servicio",         "hint": "",                                   "type": "textarea", "col": 1},
                    {"key": "section_cuenta",          "label": "Registro y cuenta — items",        "hint": "Array JSON de strings",              "type": "json",     "col": 1},
                    {"key": "section_pagos",           "label": "Planes y pagos — intro",           "hint": "",                                   "type": "textarea", "col": 1},
                    {"key": "section_reembolso",       "label": "Política de reembolso — intro",    "hint": "",                                   "type": "textarea", "col": 1},
                    {"key": "section_uso_prohibido",   "label": "Uso aceptable — prohibiciones",   "hint": "Array JSON de strings",              "type": "json",     "col": 1},
                    {"key": "section_responsabilidad", "label": "Limitación de responsabilidad",   "hint": "Array JSON de strings",              "type": "json",     "col": 1},
                ],
            },
            {
                "label": "CONTACTO LEGAL",
                "cols":  2,
                "fields": [
                    {"key": "legal_email",   "label": "Email legal",          "hint": "", "type": "text", "col": 1},
                    {"key": "support_email", "label": "Email de soporte",     "hint": "", "type": "text", "col": 1},
                ],
            },
        ],
    },
    {
        "key":   "servicios_whatsapp",
        "label": "Setup WhatsApp",
        "desc":  "Landing page /servicios/whatsapp-business",
        "icon":  "chat",
        "groups": [
            {
                "label": "HERO",
                "cols":  2,
                "fields": [
                    {"key": "badge",              "label": "Badge",                 "hint": "", "type": "text",     "col": 1},
                    {"key": "headline",           "label": "Titular H1",            "hint": "", "type": "text",     "col": 1},
                    {"key": "headline_highlight", "label": "Titular — parte naranja","hint": "", "type": "text",    "col": 1},
                    {"key": "subheadline",        "label": "Subtítulo",             "hint": "", "type": "textarea", "col": 2},
                    {"key": "trust_strip",        "label": "Señales de confianza",  "hint": 'Array JSON — [{icon, text}]', "type": "json", "col": 2},
                ],
            },
            {
                "label": "TARJETA DE PRECIO",
                "cols":  2,
                "fields": [
                    {"key": "price_card", "label": "Tarjeta de precio", "hint": 'Objeto JSON — {label, price, bullets[], cta_label, footer_text, footer_href, footer_label}', "type": "json", "col": 2},
                ],
            },
            {
                "label": "QUÉ INCLUYE",
                "cols":  1,
                "fields": [
                    {"key": "includes", "label": "Servicios incluidos", "hint": 'Array JSON — [{icon, title, desc}]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "PARA QUIÉN ES",
                "cols":  1,
                "fields": [
                    {"key": "for_whom", "label": "Sección «Para quién»", "hint": 'Objeto JSON — {headline, headline_highlight, items[], guarantee_title, guarantee_text, guarantee_note}', "type": "json", "col": 1},
                ],
            },
            {
                "label": "PREGUNTAS FRECUENTES",
                "cols":  1,
                "fields": [
                    {"key": "faqs", "label": "FAQs", "hint": 'Array JSON — [{q, a}]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "CTA FINAL",
                "cols":  2,
                "fields": [
                    {"key": "cta", "label": "Banner CTA", "hint": 'Objeto JSON — {headline, subheadline, secondary_label, secondary_href}', "type": "json", "col": 2},
                ],
            },
        ],
    },
    {
        "key":   "servicios_implementacion",
        "label": "Implementación CRM",
        "desc":  "Landing page /servicios/implementacion",
        "icon":  "rocket_launch",
        "groups": [
            {
                "label": "HERO",
                "cols":  2,
                "fields": [
                    {"key": "badge",              "label": "Badge",                  "hint": "", "type": "text",     "col": 1},
                    {"key": "headline",           "label": "Titular H1",             "hint": "", "type": "text",     "col": 2},
                    {"key": "headline_highlight", "label": "Titular — parte naranja","hint": "", "type": "text",     "col": 2},
                    {"key": "subheadline",        "label": "Subtítulo",              "hint": "", "type": "textarea", "col": 2},
                    {"key": "cta_primary",        "label": "CTA principal — texto",  "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_primary_href",   "label": "CTA principal — enlace", "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_secondary",      "label": "CTA secundario — texto", "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_secondary_href", "label": "CTA secundario — enlace","hint": "", "type": "text",     "col": 1},
                ],
            },
            {
                "label": "POR QUÉ IMPORTA",
                "cols":  1,
                "fields": [
                    {"key": "why_cards", "label": "Tarjetas de argumento", "hint": 'Array JSON — [{icon, title, desc}]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "PLANES",
                "cols":  1,
                "fields": [
                    {"key": "tiers",       "label": "Planes / tiers",      "hint": 'Array JSON — [{key, name, tagline, price, days, popular, cta, features[{text, highlight}]}]', "type": "json", "col": 1},
                    {"key": "trust_strip", "label": "Strip de confianza",  "hint": 'Array JSON — [{icon, text}]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "TABLA COMPARATIVA",
                "cols":  1,
                "fields": [
                    {"key": "comparison", "label": "Filas de comparación", "hint": 'Array JSON — [{item, arranque, impulso, escala}]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "CÓMO FUNCIONA",
                "cols":  1,
                "fields": [
                    {"key": "steps", "label": "Pasos del proceso", "hint": 'Array JSON — [{icon, title, desc}]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "PREGUNTAS FRECUENTES",
                "cols":  1,
                "fields": [
                    {"key": "faqs", "label": "FAQs", "hint": 'Array JSON — [{q, a}]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "CTA FINAL",
                "cols":  2,
                "fields": [
                    {"key": "cta", "label": "Banner CTA", "hint": 'Objeto JSON — {headline, subheadline, primary_label, primary_href, secondary_label, secondary_href}', "type": "json", "col": 2},
                ],
            },
        ],
    },
    {
        "key":   "guatemala",
        "label": "Guatemala — Landing",
        "desc":  "Contenido de la página /guatemala: CRM con IA para el mercado guatemalteco",
        "icon":  "flag",
        "groups": [
            {
                "label": "HERO",
                "cols":  1,
                "fields": [
                    {"key": "hero_badge",         "label": "Badge",                   "hint": "Texto pequeño sobre el titular", "type": "text",     "col": 1},
                    {"key": "hero_headline",      "label": "Titular (H1)",            "hint": "",                               "type": "text",     "col": 1},
                    {"key": "hero_subheadline",   "label": "Subtítulo",               "hint": "",                               "type": "textarea", "col": 1},
                    {"key": "trust_signals",      "label": "Señales de confianza",    "hint": 'Array JSON — ej. ["14 días gratis", "Sin tarjeta de crédito"]', "type": "json", "col": 1},
                    {"key": "cta_primary_text",   "label": "CTA principal — texto",   "hint": "",                               "type": "text",     "col": 1},
                    {"key": "cta_primary_href",   "label": "CTA principal — enlace",  "hint": "",                               "type": "text",     "col": 1},
                    {"key": "cta_secondary_text", "label": "CTA secundario — texto",  "hint": "",                               "type": "text",     "col": 1},
                    {"key": "cta_secondary_href", "label": "CTA secundario — enlace", "hint": "",                               "type": "text",     "col": 1},
                ],
            },
            {
                "label": "SECCIÓN INTRO",
                "cols":  1,
                "fields": [
                    {"key": "intro_headline", "label": "Titular",  "hint": "", "type": "text",     "col": 1},
                    {"key": "intro_text",     "label": "Párrafo",  "hint": "", "type": "textarea", "col": 1},
                ],
            },
            {
                "label": "SECCIÓN CRM CON IA",
                "cols":  1,
                "fields": [
                    {"key": "crm_badge",       "label": "Badge",     "hint": "", "type": "text",     "col": 1},
                    {"key": "crm_headline",    "label": "Titular",   "hint": "", "type": "text",     "col": 1},
                    {"key": "crm_subheadline", "label": "Subtítulo", "hint": "", "type": "textarea", "col": 1},
                ],
            },
            {
                "label": "SECCIÓN WHATSAPP",
                "cols":  1,
                "fields": [
                    {"key": "whatsapp_headline", "label": "Titular",          "hint": "", "type": "text",     "col": 1},
                    {"key": "whatsapp_text",     "label": "Párrafo",          "hint": "", "type": "textarea", "col": 1},
                    {"key": "whatsapp_features", "label": "Lista de features","hint": 'Array JSON — ["Feature 1", "Feature 2"]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "SECCIÓN AGENTE DE VOZ IA",
                "cols":  1,
                "fields": [
                    {"key": "voz_badge",       "label": "Badge",     "hint": "", "type": "text",     "col": 1},
                    {"key": "voz_headline",    "label": "Titular",   "hint": "", "type": "text",     "col": 1},
                    {"key": "voz_subheadline", "label": "Subtítulo", "hint": "", "type": "textarea", "col": 1},
                ],
            },
            {
                "label": "SECCIÓN FEL (FACTURA ELECTRÓNICA)",
                "cols":  1,
                "fields": [
                    {"key": "fel_headline", "label": "Titular",          "hint": "", "type": "text",     "col": 1},
                    {"key": "fel_text",     "label": "Párrafo",          "hint": "", "type": "textarea", "col": 1},
                    {"key": "fel_badges",   "label": "Badges FEL",       "hint": 'Array JSON — ["Badge 1", "Badge 2"]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "PREGUNTAS FRECUENTES",
                "cols":  1,
                "fields": [
                    {"key": "faqs", "label": "FAQs", "hint": 'Array JSON — [{q, a}]', "type": "json", "col": 1},
                ],
            },
            {
                "label": "CTA FINAL",
                "cols":  1,
                "fields": [
                    {"key": "cta_final_headline",       "label": "Titular",                  "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_final_subheadline",    "label": "Subtítulo",                "hint": "", "type": "textarea", "col": 1},
                    {"key": "cta_final_primary_text",   "label": "Botón principal — texto",  "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_final_primary_href",   "label": "Botón principal — enlace", "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_final_secondary_text", "label": "Botón secundario — texto", "hint": "", "type": "text",     "col": 1},
                    {"key": "cta_final_secondary_href", "label": "Botón secundario — enlace","hint": "", "type": "text",     "col": 1},
                    {"key": "cta_final_note",           "label": "Nota bajo los botones",    "hint": "", "type": "text",     "col": 1},
                ],
            },
        ],
    },
]

SECTION_MAP = {s["key"]: s for s in SECTIONS}
