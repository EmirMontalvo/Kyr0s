# 🤖 Flujo del Chatbot Web de Reservas

Este documento detalla el paso a paso exacto que experimenta el cliente final al escanear el código QR de una sucursal o ingresar directamente al enlace `/chat/:sucursalId`.

## Secuencia de Interacción UI

1. **Bienvenida:** El asistente da la bienvenida indicando el nombre de la sucursal correspondiente y ofrece el botón "Ver Servicios".
2. **Selección de Servicios:** Se despliega un catálogo con imágenes e información. El usuario puede elegir uno o varios servicios requeridos.
3. **Desglose de Precios:** El asistente confirma los servicios elegidos y muestra detalladamente:
   - Subtotal
   - Comisión de procesamiento (calculada automáticamente)
   - Total a pagar de la cita
4. **Detalles Opcionales:** Se ofrece un formulario donde el cliente puede escribir una descripción (opcional) o subir hasta 5 fotos de referencia (ej. ideas de corte de cabello).
5. **Nombre:** El asistente solicita ingresar el nombre completo del cliente.
6. **Teléfono:** Solicita el número de teléfono (10 dígitos).
7. **Correo Electrónico:** Solicita el email para enviar los recibos de pago.
8. **Fecha:** Pregunta la fecha deseada mostrando una serie de botones horizontales con los días disponibles.
9. **Hora:** Al confirmar la fecha, calcula la disponibilidad y despliega botones con las horas disponibles (tomando en cuenta duraciones, traslapes y horarios de comida).
10. **Empleado / Barbero:** Muestra una lista de los empleados asignados a los servicios elegidos. El usuario puede seleccionar un barbero de su preferencia o elegir "Sin preferencia" (el cual asigna cualquier empleado disponible).
11. **Resumen y Confirmación:** Muestra una tarjeta visual de resumen con los siguientes datos para la aprobación final del cliente:
    - 👤 Cliente
    - 📞 Teléfono
    - 📅 Fecha
    - 🕐 Hora
    - ✂️ Servicios
    - 👨🦱 Atendido por
    - 💰 Total
12. **Bloqueo y Pago (Stripe):** Al presionar "Confirmar Cita", la cita se pre-reserva e inmediatamente el usuario es redirigido a la pantalla segura de Stripe Checkout con el total exacto. **Un detalle importante es que el campo de correo electrónico en Stripe ya viene pre-completado** con el email que el cliente proporcionó en el paso 7, ahorrando tiempo.
13. **Redirección y Confirmación Final:** Una vez completado el pago exitosamente, Stripe redirige automáticamente al usuario de vuelta a la misma interfaz del chatbot web (usando la URL con parámetros `?payment=success&cita_id=...`). El asistente detecta esto y muestra una burbuja de diálogo final con un **mensaje de éxito**: "¡Pago procesado con éxito! Tu cita ha sido confirmada...", además de mostrar un botón para generar una "Nueva Cita". Paralelamente, el webhook de Stripe confirma el estado de pago en la base de datos de Kyros.

---

## EXPANSIONES AL FLUJO: SISTEMA MULTI-SUCURSAL Y MEMORIA (SUPABASE)

Recientemente se ha modificado el flujo del chatbot para incorporar las siguientes capacidades técnicas y lógicas de negocio, elevando la cantidad total de pasos e interacciones:

### Selección Dinámica de Sucursal
Inmediatamente después de la **BIENVENIDA** (Paso 1 original), se ha introducido un nuevo paso obligado: **SELECCIÓN DE SUCURSAL**.
*   **Filtrado por Stripe:** El chatbot extraerá de la base de datos (Supabase) únicamente aquellas sucursales que tengan el campo `stripe_account_id` validado (no nulo) y/o presenten su `stripe_onboarding_complete` en true.
*   **Aislamiento de Catálogos:** Una vez que el cliente selecciona una sucursal en este paso, toda la información subsiguiente referente a servicios, barberos, y horarios disponibles, se filtrará condicionada al `sucursal_id` seleccionado.

### Procesamiento Descentralizado de Pagos (Stripe Connect)
En el paso final de pago, el chatbot generará los enlaces de cobro o procesará el pago apuntándolo a la cuenta conectada (`stripe_account_id`) de la sucursal específica.
*   Esto asegura que Kyros limite su recepción a los márgenes o comisiones establecidas, mientras que cada sucursal reciba el pago de manera directa, manteniendo los flujos financieros descentralizados.

### Control de Estado de Sesión en Supabase
Aunque el LLM (Gemini) tiene la capacidad de deducir el contexto leyendo el historial completo, se ha determinado asegurar la robustez de la navegación guardando un control en la base de datos.
*   **Tabla de Estado:** Se utilizarán tablas como `bot_sessions` (adaptándola para usar `session_id` en lugar de `phone_number`) para almacenar variables clave por cada cliente/chat, como:
    *   `session_id` (Identificador del chat, ej. Telegram/WhatsApp + Número).
    *   `current_step` (El número del paso por donde va el usuario).
    *   `sucursal_id` (La sucursal seleccionada).
*   Esto previene "amnesias" en el LLM y otorga métricas claras sobre la retención y abandono dentro del embudo del chatbot.
