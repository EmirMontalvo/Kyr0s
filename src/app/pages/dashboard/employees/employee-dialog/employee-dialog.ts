import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { SupabaseService } from '../../../../services/supabase.service';
import { AuthService } from '../../../../services/auth';

import { Servicio } from '../../../../models';

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
    MatIconModule
  ],
  templateUrl: './employee-dialog.html',
  styleUrl: './employee-dialog.scss',
})
export class EmployeeDialog {
  form: FormGroup;
  loading = false;
  isEdit = false;
  isBranchUser = false;

  sucursales: any[] = [];
  servicios: Servicio[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EmployeeDialog>,
    private supabase: SupabaseService,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEdit = !!data?.id;
    this.form = this.fb.group({
      nombre: [data?.nombre || '', Validators.required],
      especialidad: [data?.especialidad || '', Validators.required],
      sucursal_id: [data?.sucursal_id || '', Validators.required],
      servicios_ids: [[]]
    });
    this.initData();
  }

  async initData() {
    // Check if branch user
    this.isBranchUser = localStorage.getItem('userRole') === 'sucursal';

    if (this.isBranchUser) {
      // Auto-set sucursal_id for branch users
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

      // Branch users only see services from their branch or global services
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

      const employeeData = {
        nombre: this.form.value.nombre,
        especialidad: this.form.value.especialidad,
        sucursal_id: this.form.value.sucursal_id,
        negocio_id: negocioId
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

      // Delete existing
      await this.supabase.client
        .from('empleado_servicios')
        .delete()
        .eq('empleado_id', employeeId);

      // Insert new
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
