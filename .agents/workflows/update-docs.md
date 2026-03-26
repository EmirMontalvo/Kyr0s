---
description: Workflow para actualizar docs/PROYECTO_DOCUMENTACION.md después de cada cambio significativo
---

# Actualizar Documentación del Proyecto

Cada vez que se haga un cambio significativo en el proyecto (nuevo feature, bug fix, cambio de arquitectura, etc.),
se DEBE actualizar `docs/PROYECTO_DOCUMENTACION.md` para mantener el contexto sincronizado para todas las IAs
(Antigravity, Codex, Gemini, etc.).

## Pasos

1. **Identificar qué cambió:** Después de completar un cambio, evaluar qué secciones del documento se ven afectadas.

2. **Secciones a revisar y actualizar si aplica:**
   - `Última actualización:` — Actualizar la fecha al mes actual
   - `Stack Tecnológico` — Si se agregó/cambió alguna dependencia o tecnología
   - `Estructura de Carpetas` — Si se crearon carpetas o archivos nuevos importantes
   - `Base de Datos` — Si se modificó la estructura de tablas, columnas o relaciones
   - `Edge Functions` — Si se creó, modificó o eliminó alguna función de Supabase
   - `Flujos del Sistema` — Si cambió algún flujo (auth, pagos, reservas, etc.)
   - `Componentes por Módulo` — Si se agregó o reestructuró algún componente Angular
   - `Estado Actual del Proyecto` — Mover ítems de "Pendiente" a "Completado" o agregar nuevos
   - `URLs y Endpoints Clave` — Si cambió alguna URL o endpoint

3. **Formato del cambio en "Funcionalidades Completadas":**
   Usar el formato: `- Descripción breve del cambio (Mes Año)`
   Ejemplo: `- Corrección del mapeo de precios en stripe-webhook (Marzo 2026)`

4. **Reglas importantes:**
   - NO borrar información existente, solo actualizar o agregar
   - Mantener el formato y estructura existente del documento
   - Ser conciso pero descriptivo
   - Si un bug fue corregido, mencionarlo en "Completadas" con el contexto mínimo necesario
   - Si hay un nuevo feature pendiente, agregarlo en "Pendiente / En Progreso"
