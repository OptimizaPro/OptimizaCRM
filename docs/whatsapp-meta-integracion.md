# Integración WhatsApp Business API (Meta) — Guía Completa

**Proyecto:** OptimizaCRM  
**Audiencia:** Equipo OptimizaPro (uso interno para onboarding de clientes)  
**Última actualización:** Noviembre 2026

> **Nota operativa:** Este proceso debe hacerlo el equipo de OptimizaPro por cuenta del cliente.
> Es técnicamente complejo, requiere acceso a Meta for Developers y toma entre 30-90 minutos
> la primera vez. Los clientes no técnicos no pueden hacerlo solos.

---

## Resumen del flujo

```
1. Crear cuenta Meta for Developers
2. Crear app de tipo "Business" en Meta
3. Agregar producto WhatsApp a la app
4. Verificar el número de teléfono del cliente (OTP)
5. Configurar webhook en Meta (URL de OptimizaCRM)
6. Obtener Access Token permanente
7. Obtener Phone Number ID y WABA ID
8. Ingresar credenciales en OptimizaCRM → Integraciones
9. Suscribirse a eventos de webhook
10. Enviar mensaje de prueba
```

---

## Pre-requisitos

Antes de empezar necesitas tener a mano:

- [ ] Acceso a la cuenta de **Facebook Business Manager** del cliente (o crear una)
- [ ] El **número de teléfono** que usará para WhatsApp Business (ej. `+502 5712 2606`)
  - El número NO puede tener WhatsApp Personal activo (si lo tiene, debe desactivarlo primero)
  - El número SÍ puede tener WhatsApp Business activo — se migra con OTP
- [ ] Acceso al teléfono físico para recibir el **código OTP** por SMS o llamada
- [ ] La cuenta de OptimizaCRM del cliente ya creada y activa
- [ ] Tu propia cuenta de Facebook con acceso de administrador al Business Manager del cliente

---

## PASO 1 — Crear la App en Meta for Developers

### 1.1 Acceder al portal

Ve a: **[https://developers.facebook.com](https://developers.facebook.com)**

Inicia sesión con la cuenta de Facebook que tiene acceso al Business Manager del cliente.

### 1.2 Crear nueva app

1. Click en **"Mis apps"** → **"Crear app"**
2. En "¿Cuál es el caso de uso de tu app?", selecciona **"Otro"**
3. Click **"Siguiente"**
4. En tipo de app selecciona **"Business"**
5. Click **"Siguiente"**
6. Rellena:
   - **Nombre de la app:** `OptimizaCRM - [Nombre del cliente]`  
     ej. `OptimizaCRM - Restaurante El Fogón`
   - **Email de contacto:** tu email o el del cliente
   - **Cuenta de Business Manager:** selecciona la del cliente
7. Click **"Crear app"**

> Si te pide verificación de identidad (selfie o documento), complétala antes de continuar.

---

## PASO 2 — Agregar WhatsApp a la App

### 2.1 Desde el dashboard de la app

1. En el panel izquierdo busca **"Agregar productos"** o ve a **"Panel"** y busca la sección de productos
2. Encuentra **"WhatsApp"** y click en **"Configurar"**
3. Selecciona la **cuenta de WhatsApp Business (WABA)** del cliente, o crea una nueva
4. Click **"Continuar"**

Ahora deberías ver en el menú izquierdo: **WhatsApp → Inicio**

---

## PASO 3 — Paso 1: Número de prueba y configuración básica

En WhatsApp → Inicio verás dos pasos: **"Paso 1"** y **"Paso 2"**.

### 3.1 Generar Verify Token

Antes de tocar nada en Meta, genera el verify token en OptimizaCRM:

1. Ve a **OptimizaCRM → Integraciones**
2. Click **"Conectar"** en la integración de WhatsApp
3. En el campo **"Verify Token"** escribe algo único y memorable:  
   - Formato recomendado: `optimizacrm_[nombre_cliente]_wa`  
   - Ejemplo: `optimizacrm_fogon_wa`
4. Click **"Conectar"** (guarda solo el verify token por ahora — no es necesario tener el token de acceso aún)

### 3.2 Configurar Webhook (URL de devolución de llamada)

De vuelta en Meta → WhatsApp → Inicio → Paso 1:

1. Click en **"Configurar webhooks"** (o busca la sección "Webhook")
2. En **"URL de devolución de llamada"** pega:
   ```
   https://api.optimizacrm.com/api/v1/webhooks/whatsapp/
   ```
3. En **"Token de verificación"** pega el mismo verify token que usaste en el paso anterior  
   ej. `optimizacrm_fogon_wa`
4. Click **"Verificar y guardar"**

**Debe aparecer una palomita verde.** Si falla, verifica:
- Que el verify token en OptimizaCRM y en Meta sean exactamente iguales (sin espacios)
- Que el backend de OptimizaCRM esté corriendo y accesible en Railway

> **Truco:** Si ves "No se pudo validar la URL", primero guarda la integración en OptimizaCRM solo
> con el verify token (sin access token ni phone number ID) y luego intenta la verificación.
> El webhook debe poder encontrar la integración por verify token incluso sin estar "connected".

---

## PASO 4 — Paso 2: Registrar el número real del cliente

### 4.1 Acceder a Paso 2

En Meta → WhatsApp → Inicio, click en **"Paso 2: Agregar número de teléfono"**

> **Problema común:** A veces no aparece el menú "Configuración de API" en el sidebar.
> Si pasa esto, ve directamente por URL:
> `https://business.facebook.com/wa/manage/phone-numbers/`
> o busca en Meta Business Suite → WhatsApp Manager

### 4.2 Agregar el número

1. Click en **"Agregar número de teléfono"**
2. Rellena:
   - **Nombre de la empresa:** nombre del cliente tal como aparecerá en WhatsApp
   - **Categoría:** elige la más apropiada (Retail, Servicios, etc.)
   - **Número de teléfono:** con código de país, sin espacios  
     ej. `+50257122606`
   - **Zona horaria y zona geográfica**
3. Click **"Siguiente"**

### 4.3 Verificar el número con OTP

1. Elige el método de verificación:
   - **SMS** (recomendado si funciona)
   - **Llamada de voz** (alternativa si el SMS no llega)
2. Click **"Enviar código"**
3. Ingresa el código de 6 dígitos que llegó al teléfono
4. Click **"Siguiente"**

> **Si el número ya tiene WhatsApp Business activo:** Meta lo detectará y pedirá que confirmes
> que quieres migrar el número. Acepta y procede con el OTP. El WhatsApp Business existente
> quedará inactivo durante la migración (tarda ~5 minutos).

> **Si aparece el número dos veces en la lista** (una vez registrado y otra sin verificar),
> usa el que muestra status **"Registrado"** — ignora el otro.

---

## PASO 5 — Obtener el Access Token

### 5.1 Usar Graph API Explorer

La forma más rápida es mediante el **Graph API Explorer** de Meta:

1. Ve a: **[https://developers.facebook.com/tools/explorer/](https://developers.facebook.com/tools/explorer/)**
2. En la esquina superior derecha, selecciona tu app (`OptimizaCRM - [cliente]`)
3. Click en **"Generar token de acceso"**
4. Se abrirá una ventana de permisos. Busca y activa:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Click **"Generar token"**
6. Acepta los permisos en el popup
7. Copia el token generado

> **Importante:** Este token dura ~60 días. Ver sección "Token permanente" más abajo para el token definitivo.

> **Si aparece "No hay permisos disponibles":** No uses "Usuario Global del sistema". En su lugar,
> usa directamente el Graph API Explorer con tu usuario de Facebook administrador de la app.

### 5.2 Token de sistema permanente (recomendado para producción)

Para no tener que renovar el token cada 60 días:

1. Ve a **Meta Business Suite** → **Configuración del negocio**
2. En el menú izquierdo: **Usuarios** → **Usuarios del sistema**
3. Click **"Agregar"**
   - Nombre: `OptimizaCRM Bot`
   - Rol: **Admin**
4. Click en el usuario creado → **"Generar token nuevo"**
5. Selecciona la app de WhatsApp
6. Activa permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
7. En **"Vencimiento del token"** selecciona: **"Nunca"**
8. Copia el token

> **Si el sistema user no puede seleccionar permisos de WhatsApp**, primero asegúrate de que
> el usuario del sistema esté asignado como admin del WABA. Ve a:
> Business Suite → Configuración → Cuentas de WhatsApp Business → selecciona la WABA →
> Agregar personas → agrega el usuario del sistema con rol Admin.

---

## PASO 6 — Obtener Phone Number ID y WABA ID

### 6.1 Phone Number ID

En Meta → tu app → WhatsApp → Configuración de API (o Inicio → Paso 1):

1. En la sección "Desde" hay un dropdown con los números disponibles
2. Selecciona el número del cliente
3. Debajo del número verás el **Phone Number ID**  
   Ejemplo: `347749918402187`
4. Cópialo

Alternativa vía API:
```
GET https://graph.facebook.com/v19.0/me/phone_numbers
Authorization: Bearer {access_token}
```

### 6.2 WABA ID (WhatsApp Business Account ID)

En Meta → tu app → WhatsApp → Configuración de API:

1. Busca la sección **"Cuenta de WhatsApp Business"**
2. Verás el **WABA ID**  
   Ejemplo: `301314169735926`
3. Cópialo

Alternativa vía API:
```
GET https://graph.facebook.com/v19.0/me?fields=id,name
Authorization: Bearer {access_token}
```

---

## PASO 7 — Configurar en OptimizaCRM

### 7.1 Completar la integración

1. Ve a **OptimizaCRM → Integraciones → WhatsApp**
2. Click en **"Configurar"** o edita la integración existente
3. Rellena todos los campos:
   - **Verify Token:** el que creaste en Paso 3.1 (ya guardado)
   - **Phone Number ID:** el del Paso 6.1
   - **Access Token:** el del Paso 5
   - **WABA ID:** el del Paso 6.2
4. Click **"Conectar"**
5. El status debe cambiar a **"Conectado"** (badge verde)

### 7.2 Verificar campos mínimos

| Campo | Dónde obtenerlo | Ejemplo |
|-------|----------------|---------|
| Verify Token | Lo defines tú | `optimizacrm_fogon_wa` |
| Phone Number ID | Meta → App → WhatsApp | `347749918402187` |
| Access Token | Graph API Explorer o Usuario de Sistema | `EAAxxxx...` |
| WABA ID | Meta → App → WhatsApp | `301314169735926` |

---

## PASO 8 — Suscribir Webhook a Eventos

Este paso es crítico — sin él los mensajes entrantes no llegarán.

### 8.1 Suscribir el número

En Meta → tu app → WhatsApp → Configuración (o Inicio → Paso 1):

1. Busca la sección **"Webhooks"** o **"Suscripciones al webhook"**
2. Click **"Administrar"** o **"Suscribirse a campos"**
3. Activa el campo **`messages`** (es el principal)
4. Opcionalmente activa también: `message_deliveries`, `message_reads`
5. Click **"Guardar"**

### 8.2 Suscribir la cuenta WABA

Algunos setups requieren también:

```
POST https://graph.facebook.com/v19.0/{WABA_ID}/subscribed_apps
Authorization: Bearer {access_token}
```

---

## PASO 9 — Verificación de negocio (para producción)

### ¿Por qué es necesaria?

Sin verificación de negocio, la app de Meta está en modo **"Sin publicar"**. Esto significa:
- Solo los administradores de la app pueden enviar/recibir mensajes
- No puedes enviar mensajes a números que no estén en tu lista de prueba

### 9.1 Iniciar verificación

1. Ve a **Meta Business Suite** → **Configuración del negocio** → **Verificación del negocio**
2. Click **"Iniciar verificación"**
3. Proporciona:
   - Nombre legal de la empresa
   - Sitio web de la empresa
   - Número de teléfono de la empresa
   - Documento de verificación (registro mercantil, factura de servicios, etc.)

### 9.2 Publicar la app

Una vez verificado el negocio:

1. Ve a **Meta for Developers** → tu app → **Panel de la app**
2. En la sección **"Estado de la app"** o arriba en el banner, click **"Publicar"**
3. Responde las preguntas sobre el uso de la app

> **Tiempo de verificación:** Generalmente 1-5 días hábiles. Meta puede pedir más documentación.

> **Mientras está sin publicar:** La integración FUNCIONA pero solo para números de teléfono
> que tengan rol de administrador/desarrollador en la app de Meta.

---

## PASO 10 — Prueba final

### 10.1 Enviar mensaje de prueba

1. Desde cualquier teléfono que sea admin de la app, envía un WhatsApp al número del cliente
2. Ve a **OptimizaCRM → WhatsApp → Conversaciones**
3. El mensaje debe aparecer en la bandeja en ~2-3 segundos

### 10.2 Probar respuesta

1. Selecciona la conversación en OptimizaCRM
2. Escribe una respuesta y click "Enviar"
3. El mensaje debe llegar al teléfono

### 10.3 Si los mensajes no llegan — checklist

- [ ] ¿El webhook está verificado? (palomita verde en Meta)
- [ ] ¿La suscripción al campo `messages` está activa?
- [ ] ¿El access token es válido? (prueba en Graph API Explorer con `GET /me`)
- [ ] ¿El Phone Number ID corresponde al número registrado?
- [ ] ¿El número del teléfono que envía es admin de la app? (si la app está sin publicar)
- [ ] ¿El backend de Railway está corriendo? (`GET https://api.optimizacrm.com/api/v1/health/`)

---

## Problemas conocidos y soluciones

### "No se pudo validar la URL de devolución de llamada"

**Causa:** OptimizaCRM no encontró ninguna integración con ese verify token.  
**Solución:** Primero guarda la integración en OptimizaCRM con solo el verify token (sin access token) → luego vuelve a Meta y verifica. El sistema busca el token en CUALQUIER integración de WhatsApp, esté o no conectada.

### El número aparece dos veces en Meta

**Causa:** Se intentó agregar el número dos veces, o quedó una entrada sin verificar de un intento anterior.  
**Solución:** Usa siempre el que tiene status **"Registrado"** (Registered). El Phone Number ID del registrado es el válido.

### "No hay permisos disponibles" al generar token con Usuario del Sistema

**Causa:** El usuario del sistema no está asignado como admin del WABA.  
**Solución:** Ve a Meta Business Suite → Configuración → Cuentas de WhatsApp Business → selecciona el WABA → Agregar personas → agrega el usuario del sistema con rol Admin. Luego intenta generar el token de nuevo.

### El número ya tiene WhatsApp Business activo

**Situación normal.** Meta te pedirá migrar el número. El proceso desactiva el WhatsApp Business existente y lo migra a la API. Dura ~5 minutos. Durante ese tiempo el número no recibe mensajes.

### No encuentro "Configuración de API" en el menú de Meta

**Causa:** Bug de la UI de Meta — a veces el menú de WhatsApp no muestra todas las opciones.  
**Solución:** Accede directamente por URL:
- Gestión de números: `https://business.facebook.com/wa/manage/phone-numbers/`
- Gestión de webhooks: dentro del dashboard de la app en developers.facebook.com

### El token expira después de 60 días

**Causa:** El token fue generado desde Graph API Explorer (token de usuario).  
**Solución a largo plazo:** Crear un **Usuario del Sistema** con token que no expira (ver Paso 5.2).  
**Solución inmediata:** Volver al Graph API Explorer y regenerar el token → actualizar en OptimizaCRM → Integraciones.

---

## Tiempos estimados por tarea

| Tarea | Tiempo |
|-------|--------|
| Crear app en Meta | 5-10 min |
| Configurar webhook | 5 min |
| Registrar número + OTP | 5-10 min |
| Generar access token | 5 min |
| Configurar en OptimizaCRM | 5 min |
| Verificación de negocio (espera) | 1-5 días |
| **Total (sin esperas)** | **30-45 min** |

---

## Credenciales del cliente — qué guardar

Una vez completada la integración, documenta y guarda de forma segura:

```
Cliente: [Nombre]
App Meta ID: [xxxxxxxxxxxxxxx]
Phone Number ID: [xxxxxxxxxxxxxxx]
WABA ID: [xxxxxxxxxxxxxxx]
Verify Token: optimizacrm_[cliente]_wa
Access Token: EAAxxxxxxxx... (vence: [fecha] o "Nunca")
Número WhatsApp: +502 xxxx xxxx
```

> Guarda esto en la ficha del cliente en Pipedrive o en el gestor de contraseñas del equipo.

---

## Checklist de onboarding completo

### Antes de la sesión con el cliente

- [ ] Acceso a Business Manager del cliente confirmado
- [ ] Número de teléfono definido y disponible
- [ ] Cuenta OptimizaCRM del cliente activa con plan Pro o superior

### Durante la sesión

- [ ] App de Meta creada
- [ ] WhatsApp agregado como producto
- [ ] Verify token guardado en OptimizaCRM
- [ ] Webhook verificado (palomita verde)
- [ ] Número registrado con OTP
- [ ] Access token generado
- [ ] Phone Number ID y WABA ID copiados
- [ ] Integración completada en OptimizaCRM (status: Conectado)
- [ ] Suscripción al campo `messages` activa
- [ ] Mensaje de prueba enviado y recibido en OptimizaCRM
- [ ] Verificación de negocio iniciada (si no estaba)

### Post-sesión

- [ ] Credenciales guardadas en ficha del cliente
- [ ] Recordatorio en calendario para renovar token (~50 días) si no es permanente
- [ ] Cliente informado de que la app puede estar "sin publicar" hasta que Meta verifique el negocio
