import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
    providedIn: 'root'
})
export class AiPlanService {

    constructor(private supabase: SupabaseService) { }

    async isAiAvailable(negocioId: string): Promise<boolean> {
        try {
            const { data } = await this.supabase.client
                .from('negocio_suscripciones')
                .select('planes(codigo)')
                .eq('negocio_id', negocioId)
                .single();

            const codigo = (data as any)?.planes?.codigo;
            return codigo === 'regular' || codigo === 'pro'; // Plan Avanzado o Pro
        } catch {
            return false;
        }
    }
}
