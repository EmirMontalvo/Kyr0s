import { Component, Inject, OnInit } from '@angular/core';
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
import { Sucursal } from '../../../../models';

@Component({
  selector: 'app-service-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressBarModule
  ],
  templateUrl: './service-dialog.html',
  styleUrl: './service-dialog.scss',
})
export class ServiceDialog implements OnInit {
  form: FormGroup;
  loading = false;
  isEdit = false;
  sucursales: Sucursal[] = [];
  isBranchUser = false;

  // Image upload properties
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  uploading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ServiceDialog>,
    private supabase: SupabaseService,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEdit = !!data?.id;

    // Extract existing branch IDs if editing
    const initialBranchIds = data?.sucursales_ids || [];

    this.form = this.fb.group({
      nombre: [data?.nombre || '', Validators.required],
      descripcion: [data?.descripcion || ''],
      imagen_url: [data?.imagen_url || ''],
      precio: [data?.precio_base || 0, [Validators.required, Validators.min(0)]],
      duracion_minutos: [data?.duracion_aprox_minutos || 30, [Validators.required, Validators.min(1)]],
      sucursales_ids: [initialBranchIds]
    });
  }

  async ngOnInit() {
    // Check if branch user
    this.isBranchUser = localStorage.getItem('userRole') === 'sucursal';

    // Set image preview if editing with existing image
    if (this.data?.imagen_url) {
      this.imagePreview = this.data.imagen_url;
    }

    if (!this.isBranchUser) {
      await this.loadBranches();
    }

    // If editing, we need to fetch the assigned branches for this service
    if (this.isEdit && this.data.id && !this.isBranchUser) {
      await this.loadAssignedBranches();
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('La imagen no puede ser mayor a 5MB');
        return;
      }

      this.selectedFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.imagePreview = null;
    this.selectedFile = null;
    this.form.patchValue({ imagen_url: '' });
  }

  async uploadImage(): Promise<string | null> {
    if (!this.selectedFile) return this.form.value.imagen_url || null;

    this.uploading = true;

    try {
      const fileName = `${Date.now()}_${this.selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

      const { data, error } = await this.supabase.client.storage
        .from('servicios')
        .upload(fileName, this.selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = this.supabase.client.storage
        .from('servicios')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      this.uploading = false;
    }
  }

  async loadAssignedBranches() {
    const { data } = await this.supabase.client
      .from('servicios_sucursales')
      .select('sucursal_id')
      .eq('servicio_id', this.data.id);

    if (data) {
      const ids = data.map(item => item.sucursal_id);
      this.form.patchValue({ sucursales_ids: ids });
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
        .select('*')
        .eq('negocio_id', negocioId);
      this.sucursales = data || [];
    }
  }

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;

    try {
      const user = this.authService.currentUser;
      if (!user) throw new Error('No user');

      // Get negocio_id if creating new
      let negocioId = this.data?.negocio_id;
      if (!negocioId) {
        const { data: profile } = await this.supabase.client
          .from('usuarios_perfiles')
          .select('negocio_id')
          .eq('id', user.id)
          .single();
        negocioId = profile?.negocio_id;
      }

      // Determine sucursal_id
      let sucursalId: number | null = null;
      if (this.isBranchUser) {
        // Branch users: automatically assign to their branch
        const storedId = localStorage.getItem('sucursalId');
        sucursalId = storedId ? parseInt(storedId, 10) : null;
      } else {
        // Owners: use the first selected branch or null
        sucursalId = this.form.value.sucursales_ids && this.form.value.sucursales_ids.length > 0
          ? this.form.value.sucursales_ids[0]
          : null;
      }

      // Upload image if selected
      const imageUrl = await this.uploadImage();

      const serviceData = {
        nombre: this.form.value.nombre,
        descripcion: this.form.value.descripcion,
        imagen_url: imageUrl,
        precio_base: this.form.value.precio,
        duracion_aprox_minutos: this.form.value.duracion_minutos,
        negocio_id: negocioId,
        sucursal_id: sucursalId
      };

      let serviceId;

      if (this.isEdit) {
        const { error } = await this.supabase.client
          .from('servicios')
          .update(serviceData)
          .eq('id', this.data.id);
        if (error) throw error;
        serviceId = this.data.id;
      } else {
        const { data, error } = await this.supabase.client
          .from('servicios')
          .insert(serviceData)
          .select()
          .single();
        if (error) throw error;
        serviceId = data.id;
      }

      // Handle Junction Table (Non-blocking)
      try {
        const selectedBranchIds = this.form.value.sucursales_ids || [];

        // 1. Delete existing associations
        await this.supabase.client
          .from('servicios_sucursales')
          .delete()
          .eq('servicio_id', serviceId);

        // 2. Insert new associations
        if (selectedBranchIds.length > 0) {
          const insertData = selectedBranchIds.map((branchId: number) => ({
            servicio_id: serviceId,
            sucursal_id: branchId
          }));

          const { error: insertError } = await this.supabase.client
            .from('servicios_sucursales')
            .insert(insertData);

          if (insertError) throw insertError;
        }
      } catch (junctionError) {
        console.warn('Error updating branch assignments (Table might be missing):', junctionError);
        // We do NOT throw here, so the dialog still closes.
        // The service itself was saved successfully.
      }

      this.dialogRef.close(true);

    } catch (error) {
      console.error('Error saving service:', error);
      // If the main service save failed, we DO want to keep the dialog open
      // but we must stop loading.
    } finally {
      this.loading = false;
    }
  }
}
