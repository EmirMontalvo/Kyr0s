import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../services/auth';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  registerForm: FormGroup;
  loading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private supabaseService: SupabaseService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      nombre: ['', Validators.required],
      email: ['', [Validators.required, Validators.email], [this.emailValidator()]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  emailValidator() {
    return async (control: any) => {
      if (!control.value) return null;

      // Try using secure RPC to check auth.users directly
      const { data, error } = await this.supabaseService.client
        .rpc('check_email_exists', { email_check: control.value });

      if (!error && typeof data === 'boolean') {
        return data ? { emailExists: true } : null;
      }

      // Fallback: Check public profile (may be blocked by RLS)
      const { data: profile } = await this.supabaseService.client
        .from('usuarios_perfiles')
        .select('id')
        .eq('email', control.value)
        .single();

      return profile ? { emailExists: true } : null;
    };
  }



  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.loading = true;
    const { nombre, email, password } = this.registerForm.value;

    try {
      // Sign Up without avatar (user can add it later in their profile)
      const { error } = await this.authService.signUp(email, password, {
        nombre_completo: nombre,
        avatar_url: null
      });

      if (error) throw error;

      this.snackBar.open('Favor de verificar su correo electronico para completar el registro.', 'Cerrar', { duration: 5000 });

      // Ensure user is signed out so they can't access dashboard without verification
      await this.authService.signOut();
      this.router.navigate(['/login']);

    } catch (error: any) {
      this.snackBar.open(error.message, 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
