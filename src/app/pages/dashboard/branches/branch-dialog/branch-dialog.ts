import { Component, Inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../../services/supabase.service';
import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-branch-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
    RouterModule
  ],
  templateUrl: './branch-dialog.html',
  styleUrl: './branch-dialog.scss',
})
export class BranchDialog {
  form: FormGroup;
  loading = false;
  uploading = false;
  isEdit = false;
  hidePassword = true;
  stripeLoading = false;

  // Photo upload
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BranchDialog>,
    private supabase: SupabaseService,
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEdit = !!data?.id;

    this.form = this.fb.group({
      nombre: [data?.nombre || '', Validators.required],
      direccion: [data?.direccion || '', Validators.required],
      telefono: [data?.telefono || '', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      cuenta_email: [data?.cuenta_email || '', [Validators.required, Validators.email]],
      cuenta_password: [data?.cuenta_password || '', this.isEdit ? [] : [Validators.required, Validators.minLength(6)]]
    });

    // Set existing image preview
    if (data?.imagen_url) {
      this.imagePreview = data.imagen_url;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no puede ser mayor a 5MB');
        return;
      }

      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.ngZone.run(() => {
          this.imagePreview = e.target?.result as string;
          this.cdr.detectChanges();
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.imagePreview = null;
    this.selectedFile = null;
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    try {
      const user = this.authService.currentUser;
      if (!user) throw new Error('No user');

      let negocioId = this.data?.negocio_id;
      if (!negocioId) {
        const { data: profile } = await this.supabase.client
          .from('usuarios_perfiles')
          .select('negocio_id')
          .eq('id', user.id)
          .single();
        negocioId = profile?.negocio_id;
      }

      const { nombre, direccion, telefono, cuenta_email, cuenta_password } = this.form.value;

      // Upload image if selected
      let imagenUrl = this.data?.imagen_url || null;
      if (this.selectedFile) {
        this.uploading = true;
        const fileName = `${Date.now()}_${this.selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        const { error: uploadError } = await this.supabase.client.storage
          .from('sucursales')
          .upload(fileName, this.selectedFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          this.snackBar.open('Error al subir la imagen', 'Cerrar', { duration: 3000 });
        } else {
          const { data: urlData } = this.supabase.client.storage
            .from('sucursales')
            .getPublicUrl(fileName);
          imagenUrl = urlData.publicUrl;
        }
        this.uploading = false;
      } else if (!this.imagePreview && this.data?.imagen_url) {
        imagenUrl = null;
      }

      const branchData: any = {
        nombre,
        direccion,
        telefono,
        cuenta_email,
        negocio_id: negocioId,
        imagen_url: imagenUrl
      };

      // Only update password if provided (for edit mode, empty means keep existing)
      if (cuenta_password && cuenta_password.length > 0) {
        branchData.cuenta_password = cuenta_password;
      }

      let result;
      if (this.isEdit) {
        result = await this.supabase.client
          .from('sucursales')
          .update(branchData)
          .eq('id', this.data.id)
          .select()
          .single();
      } else {
        // For new branches, password is required
        branchData.cuenta_password = cuenta_password;
        result = await this.supabase.client
          .from('sucursales')
          .insert(branchData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      const savedBranch = result.data;

      // Create/update the auth user for this branch
      if (cuenta_password && cuenta_password.length > 0) {
        const { data: fnData, error: fnError } = await this.supabase.client.functions.invoke('create-branch-user', {
          body: {
            email: cuenta_email,
            password: cuenta_password,
            sucursalId: savedBranch.id,
            negocioId: negocioId
          }
        });

        if (fnError) {
          console.error('Error creating auth user:', fnError);
          // Don't throw - branch is saved, just warn about auth
          this.snackBar.open('Sucursal guardada, pero hubo un error con la cuenta de usuario', 'Cerrar', { duration: 5000 });
        }
      }

      this.dialogRef.close(true);
      this.snackBar.open(
        this.isEdit ? 'Sucursal actualizada' : 'Sucursal creada',
        'Cerrar',
        { duration: 3000 }
      );

    } catch (error: any) {
      console.error('Error saving branch:', error);
      this.snackBar.open(error.message || 'Error al guardar sucursal', 'Cerrar', { duration: 3000 });
    } finally {
      this.ngZone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async connectStripe() {
    this.stripeLoading = true;
    try {
      const { data, error } = await this.supabase.client.functions.invoke('stripe-connect-onboarding', {
        body: {
          sucursal_id: this.data.id,
          refresh_url: window.location.href, // Go back to dashboard on refresh
          return_url: window.location.href   // Go back to dashboard on success
        }
      });

      if (error) {
        let errorMsg = error.message;
        try {
          if (error.context && typeof error.context.json === 'function') {
            const body = await error.context.json();
            errorMsg = body.error || errorMsg;
          }
        } catch (e) { }
        console.error('Detailed Edge Function Error:', errorMsg);
        throw new Error(errorMsg || 'Error invocando función de Stripe');
      }

      if (data && data.url) {
        window.location.href = data.url; // Redirect to Stripe Express Onboarding
      } else {
        throw new Error('No se recibió la URL de Stripe');
      }
    } catch (err: any) {
      console.error('Error connecting Stripe:', err);
      this.snackBar.open(err.message || 'Error al conectar con Stripe', 'Cerrar', { duration: 3000 });
      this.stripeLoading = false;
    }
  }
}

