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
  selectedFile: File | null = null;
  previewUrl: string | null = null;
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
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.loading = true;
    const { nombre, email, password } = this.registerForm.value;
    let avatarUrl = null;

    try {
      // 1. Upload Image if selected
      if (this.selectedFile) {
        const fileExt = this.selectedFile.name.split('.').pop();
        const fileName = `temp_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await this.supabaseService.client.storage
          .from('avatars')
          .upload(fileName, this.selectedFile);

        if (uploadError) throw uploadError;

        const { data } = this.supabaseService.client.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = data.publicUrl;
      }

      // 2. Sign Up
      const { error } = await this.authService.signUp(email, password, {
        nombre_completo: nombre,
        avatar_url: avatarUrl
      });

      if (error) throw error;

      this.snackBar.open('Registro exitoso. ¡Bienvenido!', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/']);

    } catch (error: any) {
      this.snackBar.open(error.message, 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }
}
