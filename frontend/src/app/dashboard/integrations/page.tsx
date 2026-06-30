"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/layout/dashboard-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, X, Plug } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { integrationsApi, driveApi, type Integration } from "@/lib/api";

type ChannelType = 'whatsapp' | 'email' | 'brevo' | 'outlook' | 'facebook' | 'instagram' | 'telegram' | 'sms' | 'tiktok' | 'google_calendar' | 'automation_webhook' | 'ai_provider';

interface GuideStep {
  title: string;
  description: string;
}

interface ChannelConfig {
  channel_type: ChannelType;
  label: string;
  icon: React.ReactNode;
  description: string;
  comingSoon?: boolean;
  fields: { key: string; label: string; type?: string; readonly?: boolean; placeholder?: string; helpText?: string }[];
  guide?: {
    intro: string;
    steps: GuideStep[];
  };
}

// Inline SVG icons for channels without a good lucide equivalent
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#25D366]">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#2AABEE]">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#1877F2]">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433" />
        <stop offset="25%" stopColor="#e6683c" />
        <stop offset="50%" stopColor="#dc2743" />
        <stop offset="75%" stopColor="#cc2366" />
        <stop offset="100%" stopColor="#bc1888" />
      </linearGradient>
    </defs>
    <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const BrevoIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
    <rect width="24" height="24" rx="5" fill="#0B996E" />
    <path d="M6 7h5.5c2 0 3.5 1.2 3.5 3s-1.5 3-3.5 3H6V7z" fill="white" />
    <path d="M6 13h6c2.2 0 4 1.2 4 3s-1.8 3-4 3H6v-6z" fill="white" opacity="0.75" />
  </svg>
);

const SmsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.63A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const OutlookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7">
    <rect width="24" height="24" rx="4" fill="#0078D4" />
    <path d="M13 6h7v2.5h-7V6zm0 3.5h7V12h-7V9.5zm0 3.5h7v2.5h-7V13zm-9.5.5C3.5 16.43 5.07 18 7 18s3.5-1.57 3.5-3.5V6H3.5v7.5zm3.5 2c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="white" />
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
);

const GoogleCalendarIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7">
    <rect x="3" y="4" width="18" height="17" rx="2" fill="white" stroke="#dadce0" strokeWidth="1.2" />
    <rect x="3" y="4" width="18" height="5" rx="2" fill="#1a73e8" />
    <rect x="3" y="7" width="18" height="2" fill="#1a73e8" />
    <path d="M8 3v3M16 3v3" stroke="#1a73e8" strokeWidth="1.5" strokeLinecap="round" />
    <text x="12" y="17.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#1a73e8">31</text>
  </svg>
);

const AutomationIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
    <circle cx="5" cy="12" r="2.5" fill="#f97316" />
    <circle cx="19" cy="6" r="2.5" fill="#8b5cf6" />
    <circle cx="19" cy="18" r="2.5" fill="#8b5cf6" />
    <path d="M7.5 12h4l2-6h2.5M7.5 12h4l2 6h2.5" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GoogleDriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="w-7 h-7 flex-shrink-0">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="M43.65 25L29.9 1.4c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#00ac47" />
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.9z" fill="#ea4335" />
    <path d="M43.65 25L57.4 1.4C56.05.6 54.5.2 52.9.2H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="M73.4 26.5l-13.1-22.8c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
);

const AiProviderIcon = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
    <rect x="2" y="6" width="20" height="13" rx="3" fill="#6366f1" />
    <circle cx="7" cy="12.5" r="1.5" fill="white" opacity="0.9" />
    <circle cx="12" cy="12.5" r="1.5" fill="white" opacity="0.9" />
    <circle cx="17" cy="12.5" r="1.5" fill="white" opacity="0.9" />
    <path d="M8 6V4.5a4 4 0 0 1 8 0V6" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 2.5v1" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const CHANNELS: ChannelConfig[] = [
  {
    channel_type: 'whatsapp',
    label: 'WhatsApp Business',
    icon: <WhatsAppIcon />,
    description: 'Conecta WhatsApp Business API para enviar y recibir mensajes.',
    fields: [
      {
        key: 'phone_number_id',
        label: 'Phone Number ID',
        placeholder: '123456789',
        helpText: 'ID numérico del número en Meta for Developers → Tu app → WhatsApp → Configuración.',
      },
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        placeholder: 'EAAxxxxxxx',
        helpText: 'Token de acceso permanente de Meta Business Suite. No uses el token temporal de 24h.',
      },
      {
        key: 'verify_token',
        label: 'Verify Token',
        placeholder: 'mi_token_secreto',
        helpText: 'Cadena de texto que tú defines. Se usa para verificar el webhook entre Meta y este CRM.',
      },
      {
        key: 'webhook_url',
        label: 'Webhook URL',
        type: 'text',
        readonly: true,
        placeholder: 'https://tu-dominio.com/api/v1/webhooks/whatsapp/',
        helpText: 'Copia esta URL y pégala en la configuración de Webhook de tu app en Meta for Developers.',
      },
    ],
    guide: {
      intro: 'WhatsApp Business API requiere una cuenta verificada en Meta Business. Sigue estos pasos antes de configurar.',
      steps: [
        { title: 'Crea una app en Meta for Developers', description: 'Ve a developers.facebook.com → Mis apps → Crear app. Selecciona tipo "Empresa" y añade el producto WhatsApp.' },
        { title: 'Verifica tu negocio en Meta Business Suite', description: 'En business.facebook.com, completa la verificación. Puede tardar 1-3 días hábiles y requiere documentos oficiales.' },
        { title: 'Registra un número de teléfono', description: 'En Meta → WhatsApp → Configuración del número. El número no puede tener WhatsApp personal activo.' },
        { title: 'Obtén el Phone Number ID y Access Token', description: 'El Phone Number ID está en WhatsApp → Configuración de API. El token permanente: Configuración del sistema → Crear token de sistema.' },
        { title: 'Configura el Webhook', description: 'En WhatsApp → Configuración, pega la Webhook URL de este CRM y el Verify Token que definiste. Suscríbete al campo "messages".' },
      ],
    },
  },
  {
    channel_type: 'email',
    label: 'Email (SMTP)',
    icon: <EmailIcon />,
    description: 'Configura un servidor SMTP para enviar emails transaccionales.',
    fields: [
      { key: 'host', label: 'Host SMTP', placeholder: 'smtp.gmail.com / smtp.office365.com', helpText: 'Gmail: smtp.gmail.com · Microsoft 365 / Outlook: smtp.office365.com' },
      { key: 'port', label: 'Puerto', placeholder: '587', helpText: 'Usa 587 con TLS (recomendado) o 465 con SSL.' },
      { key: 'username', label: 'Usuario', placeholder: 'tu@email.com' },
      {
        key: 'password',
        label: 'Contraseña',
        type: 'password',
        placeholder: '••••••••',
        helpText: 'Gmail: genera una "Contraseña de aplicación" en myaccount.google.com → Seguridad. Microsoft 365: activa SMTP AUTH en admin.microsoft.com primero.',
      },
      { key: 'from_name', label: 'Nombre del remitente', placeholder: 'Mi Empresa CRM' },
    ],
    guide: {
      intro: 'Configuración según tu proveedor. Gmail requiere contraseña de aplicación; Microsoft 365 requiere activar SMTP AUTH desde el panel de admin.',
      steps: [
        { title: 'Gmail — Activa la verificación en dos pasos', description: 'Ve a myaccount.google.com → Seguridad → Verificación en 2 pasos. Es obligatorio para crear contraseñas de aplicación.' },
        { title: 'Gmail — Crea una contraseña de aplicación', description: 'myaccount.google.com → Seguridad → Contraseñas de aplicaciones → "Otro (nombre personalizado)" → "CRM". Usa esos 16 caracteres, NO tu contraseña habitual de Gmail.' },
        { title: 'Gmail — Configuración SMTP', description: 'Host: smtp.gmail.com · Puerto: 587 · Usuario: tu dirección Gmail completa.' },
        { title: 'Microsoft 365 — Activa SMTP AUTH por usuario', description: 'admin.microsoft.com → Usuarios → tu usuario → Correo → Administrar configuración de correo → activa "Correo electrónico autenticado SMTP".' },
        { title: 'Outlook personal (outlook.com / hotmail.com)', description: 'account.microsoft.com → Seguridad → Opciones de seguridad avanzadas → activa 2FA y crea una contraseña de aplicación.' },
        { title: 'Microsoft 365 — Configuración SMTP', description: 'Host: smtp.office365.com · Puerto: 587 · Usuario: tu dirección corporativa o @outlook.com completa.' },
        { title: 'Microsoft 365 — SMTP AUTH bloqueado globalmente', description: 'Si el administrador desactivó SMTP AUTH para toda la organización, debe habilitarlo en Centro de administración de Exchange → Configuración del flujo de correo.' },
      ],
    },
  },
  {
    channel_type: 'brevo',
    label: 'Brevo (Email transaccional)',
    icon: <BrevoIcon />,
    description: 'Envía emails transaccionales y campañas usando la API de Brevo (antes Sendinblue).',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'xkeysib-xxxxxxxxxxxxxxxxxxxxxxxx',
        helpText: 'Encuéntrala en app.brevo.com → SMTP & API → API Keys → Crear una nueva clave.',
      },
      {
        key: 'sender_name',
        label: 'Nombre del remitente',
        placeholder: 'OptimizaCRM',
        helpText: 'Nombre que verá el destinatario en el campo "De:".',
      },
      {
        key: 'sender_email',
        label: 'Email del remitente',
        placeholder: 'hola@tuempresa.com',
        helpText: 'Debe estar verificado en Brevo: Configuración → Remitentes y dominios.',
      },
    ],
    guide: {
      intro: 'Brevo es la opción recomendada para emails transaccionales. Ofrece 300 emails/día gratis, sin tarjeta de crédito, con excelente entregabilidad.',
      steps: [
        { title: 'Crea una cuenta gratuita en Brevo', description: 'Ve a app.brevo.com → Crear cuenta. El plan gratuito incluye 300 emails/día y contactos ilimitados, suficiente para empezar.' },
        { title: 'Verifica tu dominio o email remitente', description: 'En Configuración → Remitentes y dominios → añade y verifica el email o dominio desde el que enviarás. La verificación de dominio mejora la entregabilidad (menos spam).' },
        { title: 'Genera una API Key', description: 'Ve a SMTP & API (menú superior) → API Keys → Crear una nueva clave. Ponle un nombre como "OptimizaCRM" y copia la clave generada — solo se muestra una vez.' },
        { title: 'Configura en OptimizaCRM', description: 'Pega la API Key, el nombre y email del remitente verificado. El CRM usará Brevo para todos los emails transaccionales: notificaciones, seguimientos automáticos y plantillas de IA.' },
      ],
    },
  },
  {
    channel_type: 'facebook',
    label: 'Facebook Pages',
    icon: <FacebookIcon />,
    description: 'Recibe mensajes de tu página de Facebook directamente en el CRM.',
    fields: [
      {
        key: 'page_id',
        label: 'Page ID',
        placeholder: '123456789012345',
        helpText: 'ID de tu página. Ve a Configuración de la página → Información de la página, o cógelo de la URL.',
      },
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        placeholder: 'EAAxxxxxxx',
        helpText: 'Page Access Token (no del usuario). Genera uno de larga duración desde Meta for Developers → Graph API Explorer.',
      },
    ],
    guide: {
      intro: 'Necesitas ser administrador de la página y tener una app en Meta for Developers.',
      steps: [
        { title: 'Crea una app en Meta for Developers', description: 'En developers.facebook.com añade el producto "Messenger" a tu app.' },
        { title: 'Conecta tu página', description: 'En Messenger → Configuración → "Añadir o eliminar páginas" y conecta tu página.' },
        { title: 'Genera un Page Access Token de larga duración', description: 'Usa el Graph API Explorer para el token de página, luego conviértelo a larga duración con el endpoint oauth/access_token.' },
        { title: 'Obtén el Page ID', description: 'Tu página de Facebook → Configuración → Información de la página. El ID numérico aparece al final.' },
      ],
    },
  },
  {
    channel_type: 'instagram',
    label: 'Instagram Business',
    icon: <InstagramIcon />,
    description: 'Gestiona mensajes directos de Instagram Business.',
    fields: [
      {
        key: 'account_id',
        label: 'Instagram Account ID',
        placeholder: '17841400000000000',
        helpText: 'ID numérico de tu cuenta Instagram Business. Debe estar vinculada a una página de Facebook.',
      },
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        placeholder: 'EAAxxxxxxx',
        helpText: 'El mismo Page Access Token de la página de Facebook vinculada a tu Instagram Business.',
      },
    ],
    guide: {
      intro: 'Instagram Business API requiere que tu cuenta esté vinculada a una página de Facebook.',
      steps: [
        { title: 'Convierte tu cuenta en Instagram Business', description: 'Instagram → Configuración → Cuenta → Cambiar a cuenta profesional → Empresa.' },
        { title: 'Vincula Instagram a una página de Facebook', description: 'En la configuración de Instagram Business, conecta tu página de Facebook. Es obligatorio.' },
        { title: 'Habilita los mensajes en Meta for Developers', description: 'En tu app de Meta, añade el producto "Instagram" y habilita el permiso "instagram_manage_messages".' },
        { title: 'Obtén el Account ID', description: 'Con el Graph API Explorer, llama a /me/accounts para obtener el listado de páginas e Instagram IDs vinculados.' },
      ],
    },
  },
  {
    channel_type: 'telegram',
    label: 'Telegram',
    icon: <TelegramIcon />,
    description: 'Conecta un bot de Telegram para comunicarte con tus contactos.',
    fields: [
      {
        key: 'bot_token',
        label: 'Bot Token',
        type: 'password',
        placeholder: '123456:ABC-DEFxxxxxxx',
        helpText: 'Token generado por @BotFather en Telegram. Escríbele /newbot para crear uno nuevo.',
      },
    ],
    guide: {
      intro: 'Crear un bot de Telegram es el proceso más sencillo de todas las integraciones.',
      steps: [
        { title: 'Abre Telegram y busca @BotFather', description: 'Es el bot oficial de Telegram para gestionar bots. Verifica que tenga la marca de verificación azul.' },
        { title: 'Crea un nuevo bot', description: 'Escríbele /newbot. Te pedirá un nombre y luego un username (debe terminar en "bot", ej: MiEmpresaCRMbot).' },
        { title: 'Copia el token', description: 'BotFather te enviará el token en formato 123456789:AAF... Pégalo en el campo Bot Token.' },
      ],
    },
  },
  {
    channel_type: 'sms',
    label: 'SMS / Twilio',
    icon: <SmsIcon />,
    description: 'Envía y recibe SMS a través de Twilio.',
    fields: [
      {
        key: 'account_sid',
        label: 'Account SID',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        helpText: 'Identificador único de tu cuenta Twilio. En el Dashboard de console.twilio.com.',
      },
      {
        key: 'auth_token',
        label: 'Auth Token',
        type: 'password',
        placeholder: '••••••••••••••••••••••••••••••••',
        helpText: 'Está junto al Account SID en el Dashboard de Twilio. Trátalo como una contraseña.',
      },
      {
        key: 'from_number',
        label: 'From Number',
        placeholder: '+15017122661',
        helpText: 'Número de Twilio en formato E.164 (con código de país). Lo compras en Twilio Console → Phone Numbers.',
      },
    ],
    guide: {
      intro: 'Twilio requiere comprar un número de teléfono y verificar tu cuenta antes de enviar SMS.',
      steps: [
        { title: 'Crea una cuenta en Twilio', description: 'twilio.com → regístrate. Hay crédito de prueba gratuito, pero para producción necesitas verificar con tarjeta.' },
        { title: 'Compra un número de teléfono', description: 'Twilio Console → Phone Numbers → Manage → Buy a number. Busca uno con capacidad SMS en tu país.' },
        { title: 'Obtén Account SID y Auth Token', description: 'En el Dashboard principal de console.twilio.com. El Auth Token está oculto por defecto, haz clic para verlo.' },
        { title: 'Configura el webhook de SMS', description: 'Phone Numbers → Manage → Active numbers → tu número → "Messaging Configuration" → pega la URL de webhook de este CRM.' },
      ],
    },
  },
  {
    channel_type: 'outlook',
    label: 'Microsoft 365 / Outlook',
    icon: <OutlookIcon />,
    description: 'Conecta tu cuenta corporativa de Microsoft 365 u Outlook para enviar emails.',
    fields: [
      { key: 'host', label: 'Host SMTP', placeholder: 'smtp.office365.com', helpText: 'Para cuentas corporativas M365 y outlook.com / hotmail.com.' },
      { key: 'port', label: 'Puerto', placeholder: '587', helpText: 'Usa 587 con TLS (recomendado).' },
      { key: 'username', label: 'Usuario', placeholder: 'tu@empresa.com', helpText: 'Tu dirección de correo de Microsoft completa.' },
      {
        key: 'password',
        label: 'Contraseña',
        type: 'password',
        placeholder: '••••••••',
        helpText: 'Usa tu contraseña habitual. Si tienes 2FA activo, genera una contraseña de aplicación en account.microsoft.com → Seguridad.',
      },
      { key: 'from_name', label: 'Nombre del remitente', placeholder: 'Mi Empresa CRM' },
    ],
    guide: {
      intro: 'Microsoft 365 requiere activar SMTP AUTH antes de poder conectar. Este paso lo realiza el administrador de la cuenta.',
      steps: [
        { title: 'Activa SMTP AUTH para tu usuario (M365 corporativo)', description: 'admin.microsoft.com → Usuarios activos → tu usuario → pestaña Correo → Administrar configuración de aplicaciones de correo → activa "Correo electrónico autenticado SMTP".' },
        { title: 'Si usas outlook.com o hotmail.com (cuenta personal)', description: 'account.microsoft.com → Seguridad → Opciones de seguridad avanzadas → activa la verificación en dos pasos y crea una contraseña de aplicación.' },
        { title: 'Si el administrador bloqueó SMTP AUTH globalmente', description: 'El admin debe habilitarlo desde Centro de administración de Exchange → Configuración → Configuración del flujo de correo. O bien, crear una cuenta de servicio dedicada con SMTP AUTH permitido.' },
        { title: 'Configuración SMTP', description: 'Host: smtp.office365.com · Puerto: 587 · Usuario: tu dirección de correo Microsoft completa.' },
      ],
    },
  },
  {
    channel_type: 'tiktok',
    label: 'TikTok Lead Generation',
    icon: <TikTokIcon />,
    description: 'Recibe leads de tus anuncios de TikTok directamente en el CRM.',
    comingSoon: true,
    fields: [],
    guide: {
      intro: 'TikTok Lead Generation captura los datos de usuarios que completan formularios en tus anuncios y los envía automáticamente al CRM vía webhook.',
      steps: [
        { title: '¿Por qué Lead Generation y no mensajes directos?', description: 'La API de mensajería directa de TikTok está en acceso cerrado solo para grandes empresas. TikTok Lead Generation sí es accesible para anunciantes estándar.' },
        { title: 'Crea un formulario de Lead Generation en TikTok Ads', description: 'En ads.tiktok.com → crea una campaña con objetivo "Generación de clientes potenciales" → diseña el formulario con los campos que necesites.' },
        { title: 'Configura el webhook en TikTok for Business', description: 'En business.tiktok.com → Herramientas → Webhook → añade la URL de este CRM para recibir leads en tiempo real.' },
        { title: 'Disponible próximamente', description: 'Estamos finalizando esta integración. Cuando esté lista, solo necesitarás pegar el token de verificación de TikTok.' },
      ],
    },
  },
  {
    channel_type: 'google_calendar',
    label: 'Google Calendar',
    icon: <GoogleCalendarIcon />,
    description: 'Sincroniza reuniones y seguimientos con tus leads y oportunidades.',
    fields: [
      {
        key: 'client_id',
        label: 'Client ID',
        placeholder: 'xxxxx.apps.googleusercontent.com',
        helpText: 'ID de cliente OAuth 2.0. Se genera en Google Cloud Console → APIs y servicios → Credenciales.',
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        placeholder: 'GOCSPX-xxxxxxxxxx',
        helpText: 'Secreto del cliente OAuth. Está junto al Client ID en Google Cloud Console.',
      },
      {
        key: 'calendar_id',
        label: 'Calendar ID (opcional)',
        placeholder: 'primary',
        helpText: 'Deja "primary" para usar el calendario principal, o pega el ID de un calendario específico (lo encuentras en Configuración del calendario → Integrar calendario).',
      },
    ],
    guide: {
      intro: 'Google Calendar usa OAuth 2.0. Necesitas crear credenciales en Google Cloud Console antes de conectar.',
      steps: [
        { title: 'Crea un proyecto en Google Cloud Console', description: 'Ve a console.cloud.google.com → Nuevo proyecto. Dale un nombre como "OptimizaCRM".' },
        { title: 'Activa la Google Calendar API', description: 'En el proyecto → APIs y servicios → Biblioteca → busca "Google Calendar API" → Habilitar.' },
        { title: 'Crea credenciales OAuth 2.0', description: 'APIs y servicios → Credenciales → Crear credenciales → ID de cliente OAuth. Tipo de aplicación: "Aplicación web". Añade la URL de callback de este CRM como URI de redireccionamiento autorizado.' },
        { title: 'Copia Client ID y Client Secret', description: 'Una vez creadas, Google te mostrará el Client ID y Client Secret. Pégalos en los campos del formulario.' },
        { title: 'Autoriza el acceso', description: 'Después de guardar, el CRM te redirigirá a Google para que apruebes el acceso a tu calendario. Solo necesitas hacerlo una vez.' },
      ],
    },
  },
  {
    channel_type: 'automation_webhook',
    label: 'Automatización (Zapier · Make · n8n)',
    icon: <AutomationIcon />,
    description: 'Conecta cualquier app externa mediante webhooks de entrada y salida.',
    fields: [
      {
        key: 'webhook_secret',
        label: 'Webhook Secret',
        placeholder: 'mi_clave_secreta',
        helpText: 'Clave para verificar que los webhooks entrantes provienen de tu plataforma de automatización. Elige una cadena segura y configúrala también en Zapier, Make o n8n.',
      },
      {
        key: 'outbound_url',
        label: 'URL de destino (salida)',
        placeholder: 'https://hooks.zapier.com/hooks/catch/...',
        helpText: 'URL del webhook de tu plataforma de automatización. El CRM enviará eventos aquí (nuevo lead, oportunidad ganada, etc.).',
      },
      {
        key: 'webhook_url',
        label: 'URL de entrada (este CRM)',
        type: 'text',
        readonly: true,
        placeholder: 'https://tu-dominio.com/api/v1/webhooks/automation/',
        helpText: 'Pega esta URL en tu flujo de Zapier, Make o n8n como destino del webhook saliente.',
      },
    ],
    guide: {
      intro: 'Un webhook bidireccional que conecta el CRM con Zapier, Make, n8n o cualquier plataforma de automatización. Una sola integración que abre miles de posibilidades.',
      steps: [
        { title: '¿Qué plataforma elegir?', description: 'Zapier: la más fácil, ideal si no tienes perfil técnico. Make (antes Integromat): más potente y visual, mejor precio que Zapier. n8n: open-source y self-hostable, cero coste de licencia, ideal si ya tienes infraestructura en Railway o DigitalOcean.' },
        { title: 'Crea un flujo/escenario/workflow con trigger "Webhook"', description: 'En Zapier: Zap → Trigger → Webhooks by Zapier → Catch Hook. En Make: Nuevo escenario → Webhooks → Custom webhook. En n8n: Nuevo workflow → nodo Webhook.' },
        { title: 'Copia la URL del webhook generada', description: 'Cada plataforma te dará una URL única. Pégala en el campo "URL de destino (salida)" del formulario. El CRM enviará eventos a esa URL.' },
        { title: 'Pega la URL de entrada del CRM en tu flujo', description: 'Copia la "URL de entrada (este CRM)" y úsala como destino en los nodos de tu automatización cuando quieras enviar datos al CRM (ej: nuevo lead desde Typeform, pago de Stripe, reserva de Calendly).' },
        { title: 'Define un Webhook Secret', description: 'Elige una cadena segura y configúrala en ambos lados (CRM y tu plataforma) para verificar la autenticidad de las peticiones.' },
      ],
    },
  },
  {
    channel_type: 'ai_provider',
    label: 'Proveedor de IA',
    icon: <AiProviderIcon />,
    description: 'Conecta tu propia API key de IA para el asistente de redacción en bandeja y WhatsApp.',
    fields: [
      {
        key: 'provider',
        label: 'Proveedor',
        placeholder: 'groq',
        helpText: 'Opciones: groq · openai · gemini. Groq es gratuito y el más rápido para redacción.',
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: 'gsk_xxxxxxxx / sk-xxxxxxxx',
        helpText: 'Tu clave privada del proveedor seleccionado. Nunca se compartirá con otros usuarios.',
      },
      {
        key: 'model',
        label: 'Modelo (opcional)',
        placeholder: 'llama-3.1-8b-instant',
        helpText: 'Groq: llama-3.1-8b-instant (defecto) o llama-3.3-70b-versatile. OpenAI: gpt-4o-mini. Gemini: gemini-1.5-flash.',
      },
    ],
    guide: {
      intro: 'Cada organización usa su propia API key — tus tokens son solo tuyos. Groq es la opción recomendada: gratuita, rápida y sin tarjeta de crédito.',
      steps: [
        { title: 'Groq (recomendado) — Crea tu cuenta', description: 'Ve a console.groq.com → Sign up. No requiere tarjeta de crédito. El plan gratuito incluye 14.400 requests/día.' },
        { title: 'Groq — Genera una API Key', description: 'En el dashboard de Groq → API Keys → Create API Key. Dale un nombre descriptivo como "OptimizaCRM".' },
        { title: 'OpenAI (alternativa) — Obtén tu API Key', description: 'platform.openai.com → API Keys → Create new secret key. Requiere crédito de pago. Modelo recomendado: gpt-4o-mini (coste muy bajo).' },
        { title: 'Gemini (alternativa) — Obtén tu API Key', description: 'aistudio.google.com → Get API Key. Plan gratuito disponible. Modelo recomendado: gemini-1.5-flash.' },
        { title: 'Configura y conecta', description: 'Selecciona el proveedor, pega tu API Key y opcionalmente elige el modelo. Pulsa "Guardar y conectar" — el asistente de redacción quedará activo para toda tu organización.' },
      ],
    },
  },
];

function statusBadge(status: string) {
  if (status === 'connected') return <Badge className="bg-green-100 text-green-700 border-green-200">Conectado</Badge>;
  if (status === 'error') return <Badge className="bg-red-100 text-red-700 border-red-200">Error</Badge>;
  if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendiente</Badge>;
  return <Badge className="bg-slate-100 text-slate-600 border-slate-200">Desconectado</Badge>;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function IntegrationsPage() {
  const { tokens, organization } = useAuthStore();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeChannel, setActiveChannel] = useState<ChannelType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [guideChannel, setGuideChannel] = useState<ChannelConfig | null>(null);

  // Handle Drive OAuth redirect params
  const driveConnected = searchParams.get("drive_connected") === "1";
  const driveError = searchParams.get("drive_error");

  // Clear Drive URL params after reading them
  useEffect(() => {
    if (driveConnected || driveError) {
      const url = new URL(window.location.href);
      url.searchParams.delete("drive_connected");
      url.searchParams.delete("drive_error");
      router.replace(url.pathname + (url.search || ""), { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive status
  const { data: driveStatusData, isLoading: driveStatusLoading } = useQuery({
    queryKey: ["drive-status"],
    queryFn: () => driveApi.getStatus(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
  });

  const isDriveConnected = driveStatusData?.connected ?? false;
  const driveConnectedAt = driveStatusData?.connected_at ?? null;

  // Drive connect
  const [driveConnecting, setDriveConnecting] = useState(false);
  const handleDriveConnect = async () => {
    if (!tokens || !organization) return;
    setDriveConnecting(true);
    try {
      const { auth_url } = await driveApi.getAuthUrl(tokens.access, organization.id);
      window.location.href = auth_url;
    } catch {
      setDriveConnecting(false);
    }
  };

  // Drive disconnect
  const driveDisconnectMutation = useMutation({
    mutationFn: () => driveApi.disconnect(tokens!.access, organization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drive-status"] });
      setSuccessMessage("Google Drive desconectado.");
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  // Plan guard — equipo or enterprise only
  const orgPlan = organization?.plan ?? "";
  const driveAllowed = orgPlan === "equipo" || orgPlan === "enterprise";

  const { data, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.getAll(tokens!.access, organization!.id),
    enabled: !!tokens && !!organization,
  });

  const integrations: Integration[] = data?.results ?? [];

  const findIntegration = (channelType: ChannelType) =>
    integrations.find((i) => i.channel_type === channelType) ?? null;

  const createMutation = useMutation({
    mutationFn: (vars: { channel_type: string; name: string }) =>
      integrationsApi.create(tokens!.access, organization!.id, vars),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  });

  const connectMutation = useMutation({
    mutationFn: (vars: { id: string; config: Record<string, string> }) =>
      integrationsApi.connect(tokens!.access, organization!.id, vars.id, vars.config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setActiveChannel(null);
      setFormData({});
      setSuccessMessage('Integración conectada correctamente.');
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Error al conectar la integración.');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.disconnect(tokens!.access, organization!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setSuccessMessage('Integración desconectada.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.test(tokens!.access, organization!.id, id),
    onSuccess: (res) => {
      setSuccessMessage(res.message || 'Test exitoso.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Error en el test de conexión.');
    },
  });

  const handleOpenForm = (channelType: ChannelType) => {
    if (activeChannel === channelType) {
      setActiveChannel(null);
      setFormData({});
      setErrorMessage(null);
      return;
    }
    setActiveChannel(channelType);
    setFormData({});
    setErrorMessage(null);
  };

  const handleConnect = async (channel: ChannelConfig) => {
    setErrorMessage(null);
    let integration = findIntegration(channel.channel_type);

    if (!integration) {
      try {
        integration = await createMutation.mutateAsync({
          channel_type: channel.channel_type,
          name: channel.label,
        });
      } catch {
        setErrorMessage('Error al crear la integración.');
        return;
      }
    }

    connectMutation.mutate({ id: integration.id, config: { ...formData } });
  };

  const allConnectedLogs = integrations
    .filter((i) => i.status === 'connected')
    .flatMap((i) => (i.recent_logs ?? []).map((log) => ({ ...log, channelLabel: i.channel_type_display })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return (
    <>
      {/* Guide modal — pure React, no Radix */}
      {guideChannel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setGuideChannel(null)}
        >
          <div
            className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setGuideChannel(null)}
              className="absolute right-4 top-4 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-lg p-1"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex-shrink-0">{guideChannel.icon}</span>
              <h2 className="text-base font-semibold text-slate-100">
                Guía de configuración — {guideChannel.label}
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-2 mb-4">
              {guideChannel.guide?.intro}
            </p>
            <ol className="space-y-4">
              {guideChannel.guide?.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{step.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            {guideChannel.channel_type === 'whatsapp' && (
              <div className="mt-6 rounded-xl border border-green-800/40 bg-green-950/20 p-4">
                <p className="text-sm font-semibold text-slate-200">¿El proceso te parece complejo?</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  La configuración de Meta Business Suite puede ser engorrosa, especialmente si aún no tienes tu cuenta verificada.
                  Podemos asistirte en todo el proceso por un pago único.
                </p>
                <a
                  href="/contacto"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-green-700 hover:bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  Solicitar asistencia →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <DashboardHeader title="Integraciones" />
      <div className="flex-1 min-h-0 overflow-y-auto p-6">

        {/* ── Google Drive ── */}
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-1">
            <GoogleDriveIcon />
            Almacenamiento y documentos
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            Vincula archivos de Google Drive a leads, clientes y oportunidades.
          </p>

          {(driveConnected || driveError) && (
            <div className={[
              "mb-4 rounded-lg px-4 py-3 text-sm border",
              driveConnected
                ? "bg-green-950 border-green-800 text-green-300"
                : "bg-red-950 border-red-800 text-red-300",
            ].join(" ")}>
              {driveConnected
                ? "Google Drive conectado correctamente."
                : `Error al conectar Google Drive${driveError !== "1" ? ` (${driveError})` : ""}. Inténtalo de nuevo.`}
            </div>
          )}

          <div className="relative max-w-sm">
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <GoogleDriveIcon />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">Google Drive</CardTitle>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Busca y vincula archivos de Drive desde cada registro del CRM.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  {driveStatusLoading ? (
                    <Badge className="bg-slate-800 text-slate-400 border-slate-700 animate-pulse">Cargando...</Badge>
                  ) : isDriveConnected ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">Conectado</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">Desconectado</Badge>
                  )}
                  <Badge className="bg-orange-950/40 text-orange-400 border-orange-800 text-xs">Plan Equipo</Badge>
                </div>

                {isDriveConnected && driveConnectedAt && (
                  <p className="text-xs text-slate-400 mb-3">
                    Conectado {formatDate(driveConnectedAt)}
                  </p>
                )}

                {isDriveConnected ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => driveDisconnectMutation.mutate()}
                    disabled={driveDisconnectMutation.isPending}
                  >
                    {driveDisconnectMutation.isPending ? "Desconectando..." : "Desconectar"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-500 text-white"
                    onClick={handleDriveConnect}
                    disabled={driveConnecting || !driveAllowed}
                  >
                    {driveConnecting ? "Redirigiendo..." : "Conectar con Google"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Plan upgrade overlay */}
            {!driveAllowed && (
              <div className="absolute inset-0 rounded-xl bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-4">
                <p className="text-sm font-semibold text-slate-200 text-center">
                  Disponible en Plan Equipo
                </p>
                <p className="text-xs text-slate-400 text-center">
                  Actualiza tu plan para conectar Google Drive y vincular documentos.
                </p>
                <a
                  href="/precios"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  Actualizar plan →
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Plug className="h-5 w-5 text-orange-400" />
            Canales de comunicación
          </h2>
          <p className="mt-1 text-slate-400">
            Conecta tus canales de comunicación para centralizar la gestión en el CRM.
          </p>
        </div>

        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300">
            {successMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-slate-200">Cargando integraciones...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {CHANNELS.map((channel) => {
              const integration = findIntegration(channel.channel_type);
              const isConnected = integration?.status === 'connected';
              const isFormOpen = activeChannel === channel.channel_type;

              return (
                <div key={channel.channel_type}>
                  <Card className="h-full bg-slate-950">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="flex-shrink-0">{channel.icon}</span>
                          <div>
                            <CardTitle className="text-base">{channel.label}</CardTitle>
                            <p className="text-xs text-slate-300 mt-0.5">
                              {channel.description}
                            </p>
                          </div>
                        </div>
                        {channel.guide && (
                          <button
                            onClick={() => setGuideChannel(channel)}
                            className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-300 hover:text-slate-400 transition-colors pt-0.5"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Guía</span>
                          </button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-3">
                        {integration ? statusBadge(integration.status) : statusBadge('disconnected')}
                        {isConnected && integration?.connected_at && (
                          <span className="text-xs text-slate-400">
                            Conectado {formatDate(integration.connected_at)}
                          </span>
                        )}
                      </div>

                      {channel.comingSoon ? (
                        <Badge className="bg-slate-100 text-slate-500 border-slate-200">Próximamente</Badge>
                      ) : isConnected ? (
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="text-green-600 border-green-300" disabled>
                            Configurado &#10003;
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testMutation.mutate(integration!.id)}
                            disabled={testMutation.isPending}
                          >
                            {testMutation.isPending ? 'Probando...' : 'Test'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => disconnectMutation.mutate(integration!.id)}
                            disabled={disconnectMutation.isPending}
                          >
                            {disconnectMutation.isPending ? 'Desconectando...' : 'Desconectar'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleOpenForm(channel.channel_type)}
                          variant={isFormOpen ? 'outline' : 'default'}
                          className={!isFormOpen ? 'bg-orange-600 hover:bg-orange-500 text-white' : ''}
                        >
                          {isFormOpen ? 'Cancelar' : 'Conectar'}
                        </Button>
                      )}

                      {/* Connection form */}
                      {isFormOpen && !isConnected && (
                        <div className="mt-4 border-t border-slate-800 pt-4 space-y-3">
                          {errorMessage && (
                            <p className="text-xs text-red-500">{errorMessage}</p>
                          )}
                          {channel.fields.map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs font-medium text-slate-400 mb-1">
                                {field.label}
                              </label>
                              <Input
                                type={field.type || 'text'}
                                placeholder={field.placeholder}
                                readOnly={field.readonly}
                                value={field.readonly ? (field.placeholder || '') : (formData[field.key] || '')}
                                onChange={field.readonly ? undefined : (e) =>
                                  setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                                }
                                className={field.readonly ? 'bg-slate-900 text-slate-500' : ''}
                              />
                              {field.helpText && (
                                <p className="mt-1 text-xs text-slate-500">{field.helpText}</p>
                              )}
                            </div>
                          ))}
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-orange-600 hover:bg-orange-500 text-white"
                            onClick={() => handleConnect(channel)}
                            disabled={connectMutation.isPending || createMutation.isPending}
                          >
                            {connectMutation.isPending || createMutation.isPending
                              ? 'Conectando...'
                              : 'Guardar y conectar'}
                          </Button>
                        </div>
                      )}

                      {integration?.error_message && (
                        <p className="mt-2 text-xs text-red-500">{integration.error_message}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent activity */}
        {allConnectedLogs.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-4">Actividad reciente</h2>
            <Card className="bg-slate-950 border-slate-800">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Canal</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Tipo</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Dirección</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Contenido</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Estado</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-400">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allConnectedLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b border-slate-800 last:border-0 hover:bg-slate-900"
                        >
                          <td className="px-4 py-3 text-slate-300">{log.channelLabel}</td>
                          <td className="px-4 py-3 text-slate-400">{log.message_type || '—'}</td>
                          <td className="px-4 py-3">
                            <Badge className={log.direction === 'inbound'
                              ? 'bg-orange-950/40 text-orange-400 border-orange-800'
                              : 'bg-purple-950/40 text-purple-400 border-purple-800'
                            }>
                              {log.direction === 'inbound' ? 'Entrante' : 'Saliente'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-slate-400">
                            {log.content || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={log.status === 'success'
                              ? 'bg-green-950/40 text-green-400 border-green-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                            }>
                              {log.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && integrations.filter((i) => i.status === 'connected').length === 0 && (
          <div className="mt-10 text-center text-slate-400 text-sm">
            No hay actividad reciente. Conecta un canal para empezar a ver logs aquí.
          </div>
        )}
      </div>
    </>
  );
}
