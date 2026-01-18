import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../../../services/supabase.service';
import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-client-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './client-dialog.html',
  styleUrl: './client-dialog.scss',
})
export class ClientDialog {
  form: FormGroup;
  loading = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ClientDialog>,
    private supabase: SupabaseService,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEdit = !!data?.id;
    this.form = this.fb.group({
      nombre: [data?.nombre || '', Validators.required],
      telefono: [data?.telefono || '', Validators.required]
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

      // Determine sucursal_id for branch users
      let sucursalId: number | null = null;
      const storedSucursalId = localStorage.getItem('sucursalId');
      if (storedSucursalId) {
        sucursalId = parseInt(storedSucursalId, 10);
      }

      const clientData: any = {
        ...this.form.value,
        negocio_id: negocioId
      };

      // Assign to branch if branch user
      if (sucursalId) {
        clientData.sucursal_id = sucursalId;
      }

      let result;
      if (this.isEdit) {
        result = await this.supabase.client
          .from('clientes_bot')
          .update(clientData)
          .eq('id', this.data.id)
          .select();
      } else {
        result = await this.supabase.client
          .from('clientes_bot')
          .insert(clientData)
          .select();
      }

      if (result.error) throw result.error;
      this.dialogRef.close(true);

    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      this.loading = false;
    }
  }
}
