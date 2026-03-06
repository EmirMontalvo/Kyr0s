import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
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
        RouterModule,
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
        private router: Router,
        public bookingService: BookingService,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('sucursalId');

        // Handle payment return params
        const paymentStatus = this.route.snapshot.queryParamMap.get('payment');
        const citaId = this.route.snapshot.queryParamMap.get('cita_id');

        if (id) {
            this.sucursalId = parseInt(id, 10);

            if (paymentStatus === 'success') {
                // Verify session using localStorage
                const pendingCitaId = localStorage.getItem('pending_checkout_cita_id');

                if (citaId && pendingCitaId === citaId) {
                    // Valid session
                    localStorage.removeItem('pending_checkout_cita_id'); // Clear token
                    await this.handlePaymentSuccess();
                } else {
                    // Invalid session - redirect to login
                    console.warn('Unauthorized access to payment success page');
                    this.router.navigate(['/login']);
                }
            } else if (paymentStatus === 'cancelled') {
                // Payment was cancelled
                await this.handlePaymentCancelled(citaId);
            } else {
                try {
                    await this.initializeChat();
                } catch (error) {
                    console.error('Error initializing chat:', error);
                    this.addBotMessage('Lo siento, hubo un error al cargar. Por favor recarga la página.');
                }
            }
        } else {
            this.addBotMessage('Error: No se encontró la sucursal.');
        }
        this.loading = false;
        this.cdr.detectChanges();
    }

    private async handlePaymentSuccess() {
        this.bookingService.confirmPaymentSuccess();
        this.addBotMessage(`
✅ **¡Pago procesado con éxito!**

**¡Tu cita ha sido confirmada!**

Recibirás un correo de confirmación con los detalles.

¡Gracias por tu preferencia! 💈
        `);
    }

    private async handlePaymentCancelled(citaId: string | null) {
        if (citaId) {
            // Cancel the pending appointment
            this.bookingService.setState({ pendingCitaId: parseInt(citaId, 10) });
            await this.bookingService.cancelPendingAppointment();
        }

        this.addBotMessage(`
❌ **Pago cancelado**

El proceso de pago fue cancelado. Tu cita no ha sido confirmada.

Si deseas intentar de nuevo, puedes iniciar una nueva reservación.
        `);

        setTimeout(() => {
            this.addBotMessage('¿Qué te gustaría hacer?', 'text');
            this.addBotMessage('', 'services', { showOptions: true });
            this.cdr.detectChanges();
        }, 1000);
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

    // Details State
    detailsDescription: string = '';
    selectedFiles: File[] = [];
    filePreviews: string[] = [];

    // ... existing properties ...

    // ... existing methods ...

    async confirmServices() {
        if (this.selectedServiceIds.size === 0) {
            this.addBotMessage('Por favor, selecciona al menos un servicio.');
            return;
        }

        const selected = this.services.filter(s => this.selectedServiceIds.has(s.id));
        const names = selected.map(s => s.nombre).join(', ');
        const subtotal = selected.reduce((sum, s) => sum + s.precio_base, 0);

        // Calculate Stripe Mexico fees: 3.6% + $3.00 MXN
        // Formula to pass fees to customer: total = (base + fixedFee) / (1 - percentFee)
        const fixedFee = 3.00; // MXN
        const percentFee = 0.036; // 3.6%
        const totalWithFees = (subtotal + fixedFee) / (1 - percentFee);
        const feeAmount = totalWithFees - subtotal;

        this.addUserMessage(`Quiero: ${names}`);
        this.bookingService.setState({
            selectedServices: selected,
            step: 'details' // Step changed to details
        });

        this.addBotMessage(`¡Excelente! Has elegido: **${names}**

💰 **Desglose de precio:**
- Subtotal: **$${subtotal.toFixed(2)} MXN**
- Comisión de procesamiento: **$${feeAmount.toFixed(2)} MXN**
- **Total a pagar: $${totalWithFees.toFixed(2)} MXN**`);

        setTimeout(() => {
            this.addBotMessage(
                '¿Deseas agregar algún detalle o foto de referencia? (Opcional)',
                'details_input'
            );
            this.cdr.detectChanges();
        }, 300);
    }

    onFileSelected(event: any) {
        const files = event.target.files;
        if (files) {
            for (let i = 0; i < files.length; i++) {
                if (this.selectedFiles.length >= 5) {
                    // Limit 5
                    break;
                }
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    this.selectedFiles.push(file);
                    // Preview
                    const reader = new FileReader();
                    reader.onload = (e: any) => {
                        this.filePreviews.push(e.target.result);
                        this.cdr.detectChanges();
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    }

    removeFile(index: number) {
        this.selectedFiles.splice(index, 1);
        this.filePreviews.splice(index, 1);
    }

    async submitDetails() {
        this.processing = true;
        this.cdr.detectChanges();

        let photoUrls: string[] = [];
        if (this.selectedFiles.length > 0) {
            try {
                console.log('[Chatbot] Uploading files:', this.selectedFiles.length);
                photoUrls = await this.bookingService.uploadFiles(this.selectedFiles);
                console.log('[Chatbot] Upload complete, URLs:', photoUrls);
            } catch (error) {
                console.error('[Chatbot] Error uploading photos:', error);
            }
        }

        console.log('[Chatbot] Setting state with photoUrls:', photoUrls, 'description:', this.detailsDescription);
        this.bookingService.setState({
            description: this.detailsDescription,
            photoUrls: photoUrls,
            step: 'customer_info'
        });

        // Summary ofdetails
        let msg = 'Continuar';
        const parts = [];
        if (this.detailsDescription) parts.push(`Nota: "${this.detailsDescription}"`);
        if (this.selectedFiles.length > 0) parts.push(`${this.selectedFiles.length} fotos`);
        if (parts.length > 0) msg = parts.join(', ');

        this.addUserMessage(msg);

        setTimeout(() => {
            this.addBotMessage('Por favor, dime tu **nombre completo**:');
            this.processing = false;
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
                } else if (!state.customerPhone) {
                    // Validate phone: exactly 10 digits
                    const phoneDigits = input.replace(/\D/g, '');
                    if (phoneDigits.length !== 10) {
                        this.addBotMessage('Por favor, ingresa un **teléfono válido** (exactamente 10 dígitos):');
                    } else {
                        this.bookingService.setState({ customerPhone: phoneDigits });
                        this.addBotMessage('Por último, ingresa tu **correo electrónico** (para enviar el recibo de pago):');
                    }
                } else {
                    // Validate email
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(input)) {
                        this.addBotMessage('Por favor, ingresa un **correo electrónico válido**:');
                    } else {
                        this.bookingService.setState({ customerEmail: input, step: 'datetime' });
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

        let detailsHtml = '';
        if (state.description) {
            detailsHtml += `\n📝 **Nota:** ${state.description}`;
        }
        if (state.photoUrls && state.photoUrls.length > 0) {
            detailsHtml += `\n📷 **Fotos:** ${state.photoUrls.length} referencias`;
        }

        this.addBotMessage(`
📋 **Resumen de tu cita:**

👤 **Cliente:** ${state.customerName}
📞 **Teléfono:** ${state.customerPhone}
📅 **Fecha:** ${dateStr}
🕐 **Hora:** ${state.selectedTime}
✂️ **Servicios:** ${services}
👨‍🦱 **Atendido por:** ${state.selectedEmployeeName || 'Por asignar'}
💰 **Total:** $${total}${detailsHtml}
        `, 'confirmation');
    }

    async confirmBooking() {
        this.processing = true;
        this.addUserMessage('Confirmar y pagar');
        this.cdr.detectChanges();

        try {
            // 1. Create pending appointment
            await this.bookingService.createAppointment();

            const state = this.bookingService.getState();
            const total = this.bookingService.calculateTotal();

            this.addBotMessage(`
💳 **Procesando pago...**

Se creará un cargo de **$${total} MXN** (+ comisión de procesamiento).

Serás redirigido a la página de pago segura de Stripe.
            `);

            this.cdr.detectChanges();

            // 2. Initiate payment and redirect
            const paymentResult = await this.bookingService.initiatePayment();

            if (paymentResult && paymentResult.url) {
                // Save pending cita ID to localStorage for security check upon return
                if (state.pendingCitaId) {
                    localStorage.setItem('pending_checkout_cita_id', state.pendingCitaId.toString());
                }

                // Redirect to Stripe Checkout
                window.location.href = paymentResult.url;
            } else {
                // Payment initiation failed - cancel the pending appointment
                await this.bookingService.cancelPendingAppointment();
                this.addBotMessage('❌ Hubo un error al procesar el pago. Por favor intenta de nuevo.');
            }
        } catch (error: any) {
            console.error('Error in confirmBooking:', error);
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
        this.detailsDescription = '';
        this.selectedFiles = [];
        this.filePreviews = [];
        this.initializeChat();
    }
}
