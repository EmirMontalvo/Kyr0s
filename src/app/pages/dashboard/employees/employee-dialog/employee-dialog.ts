import { Component, Inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SupabaseService } from '../../../../services/supabase.service';
import { AuthService } from '../../../../services/auth';

import { Servicio } from '../../../../models';

import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-employee-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule
  ],
  templateUrl: './employee-dialog.html',
  styleUrl: './employee-dialog.scss',
})
export class EmployeeDialog {
  form: FormGroup;
  loading = false;
  uploading = false;
  isEdit = false;
  isBranchUser = false;

  sucursales: any[] = [];
  servicios: Servicio[] = [];

  // Photo upload
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EmployeeDialog>,
    private supabase: SupabaseService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEdit = !!data?.id;
    this.form = this.fb.group({
      nombre: [data?.nombre || '', Validators.required],
      especialidad: [data?.especialidad || '', Validators.required],
      sucursal_id: [data?.sucursal_id || '', Validators.required],
      servicios_ids: [[]]
    });

    // Set existing image preview
    if (data?.imagen_url) {
      this.imagePreview = data.imagen_url;
    }

    this.initData();
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

  async initData() {
    this.isBranchUser = localStorage.getItem('userRole') === 'sucursal';

    if (this.isBranchUser) {
      const storedId = localStorage.getItem('sucursalId');
      if (storedId) {
        this.form.patchValue({ sucursal_id: parseInt(storedId, 10) });
      }
    } else {
      await this.loadBranches();
    }

    await this.loadServices();
    if (this.isEdit) {
      await this.loadEmployeeServices();
    }
  }

  async loadBranches() {
    const user = this.authService.currentUser;
    if (!user) return;

    let negocioId = this.data?.negocio_id;
    if (!negocioId) {
      const { data: profile } = await this.supabase.client
        .from('usuarios_perfiles')
        .select('negocio_id')
        .eq('id', user.id)
        .single();
      negocioId = profile?.negocio_id;
    }

    if (negocioId) {
      const { data } = await this.supabase.client
        .from('sucursales')
        .select('id, nombre')
        .eq('negocio_id', negocioId);
      this.sucursales = data || [];
    }
  }

  async loadServices() {
    const user = this.authService.currentUser;
    if (!user) return;

    let negocioId = this.data?.negocio_id;

    if (!negocioId) {
      const { data: profile } = await this.supabase.client
        .from('usuarios_perfiles')
        .select('negocio_id')
        .eq('id', user.id)
        .single();
      negocioId = profile?.negocio_id;
    }

    if (negocioId) {
      let query = this.supabase.client
        .from('servicios')
        .select('*')
        .eq('negocio_id', negocioId);

      if (this.isBranchUser) {
        const sucursalId = localStorage.getItem('sucursalId');
        if (sucursalId) {
          query = query.or(`sucursal_id.eq.${sucursalId},sucursal_id.is.null`);
        }
      }

      const { data } = await query;
      this.servicios = data || [];
    }
  }

  async loadEmployeeServices() {
    const { data } = await this.supabase.client
      .from('empleado_servicios')
      .select('servicio_id')
      .eq('empleado_id', this.data.id);

    if (data) {
      const serviceIds = data.map((item: any) => item.servicio_id);
      this.form.patchValue({ servicios_ids: serviceIds });
    }
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

      // Check Limit functionality
      if (!this.isEdit) {
        const sucursalId = this.form.value.sucursal_id;

        const { data: sub, error: subError } = await this.supabase.client
          .from('negocio_suscripciones')
          .select('planes!inner(limite_empleados_por_sucursal, nombre)')
          .eq('negocio_id', negocioId)
          .single();

        if (!subError && sub && sub.planes) {
          const limit = (sub.planes as any).limite_empleados_por_sucursal;

          if (limit !== null) {
            const { count, error: countError } = await this.supabase.client
              .from('empleados')
              .select('*', { count: 'exact', head: true })
              .eq('sucursal_id', sucursalId);

            if (!countError && (count || 0) >= limit) {
              this.snackBar.open(`Has alcanzado el límite de empleados (${limit}) en esta sucursal con tu ${(sub.planes as any).nombre}.`, 'Entendido', { duration: 5000 });
              return;
            }
          }
        }
      }

      // Upload image if selected
      let imagenUrl = this.data?.imagen_url || null;
      if (this.selectedFile) {
        this.uploading = true;
        const fileName = `${Date.now()}_${this.selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

        const { error: uploadError } = await this.supabase.client.storage
          .from('empleados')
          .upload(fileName, this.selectedFile, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          this.snackBar.open('Error al subir la imagen', 'Cerrar', { duration: 3000 });
        } else {
          const { data: urlData } = this.supabase.client.storage
            .from('empleados')
            .getPublicUrl(fileName);
          imagenUrl = urlData.publicUrl;
        }
        this.uploading = false;
      } else if (!this.imagePreview && this.data?.imagen_url) {
        // Image was removed
        imagenUrl = null;
      }

      const employeeData: any = {
        nombre: this.form.value.nombre,
        especialidad: this.form.value.especialidad,
        sucursal_id: this.form.value.sucursal_id,
        negocio_id: negocioId,
        imagen_url: imagenUrl
      };

      let employeeId;

      if (this.isEdit) {
        const { error } = await this.supabase.client
          .from('empleados')
          .update(employeeData)
          .eq('id', this.data.id);
        if (error) throw error;
        employeeId = this.data.id;
      } else {
        const { data, error } = await this.supabase.client
          .from('empleados')
          .insert(employeeData)
          .select()
          .single();
        if (error) throw error;
        employeeId = data.id;
      }

      // Handle Services
      const selectedServices = this.form.value.servicios_ids;

      await this.supabase.client
        .from('empleado_servicios')
        .delete()
        .eq('empleado_id', employeeId);

      if (selectedServices && selectedServices.length > 0) {
        const servicesToInsert = selectedServices.map((servicioId: number) => ({
          empleado_id: employeeId,
          servicio_id: servicioId
        }));

        const { error: servicesError } = await this.supabase.client
          .from('empleado_servicios')
          .insert(servicesToInsert);

        if (servicesError) throw servicesError;
      }

      this.dialogRef.close(true);

    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      this.loading = false;
    }
  }
}
