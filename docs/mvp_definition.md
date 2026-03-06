# Kyros Barber: Definición del MVP

## 🎯 ¿Qué es el MVP?

El **Producto Mínimo Viable (MVP)** de Kyros Barber es una plataforma SaaS funcional que permite a dueños de barberías gestionar su negocio y a clientes reservar citas con pago adelantado.

**Estado:** ✅ **Completado y Funcional**

---

## 📦 Componentes del MVP

### 1. Dashboard Administrativo (Web App)
*Para dueños de barbería*

| Módulo | Funcionalidad | Estado |
|--------|---------------|--------|
| **Autenticación** | Login, Registro, Verificación de Email | ✅ |
| **Sucursales** | CRUD completo, dirección, horarios | ✅ |
| **Empleados** | CRUD, horarios, especialidades, asignación a sucursal | ✅ |
| **Servicios** | CRUD, precios, duración, categorías | ✅ |
| **Calendario** | Vista de citas por sucursal/empleado, drag & drop | ✅ |
| **Estadísticas** | Ingresos diarios/semanales/mensuales | ✅ |
| **Perfil** | Edición de datos del negocio, logo | ✅ |

---

### 2. Chatbot de Reservas (Web Móvil)
*Para clientes finales*

| Paso | Funcionalidad | Estado |
|------|---------------|--------|
| 1 | Selección de servicios (catálogo visual con precios) | ✅ |
| 2 | Selección de barbero (con foto y especialidades) | ✅ |
| 3 | Selección de fecha/hora (disponibilidad en tiempo real) | ✅ |
| 4 | Ingreso de datos (nombre, teléfono, email) | ✅ |
| 5 | Pago adelantado vía Stripe Checkout | ✅ |
| 6 | Confirmación de cita | ✅ |

> [!NOTE]
> El cliente **no necesita crear cuenta** para reservar. Solo proporciona sus datos de contacto.

---

### 3. Sistema de Monetización (SaaS B2B)

| Plan | Precio | Límites | Estado |
|------|--------|---------|--------|
| **Free** | $0/mes | 1 Sucursal, 2 Empleados | ✅ |
| **Emprendedor** | $29/mes | 1 Sucursal, Empleados Ilimitados | ✅ |
| **Imperio** | $99/mes | Sucursales Ilimitadas, Todo Ilimitado | ✅ |

**Integración de Pagos:**
- Stripe Checkout para suscripciones ✅
- Webhooks para activación automática ✅
- Guards en frontend para límites por plan ✅

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Angular 18 (Standalone), Angular Material, SCSS |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Pagos | Stripe (Subscriptions + One-time payments) |
| Hosting | Vercel / Netlify (Frontend), Supabase (Backend) |

---

## 🔒 Seguridad Implementada

- **Row Level Security (RLS):** Aislamiento de datos por negocio.
- **Verificación de Email:** Obligatoria antes de acceder al dashboard.
- **Validación de Email Duplicado:** RPC seguro `check_email_exists`.
- **Tokens de Pago:** Validación en redirección post-pago.

---

## ❌ Fuera del Alcance del MVP (Roadmap)

| Funcionalidad | Prioridad | Fase |
|---------------|-----------|------|
| Notificaciones por Email (recordatorios) | Alta | 2 |
| Notificaciones por WhatsApp | Alta | 2 |
| Recuperación de Contraseña | Alta | 2 |
| App Móvil Nativa (Flutter) | Media | 3 |
| Reseñas de Clientes | Baja | 4 |
| Gestión de Inventario | Baja | 4 |
| Marketplace de Productos | Baja | 5 |

---

## 📊 Métricas de Éxito del MVP

Para considerar el MVP "validado", se deben alcanzar:

1. **10 negocios registrados** (al menos 3 activos).
2. **50+ citas reservadas** a través del chatbot.
3. **1 conversión a plan de pago** (Emprendedor o Imperio).
4. **Feedback cualitativo** de al menos 3 dueños de barbería.

---

*Documento generado: Enero 2026*
