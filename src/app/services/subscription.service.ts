import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class SubscriptionService {

    constructor(
        private supabase: SupabaseService,
        private http: HttpClient
    ) { }

    async createCheckoutSession(priceId: string, negocioId: string) {
        const { data: { session } } = await this.supabase.client.auth.getSession();

        if (!session) throw new Error('No session');

        console.log('SubscriptionService: Invoking create-checkout with:', { price_id: priceId, negocio_id: negocioId });

        // Call Supabase Function
        const { data, error } = await this.supabase.client.functions.invoke('create-checkout', {
            body: {
                price_id: priceId,
                negocio_id: negocioId
            }
        });

        if (error) {
            console.error('SubscriptionService: Error creating checkout:', error);
            // Try to extract useful message
            throw new Error(error.message || 'Error al crear sesión de pago');
        }

        if (data?.url) {
            window.location.href = data.url; // Redirect to Stripe
        } else {
            console.error('SubscriptionService: No URL in data:', data);
            throw new Error('No checkout URL returned');
        }
    }

    async getSubscriptionStatus(negocioId: string) {
        return this.supabase.client
            .from('negocio_suscripciones')
            .select(`
            *,
            planes (*)
        `)
            .eq('negocio_id', negocioId)
            .single();
    }
}
