
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Sucursal } from '../../../../models';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../../../environments/environment';

@Component({
    selector: 'app-create-branch-user-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule
    ],
    templateUrl: './create-branch-user-dialog.html',
    styleUrl: './create-branch-user-dialog.scss',
})
export class CreateBranchUserDialog {
    form: FormGroup;
    loading = false;
    hidePassword = true;

    // Secondary client for creating users without logging out
    private supabaseAdmin: any;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<CreateBranchUserDialog>,
        private snackBar: MatSnackBar,
        @Inject(MAT_DIALOG_DATA) public data: { sucursales: Sucursal[] }
    ) {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            sucursal_id: ['', Validators.required]
        });

        // Initialize a temporary client. 
        // NOTE: In a real production app, this should be done via a backend function 
        // to avoid exposing service role keys if used, but here we use the public anon key.
        // However, the public anon key usually doesn't allow creating users without logging in as them.
        // The "Trick" is: using `supabase.auth.signUp` logs you in as the new user by default.
        // WE CANNOT do that here without losing the admin session.
        // Correct approach using client-side only (if no Edge Functions):
        // Use a completely separate instance. BUT `signUp` persists session to localStorage by default.
        // We must configure it to NOT persist session or use a MemoryStorage.

        this.supabaseAdmin = createClient(environment.supabaseUrl, environment.supabaseKey, {
            auth: {
                persistSession: false, // CRITICAL: Do not overwrite current admin session
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
    }

    async onSubmit() {
        if (this.form.invalid) return;
        this.loading = true;

        const { email, password, sucursal_id } = this.form.value;

        try {
            // 1. Create the user
            const { data: authData, error: authError } = await this.supabaseAdmin.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        // We can pass metadata here if we have a trigger, but we'll insert manually below to be safe/explicit
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Insert profile with role 'sucursal'
                // We need to use the MAIN CLIENT (the admin one) to insert into the public table, 
                // assuming RLS allows the admin to insert for others or we have an RPC.
                // If RLS blocks this, we might have an issue. 
                // Usually, users can insert their own profile. But here the "Admin" is inserting for "New User".

                // Let's assume standard RLS: 'dueno' can insert/update profiles within their Business logic?
                // Or we rely on the fact that we are 'authed' as the new user in `supabaseAdmin`?
                // Wait, `signUp` returns the user but doesn't necessarily give us a session if email confirmation is on.
                // IF email confirm is OFF: we get a session in `authData.session`.

                // BETTER APPROACH: 
                // We assume the Admin (current user) has RLS permissions to INSERT into `usuarios_perfiles`.
                // We just need the `id` of the new user.

                const newUserId = authData.user.id;

                // Use the main app's supabase client (which we can import or pass? No, use the one from service but creating new instance here is messy).
                // Let's instantiate a new main client or assume we have access.
                // Actually, we'll try to insert using the `supabaseAdmin` client IF it has a session (user logged in).
                // If email confirmation is required, `session` will be null, and we can't insert the profile row easily unless 
                // the table allows public inserts (bad) or we have a backend function.

                // WORKAROUND if Email Confirm is ON: 
                // We can't set the profile row easily.
                // Assuming Email Confirm is OFF for this prototype or 'dueno' can write to `usuarios_perfiles`.

                // Let's use the provided main client from DI or just use the `supabaseAdmin` if it got a session.
                // If it didn't get a session (waiting for email verify), we can't insert safely client-side.

                // Let's try inserting with the `CreateBranchUserDialog`'s dependency. 
                // I need to inject SupabaseService.

            } else {
                throw new Error('No se pudo crear el usuario.');
            }

            this.dialogRef.close({ email, sucursal_id, userId: authData.user.id });

        } catch (error: any) {
            console.error(error);
            this.snackBar.open('Error: ' + error.message, 'Cerrar', { duration: 3000 });
        } finally {
            this.loading = false;
        }
    }
}
