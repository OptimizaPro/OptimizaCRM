# Optimiza-CRM

**CRM SaaS multi-tenant con IA integrada para PYMEs**

Desarrollado por **Nelson Alvarez** — [OptimizaPro](https://optimizapro.com)

---

## Stack

| Capa       | Tecnología                                                                      |
|------------|---------------------------------------------------------------------------------|
| Frontend   | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, React Query, Zustand |
| Backend    | Django 6, Django REST Framework, JWT, Celery                                    |
| Base datos | PostgreSQL (prod) / SQLite (dev)                                                |
| IA         | Groq / OpenAI / Gemini — BYOK por organización                                  |
| Deploy     | Railway · Vercel · Docker                                                       |

## Módulos

- **Dashboard** — KPIs en tiempo real
- **Leads** — Gestión, scoring con IA, importación CSV
- **Clientes** — Perfiles 360°, predicción de churn
- **Oportunidades** — Pipeline Kanban con drag-and-drop
- **Comunicaciones** — Bandeja de entrada, WhatsApp, asistente de escritura IA
- **Tareas & Calendario**
- **Analítica** — Reportes, forecast de ingresos
- **Integraciones** — WhatsApp, Email, Outlook, Google Calendar, Automatización, Proveedor IA (BYOK)
- **CMS** — Gestión de contenido del sitio público
- **Administración** — Perfil, organización, equipo, facturación

## Inicio rápido (desarrollo)

```bash
# Backend
cd backend
python -m venv env && source env/bin/activate  # Windows: env\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

## Variables de entorno

```env
# backend/.env
USE_SQLITE=True
DEBUG=True
SECRET_KEY=your-secret-key
GROQ_API_KEY=your-groq-key   # opcional en dev, BYOK en prod
```

## Licencia

Copyright (c) 2025 Nelson Alvarez / OptimizaPro. Todos los derechos reservados.
