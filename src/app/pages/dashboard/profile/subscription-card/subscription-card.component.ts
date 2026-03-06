import { Component, OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { SubscriptionService } from '../../../../services/subscription.service';
import { environment } from '../../../../../environments/environment';

@Component({
    selector: 'app-subscription-card',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatDividerModule
    ],
    templateUrl: './subscription-card.component.html',
    styleUrl: './subscription-card.component.scss'
})
export class SubscriptionCardComponent implements OnInit, OnChanges {
    @Input() negocioId: string | null = null;

    loading = false;
    currentSubscription: any = null;
    features: Record<string, string[]> = {
        free: [
            '1 Sucursal',
            '2 Empleados por sucursal',
            'Calendario de citas',
            'Gestión de servicios'
        ],
        basic: [
            '2 Sucursales',
            '4 Empleados por sucursal',
            'Calendario de citas',
            'Gestión de servicios'
        ],
        regular: [
            '6 Sucursales',
            '8 Empleados por sucursal',
            'Asistente IA',
            'Chatbot de reservas'
        ]
    };

    constructor(
        private subscriptionService: SubscriptionService,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) { }

    async ngOnInit() { }

    async ngOnChanges(changes: SimpleChanges) {
        if (changes['negocioId'] && this.negocioId) {
            setTimeout(async () => {
                await this.loadSubscription();
            });
        }
    }

    async loadSubscription() {
        if (!this.negocioId) return;
        this.loading = true;

        try {
            const { data, error } = await this.subscriptionService.getSubscriptionStatus(this.negocioId);

            if (error) {
                if (error.code === 'PGRST116') {
                    this.currentSubscription = {
                        planes: { codigo: 'free' },
                        estado: 'active'
                    };
                    return;
                }
                throw error;
            }

            this.currentSubscription = data;
        } catch (error) {
            console.error('Error loading subscription:', error);
        } finally {
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    isTrialing(): boolean {
        return this.currentSubscription?.estado === 'trialing' || this.currentSubscription?.estado === 'trial';
    }

    getEndDate(): string | null {
        const sub = this.currentSubscription;
        if (!sub) return null;

        // Check if trialing to determine which date to show
        let dateStr = null;
        if (this.isTrialing()) {
            dateStr = sub.fecha_fin_prueba;
        } else {
            // For active plans, prioritize the renewal period date
            dateStr = sub.fecha_fin_periodo || sub.fecha_fin_prueba;
        }

        if (!dateStr) return null;

        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getDaysRemaining(): number {
        if (!this.currentSubscription?.fecha_fin_prueba) return 0;
        const end = new Date(this.currentSubscription.fecha_fin_prueba);
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
    }

    async upgradePlan(planCode: 'basic' | 'regular') {
        if (!this.negocioId) return;
        this.loading = true;

        try {
            const priceId = environment.stripePrices[planCode];
            if (!priceId) throw new Error('Price ID not found for ' + planCode);
            await this.subscriptionService.createCheckoutSession(priceId, this.negocioId);
        } catch (error: any) {
            this.snackBar.open('Error al iniciar pago: ' + error.message, 'Cerrar', { duration: 3000 });
            this.loading = false;
            this.cdr.detectChanges();
        }
    }

    getPlanName(code: string): string {
        switch (code) {
            case 'free': return 'Plan Gratuito';
            case 'basic': return 'Plan Básico';
            case 'regular': return 'Plan Avanzado';
            default: return code;
        }
    }

    getPlanIcon(code: string): string {
        switch (code) {
            case 'free': return 'card_giftcard';
            case 'basic': return 'star';
            case 'regular': return 'rocket_launch';
            default: return 'credit_card';
        }
    }

    getFeatures(planCode: string): string[] {
        return this.features[planCode] || [];
    }
}
