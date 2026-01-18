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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth';
import { SupabaseService } from '../../../services/supabase.service';
import { QrScannerDialog } from '../../../components/qr-scanner-dialog/qr-scanner-dialog';

@Component({
  selector: 'app-login',
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
    MatIconModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  loading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private supabase: SupabaseService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  openQrScanner() {
    this.dialog.open(QrScannerDialog, {
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'qr-scanner-dialog-panel'
    });
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    const { email, password } = this.loginForm.value;

    try {
      const { data: authData, error } = await this.authService.signIn(email, password);
      if (error) throw error;

      // Check if user has a business assigned
      const user = authData.user;
      if (user) {
        const { data: profile, error: profileError } = await this.supabase.client
          .from('usuarios_perfiles')
          .select('negocio_id, rol, sucursal_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          // No profile at all - might be a new owner, send to onboarding
          localStorage.setItem('userRole', 'dueno');
          localStorage.removeItem('sucursalId');
          this.router.navigate(['/onboarding']);
        } else if (profile?.rol === 'sucursal') {
          // Branch user - always go to dashboard (they don't need onboarding)
          localStorage.setItem('userRole', 'sucursal');
          localStorage.setItem('sucursalId', profile.sucursal_id?.toString() || '');
          this.router.navigate(['/dashboard']);
        } else if (!profile?.negocio_id) {
          // Owner without business - send to onboarding
          localStorage.setItem('userRole', 'dueno');
          localStorage.removeItem('sucursalId');
          this.router.navigate(['/onboarding']);
        } else {
          // Owner with business - go to dashboard
          localStorage.setItem('userRole', 'dueno');
          localStorage.removeItem('sucursalId');
          this.router.navigate(['/dashboard']);
        }
      } else {
        this.router.navigate(['/dashboard']);
      }

    } catch (error: any) {
      this.snackBar.open(error.message, 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
