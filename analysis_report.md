# Análisis del Proyecto Kyros

## Resumen del Proyecto
**Kyros** es una plataforma integral SaaS (Software as a Service) diseñada para la gestión operativa y administrativa de barberías y salones de belleza. El ecosistema consta de:
1.  **Panel Web de Administración (Angular 21)**: Para dueños y administradores. Permite la configuración inicial (Onboarding), gestión de múltiples sucursales, empleados, servicios, horarios y métricas.
2.  **Aplicación Móvil (Flutter)**: Para el personal y operación dia a dia. Permite gestionar agenda, clientes y visualizar turnos.

## Stack Tecnológico
### Web (Panel Administrativo)
-   **Framework**: Angular v21 (Última generación, alto rendimiento).
-   **Diseño UI**: Angular Material, SCSS personalizado.
-   **Animaciones**: Anime.js para interacciones fluidas.
-   **Backend & Base de Datos**: Supabase (PostgreSQL en tiempo real, Auth, Storage).
-   **Manejo de Estado**: RxJS.

### Móvil (App Operativa)
-   **Framework**: Flutter (Multiplataforma iOS/Android).
-   **Backend**: Supabase.
-   **Librerías Clave**: `table_calendar` (Agenda), `image_picker`, `intl`.

## Lógica de Negocio y Funcionalidades Clave
El sistema resuelve la complejidad de administrar negocios de belleza mediante:
-   **Gestión Multi-Sucursal**: Un solo dueño puede administrar varias locaciones desde un único panel.
-   **Onboarding Inteligente**: Flujo guiado para configurar horarios, servicios y personal en minutos.
-   **Agenda Centralizada**: Vista de calendario para gestionar citas y bloqueos de disponibilidad.
-   **Roles y Permisos**: Distinción entre Dueño (Admin), Barbero (Staff) y Recepción.

## Público Objetivo (Target Audience)
-   **Principal**: Dueños de Barberías y Salones de Belleza (PyMEs). Buscan control, métricas y organización.
-   **Secundario**: Barberos y Estilistas. Buscan facilidad para ver su agenda y comisiones.
-   **Terciario**: Recepcionistas. Necesitan una herramienta rápida para agendar y cobrar.

## Problemática que Resuelve
-   Desorganización en citas y horarios (cruce de turnos).
-   Falta de control sobre múltiples sucursales o empleados.
-   Pérdida de información de clientes (historial de cortes, preferencias).
-   Procesos manuales (papel y lápiz) que limitan el crecimiento del negocio.

## Ventajas Competitivas
1.  **Ecosistema Completo**: Web para gestión pesada, Móvil para agilidad operativa.
2.  **Tecnología de Punta**: Angular 21 y Flutter garantizan velocidad y escalabilidad.
3.  **Escalabilidad**: Soporte nativo para múltiples sucursales ("Sucursales" en el código).
4.  **Tiempo Real**: Gracias a Supabase, los cambios en la agenda se reflejan instantáneamente en todos los dispositivos.

---

# Prompt para Figma

Aquí tienes un prompt detallado optimizado para generar un proyecto de presentación/landing page en Figma (o para instruir a un diseñador AI):

```text
Actúa como un Diseñador UI/UX Senior experto en presentaciones de productos SaaS B2B.

**Objetivo:** Crear un proyecto de diseño en Figma para "Kyros", una plataforma moderna de gestión integral para barberías y salones de belleza. El diseño debe transmitir profesionalismo, modernidad y eficiencia tecnológica.

**Estructura del Proyecto de Información:**
Diseña una landing page informativa o una presentación de diapositivas (Pitch Deck) que cubra las siguientes secciones:

1.  **Hero Section (Portada):**
    *   **Título:** "Kyros: El futuro de la gestión para tu Barbería".
    *   **Subtítulo:** "Controla sucursales, empleados y citas en tiempo real con la potencia de Angular 21 y Flutter."
    *   **Visual:** Mockup combinado mostrando el Dashboard Web (Desktop) y la App Móvil (Smartphone) funcionando en sincronía. Estilo moderno, "Dark Mode" elegante con acentos en colores vibrantes (ej. azul eléctrico o dorado).

2.  **¿En qué consiste? (Overview):**
    *   Descripción visual del ecosistema: Icono de Nube (Supabase) conectando el Panel Web (Administración) con la App Móvil (Staff).
    *   Texto clave: "Una solución unificada para digitalizar tu negocio. Desde la configuración de horarios hasta el historial de tus clientes."

3.  **Stack Tecnológico (Tech Showcase):**
    *   Diseña tarjetas (cards) minimalistas/glassmorphism para las tecnologías:
        *   **Angular v21**: "Rendimiento máximo y arquitectura escalable para la web."
        *   **Flutter**: "Experiencia nativa fluida en iOS y Android."
        *   **Supabase**: "Base de datos en tiempo real y seguridad robusta."
        *   **Anime.js & Material Design**: "Interacciones suaves y diseño intuitivo."

4.  **Problemática vs. Solución:**
    *   **Antes (Problemática):** Iconos representando caos (papel, agenda tachada, teléfono sonando). Texto: "Citas perdidas, descontrol de caja, gestión manual."
    *   **Con Kyros (Solución):** Iconos de orden (Checkmarks, Gráficos ascendentes, Calendario digital). Texto: "Agenda automatizada, métricas en tiempo real, gestión multi-sucursal."

5.  **Funcionalidades Core (Features):**
    *   **Multi-Sucursal**: Mapa o gráfico mostrando control centralizado.
    *   **Gestión de Staff**: Perfiles de barberos con especialidades y horarios.
    *   **Agenda Inteligente**: Screenshot estilizado del componente de calendario.
    *   **Onboarding Express**: Ilustración del flujo de "Configura tu negocio en 3 pasos".

6.  **Público Objetivo:**
    *   Representación visual de los usuarios: "El Dueño Visionario" (Admin), "El Barbero Talentoso" (App user), "El Cliente Satisfecho".

7.  **Ventajas Competitivas:**
    *   Lista con iconos grandes: "Sincronización Real-Time", "Escalable de 1 a 100 sucursales", "Interfaz de Última Generación".

**Estilo Visual Requerido:**
*   **Paleta de Colores:** Fondo oscuro (Gunmetal/Black) con tipografía blanca sans-serif (Inter o Roboto) y acentos de color modernos (Neon Blue o Gold).
*   **Estilo:** "SaaS Tech Moderno". Uso de Glassmorphism suave, bordes redondeados, sombras sutiles y mucho espacio negativo (aire).
*   **Imágenes:** Usa componentes de UI reales (botones, inputs) abstractos para decorar el fondo.

Genera los wireframes de alta fidelidad para estas secciones.
```
