import { Component, Inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatSnackBarModule
  ],
  templateUrl: './branch-dialog.html',
  styleUrl: './branch-dialog.scss',
})
export class BranchDialog {
  form: FormGroup;
  loading = false;
  isEdit = false;
  hidePassword = true;

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
      cuenta_email: [data?.cuenta_email || '', [Validators.required, Validators.email]],
      cuenta_password: [data?.cuenta_password || '', this.isEdit ? [] : [Validators.required, Validators.minLength(6)]]
    });
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

      const { nombre, direccion, cuenta_email, cuenta_password } = this.form.value;

      const branchData: any = {
        nombre,
        direccion,
        cuenta_email,
        negocio_id: negocioId
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
}
