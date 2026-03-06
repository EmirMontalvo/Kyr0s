import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
    templateUrl: './landing.html',
    styleUrl: './landing.scss',
})
export class Landing {

    isScrolled = false;
    isMenuOpen = false;
    features = [
        { icon: 'calendar_month', title: 'Agenda Inteligente', desc: 'Gestiona citas en tiempo real con vista de calendario interactiva y notificaciones.' },
        { icon: 'store', title: 'Multi-Sucursal', desc: 'Administra todas tus sucursales desde un solo panel de control centralizado.' },
        { icon: 'people', title: 'Gestión de Clientes', desc: 'CRM integrado con historial de visitas, preferencias y datos de contacto.' },
        { icon: 'content_cut', title: 'Catálogo de Servicios', desc: 'Configura servicios, precios, duraciones y asígnalos a tus empleados.' },
        { icon: 'smart_toy', title: 'Asistente IA', desc: 'Chat con inteligencia artificial que conoce los datos de tu negocio en tiempo real.' },
        { icon: 'chat', title: 'Chatbot de Reservas', desc: 'Tus clientes agendan citas online las 24 horas, los 7 días de la semana.' },
        { icon: 'payments', title: 'Pagos con Stripe', desc: 'Cobra depósitos o montos completos de forma automática al momento de reservar.' },
        { icon: 'bar_chart', title: 'Estadísticas', desc: 'Visualiza ingresos, retención y métricas clave con gráficas en tiempo real.' },
        { icon: 'badge', title: 'Gestión de Empleados', desc: 'Asigna servicios, horarios y especialidades a cada miembro de tu staff.' },
        { icon: 'dark_mode', title: 'Modo Oscuro', desc: 'Interfaz adaptable con modo claro y oscuro para mayor comodidad visual.' },
    ];

    plans = [
        {
            name: 'Plan Gratuito',
            code: 'free',
            price: 'Gratis',
            period: 'Prueba de 7 días',
            features: [
                '1 Sucursal',
                '2 Empleados por sucursal',
                'Sistema de reservas para clientes',
                'Calendario de citas en tiempo real',
                'Gestión de servicios y empleados',
                'Estadísticas de ingresos',
                'Actualizaciones automáticas',
                'Pagos con Stripe'
            ],
            excluded: ['Asistente IA'],
            highlighted: false,
        },
        {
            name: 'Plan Básico',
            code: 'basic',
            price: '$219',
            period: 'MXN / mes',
            features: [
                '2 Sucursales',
                '4 Empleados por sucursal',
                'Sistema de reservas para clientes',
                'Calendario de citas en tiempo real',
                'Gestión de servicios y empleados',
                'Estadísticas de ingresos',
                'Actualizaciones automáticas',
                'Pagos con Stripe'
            ],
            excluded: ['Asistente IA'],
            highlighted: false,
        },
        {
            name: 'Plan Avanzado',
            code: 'regular',
            price: '$499',
            period: 'MXN / mes',
            features: [
                '6 Sucursales',
                '8 Empleados por sucursal',
                'Asistente IA',
                'Sistema de reservas para clientes',
                'Calendario de citas en tiempo real',
                'Gestión de servicios y empleados',
                'Estadísticas de ingresos',
                'Actualizaciones automáticas',
                'Pagos con Stripe'
            ],
            excluded: [],
            highlighted: true,
        },
    ];

    steps = [
        { number: '1', icon: 'person_add', title: 'Regístrate', desc: 'Crea tu cuenta en segundos. Sin tarjeta de crédito requerida.' },
        { number: '2', icon: 'settings', title: 'Configura', desc: 'Añade tus sucursales, servicios, empleados y horarios de atención.' },
        { number: '3', icon: 'rocket_launch', title: 'Gestiona', desc: 'Empieza a recibir reservas y administra tu barbería desde cualquier dispositivo.' },
    ];

    scrollTo(sectionId: string) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }

    @HostListener('window:scroll', [])
    onWindowScroll() {
        this.isScrolled = window.scrollY > 50;
    }

    toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
    }

}
