import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SupabaseService } from '../../../../services/supabase.service';
import { AiPlanService } from '../../../../services/ai-plan.service';
import { AuthService } from '../../../../services/auth';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

@Component({
    selector: 'app-ai-chat',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatIconModule,
        MatButtonModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './ai-chat.html',
    styleUrl: './ai-chat.scss',
})
export class AiChat implements OnInit {
    isOpen = false;
    isAvailable = false;
    isLoading = false;
    messages: ChatMessage[] = [];
    userMessage = '';
    negocioId: string | null = null;
    sucursalId: number | null = null;

    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    constructor(
        private supabase: SupabaseService,
        private aiPlanService: AiPlanService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit() {
        const user = this.authService.currentUser;
        if (!user) return;

        const { data: profile } = await this.supabase.client
            .from('usuarios_perfiles')
            .select('negocio_id, sucursal_id, rol')
            .eq('id', user.id)
            .single();

        if (profile?.negocio_id) {
            this.negocioId = profile.negocio_id;
            // Detect branch user
            if (profile.rol === 'sucursal' && profile.sucursal_id) {
                this.sucursalId = profile.sucursal_id;
            }
            this.isAvailable = await this.aiPlanService.isAiAvailable(profile.negocio_id);
            this.cdr.detectChanges();
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        if (this.isOpen && this.messages.length === 0) {
            this.messages.push({
                role: 'assistant',
                content: 'Hola! Soy tu asistente IA de Kyros. Puedo ayudarte con info sobre tu negocio.\n\nPregunta cosas como:\n- Cuanto gane este mes?\n- Cual es mi servicio mas popular?\n- Como van mis sucursales?',
                timestamp: new Date()
            });
        }
    }

    async sendMessage() {
        if (!this.userMessage.trim() || this.isLoading || !this.negocioId) return;

        const message = this.userMessage.trim();
        this.userMessage = '';

        // Add user message
        this.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        this.isLoading = true;
        this.cdr.detectChanges();
        this.scrollToBottom();

        try {
            const { data, error } = await this.supabase.client.functions.invoke('ai-chat', {
                body: {
                    message: message,
                    negocio_id: this.negocioId,
                    sucursal_id: this.sucursalId
                }
            });

            console.log('AI Chat response:', data, 'error:', error);

            if (error) {
                // Try to parse the error body for our reply
                try {
                    const errorBody = JSON.parse(error.message || '{}');
                    if (errorBody.reply) {
                        this.messages.push({ role: 'assistant', content: errorBody.reply, timestamp: new Date() });
                    } else {
                        throw error;
                    }
                } catch {
                    this.messages.push({ role: 'assistant', content: 'Lo siento, hubo un error. Intenta de nuevo.', timestamp: new Date() });
                }
            } else if (data?.reply) {
                this.messages.push({ role: 'assistant', content: data.reply, timestamp: new Date() });
            } else {
                this.messages.push({ role: 'assistant', content: 'No pude generar una respuesta.', timestamp: new Date() });
            }
        } catch (err: any) {
            this.messages.push({
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu pregunta. Intenta de nuevo.',
                timestamp: new Date()
            });
            console.error('AI Chat error:', err);
        }

        this.isLoading = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
    }

    private scrollToBottom() {
        setTimeout(() => {
            if (this.messagesContainer) {
                const el = this.messagesContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            }
        }, 100);
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }
}
