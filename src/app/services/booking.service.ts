import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ChatMessage {
    id: string;
    content: string;
    sender: 'bot' | 'user';
    type: 'text' | 'services' | 'datetime' | 'employees' | 'confirmation' | 'details_input';
    data?: any;
    timestamp: Date;
}

export interface BookingState {
    step: 'welcome' | 'services' | 'details' | 'customer_info' | 'datetime' | 'employee' | 'confirm' | 'payment' | 'done';
    sucursalId: number | null;
    sucursalNombre: string;
    sucursalTelefono: string;
    selectedServices: any[];
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    selectedDate: Date | null;
    selectedTime: string;
    selectedEmployeeId: number | null;
    selectedEmployeeName: string;
    description?: string;
    photoUrls?: string[];
    pendingCitaId?: number;
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
            customerEmail: '',
            selectedDate: null,
            selectedTime: '',
            selectedEmployeeId: null,
            selectedEmployeeName: '',
            description: '',
            photoUrls: [],
            pendingCitaId: undefined
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

        const now = new Date();
        const isToday = now.getDate() === date.getDate() &&
            now.getMonth() === date.getMonth() &&
            now.getFullYear() === date.getFullYear();

        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (let h = startHour; h < endHour; h++) {
            for (let m = 0; m < 60; m += 30) {
                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                const slotMinutes = h * 60 + m;

                // If today, filter out past slots + 30 min buffer
                if (isToday && slotMinutes < currentMinutes + 30) {
                    continue;
                }

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

    async findOrCreateCustomer(name: string, phone: string, email: string, sucursalId: number) {
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

        if (existing) {
            // Update email if provided and not already set
            if (email) {
                await this.supabase.client
                    .from('clientes_bot')
                    .update({ email })
                    .eq('id', existing.id);
            }
            return existing.id;
        }

        // Create new customer
        const { data: newCustomer, error } = await this.supabase.client
            .from('clientes_bot')
            .insert({
                nombre: name,
                telefono: phone,
                email: email,
                plataforma: 'web_chat',
                chat_id: `web_${Date.now()}`,
                negocio_id: sucursal.negocio_id
            })
            .select('id')
            .single();

        if (error) throw error;
        return newCustomer?.id;
    }

    async uploadFiles(files: File[]): Promise<string[]> {
        const urls: string[] = [];
        for (const file of files) {
            const fileName = `citas/${Date.now()}_${file.name}`;
            const { data, error } = await this.supabase.client
                .storage
                .from('citas-files')
                .upload(fileName, file);

            if (error) {
                console.error('Error uploading file:', error);
                continue;
            }

            const { data: publicUrlData } = this.supabase.client
                .storage
                .from('citas-files')
                .getPublicUrl(fileName);

            urls.push(publicUrlData.publicUrl);
        }
        return urls;
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

        // Find or create customer (now with email)
        const clienteId = await this.findOrCreateCustomer(
            state.customerName,
            state.customerPhone,
            state.customerEmail,
            state.sucursalId!
        );

        console.log('[BookingService] Cliente ID:', clienteId);

        // Calculate total amount
        const montoBase = this.calculateTotal();

        // Create appointment with pending payment status
        const appointmentData = {
            fecha_hora_inicio: startDateTime,
            fecha_hora_fin: endDateTime,
            empleado_id: state.selectedEmployeeId,
            sucursal_id: state.sucursalId,
            cliente_id: clienteId,
            estado: 'pendiente_pago', // Changed from 'pendiente' to 'pendiente_pago'
            estado_pago: 'pendiente',
            negocio_id: sucursal?.negocio_id,
            nombre_cliente_manual: state.customerName,
            descripcion: state.description,
            fotos_referencia: state.photoUrls && state.photoUrls.length > 0 ? state.photoUrls : null,
            monto_total: montoBase,
            cliente_email: state.customerEmail
        };

        console.log('[BookingService] State photoUrls:', state.photoUrls);
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

        // Store pending cita ID in state
        this.setState({ pendingCitaId: cita!.id });

        return cita;
    }

    /**
     * Calculate total price of selected services
     */
    calculateTotal(): number {
        return this.state.selectedServices.reduce(
            (sum, s) => sum + (s.precio_base || 0), 0
        );
    }

    /**
     * Initiate payment by calling Edge Function
     */
    async initiatePayment(): Promise<{ url: string; montoTotal: number } | null> {
        const state = this.state;
        if (!state.pendingCitaId || !state.sucursalId) {
            console.error('[BookingService] Missing pendingCitaId or sucursalId');
            return null;
        }

        const montoBase = this.calculateTotal();
        const serviciosNombres = state.selectedServices.map(s => s.nombre).join(', ');

        try {
            const response = await fetch(
                `https://qyyhembukflbxjbctuav.supabase.co/functions/v1/create-appointment-checkout`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        cita_id: state.pendingCitaId,
                        monto_base: montoBase,
                        sucursal_id: state.sucursalId,
                        cliente_email: state.customerEmail,
                        cliente_nombre: state.customerName,
                        servicios_nombres: serviciosNombres
                    })
                }
            );

            const data = await response.json();
            if (data.error) {
                console.error('[BookingService] Payment initiation error:', data.error);
                return null;
            }

            return { url: data.url, montoTotal: data.monto_total };
        } catch (error) {
            console.error('[BookingService] Payment initiation failed:', error);
            return null;
        }
    }

    /**
     * Cancel a pending appointment (called when user cancels payment)
     */
    async cancelPendingAppointment(): Promise<void> {
        const citaId = this.state.pendingCitaId;
        if (!citaId) return;

        try {
            // Delete associated services first
            await this.supabase.client
                .from('citas_servicios')
                .delete()
                .eq('cita_id', citaId);

            // Delete the appointment
            await this.supabase.client
                .from('citas')
                .delete()
                .eq('id', citaId);

            console.log('[BookingService] Cancelled pending appointment:', citaId);
        } catch (error) {
            console.error('[BookingService] Error cancelling appointment:', error);
        }
    }

    /**
     * Confirm payment was successful (update local state)
     */
    confirmPaymentSuccess(): void {
        this.setState({ step: 'done' });
    }
}
