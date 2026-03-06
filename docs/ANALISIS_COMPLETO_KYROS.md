# Análisis Completo del Proyecto Kyros Barber Web

## 1. Visión General del Sistema
**Kyros** es una plataforma SaaS (Software as a Service) integral B2B orientada a la gestión de barberías y salones de belleza. 
El sistema central permite a dueños de negocios gestionar múltiples sucursales, empleados, servicios, clientes y citas desde un panel de administración web, a la vez que proporciona flujos de reserva (booking) y chatbots integrados.

### Stack Tecnológico Principal
- **Frontend**: Angular v21 (Framework principal).
- **Estilos y UI**: Angular Material, estilos SCSS/CSS personalizados, Anime.js para animaciones.
- **Backend / Base de Datos**: Supabase (PostgreSQL, Realtime, Storage, Auth, Edge Functions).
- **Integración de Pagos**: Stripe (implementado mediante Supabase Edge Functions).
- **Integraciones Bot**: Chatbot web y soporte para integración con n8n/WhatsApp.

---

## 2. Arquitectura de Datos (Modelos)

El núcleo de datos está altamente normalizado en PostgreSQL (vía Supabase). Los modelos principales (`src/app/models/index.ts`) dictan la estructura del negocio:

- **Planes y Suscripciones (`Plan`, `NegocioSuscripcion`)**: Controlan el acceso SaaS. Los planes actuales son:
  | Plan | Código | Precio | Sucursales | Empleados/Suc | Descripción |
  |------|--------|--------|-----------|---------------|-------------|
  | Plan Gratuito | `free` | $0 MXN | 1 | 2 | Prueba gratuita de 7 días |
  | Plan Básico | `basic` | $219 MXN/mes | 2 | 4 | Emprendedores |
  | Plan Avanzado | `regular` | $499 MXN/mes | 6 | 8 | Negocios en crecimiento |
- **Sucursal (`Sucursal`, `HorarioSucursal`)**: Un dueño (`negocio_id`) puede tener múltiples sucursales, cada una con horarios de apertura, cierre y descanso, lo que permite escalabilidad masiva.
- **Catálogos Operativos (`Servicio`, `Empleado`)**: Los servicios y empleados están atados a sucursales o al negocio global. La relación muchos-a-muchos (`empleado_servicios`) define qué barbero puede realizar qué corte.
- **Clientes (`Cliente`)**: Base de datos de clientes unificada (nombre, teléfono, email) para crear historial y marketing. Soporta origen (`plataforma`: bot_whatsapp o web_chat).
- **Transaccional (`Cita`, `Cita_Servicios`)**: El modelo más complejo. Maneja el estado de las citas (`pendiente_pago`, `confirmada`, `cancelada`, `completada`), vinculando cliente, empleado, sucursal, horarios de inicio/fin y el desglose de múltiples servicios consumidos junto con el precio histórico (`precio_actual`).

---

## 3. Lógica y Procesos Clave

### A. Flujo de Roles y Autenticación (`AuthGuard` & `app.routes.ts`)
- **Público**: `/login`, `/register`, y `/chat/:sucursalId` (Chatbot público de reserva).
- **Seguro (AuthGuard)**: Todas las demás rutas. Si el usuario no está logueado, es redirigido.
- **Onboarding**: Existe un proceso de "Onboarding" obligatorio inicial (`/onboarding`) para que un nuevo registro configure su primera sucursal, horario y servicios base.
- **Suscripción**: Barrera `/renew-subscription` si la cuenta expira o excede límites.

### B. Módulos del Panel Administrativo (Dashboard)
Los procesos administrativos viven bajo la ruta `/dashboard`:
1. **Calendar (`/dashboard/calendar`)**: El corazón operativo. Muestra todas las citas, permite arrastrar, bloquear horarios y ver cruces. Escucha eventos de Supabase en tiempo real.
2. **Services (`/dashboard/services`)**: ABM (Alta, Baja, Modificación) de servicios, precios y duraciones.
3. **Employees (`/dashboard/employees`)**: Gestión de staff, asignándoles servicios que pueden realizar y sus especialidades.
4. **Branches (`/dashboard/branches`)**: Gestión multi-locación. Permite al franquiciatario ver y unificar toda su red.
5. **Clients (`/dashboard/clients`)**: CRM básico de todos los usuarios que han agendado, permitiendo ver su ticket promedio o asistencias.
6. **Statistics (`/dashboard/statistics`)**: Paneles de ingresos y retención calculados en tiempo real sumando pagos de citas completadas.
7. **Reception (`/reception`)**: Una vista simplificada probablemente para el personal de mostrador (cobro rápido y asignación de walk-ins sin ver analíticas de negocio).

### C. El Motor de Reservas (Booking Pipeline)
El proceso más avanzado del sistema reside en `BookingService` (`src/app/services/booking.service.ts`). Implementa un flujo de estado progresivo:
1. **Paso a Paso State Machine**: `welcome -> services -> details -> customer_info -> datetime -> employee -> confirm -> payment -> done`.
2. **Cálculo de Disponibilidad `loadAvailableSlots`**:
   - Revisa el horario de la sucursal (apertura y cierre).
   - Descarta el `hora_descanso_inicio` (comida).
   - Cruza la consulta contra citas existentes en la base de datos para ese día, evitando cualquier "overlap" (solapamiento) basándose en `fecha_hora_inicio` y `fin`.
3. **Filtro de Empleados `loadEmployees`**: Filtra algorítmicamente a los barberos para mostrar únicamente a los que tienen la capacidad de realizar **todos** los servicios seleccionados en el carrito del cliente (mediante la tabla cruzada `empleado_servicios`).
4. **Flujo de Pagos (Stripe Edge Functions)**:
   - Al llegar a confirmación, el backend local crea una `Cita` en estado `pendiente_pago`.
   - Se invoca una Edge Function en Supabase (`create-appointment-checkout`) que retorna una URL de Stripe.
   - Si el pago se concreta, la cita pasa a `confirmada`. Si se abandona, se corre `cancelPendingAppointment()` para limpiar la basura en la BD.
   - También gestiona subida de imágenes (referencias de cortes) a Supabase Storage (`citas-files`).

---

## 4. Conexiones e Integraciones Externas

1. **Supabase (Backend as a Service)**:
   - Capa de datos y ORM (vía `@supabase/supabase-js`).
   - Autenticación segura de administradores.
   - Almacenamiento blob/objetos para las fotos de clientes y servicios.
   - Funciones Serverless (Edge Functions) para la comunicación con herramientas de terceros (Stripe).
2. **Stripe**: Configurado para cobrar depósitos o montos totales durante el flujo automatizado de reservas.
3. **n8n / WhatsApp**: Aunque el motor interno soporta "web chats", la estructura de tablas y scripts (`clientes_bot`, `chat_id`) indica una pasarela para conectar n8n y habilitar un asistente IA conversacional vía WhatsApp, compartiendo la misma API de base de datos.

## Conclusión Estratégica
El proyecto está construido con un enfoque altamente profesional, preparado para escalar de **1 a cientos de sucursales**. Su separación lógica garantiza que la capa de reglas de negocio (cruces de horarios, cobros) trabaje limpiamente sin importar si la orden llega desde la web, recepción manual o WhatsApp. El uso de Angular moderno con señales y RxJS complementa la reactividad en tiempo real de Supabase.
