# 📱 Guía de Implementación: Chatbot WhatsApp para Kyros Barber

> **Documento preparado para:** Compañero de equipo encargado de la integración n8n + WhatsApp
> **Proyecto:** Kyros Barber - Sistema de Gestión para Barberías
> **Fecha:** 29 de Enero 2026

---

## 📋 Tabla de Contenidos

1. [Resumen del Proyecto](#resumen-del-proyecto)
2. [Credenciales y Accesos](#credenciales-y-accesos)
3. [Esquema de Base de Datos](#esquema-de-base-de-datos)
4. [Configuración de n8n](#configuración-de-n8n)
5. [Configuración de WhatsApp Business API](#configuración-de-whatsapp-business-api)
6. [Workflow del Chatbot](#workflow-del-chatbot)
7. [Flujo de Conversación](#flujo-de-conversación)
8. [Endpoints y Queries](#endpoints-y-queries)
9. [Testing y Verificación](#testing-y-verificación)

---

## 🎯 Resumen del Proyecto

### ¿Qué es Kyros Barber?
Kyros Barber es un SaaS para gestión de barberías que incluye:
- Gestión de sucursales y empleados
- Reservación de citas online
- Chatbot para atención al cliente

### ¿Qué debe hacer el Chatbot de WhatsApp?
El chatbot debe permitir a los clientes:
1. **Ver servicios disponibles** de una sucursal
2. **Ver empleados** (barberos) disponibles
3. **Consultar horarios** de atención
4. **Agendar citas** seleccionando servicio, empleado, fecha y hora
5. **Cancelar/reagendar** citas existentes

### Flujo de Identificación
El chatbot identifica la sucursal por el **número de teléfono de WhatsApp Business** al que el cliente escribe. Cada sucursal tiene su propio número.

---

## 🔐 Credenciales y Accesos

### Supabase

| Campo | Valor |
|-------|-------|
| **URL del Proyecto** | `https://qyyhembukflbxjbctuav.supabase.co` |
| **Project ID** | `qyyhembukflbxjbctuav` |
| **Región** | `us-west-2` |

> [!IMPORTANT]
> **Solicitar a Emir:**
> - `anon` key (para operaciones públicas)
> - `service_role` key (para operaciones del chatbot - NUNCA exponer en frontend)
> - Invitación como miembro del proyecto en Supabase Dashboard

### Acceso al Dashboard de Supabase
1. Pedir a Emir que te invite a: https://supabase.com/dashboard/project/qyyhembukflbxjbctuav
2. Aceptar la invitación en tu email
3. Ir a **Project Settings > API** para ver las keys

---

## 🗄️ Esquema de Base de Datos

### Tablas Principales que Usarás

#### `sucursales` - Información de sucursales
```sql
id              BIGINT PRIMARY KEY
negocio_id      UUID           -- FK a negocios
nombre          TEXT NOT NULL
direccion       TEXT
telefono        VARCHAR(20)    -- ⭐ Número de WhatsApp Business
cuenta_email    TEXT
created_at      TIMESTAMPTZ
```

#### `servicios` - Catálogo de servicios
```sql
id                      BIGINT PRIMARY KEY
negocio_id              UUID
sucursal_id             BIGINT          -- FK a sucursales
nombre                  TEXT NOT NULL
descripcion             TEXT
precio_base             NUMERIC
duracion_aprox_minutos  INTEGER
imagen_url              TEXT
created_at              TIMESTAMPTZ
```

#### `empleados` - Barberos/estilistas
```sql
id            BIGINT PRIMARY KEY
negocio_id    UUID
sucursal_id   BIGINT          -- FK a sucursales
nombre        TEXT NOT NULL
especialidad  TEXT
user_id       UUID
created_at    TIMESTAMPTZ
```

#### `clientes_bot` - Clientes que interactúan con el bot
```sql
id          BIGINT PRIMARY KEY
negocio_id  UUID
nombre      TEXT
telefono    TEXT            -- ⭐ Número de WhatsApp del cliente
plataforma  TEXT            -- 'whatsapp', 'web', etc.
chat_id     TEXT            -- ID único de la conversación
created_at  TIMESTAMPTZ
```

#### `citas` - Reservaciones
```sql
id                    BIGINT PRIMARY KEY
negocio_id            UUID
sucursal_id           BIGINT
empleado_id           BIGINT
cliente_id            BIGINT          -- FK a clientes_bot
nombre_cliente_manual TEXT            -- Si no hay cliente registrado
fecha_hora_inicio     TIMESTAMPTZ
fecha_hora_fin        TIMESTAMPTZ
estado                TEXT            -- 'pendiente', 'confirmada', 'completada', 'cancelada'
telefono              TEXT
servicio              TEXT
created_at            TIMESTAMPTZ
```

#### `citas_servicios` - Relación citas-servicios (muchos a muchos)
```sql
cita_id       BIGINT      -- FK a citas
servicio_id   BIGINT      -- FK a servicios
precio_actual NUMERIC
PRIMARY KEY (cita_id, servicio_id)
```

#### `horarios_sucursal` - Horarios de atención
```sql
id                        BIGINT PRIMARY KEY
sucursal_id               BIGINT
dia_semana                INTEGER         -- 0=Domingo, 1=Lunes, ..., 6=Sábado
hora_inicio               TIME
hora_fin                  TIME
hora_descanso_inicio      TIME
duracion_descanso_minutos INTEGER
```

---

## ⚙️ Configuración de n8n

### Opción A: Si YA tienes n8n Cloud (Suscripción)

1. **Inicia sesión** en [app.n8n.cloud](https://app.n8n.cloud)
2. **Ve a Credentials** → **Add Credential**
3. **Configura Supabase:**
   - Name: `Kyros Supabase`
   - Host: `https://qyyhembukflbxjbctuav.supabase.co`
   - API Key: `[service_role key - pedir a Emir]`

4. **Obtén tu Webhook URL** al crear un nodo Webhook (será algo como):
   ```
   https://tu-instancia.app.n8n.cloud/webhook/xxxxx
   ```

---

### Opción B: Si NO tienes n8n (Instalación Local GRATIS)

#### Método 1: Con Docker (Recomendado)

```bash
# 1. Instalar Docker Desktop desde https://docker.com/products/docker-desktop

# 2. Crear y ejecutar n8n
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n
```

Accede a: `http://localhost:5678`

#### Método 2: Con npm

```bash
# 1. Requisito: Node.js 18+ instalado

# 2. Instalar n8n globalmente
npm install -g n8n

# 3. Ejecutar n8n
n8n start
```

Accede a: `http://localhost:5678`

#### Exponer n8n a Internet (Necesario para Webhooks)

Para que Meta pueda enviar webhooks a tu n8n local, necesitas exponerlo:

```bash
# Instalar ngrok
npm install -g ngrok

# Exponer el puerto 5678
ngrok http 5678
```

Ngrok te dará una URL pública como:
```
https://abc123.ngrok.io
```

Tu Webhook URL será:
```
https://abc123.ngrok.io/webhook/whatsapp
```

> [!WARNING]
> La URL de ngrok cambia cada vez que reinicias. Para producción, considera:
> - Comprar un dominio en ngrok ($8/mes)
> - Usar n8n Cloud
> - Hostear en un VPS (DigitalOcean, AWS, etc.)

---

## 📱 Configuración de WhatsApp Business API

### Paso 1: Crear Cuenta Meta Business

1. Ve a [business.facebook.com](https://business.facebook.com)
2. Crea o inicia sesión con cuenta Business
3. Verifica tu negocio (puede tomar 24-48 hrs)

### Paso 2: Configurar en Meta for Developers

1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Crea una nueva App:
   - Tipo: **Business**
   - Nombre: `Kyros WhatsApp Bot`
3. Agrega el producto **WhatsApp**
4. En WhatsApp > Getting Started:
   - Anota el **Phone Number ID**
   - Anota el **WhatsApp Business Account ID**
   - Genera un **Access Token** (temporal o permanente)

### Paso 3: Configurar Webhook en Meta

1. Ve a WhatsApp > Configuration > Webhooks
2. Callback URL: `https://TU-URL-NGROK/webhook/whatsapp`
3. Verify Token: `kyros_verify_token_2026` (o el que prefieras)
4. Suscríbete a: `messages`, `message_deliveries`

### Paso 4: Agregar Número de Teléfono

1. En WhatsApp > Phone numbers
2. Agrega el número de WhatsApp Business de cada sucursal
3. Verifica cada número

---

## 🔄 Workflow del Chatbot

### Estructura del Workflow en n8n

```
┌─────────────────┐
│  Webhook        │ ← Recibe mensajes de WhatsApp
│  (Trigger)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Verificar      │ ← Valida el webhook token
│  Token          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Identificar    │ ← Busca sucursal por teléfono
│  Sucursal       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Switch         │ ← Analiza intención del mensaje
│  (Intenciones)  │
└────────┬────────┘
         │
    ┌────┴────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│Saludo │ │Ver    │ │Agendar│ │Cancelar│
│       │ │Servs  │ │Cita   │ │Cita    │
└───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
    │         │         │         │
    └────┬────┴─────────┴─────────┘
         │
         ▼
┌─────────────────┐
│  Enviar         │ ← Responde al cliente por WhatsApp
│  Respuesta      │
└─────────────────┘
```

### Nodo 1: Webhook Trigger

```json
{
  "name": "WhatsApp Webhook",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "whatsapp",
    "responseMode": "lastNode",
    "options": {}
  }
}
```

### Nodo 2: Verificar Token (Challenge de Meta)

```javascript
// Code node para verificar webhook
const query = $input.first().json.query;

if (query && query['hub.mode'] === 'subscribe') {
  // Verificación inicial del webhook
  const verifyToken = 'kyros_verify_token_2026';
  if (query['hub.verify_token'] === verifyToken) {
    return { json: { response: query['hub.challenge'] } };
  }
}

// Si es un mensaje normal, continuar
return $input.all();
```

### Nodo 3: Identificar Sucursal por Teléfono

```javascript
// Supabase HTTP Request
// GET /rest/v1/sucursales?telefono=eq.{phone_number_id}

const phoneNumberId = $input.first().json.body.entry[0].changes[0].value.metadata.phone_number_id;

// Buscar en sucursales
// Si negocio usa tipo_chatbot = 'whatsapp' permitir continuar
```

### Nodo 4: Procesar Mensaje y Determinar Intención

```javascript
const message = $input.first().json.body.entry[0].changes[0].value.messages[0];
const text = message.text?.body?.toLowerCase() || '';
const from = message.from; // Número del cliente

let intention = 'unknown';

if (text.includes('hola') || text.includes('hi') || text.includes('menu')) {
  intention = 'greeting';
} else if (text.includes('servicio') || text.includes('precio') || text.includes('corte')) {
  intention = 'services';
} else if (text.includes('agendar') || text.includes('cita') || text.includes('reservar')) {
  intention = 'book';
} else if (text.includes('cancelar')) {
  intention = 'cancel';
} else if (text.includes('horario')) {
  intention = 'schedule';
}

return { json: { intention, text, from, message } };
```

### Nodo 5: Enviar Respuesta WhatsApp

```javascript
// HTTP Request Node
// POST https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
// Headers: Authorization: Bearer {ACCESS_TOKEN}

{
  "messaging_product": "whatsapp",
  "to": "{{$json.from}}",
  "type": "text",
  "text": {
    "body": "{{$json.responseMessage}}"
  }
}
```

---

## 💬 Flujo de Conversación

### Ejemplo de Conversación Completa

```
Cliente: Hola

Bot: ¡Hola! 👋 Bienvenido a [Nombre Sucursal].
     ¿En qué puedo ayudarte?
     
     1️⃣ Ver servicios y precios
     2️⃣ Agendar una cita
     3️⃣ Ver mis citas
     4️⃣ Cancelar cita
     5️⃣ Horarios de atención

Cliente: 1

Bot: 💈 Servicios disponibles:
     
     • Corte clásico - $80
     • Corte + barba - $120
     • Afeitado completo - $60
     • Diseño de barba - $50
     
     ¿Deseas agendar alguno? Escribe "agendar"

Cliente: agendar corte + barba

Bot: ¡Perfecto! Corte + barba ($120)
     
     Selecciona un barbero:
     1️⃣ Carlos - Experto en fades
     2️⃣ Miguel - Especialista en barba
     3️⃣ Pedro - Cortes clásicos

Cliente: 1

Bot: Carlos seleccionado ✅
     
     ¿Qué día te gustaría venir?
     
     📅 Días disponibles esta semana:
     • Lun 30 Ene
     • Mar 31 Ene
     • Mie 01 Feb
     
     Escribe la fecha (ej: "lunes" o "30 ene")

Cliente: lunes

Bot: 🕐 Horarios disponibles el Lun 30 Ene:
     
     • 09:00
     • 09:30
     • 10:00
     • 11:00
     • 14:00
     • 15:30
     
     Escribe la hora que prefieras

Cliente: 10:00

Bot: ✅ ¡Cita confirmada!
     
     📋 Resumen:
     • Servicio: Corte + barba
     • Barbero: Carlos
     • Fecha: Lun 30 Ene 2026
     • Hora: 10:00 AM
     • Precio: $120
     
     Te esperamos en [Dirección Sucursal]
     
     Para cancelar, escribe "cancelar cita"
```

---

## 📡 Endpoints y Queries

### Obtener Servicios de una Sucursal

```sql
SELECT id, nombre, descripcion, precio_base, duracion_aprox_minutos
FROM servicios
WHERE sucursal_id = {SUCURSAL_ID}
ORDER BY nombre;
```

**HTTP Request en n8n:**
```
GET https://qyyhembukflbxjbctuav.supabase.co/rest/v1/servicios
?sucursal_id=eq.{SUCURSAL_ID}
&select=id,nombre,descripcion,precio_base,duracion_aprox_minutos

Headers:
  apikey: {SUPABASE_KEY}
  Authorization: Bearer {SUPABASE_KEY}
```

### Obtener Empleados de una Sucursal

```sql
SELECT id, nombre, especialidad
FROM empleados
WHERE sucursal_id = {SUCURSAL_ID}
ORDER BY nombre;
```

### Obtener Horarios de una Sucursal

```sql
SELECT dia_semana, hora_inicio, hora_fin, 
       hora_descanso_inicio, duracion_descanso_minutos
FROM horarios_sucursal
WHERE sucursal_id = {SUCURSAL_ID}
ORDER BY dia_semana;
```

### Buscar Sucursal por Teléfono

```sql
SELECT s.*, n.nombre as nombre_negocio, ns.tipo_chatbot
FROM sucursales s
JOIN negocios n ON s.negocio_id = n.id
JOIN negocio_suscripciones ns ON n.id = ns.negocio_id
WHERE s.telefono = {TELEFONO_WHATSAPP}
AND ns.tipo_chatbot = 'whatsapp';
```

### Verificar Disponibilidad de Horario

```sql
SELECT * FROM citas
WHERE empleado_id = {EMPLEADO_ID}
AND fecha_hora_inicio >= {FECHA_HORA_INICIO}
AND fecha_hora_fin <= {FECHA_HORA_FIN}
AND estado NOT IN ('cancelada');
```

### Crear/Obtener Cliente

```sql
-- Buscar cliente existente
SELECT id FROM clientes_bot
WHERE telefono = {TELEFONO_CLIENTE}
AND negocio_id = {NEGOCIO_ID};

-- Si no existe, crear
INSERT INTO clientes_bot (nombre, telefono, plataforma, chat_id, negocio_id)
VALUES ({NOMBRE}, {TELEFONO}, 'whatsapp', {CHAT_ID}, {NEGOCIO_ID})
RETURNING id;
```

### Crear Cita

```sql
INSERT INTO citas (
  negocio_id, sucursal_id, empleado_id, cliente_id,
  fecha_hora_inicio, fecha_hora_fin, estado
)
VALUES (
  {NEGOCIO_ID}, {SUCURSAL_ID}, {EMPLEADO_ID}, {CLIENTE_ID},
  {FECHA_HORA_INICIO}, {FECHA_HORA_FIN}, 'confirmada'
)
RETURNING id;

-- Agregar servicios a la cita
INSERT INTO citas_servicios (cita_id, servicio_id, precio_actual)
VALUES ({CITA_ID}, {SERVICIO_ID}, {PRECIO});
```

### Cancelar Cita

```sql
UPDATE citas
SET estado = 'cancelada'
WHERE id = {CITA_ID}
AND cliente_id = {CLIENTE_ID};
```

---

## 🧪 Testing y Verificación

### 1. Verificar Conexión con Supabase

En n8n, crea un workflow simple:
1. **Manual Trigger** → **HTTP Request** (GET servicios)
2. Ejecuta y verifica que obtienes datos

### 2. Verificar Webhook de WhatsApp

1. En Meta for Developers > WhatsApp > Webhooks
2. Haz clic en "Test" junto a "messages"
3. Verifica que n8n recibe el evento

### 3. Probar con WhatsApp Sandbox

Meta proporciona un número de prueba:
1. Escanea el QR en Meta for Developers
2. Envía un mensaje al número de prueba
3. Verifica que el workflow se ejecuta

### 4. Checklist de Verificación

- [ ] n8n instalado y ejecutando
- [ ] Credenciales de Supabase configuradas
- [ ] Webhook accesible desde internet
- [ ] Token de verificación aceptado por Meta
- [ ] Prueba de envío de mensaje exitosa
- [ ] Prueba de recepción de mensaje exitosa
- [ ] Consulta a servicios funciona
- [ ] Consulta a empleados funciona
- [ ] Creación de cita funciona
- [ ] Cancelación de cita funciona

---

## 📞 Contacto y Soporte

| Pregunta sobre... | Contactar a |
|-------------------|-------------|
| Credenciales Supabase | Emir |
| Esquema de base de datos | Emir |
| Lógica de negocio | Emir |
| Problemas con n8n | Documentación oficial: [docs.n8n.io](https://docs.n8n.io) |
| WhatsApp API | [Meta Developer Docs](https://developers.facebook.com/docs/whatsapp) |

---

## 📎 Recursos Adicionales

- [Documentación n8n](https://docs.n8n.io)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Plantilla Webhook WhatsApp n8n](https://n8n.io/integrations/whatsapp-business-cloud)

---

> [!TIP]
> **Siguiente paso recomendado:** Solicitar a Emir las credenciales de Supabase y la invitación al proyecto antes de comenzar con la implementación.
