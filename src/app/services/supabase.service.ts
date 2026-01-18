import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
            auth: {
                persistSession: true, // Keep session after page reload
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storage: localStorage, // Explicitly use localStorage
                storageKey: 'kyrosbarber-auth',
                flowType: 'pkce'
            }
        });
    }

    get client() {
        return this.supabase;
    }
}

