# Kyros Barber: Cronograma del Proyecto

## 📅 Resumen Ejecutivo

| Fase | Descripción | Duración | Estado |
|------|-------------|----------|--------|
| Fase 1 | Fundación y MVP | 8 semanas | ✅ Completado |
| Fase 2 | Monetización | 3 semanas | ✅ Completado |
| Fase 3 | Notificaciones | 2 semanas | 🔜 Pendiente |
| Fase 4 | App Móvil | 6 semanas | 🔜 Pendiente |
| Fase 5 | Optimización | 2 semanas | 🔜 Pendiente |

**Fecha de inicio:** Diciembre 2025  
**MVP completado:** Enero 2026  
**Lanzamiento estimado v2.0:** Marzo 2026

---

## Fase 1: Fundación y MVP ✅
*Duración: 8 semanas | Estado: COMPLETADO*

### Semana 1-2: Arquitectura y Configuración
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Configurar proyecto Angular 18 | Dev | ✅ |
| Configurar Supabase (Auth, DB, Storage) | Dev | ✅ |
| Diseñar esquema de base de datos | Dev | ✅ |
| Implementar Row Level Security (RLS) | Dev | ✅ |

### Semana 3-4: Autenticación y Perfiles
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Login / Registro | Dev | ✅ |
| Verificación de email | Dev | ✅ |
| Validación de email duplicado (RPC) | Dev | ✅ |
| Perfil de usuario/negocio | Dev | ✅ |

### Semana 5-6: Gestión del Negocio (CRUD)
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Módulo de Sucursales | Dev | ✅ |
| Módulo de Empleados | Dev | ✅ |
| Módulo de Servicios | Dev | ✅ |
| Módulo de Clientes | Dev | ✅ |

### Semana 7-8: Calendario y Chatbot
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Calendario de citas (vista día/semana) | Dev | ✅ |
| Chatbot de reservas (flujo completo) | Dev | ✅ |
| Estadísticas básicas | Dev | ✅ |

---

## Fase 2: Monetización (Stripe) ✅
*Duración: 3 semanas | Estado: COMPLETADO*

### Semana 9: Planes y Suscripciones
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Diseñar modelo de planes (Free/Emprendedor/Imperio) | Producto | ✅ |
| Crear tablas `planes` y `suscripciones` | Dev | ✅ |
| Implementar selección de plan en onboarding | Dev | ✅ |

### Semana 10: Integración Stripe (Suscripciones)
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Crear Edge Function `checkout` | Dev | ✅ |
| Crear Edge Function `stripe-webhook` | Dev | ✅ |
| Implementar guards de límites por plan | Dev | ✅ |

### Semana 11: Pagos de Citas (Chatbot)
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Edge Function `create-appointment-checkout` | Dev | ✅ |
| Flujo de pago en chatbot | Dev | ✅ |
| Lógica de reembolsos en dashboard | Dev | ✅ |

---

## Fase 3: Notificaciones 🔜
*Duración: 2 semanas | Estado: PENDIENTE*

### Semana 12: Email Transaccional
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Configurar proveedor (Resend/SendGrid) | Dev | ⬜ |
| Email de confirmación de cita | Dev | ⬜ |
| Email de recordatorio (24h antes) | Dev | ⬜ |
| Email de cancelación | Dev | ⬜ |

### Semana 13: Recuperación de Contraseña
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Flujo "Olvidé mi contraseña" | Dev | ⬜ |
| Página de reset de contraseña | Dev | ⬜ |
| Integración con Supabase Auth | Dev | ⬜ |

---

## Fase 4: App Móvil (Flutter) 🔜
*Duración: 6 semanas | Estado: PENDIENTE*

### Semana 14-15: Configuración y Arquitectura
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Inicializar proyecto Flutter | Dev | ⬜ |
| Configurar estructura (Clean Architecture) | Dev | ⬜ |
| Integrar Supabase Flutter SDK | Dev | ⬜ |
| Migrar modelos/interfaces | Dev | ⬜ |

### Semana 16-17: Autenticación y Dashboard
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Pantallas de Login/Registro | Dev | ⬜ |
| Dashboard principal | Dev | ⬜ |
| Navegación y routing | Dev | ⬜ |

### Semana 18-19: Funcionalidades Core
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Gestión de sucursales | Dev | ⬜ |
| Gestión de empleados | Dev | ⬜ |
| Calendario de citas | Dev | ⬜ |
| Estadísticas | Dev | ⬜ |

---

## Fase 5: Optimización y Lanzamiento 🔜
*Duración: 2 semanas | Estado: PENDIENTE*

### Semana 20: Testing y QA
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Pruebas end-to-end (Web) | QA | ⬜ |
| Pruebas end-to-end (Móvil) | QA | ⬜ |
| Corrección de bugs críticos | Dev | ⬜ |
| Optimización de rendimiento | Dev | ⬜ |

### Semana 21: Lanzamiento
| Tarea | Responsable | Estado |
|-------|-------------|--------|
| Deploy a producción (Web) | Dev | ⬜ |
| Publicar en App Store / Play Store | Dev | ⬜ |
| Documentación de usuario | Producto | ⬜ |
| Onboarding de primeros clientes | Ventas | ⬜ |

---

## 📊 Diagrama de Gantt (Visual)

```
Dic 2025  |  Ene 2026  |  Feb 2026  |  Mar 2026
    |          |          |          |
====|==========|==========|==========|====
    |▓▓▓▓▓▓▓▓▓▓|          |          |  Fase 1: MVP
    |          |▓▓▓▓      |          |  Fase 2: Stripe
    |          |    ░░░░  |          |  Fase 3: Notificaciones
    |          |          |░░░░░░░░░░|  Fase 4: Flutter
    |          |          |          |░░ Fase 5: Lanzamiento

▓ = Completado   ░ = Pendiente
```

---

## 🎯 Hitos Clave

| Hito | Fecha Objetivo | Estado |
|------|----------------|--------|
| MVP Web funcional | Enero 2026 | ✅ |
| Integración Stripe completa | Enero 2026 | ✅ |
| Primer cliente de pago | Febrero 2026 | 🔜 |
| App móvil en beta | Marzo 2026 | 🔜 |
| Lanzamiento público v2.0 | Marzo 2026 | 🔜 |

---

*Documento generado: Enero 2026*
*Última actualización: 27/01/2026*
