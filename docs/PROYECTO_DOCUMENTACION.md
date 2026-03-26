# 📋 KyrosBarber — Documentación Completa del Proyecto

> **Última actualización:** Marzo 2026  
> **Propósito:** Documento de contexto para uso con IA. Describe toda la arquitectura, componentes, base de datos y flujos del sistema.

---

## 🎯 Descripción General

**KyrosBarber** es una plataforma SaaS (Software as a Service) para gestión de barberías. Permite a los dueños administrar sus sucursales, empleados, clientes, citas y estadísticas desde un panel de control web. Los clientes finales pueden agendar citas en línea a través de un chatbot web integrado.

### Stack Tecnológico
| Capa | Tecnología |
|------|-----------|
| **Frontend** | Angular 21 (Standalone Components, TypeScript) |
| **Backend / BaaS** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **Pagos** | Stripe (Checkout Sessions + Connect para sucursales) |
| **IA del Dashboard** | Google Gemini 2.5 Flash via Edge Function |
| **Chatbot IA (n8n)** | n8n + WhatsApp Business API (external) |
| **Estilos** | Angular Material + SCSS personalizado |
| **Hosting** | Railway (frontend) + Supabase (backend) |

---

## 🗂️ Estructura de Carpetas del Proyecto

```
kyros-web final2/
├── src/
│   └── app/
│       ├── pages/           # Módulos de páginas (vistas)
│       │   ├── landing/     # Página de inicio pública
│       │   ├── auth/        # Login, Register, RenewSubscription
│       │   ├── onboarding/  # Flujo de configuración inicial
│       │   ├── dashboard/   # Panel principal (protegido)
│       │   ├── chatbot/     # Chatbot de reservas público
│       │   └── reception/   # Vista de recepción
│       ├── services/        # Servicios Angular inyectables
│       ├── models/          # Interfaces TypeScript (tipos de datos)
│       ├── guards/          # Guards de rutas (auth)
│       └── components/      # Componentes reutilizables
├── supabase/
│   └── functions/           # Edge Functions de Supabase (Deno)
└── docs/                    # Esta documentación
```

---

## 🛣️ Rutas de la Aplicación

| Ruta | Componente | Acceso | Descripción |
|------|-----------|--------|-------------|
| `/` | `Landing` | Público | Página de inicio con planes y funcionalidades |
| `/login` | `Login` | Público | Inicio de sesión |
| `/register` | `Register` | Público | Registro (nombre, email, contraseña) |
| `/onboarding` | `Onboarding` | Auth requerido | Configuración inicial del negocio (plan + sucursal) |
| `/renew-subscription` | `RenewSubscription` | Auth requerido | Renovar/cambiar plan |
| `/dashboard/calendar` | `Calendar` | Auth requerido | Calendario de citas (vista principal) |
| `/dashboard/services` | `Services` | Auth requerido | Gestión de servicios |
| `/dashboard/employees` | `Employees` | Auth requerido | Gestión de empleados |
| `/dashboard/branches` | `Branches` | Auth requerido | Gestión de sucursales + Stripe Connect |
| `/dashboard/clients` | `Clients` | Auth requerido | Lista de clientes |
| `/dashboard/statistics` | `Statistics` | Auth requerido | Estadísticas e ingresos |
| `/dashboard/profile` | `Profile` | Auth requerido | Perfil del usuario y suscripción |
| `/reception` | `Reception` | Auth requerido | Vista simplificada de recepcionista |
| `/chat/:sucursalId` | `ChatbotPage` | **Público** | Chatbot de reservas para clientes |

---

## 🔑 Autenticación y Control de Acceso

### Auth Guard (`auth-guard.ts`)
- Usa `AuthService.session$` para verificar sesión activa
- Si no hay sesión → redirige a `/login`
- Si el email no está verificado → hace signOut y redirige a `/login?error=email_not_verified`

### Tipos de Cuenta
| Tipo | Descripción | Cómo identificarlo |
|------|-------------|-------------------|
| **Dueño** | Administra todas las sucursales del negocio | `usuarios_perfiles.rol = 'owner'` |
| **Sucursal** | Solo ve su propia sucursal | `usuarios_perfiles.rol = 'branch'` |

> **Regla del dashboard:** Si eres dueño, ves datos de TODAS tus sucursales. Si eres cuenta sucursal, solo ves los datos de TU sucursal.

### Flujo de Login
1. Usuario ingresa credenciales → `AuthService.signIn()`
2. `dashboard.ts` lee el perfil del usuario → determina si es `owner` o `branch`
3. Si es `branch` → filtra todo por `sucursal_id`
4. Si hay suscripción vencida → redirige a `/renew-subscription`

---

## 🗄️ Base de Datos (Supabase / PostgreSQL)

**Proyecto Supabase ID:** `qyyhembukflbxjbctuav`  
**URL:** `https://qyyhembukflbxjbctuav.supabase.co`

### Tablas del Esquema `public`

#### `negocios`
Representa una empresa/barbería registrada en la plataforma.
```
id (int), nombre (text), created_at, stripe_customer_id (text)
```

#### `planes`
Planes de suscripción disponibles (3 planes).
```
id, codigo ('free'|'basic'|'regular'), nombre, precio_mxn, 
limite_sucursales, limite_empleados_por_sucursal, descripcion, activo
```
| ID | Código | Nombre | Precio | Sucursales | Empleados/Sucursal |
|----|--------|--------|--------|------------|-------------------|
| 1 | free | Gratuito | $0 | 1 | 2 |
| 2 | basic | Básico | $219 MXN | 2 | 4 |
| 3 | regular | Avanzado | $499 MXN | 6 | 8 |

#### `negocio_suscripciones`
Estado de suscripción de cada negocio.
```
negocio_id, plan_id, estado ('trial'|'active'|'past_due'|'canceled'|'free'),
tipo_chatbot ('web'|'whatsapp'), fecha_fin_prueba, fecha_fin_periodo,
stripe_subscription_id, created_at, updated_at
```

#### `sucursales`
Sucursales de un negocio.
```
id, nombre, direccion, telefono, negocio_id,
cuenta_email, cuenta_password (credenciales de acceso de la sucursal),
stripe_account_id (ID de cuenta Stripe Connect),
stripe_onboarding_complete (bool)
```

#### `usuarios_perfiles`
Perfiles de todos los usuarios del sistema (dueños y cuentas sucursal).
```
id (uuid - mismo que auth.users), nombre_completo, email,
negocio_id, sucursal_id (null si es owner), rol ('owner'|'branch'),
avatar_url, created_at
```

#### `empleados`
Empleados de cada sucursal.
```
id, nombre, especialidad, sucursal_id, negocio_id, user_id (auth)
```

#### `servicios`
Catálogo de servicios por sucursal.
```
id, negocio_id, sucursal_id, nombre, descripcion, precio_base,
duracion_aprox_minutos, imagen_url, link_pago, created_at
```

#### `citas`
Reservas/citas del sistema.
```
id, negocio_id, sucursal_id, empleado_id, cliente_id,
nombre_cliente_manual, fecha_hora_inicio, fecha_hora_fin,
estado ('confirmada'|'cancelada'|'completada'|'pendiente'|'en_proceso'|'pendiente_pago'),
tipo ('manual'|'chatbot'), auto_cancelada (bool),
estado_pago ('pendiente'|'pagado'|'reembolsado'),
total_pagado, monto_total, telefono, servicio,
stripe_payment_intent_id, created_at
```

#### `citas_servicios`
Relación N:M entre citas y servicios.
```
id, cita_id, servicio_id, precio_actual
```

#### `empleado_servicios`
Qué servicios puede realizar cada empleado.
```
empleado_id, servicio_id
```

#### `clientes_bot`
Clientes captados via chatbot.
```
id, nombre, telefono, plataforma ('web'|'whatsapp'), chat_id, negocio_id, sucursal_id
```

#### `horarios_sucursal`
Horarios de atención por sucursal y día.
```
id, sucursal_id, dia_semana (0=Dom...6=Sáb), hora_inicio, hora_fin,
hora_descanso_inicio, duracion_descanso_minutos
```

#### `chat_histories` / `n8n_chat_histories`
Historial de conversaciones del chatbot de IA del dashboard y de n8n (WhatsApp).

---

## ⚙️ Servicios Angular

### `AuthService` (`auth.ts`)
- Maneja sesión con `BehaviorSubject<Session>`
- `signIn()`, `signUp()`, `signOut()`
- Auto-refresh de sesión al volver a la app

### `SupabaseService` (`supabase.service.ts`)
- Singleton del cliente Supabase
- Expone `client` para consultas directas

### `BookingService` (`booking.service.ts`)
- Gestiona el estado del chatbot de reservas web
- Pasos: `welcome → services → details → customer_info → datetime → employee → confirm → payment → done`
- Calcula disponibilidad de slots horarios
- Crea citas en la DB y genera links de pago Stripe

### `SubscriptionService` (`subscription.service.ts`)
- `createCheckoutSession(priceId, negocioId)` → llama Edge Function `create-checkout` → redirige a Stripe
- `getSubscriptionStatus(negocioId)` → consulta estado actual del plan

### `ThemeService` (`theme.service.ts`)
- Gestiona modo claro/oscuro
- Persiste preferencia en `localStorage`

---

## 🚀 Edge Functions (Supabase / Deno)

Todas las funciones están en: `supabase/functions/`

### `ai-chat`
**Propósito:** Chatbot de IA para el dashboard del dueño (no para clientes finales)  
**Modelo:** Google Gemini 2.5 Flash (`gemini-2.5-flash`)  
**Parámetros:** `{ message, negocio_id, sucursal_id? }`  
**Contexto que inyecta:**
- Datos de sucursales, empleados, servicios del negocio
- Citas de los últimos 45 días y próximas 45 días
- Estadísticas de ingresos
- **Si es cuenta dueño (`sucursal_id` = null):** Incluye datos de TODAS las sucursales
- **Si es cuenta sucursal (`sucursal_id` presente):** Solo datos de esa sucursal

### `create-checkout`
**Propósito:** Crear sesión de pago en Stripe para suscripción de planes  
**Parámetros:** `{ price_id, negocio_id }`  
**Flujo:** Stripe → pago → webhook → actualiza `negocio_suscripciones`  
**Destino del dinero:** Cuenta Stripe principal del dueño de la plataforma (Emir)

### `create-appointment-checkout`
**Propósito:** Crear link de pago de Stripe para una cita específica  
**Parámetros:** `{ cita_id, sucursal_id, monto }`  
**Destino del dinero:** Cuenta Stripe Connect de la sucursal

### `stripe-connect-onboarding`
**Propósito:** Generar link de onboarding de Stripe Express para que una sucursal conecte su cuenta bancaria  
**Parámetros:** `{ sucursal_id, return_url, refresh_url }`  
**Flujo:** Crear/recuperar `stripe_account_id` → generar `accountLink` → redirigir a Stripe Express

### `stripe-webhook`
**Propósito:** Recibir eventos de Stripe y actualizar la base de datos  
**URL registrada en Stripe:** `https://qyyhembukflbxjbctuav.supabase.co/functions/v1/stripe-webhook`  
**Eventos que maneja:**
- `checkout.session.completed` con `type = 'appointment'` → actualiza estado de cita a `confirmada`
- `checkout.session.completed` con `type = 'subscription'` → actualiza `negocio_suscripciones`
- `account.updated` → actualiza `stripe_onboarding_complete` en la sucursal cuando completa su onboarding

### `create-branch-user`
**Propósito:** Crear usuario en Supabase Auth para una cuenta de sucursal  
**Parámetros:** `{ email, password, sucursalId, negocioId }`  
**Crea:** Usuario en `auth.users` + perfil en `usuarios_perfiles` con `rol = 'branch'`

### `manage-branch-user`
**Propósito:** Actualizar usuario de sucursal (cambiar contraseña, email)

### `refund-appointment`
**Propósito:** Procesar reembolso de Stripe cuando se cancela una cita pagada

---

## 💳 Integración de Pagos (Stripe)

### Arquitectura de Pagos
```
┌─────────────────────────────────────────────────┐
│  CUENTAS STRIPE                                  │
│                                                  │
│  Tu cuenta principal (Emir)                      │
│  ┌────────────┐                                  │
│  │ Suscripciones │ ← Pagos de planes Kyros       │
│  │ de planes     │   ($219 y $499 MXN/mes)       │
│  └────────────┘                                  │
│                                                  │
│  Cuentas Connect (por sucursal)                  │
│  ┌────────────┐  ┌────────────┐                  │
│  │ Sucursal A │  │ Sucursal B │ ← Pagos de citas │
│  └────────────┘  └────────────┘                  │
└─────────────────────────────────────────────────┘
```

### Variables de Entorno en Supabase (Secrets)
| Variable | Descripción |
|-----------|-----------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (test) o `sk_live_...` (producción) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` o `pk_live_...` |
| `STRIPE_WEBHOOK_SIGNATURE` | `whsec_...` (secreto del webhook en Stripe) |
| `GEMINI_API_KEY` | API Key de Google Gemini |
| `GOOGLE_AI_API_KEY` | API Key alternativa para Gemini |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave anónima pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave con permisos de servicio (solo backend) |

### Webhook de Stripe
- **Nombre:** `energetic-euphoria`
- **Estado:** ✅ Activo
- **Eventos:** `checkout.session.completed`, `account.updated`

---

## 🤖 Chatbots

### Chatbot Web de Reservas (`/chat/:sucursalId`)
- **Componente:** `ChatbotPage` + `BookingService`
- **Público** (sin autenticación)
- Flujo de reserva paso a paso: seleccionar servicio → ingresar datos → elegir fecha/hora → empleado → confirmar → pago (opcional)
- Consulta directamente Supabase para disponibilidad de horarios
- Puede generar link de pago Stripe para depósito

### Chatbot IA del Dashboard
- **Edge Function:** `ai-chat`
- **Modelo:** Gemini 2.5 Flash
- **Acceso:** Solo usuarios autenticados en el dashboard
- **Qué sabe:** Citas, ingresos, empleados, servicios, clientes dentro de un rango de 45 días pasados y 45 futuros
- **Restricción por rol:** Dueño ve todo el negocio, sucursal solo ve su propia información

### Chatbot WhatsApp (n8n) - Externo
- Implementado en n8n (plataforma de automatización externa)
- Se conecta a la misma base de datos Supabase
- Utiliza WhatsApp Business API
- La tabla `n8n_chat_histories` guarda el historial de conversaciones
- Puede hacer reservas y cobrar citas igual que el chatbot web

---

## 📊 Planes y Restricciones

| Plan | Precio | Sucursales | Empleados/Sucursal | Asistente IA | Chatbot Web |
|------|--------|------------|-------------------|--------------|------------|
| **Gratuito** | $0 (7 días de prueba) | 1 | 2 | ❌ | ✅ |
| **Básico** | $219 MXN/mes | 2 | 4 | ❌ | ✅ |
| **Avanzado** | $499 MXN/mes | 6 | 8 | ✅ | ✅ |

Todos los planes incluyen:
- Sistema de reservas para clientes
- Calendario de citas en tiempo real
- Gestión de servicios y empleados
- Estadísticas de ingresos
- Actualizaciones automáticas
- Pagos con Stripe

---

## 🔄 Flujos Principales

### Flujo de Registro (Nuevo Negocio)
```
/register → Crear cuenta (email, password, nombre)
         → Verificar correo
         → /login
         → /onboarding → Elegir plan → Configurar sucursal
         → /dashboard/calendar
```

### Flujo de Suscripción
```
Perfil / Onboarding → Seleccionar plan
                    → create-checkout (Edge Function)
                    → Stripe Checkout
                    → Pago exitoso
                    → stripe-webhook actualiza DB
                    → Acceso habilitado
```

### Flujo de Pago de Cita (Chatbot)
```
Cliente agenda cita → Opción de pago
                    → create-appointment-checkout (Edge Function)
                    → Stripe (a cuenta Connect de la sucursal)
                    → stripe-webhook confirma cita
```

### Flujo de Stripe Connect (Sucursal conecta banco)
```
Dueño abre "Editar Sucursal" → Botón "Conectar Banco"
                              → stripe-connect-onboarding (Edge Function)
                              → Crea cuenta Stripe Express
                              → Sucursal completa formulario en Stripe
                              → stripe-webhook recibe account.updated
                              → stripe_onboarding_complete = true en DB
```

---

## 📁 Archivos de Configuración Importantes

| Archivo | Descripción |
|---------|-------------|
| `src/environments/` | URLs y keys del entorno |
| `src/app/services/supabase.service.ts` | Inicialización del cliente Supabase |
| `supabase/functions/.env` | Variables locales para desarrollo |
| `supabase/backup_2026-02-26.sql` | Backup completo de la DB (Febrero 2026) |
| `docs/CREDENCIALES_PARA_LLENAR.md` | Guía de credenciales necesarias |

---

## 🏗️ Estado Actual del Proyecto (Marzo 2026)

### ✅ Funcionalidades Completadas
- Autenticación completa (registro, login, verificación de email)
- Dashboard completo con Calendario, Servicios, Empleados, Sucursales, Clientes, Estadísticas, Perfil
- Chatbot web de reservas para clientes finales
- Asistente IA Gemini en el dashboard (solo plan Avanzado)
- Stripe para suscripciones de planes
- Stripe Connect para pagos directos a sucursales
- Sistema multi-sucursal con cuentas independientes por sucursal
- Modo claro/oscuro
- Landing page pública
- Onboarding de nuevos negocios
- Vista de recepción
- Backup de base de datos (71 KB, Febrero 2026)
- Webhook de Stripe activo y funcionando
- Corrección del mapeo de precios en `stripe-webhook` (Marzo 2026): $219→Básico, $499→Avanzado

### ⚠️ Pendiente / En Progreso
- Pasar de modo prueba de Stripe a modo producción (live)
- Completar verificación de Stripe Connect para cuentas live
- Avatar de usuario (se eliminó del registro, pendiente en perfil)

---

## 🔗 URLs y Endpoints Clave

| Servicio | URL |
|---------|-----|
| App en Railway | `https://kyros-barber-web.up.railway.app` (o similar) |
| Supabase Dashboard | `https://supabase.com/dashboard/project/qyyhembukflbxjbctuav` |
| Stripe Dashboard (Test) | `https://dashboard.stripe.com/test` |
| Stripe Dashboard (Live) | `https://dashboard.stripe.com` |
| Webhook URL | `https://qyyhembukflbxjbctuav.supabase.co/functions/v1/stripe-webhook` |
| AI Chat Function | `https://qyyhembukflbxjbctuav.supabase.co/functions/v1/ai-chat` |

---

## 🤖 Notas de Colaboración entre IAs

> **Este proyecto se trabaja con múltiples IAs** (Antigravity/Google, Codex/OpenAI, Gemini, etc.). Esta sección sirve como contexto compartido para TODAS las IAs que intervengan.

### Reglas para cualquier IA que trabaje en este proyecto

1. **Leer este documento COMPLETO antes de hacer cambios** — Contiene toda la arquitectura, flujos y decisiones de diseño.
2. **Actualizar este documento después de cada cambio significativo** — Seguir el workflow en `.agents/workflows/update-docs.md`.
3. **No romper patrones existentes** — El proyecto usa Standalone Components de Angular, Supabase Edge Functions en Deno, y SCSS modular.
4. **Respetar la estructura de carpetas** — Cada feature tiene su propia carpeta con `.ts`, `.html`, `.scss`.
5. **No cambiar la base de datos sin documentar** — Cualquier cambio en tablas/columnas debe reflejarse en la sección de Base de Datos de este documento.
6. **Usar `supabaseService`** para todas las operaciones de datos en el frontend (no crear clientes de Supabase directos).
7. **Las Edge Functions usan Deno** — Imports por URL (no npm), `serve()` de `std@0.168.0`, y variables de entorno con `Deno.env.get()`.

### ⚠️ Gotchas y Errores Conocidos (para evitar repetirlos)

| Problema | Causa | Solución |
|----------|-------|----------|
| Plan incorrecto al pagar suscripción | El `stripe-webhook` mapeaba `amount_total` a `plan_id` con montos equivocados | Verificar que los montos en centavos coincidan con la tabla `planes` ($219=21900→plan 2, $499=49900→plan 3) |
| Errores de `Deno` y `serve` en el IDE | TypeScript del IDE no reconoce imports Deno por URL | Son falsos positivos locales. Las Edge Functions compilan bien en Supabase |
| `window is not defined` en SSR | Uso de `localStorage` durante SSR | Usar adapter de storage compatible con SSR para Supabase Auth |

---

## 📝 Change Log (Registro de Cambios)

> Registro cronológico de cambios significativos. Cada IA que haga cambios debe agregar una entrada aquí.

| Fecha | Cambio | IA / Autor |
|-------|--------|------------|
| Marzo 2026 | Corrección del mapeo de precios en `stripe-webhook`: $219→Básico (plan 2), $499→Avanzado (plan 3) | Antigravity |
| Marzo 2026 | Corrección de suscripción de Oscar Franco en BD (plan_id 2→3) | Antigravity |
| Marzo 2026 | Landing page 100% responsivo: nuevos breakpoints 768px y 400px, fix de line-height en h2, footer adaptado | Antigravity |
| Marzo 2026 | Pricing section: 3 planes horizontales en desktop (grid 3 columnas) | Antigravity |
| Marzo 2026 | Actualización de Angular 18→21 en documentación | Antigravity |
| Marzo 2026 | Creación de sección de colaboración IA y Change Log | Antigravity |
| Marzo 2026 | Restricción de Estadísticas y Pagos Stripe para Plan Gratuito: nuevo `UpgradePlanDialog`, interceptor en sidebar, bloqueo de Stripe Connect en branch-dialog | Antigravity |
| Marzo 2026 | Validación de expiración de suscripción: check de `fecha_fin_prueba` y `fecha_fin_periodo` en login.ts y dashboard.ts. Usuarios expirados redirigen a `/renew-subscription` | Antigravity |

