import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ChatMessage {
    id: string;
    content: string;
    sender: 'bot' | 'user';
    type: 'text' | 'services' | 'datetime' | 'employees' | 'confirmation';
    data?: any;
    timestamp: Date;
}

export interface BookingState {
    step: 'welcome' | 'services' | 'customer_info' | 'datetime' | 'employee' | 'confirm' | 'done';
    sucursalId: number | null;
    sucursalNombre: string;
    sucursalTelefono: string;
    selectedServices: any[];
    customerName: string;
    customerPhone: string;
    selectedDate: Date | null;
    selectedTime: string;
    selectedEmployeeId: number | null;
    selectedEmployeeName: string;
}

@Injectable({
    providedIn: 'root'
})
export class BookingService {
    private state: BookingState = this.getInitialState();

    constructor(private supabase: SupabaseService) { }

    getInitialState(): BookingState {
        return {
            step: 'welcome',
            sucursalId: null,
            sucursalNombre: '',
            sucursalTelefono: '',
            selectedServices: [],
            customerName: '',
            customerPhone: '',
            selectedDate: null,
            selectedTime: '',
            selectedEmployeeId: null,
            selectedEmployeeName: ''
        };
    }

    getState(): BookingState {
        return this.state;
    }

    setState(partial: Partial<BookingState>) {
        this.state = { ...this.state, ...partial };
    }

    resetState() {
        this.state = this.getInitialState();
    }

    async loadSucursal(sucursalId: number) {
        const { data } = await this.supabase.client
            .from('sucursales')
            .select('id, nombre, telefono')
            .eq('id', sucursalId)
            .single();

        if (data) {
            this.setState({
                sucursalId: data.id,
                sucursalNombre: data.nombre,
                sucursalTelefono: data.telefono || ''
            });
        }
        return data;
    }

    async loadServices(sucursalId: number) {
        const { data } = await this.supabase.client
            .from('servicios')
            .select('id, nombre, precio_base, duracion_aprox_minutos, descripcion, imagen_url')
            .eq('sucursal_id', sucursalId);

        return data || [];
    }

    async loadEmployees(sucursalId: number, serviceIds: number[]) {
        // Get all employees from this branch
        const { data: allEmployees } = await this.supabase.client
            .from('empleados')
            .select('id, nombre, especialidad')
            .eq('sucursal_id', sucursalId);

        if (!allEmployees || allEmployees.length === 0) return [];
        if (serviceIds.length === 0) return allEmployees;

        // Get employee-service relationships for all selected services
        const { data: employeeServices } = await this.supabase.client
            .from('empleado_servicios')
            .select('empleado_id, servicio_id')
            .in('servicio_id', serviceIds);

        if (!employeeServices) return [];

        // Count how many of the selected services each employee can perform
        const employeeServiceCount = new Map<number, number>();
        employeeServices.forEach(es => {
            const count = employeeServiceCount.get(es.empleado_id) || 0;
            employeeServiceCount.set(es.empleado_id, count + 1);
        });

        // Only return employees who can perform ALL selected services
        const filteredEmployees = allEmployees.filter(emp => {
            const count = employeeServiceCount.get(emp.id) || 0;
            return count >= serviceIds.length;
        });

        return filteredEmployees;
    }

    async loadOpenDays(sucursalId: number): Promise<number[]> {
        // Get all schedules for this branch
        const { data: schedules } = await this.supabase.client
            .from('horarios_sucursal')
            .select('dia_semana')
            .eq('sucursal_id', sucursalId);

        if (!schedules) return [];

        // Return array of open day numbers (0 = Sunday, 1 = Monday, etc.)
        return schedules.map(s => s.dia_semana);
    }

    async loadAvailableSlots(sucursalId: number, date: Date) {
        const dayOfWeek = date.getDay();

        // Get branch schedule for this day
        const { data: schedule } = await this.supabase.client
            .from('horarios_sucursal')
            .select('*')
            .eq('sucursal_id', sucursalId)
            .eq('dia_semana', dayOfWeek)
            .single();

        if (!schedule) return [];

        // Format date as YYYY-MM-DD using local date (not UTC)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Get existing appointments for this date
        const { data: existingCitas } = await this.supabase.client
            .from('citas')
            .select('fecha_hora_inicio, fecha_hora_fin, empleado_id')
            .eq('sucursal_id', sucursalId)
            .gte('fecha_hora_inicio', `${dateStr}T00:00:00`)
            .lte('fecha_hora_inicio', `${dateStr}T23:59:59`)
            .neq('estado', 'cancelada');

        console.log('[BookingService] Existing citas for', dateStr, ':', existingCitas);

        // Generate time slots (every 30 min)
        const slots: string[] = [];
        const startHour = parseInt(schedule.hora_inicio.split(':')[0]);
        const endHour = parseInt(schedule.hora_fin.split(':')[0]);

        for (let h = startHour; h < endHour; h++) {
            for (let m = 0; m < 60; m += 30) {
                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                const slotMinutes = h * 60 + m;

                // Check if slot overlaps with any existing appointment
                // Compare times as strings/minutes to avoid timezone issues
                const isTaken = existingCitas?.some(c => {
                    // Extract start time from fecha_hora_inicio (format: 2026-01-19T10:00:00)
                    const citaStartTime = c.fecha_hora_inicio.split('T')[1]?.substring(0, 5);
                    const citaEndTime = c.fecha_hora_fin.split('T')[1]?.substring(0, 5);

                    if (!citaStartTime || !citaEndTime) return false;

                    const [citaStartH, citaStartM] = citaStartTime.split(':').map(Number);
                    const [citaEndH, citaEndM] = citaEndTime.split(':').map(Number);
                    const citaStartMinutes = citaStartH * 60 + citaStartM;
                    const citaEndMinutes = citaEndH * 60 + citaEndM;

                    // Slot is taken if it falls within an existing appointment
                    return slotMinutes >= citaStartMinutes && slotMinutes < citaEndMinutes;
                });

                // Check if in break time
                let inBreak = false;
                if (schedule.hora_descanso_inicio && schedule.duracion_descanso_minutos) {
                    const breakStart = schedule.hora_descanso_inicio;
                    const breakStartMins = parseInt(breakStart.split(':')[0]) * 60 + parseInt(breakStart.split(':')[1]);
                    if (slotMinutes >= breakStartMins && slotMinutes < breakStartMins + schedule.duracion_descanso_minutos) {
                        inBreak = true;
                    }
                }

                if (!isTaken && !inBreak) {
                    slots.push(timeStr);
                }
            }
        }

        console.log('[BookingService] Available slots:', slots);
        return slots;
    }

    async findOrCreateCustomer(name: string, phone: string, sucursalId: number) {
        // Get negocio_id from sucursal
        const { data: sucursal } = await this.supabase.client
            .from('sucursales')
            .select('negocio_id')
            .eq('id', sucursalId)
            .single();

        if (!sucursal) throw new Error('Sucursal not found');

        // Check if customer exists by phone
        const { data: existing } = await this.supabase.client
            .from('clientes_bot')
            .select('id')
            .eq('telefono', phone)
            .eq('negocio_id', sucursal.negocio_id)
            .single();

        if (existing) return existing.id;

        // Create new customer
        const { data: newCustomer, error } = await this.supabase.client
            .from('clientes_bot')
            .insert({
                nombre: name,
                telefono: phone,
                plataforma: 'web_chat',
                chat_id: `web_${Date.now()}`,
                negocio_id: sucursal.negocio_id
            })
            .select('id')
            .single();

        if (error) throw error;
        return newCustomer?.id;
    }

    async createAppointment() {
        const state = this.state;
        console.log('[BookingService] Creating appointment with state:', state);

        // Calculate total duration
        const totalMinutes = state.selectedServices.reduce(
            (sum, s) => sum + (s.duracion_aprox_minutos || 30), 0
        );

        // Format date as YYYY-MM-DD using local date (not UTC)
        const selectedDate = state.selectedDate!;
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Create start datetime string (local time)
        const startDateTime = `${dateStr}T${state.selectedTime}:00`;

        // Calculate end time by parsing start time and adding duration
        const [startHour, startMin] = state.selectedTime.split(':').map(Number);
        const totalStartMinutes = startHour * 60 + startMin + totalMinutes;
        const endHour = Math.floor(totalStartMinutes / 60);
        const endMin = totalStartMinutes % 60;
        const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
        const endDateTime = `${dateStr}T${endTimeStr}:00`;

        console.log('[BookingService] DateTime:', { startDateTime, endDateTime, totalMinutes });

        // Get negocio_id
        const { data: sucursal } = await this.supabase.client
            .from('sucursales')
            .select('negocio_id')
            .eq('id', state.sucursalId)
            .single();

        console.log('[BookingService] Sucursal:', sucursal);

        // Find or create customer
        const clienteId = await this.findOrCreateCustomer(
            state.customerName,
            state.customerPhone,
            state.sucursalId!
        );

        console.log('[BookingService] Cliente ID:', clienteId);

        // Create appointment
        const appointmentData = {
            fecha_hora_inicio: startDateTime,
            fecha_hora_fin: endDateTime,
            empleado_id: state.selectedEmployeeId,
            sucursal_id: state.sucursalId,
            cliente_id: clienteId,
            estado: 'pendiente',
            negocio_id: sucursal?.negocio_id,
            nombre_cliente_manual: state.customerName
        };

        console.log('[BookingService] Inserting appointment:', appointmentData);

        const { data: cita, error: citaError } = await this.supabase.client
            .from('citas')
            .insert(appointmentData)
            .select('id')
            .single();

        console.log('[BookingService] Appointment result:', { cita, citaError });

        if (citaError) throw citaError;

        // Insert services
        const servicesToInsert = state.selectedServices.map(s => ({
            cita_id: cita!.id,
            servicio_id: s.id,
            precio_actual: s.precio_base
        }));

        await this.supabase.client
            .from('citas_servicios')
            .insert(servicesToInsert);

        return cita;
    }
}
