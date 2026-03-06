export interface Servicio {
    id: number;
    nombre: string;
    precio_base: number;
    duracion_aprox_minutos: number;
    negocio_id: number;
    sucursal_id?: number;
    sucursales?: Sucursal;
    descripcion?: string;
    imagen_url?: string;
    sucursal?: string; // Display field for sucursal name
}

export interface Empleado {
    id: number;
    nombre: string;
    especialidad: string;
    sucursal_id: number;
    sucursal_nombre?: string; // For display
    negocio_id: number;
    user_id?: string; // For auth deletion
}

export interface Sucursal {
    id: number;
    nombre: string;
    direccion: string;
    telefono?: string;
    negocio_id: number;
    cuenta_email?: string;
    cuenta_password?: string;
}

export interface Cliente {
    id: number;
    nombre: string;
    telefono?: string;
    plataforma: string;
    chat_id: string;
    negocio_id?: number;
}

export interface Cita {
    id: number;
    fecha_hora_inicio: string;
    fecha_hora_fin: string;
    empleado_id: number;
    sucursal_id: number;
    cliente_id: number;
    estado: 'confirmada' | 'cancelada' | 'completada' | 'pendiente' | 'en_proceso' | 'pendiente_pago';
    negocio_id: number;
    nombre_cliente_manual?: string;
    total_pagado?: number;
    fecha_completado?: string;
    descripcion?: string;
    fotos_referencia?: string[];
    estado_pago?: 'pendiente' | 'pagado' | 'reembolsado';
    monto_total?: number;

    // Joins
    empleados?: Empleado;
    clientes_bot?: Cliente;
    sucursales?: Sucursal;
    citas_servicios?: { servicios: Servicio, precio_actual: number }[];
}

export interface HorarioSucursal {
    id: number;
    sucursal_id: number;
    dia_semana: number; // 0-6
    hora_inicio: string; // HH:mm:ss
    hora_fin: string; // HH:mm:ss
    hora_descanso_inicio?: string; // HH:mm:ss
    duracion_descanso_minutos?: number;
}

export interface Plan {
    id: number;
    codigo: string;
    nombre: string;
    precio_mxn: number;
    limite_sucursales: number;
    limite_empleados_por_sucursal: number | null;
    descripcion: string;
    activo: boolean;
}

export interface NegocioSuscripcion {
    negocio_id: string;
    plan_id: number;
    estado: 'trial' | 'active' | 'past_due' | 'canceled' | 'free';
    tipo_chatbot?: 'web' | 'whatsapp';
    fecha_fin_prueba?: string;
    fecha_fin_periodo?: string;
    planes?: Plan;
}

