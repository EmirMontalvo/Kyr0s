import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { BookingService, ChatMessage } from '../../services/booking.service';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MarkdownPipe
    ],
    templateUrl: './chatbot.html',
    styleUrl: './chatbot.scss'
})
export class ChatbotPage implements OnInit, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

    messages: ChatMessage[] = [];
    userInput = '';
    loading = true;
    processing = false;
    sucursalId: number | null = null;

    // UI State
    services: any[] = [];
    selectedServiceIds: Set<number> = new Set();
    availableSlots: string[] = [];
    employees: any[] = [];
    selectedDate: Date | null = null;
    openDays: number[] = []; // Days of week the branch is open (0=Sun, 1=Mon, etc.)

    constructor(
        private route: ActivatedRoute,
        public bookingService: BookingService,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('sucursalId');
        if (id) {
            this.sucursalId = parseInt(id, 10);
            try {
                await this.initializeChat();
            } catch (error) {
                console.error('Error initializing chat:', error);
                this.addBotMessage('Lo siento, hubo un error al cargar. Por favor recarga la página.');
            }
        } else {
            this.addBotMessage('Error: No se encontró la sucursal.');
        }
        this.loading = false;
        this.cdr.detectChanges();
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    private scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.nativeElement.scrollTop =
                this.messagesContainer.nativeElement.scrollHeight;
        }
    }

    private async initializeChat() {
        console.log('[Chatbot] initializeChat started, sucursalId:', this.sucursalId);
        this.bookingService.resetState();

        console.log('[Chatbot] Calling loadSucursal...');
        const sucursal = await this.bookingService.loadSucursal(this.sucursalId!);
        console.log('[Chatbot] loadSucursal result:', sucursal);

        if (!sucursal) {
            this.addBotMessage('Lo siento, no encontré esta sucursal.');
            return;
        }

        this.addBotMessage(
            `¡Hola! 👋 Bienvenido a **${sucursal.nombre}**. Soy tu asistente virtual para agendar citas.`,
            'text'
        );

        setTimeout(() => {
            this.addBotMessage('¿Qué te gustaría hacer?', 'text');
            this.addBotMessage('', 'services', { showOptions: true });
            this.cdr.detectChanges();
        }, 500);
    }

    private addBotMessage(content: string, type: ChatMessage['type'] = 'text', data?: any) {
        this.messages.push({
            id: `bot_${Date.now()}`,
            content,
            sender: 'bot',
            type,
            data,
            timestamp: new Date()
        });
    }

    private addUserMessage(content: string) {
        this.messages.push({
            id: `user_${Date.now()}`,
            content,
            sender: 'user',
            type: 'text',
            timestamp: new Date()
        });
    }

    async showServices() {
        this.addUserMessage('Ver servicios disponibles');
        this.processing = true;
        this.cdr.detectChanges();

        this.services = await this.bookingService.loadServices(this.sucursalId!);
        this.bookingService.setState({ step: 'services' });

        this.addBotMessage(
            'Estos son nuestros servicios. Selecciona los que desees y presiona "Continuar":',
            'services',
            { services: this.services }
        );

        this.processing = false;
        this.cdr.detectChanges();
    }

    toggleService(service: any) {
        if (this.selectedServiceIds.has(service.id)) {
            this.selectedServiceIds.delete(service.id);
        } else {
            this.selectedServiceIds.add(service.id);
        }
    }

    isServiceSelected(serviceId: number): boolean {
        return this.selectedServiceIds.has(serviceId);
    }

    async confirmServices() {
        if (this.selectedServiceIds.size === 0) {
            this.addBotMessage('Por favor, selecciona al menos un servicio.');
            return;
        }

        const selected = this.services.filter(s => this.selectedServiceIds.has(s.id));
        const names = selected.map(s => s.nombre).join(', ');
        const total = selected.reduce((sum, s) => sum + s.precio_base, 0);

        this.addUserMessage(`Quiero: ${names}`);
        this.bookingService.setState({
            selectedServices: selected,
            step: 'customer_info'
        });

        this.addBotMessage(`¡Excelente! Has elegido: **${names}** (Total: $${total})`);

        setTimeout(() => {
            this.addBotMessage('Por favor, dime tu **nombre completo**:');
            this.cdr.detectChanges();
        }, 300);
    }

    async sendMessage() {
        if (!this.userInput.trim()) return;

        const input = this.userInput.trim();
        this.addUserMessage(input);
        this.userInput = '';
        this.processing = true;

        const state = this.bookingService.getState();

        switch (state.step) {
            case 'customer_info':
                if (!state.customerName) {
                    // Validate name: at least 3 characters and contains letters
                    if (input.length < 3 || !/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(input)) {
                        this.addBotMessage('Por favor, ingresa un **nombre válido** (mínimo 3 caracteres):');
                    } else {
                        this.bookingService.setState({ customerName: input });
                        this.addBotMessage(`Gracias, **${input}**. Ahora ingresa tu **número de teléfono** (10 dígitos):`);
                    }
                } else {
                    // Validate phone: exactly 10 digits
                    const phoneDigits = input.replace(/\D/g, '');
                    if (phoneDigits.length !== 10) {
                        this.addBotMessage('Por favor, ingresa un **teléfono válido** (exactamente 10 dígitos):');
                    } else {
                        this.bookingService.setState({ customerPhone: phoneDigits, step: 'datetime' });
                        this.addBotMessage('Perfecto. ¿Para qué **fecha** te gustaría la cita?');
                        this.showDateSelector();
                    }
                }
                break;

            case 'datetime':
                await this.handleDateInput(input);
                break;

            case 'employee':
                await this.handleEmployeeSelection(input);
                break;
        }

        this.processing = false;
        this.cdr.detectChanges();
    }

    private async showDateSelector() {
        // Load open days if not already loaded
        if (this.openDays.length === 0) {
            this.openDays = await this.bookingService.loadOpenDays(this.sucursalId!);
        }

        // Show next 14 days, but only those that are open
        const dates: Date[] = [];
        for (let i = 0; i < 14 && dates.length < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            // Check if this day of week is in openDays
            if (this.openDays.includes(d.getDay())) {
                dates.push(d);
            }
        }

        if (dates.length === 0) {
            this.addBotMessage('Lo siento, no hay días disponibles próximamente. Por favor contacta a la sucursal.');
        } else {
            this.addBotMessage('', 'datetime', { dates });
        }
        this.cdr.detectChanges();
    }

    async selectDate(date: Date) {
        this.selectedDate = date;
        const dateStr = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
        this.addUserMessage(dateStr);

        this.processing = true;
        this.cdr.detectChanges();

        this.availableSlots = await this.bookingService.loadAvailableSlots(this.sucursalId!, date);

        if (this.availableSlots.length === 0) {
            this.addBotMessage('Lo siento, no hay horarios disponibles para este día. Elige otra fecha.');
            await this.showDateSelector();
        } else {
            this.addBotMessage('Horarios disponibles:', 'datetime', { slots: this.availableSlots });
        }
        this.processing = false;
        this.cdr.detectChanges();
    }

    async selectTime(time: string) {
        this.addUserMessage(time);
        this.bookingService.setState({
            selectedDate: this.selectedDate,
            selectedTime: time,
            step: 'employee'
        });

        // Load employees
        this.employees = await this.bookingService.loadEmployees(
            this.sucursalId!,
            Array.from(this.selectedServiceIds)
        );

        if (this.employees.length > 0) {
            this.addBotMessage(
                '¿Tienes preferencia por alguno de nuestros profesionales?',
                'employees',
                { employees: this.employees }
            );
        } else {
            this.bookingService.setState({ step: 'confirm' });
            this.showConfirmation();
        }
        this.cdr.detectChanges();
    }

    selectEmployee(employee: any | null) {
        if (employee) {
            this.addUserMessage(`Quiero con ${employee.nombre}`);
            this.bookingService.setState({
                selectedEmployeeId: employee.id,
                selectedEmployeeName: employee.nombre,
                step: 'confirm'
            });
        } else {
            this.addUserMessage('Sin preferencia');
            this.bookingService.setState({
                selectedEmployeeId: null,
                selectedEmployeeName: 'Sin preferencia',
                step: 'confirm'
            });
        }
        this.showConfirmation();
        this.cdr.detectChanges();
    }

    private async handleDateInput(input: string) {
        // Simple date parsing - could be enhanced
        const today = new Date();
        if (input.toLowerCase().includes('mañana')) {
            today.setDate(today.getDate() + 1);
            await this.selectDate(today);
        } else if (input.toLowerCase().includes('hoy')) {
            await this.selectDate(today);
        }
    }

    private async handleEmployeeSelection(input: string) {
        const employee = this.employees.find(e =>
            e.nombre.toLowerCase().includes(input.toLowerCase())
        );
        this.selectEmployee(employee || null);
    }

    private showConfirmation() {
        const state = this.bookingService.getState();
        const dateStr = state.selectedDate?.toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long'
        });
        const services = state.selectedServices.map(s => s.nombre).join(', ');
        const total = state.selectedServices.reduce((sum, s) => sum + s.precio_base, 0);

        this.addBotMessage(`
📋 **Resumen de tu cita:**

👤 **Cliente:** ${state.customerName}
📞 **Teléfono:** ${state.customerPhone}
📅 **Fecha:** ${dateStr}
🕐 **Hora:** ${state.selectedTime}
✂️ **Servicios:** ${services}
👨‍🦱 **Atendido por:** ${state.selectedEmployeeName || 'Por asignar'}
💰 **Total:** $${total}
        `, 'confirmation');
    }

    async confirmBooking() {
        this.processing = true;
        this.addUserMessage('Confirmar cita');
        this.cdr.detectChanges();

        try {
            await this.bookingService.createAppointment();
            this.bookingService.setState({ step: 'done' });

            const state = this.bookingService.getState();
            const phoneMsg = state.sucursalTelefono
                ? `📞 Teléfono: **${state.sucursalTelefono}**`
                : '';

            this.addBotMessage(`
✅ **¡Cita agendada con éxito!**

Te esperamos en **${state.sucursalNombre}**.
${phoneMsg}

Si necesitas cancelar o modificar tu cita, comunícate con la sucursal.

¡Gracias por elegirnos! 💈
            `);
        } catch (error: any) {
            this.addBotMessage(`❌ Hubo un error: ${error.message}. Por favor intenta de nuevo.`);
        }

        this.processing = false;
        this.cdr.detectChanges();
    }

    startOver() {
        this.messages = [];
        this.selectedServiceIds.clear();
        this.services = [];
        this.availableSlots = [];
        this.employees = [];
        this.selectedDate = null;
        this.initializeChat();
    }
}
