import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatListModule } from '@angular/material/list';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatListModule,
    MatSnackBarModule
  ],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss'
})
export class Onboarding implements OnInit {
  branchForm: FormGroup;
  hoursForm: FormGroup;
  serviceForm: FormGroup;
  employeeForm: FormGroup;

  services: any[] = [];
  employees: any[] = [];
  loading = false;

  createdBranchId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.branchForm = this.fb.group({
      nombre: ['', Validators.required],
      direccion: ['', Validators.required]
    });

    this.hoursForm = this.fb.group({
      lunes_viernes_apertura: ['09:00', Validators.required],
      lunes_viernes_cierre: ['20:00', Validators.required],
      abrir_fines_semana: [false],
      sabado_domingo_apertura: ['10:00'],
      sabado_domingo_cierre: ['16:00']
    });

    this.serviceForm = this.fb.group({
      nombre: ['', Validators.required],
      precio: ['', [Validators.required, Validators.min(0)]],
      duracion_minutos: ['', [Validators.required, Validators.min(1)]]
    });

    this.employeeForm = this.fb.group({
      nombre: ['', Validators.required],
      especialidad: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Session check is handled by AuthGuard
  }

  async saveBranch() {
    if (this.branchForm.invalid) return;
    this.loading = true;

    try {
      const user = this.authService.currentUser;
      if (!user) throw new Error('No user found');

      // 1. Get profile to check for name
      const { data: profile } = await this.supabase.client
        .from('usuarios_perfiles')
        .select('nombre')
        .eq('id', user.id)
        .single();

      const negocioNombre = `Barbería de ${profile?.nombre || 'Mi Negocio'}`;

      // 2. Create Negocio
      const { data: negocio, error: negocioError } = await this.supabase.client
        .from('negocios')
        .insert({ nombre: negocioNombre })
        .select()
        .single();

      if (negocioError) throw negocioError;

      // 3. Update Profile with negocio_id
      const { error: profileUpdateError } = await this.supabase.client
        .from('usuarios_perfiles')
        .update({ negocio_id: negocio.id })
        .eq('id', user.id);

      if (profileUpdateError) throw profileUpdateError;

      // 4. Create Sucursal tied to Negocio
      const { data: sucursal, error: sucursalError } = await this.supabase.client
        .from('sucursales')
        .insert({
          nombre: this.branchForm.value.nombre,
          direccion: this.branchForm.value.direccion,
          negocio_id: negocio.id
        })
        .select()
        .single();

      if (sucursalError) throw sucursalError;
      this.createdBranchId = sucursal.id;

    } catch (error: any) {
      this.snackBar.open('Error al configurar negocio y sucursal: ' + error.message, 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }


  async saveHours() {
    if (this.hoursForm.invalid || !this.createdBranchId) return;
    this.loading = true;

    try {
      const form = this.hoursForm.value;
      const user = this.authService.currentUser;

      // Expand "Lunes-Viernes" (1-5) and "Sabado-Domingo" (6, 0)
      const horarios: any[] = [];

      // Mon-Fri
      for (let i = 1; i <= 5; i++) {
        horarios.push({
          sucursal_id: this.createdBranchId,
          dia_semana: i,
          hora_inicio: form.lunes_viernes_apertura,
          hora_fin: form.lunes_viernes_cierre,
          activo: true
        });
      }

      if (form.abrir_fines_semana) {
        // Sat (6) and Sun (0)
        [6, 0].forEach(day => {
          horarios.push({
            sucursal_id: this.createdBranchId,
            dia_semana: day,
            hora_inicio: form.sabado_domingo_apertura,
            hora_fin: form.sabado_domingo_cierre,
            activo: true
          });
        });
      }

      const { error } = await this.supabase.client
        .from('horarios_sucursal')
        .insert(horarios);

      if (error) throw error;

    } catch (error: any) {
      console.error('Error saving hours', error);
      this.snackBar.open('Error al guardar horarios: ' + error.message, 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  addService() {
    if (this.serviceForm.invalid) return;
    this.services.push(this.serviceForm.value);
    this.serviceForm.reset();
  }

  removeService(index: number) {
    this.services.splice(index, 1);
  }

  async saveServices() {
    if (this.services.length === 0 || !this.createdBranchId) return;
    this.loading = true;

    try {
      // Get negocio_id from profile (or we could store it when saveBranch runs)
      const user = this.authService.currentUser;
      const { data: profile } = await this.supabase.client
        .from('usuarios_perfiles')
        .select('negocio_id')
        .eq('id', user?.id)
        .single();

      const servicesToSave = this.services.map(s => ({
        nombre: s.nombre,
        precio_base: s.precio,
        duracion_aprox_minutos: s.duracion_minutos,
        sucursal_id: this.createdBranchId,
        negocio_id: profile?.negocio_id
      }));

      const { error } = await this.supabase.client
        .from('servicios')
        .insert(servicesToSave);

      if (error) throw error;

    } catch (error: any) {
      this.snackBar.open('Error al guardar servicios: ' + error.message, 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  addEmployee() {
    if (this.employeeForm.invalid) return;
    this.employees.push(this.employeeForm.value);
    this.employeeForm.reset();
  }

  removeEmployee(index: number) {
    this.employees.splice(index, 1);
  }

  async saveEmployeesAndFinish() {
    if (this.employees.length === 0 || !this.createdBranchId) {
      this.snackBar.open('Agrega al menos un empleado', 'Cerrar', { duration: 3000 });
      return;
    }
    this.loading = true;

    try {
      const user = this.authService.currentUser;
      const { data: profile } = await this.supabase.client
        .from('usuarios_perfiles')
        .select('negocio_id')
        .eq('id', user?.id)
        .single();

      const employeesToSave = this.employees.map(e => ({
        ...e,
        sucursal_id: this.createdBranchId,
        negocio_id: profile?.negocio_id,
        rol: 'barbero' // Default role
      }));

      const { error } = await this.supabase.client
        .from('empleados')
        .insert(employeesToSave);

      if (error) throw error;

      this.snackBar.open('¡Configuración completada!', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/dashboard']);

    } catch (error: any) {
      this.snackBar.open('Error al guardar empleados: ' + error.message, 'Cerrar', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }
}
