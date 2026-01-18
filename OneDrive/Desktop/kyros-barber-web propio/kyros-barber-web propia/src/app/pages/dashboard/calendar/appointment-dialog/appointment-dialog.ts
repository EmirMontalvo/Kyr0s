import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../../../services/supabase.service';
import { AuthService } from '../../../../services/auth';
import { Observable, from } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { Cita, Servicio, Empleado, Cliente, Sucursal, HorarioSucursal } from '../../../../models';

import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-appointment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './appointment-dialog.html',
  styleUrl: './appointment-dialog.scss',
})
export class AppointmentDialog implements OnInit {
  form: FormGroup;
  newClientForm: FormGroup;
  loading = false;
  isEdit = false;
  showNewClientForm = false;

  isSaving = false;

  servicios: Servicio[] = [];
  empleados: Empleado[] = [];
  allEmpleados: Empleado[] = []; // Store all employees before filtering by services
  clientes: Cliente[] = [];
  sucursales: Sucursal[] = [];
  horariosSucursal: HorarioSucursal[] = [];
  filteredClients: Observable<Cliente[]> | undefined;

  negocioId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AppointmentDialog>,
    private supabase: SupabaseService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEdit = !!data?.cita;

    let fecha = data?.date ? new Date(data.date) : new Date();

    // If new appointment, set time to current user time
    if (!this.isEdit) {
      const now = new Date();
      fecha.setHours(now.getHours(), now.getMinutes());
    }

    this.form = this.fb.group({
      fecha: [fecha, Validators.required],
      hora: [this.formatTime(fecha), Validators.required],
      cliente_id: [''],
      nombre_cliente_manual: [''],
      sucursal_id: ['', Validators.required],
      empleado_id: [''],
      servicios_ids: [[], Validators.required],
      notas: ['']
    });

    this.newClientForm = this.fb.group({
      nombre: ['', Validators.required],
      telefono: ['', Validators.required]
    });
  }

  formatTime(date: Date): string {
    return date.toTimeString().substring(0, 5);
  }

  async ngOnInit() {
    this.loading = true;
    try {
      const user = this.authService.currentUser;
      if (!user) return;

      // Get negocio_id first
      const { data: profile } = await this.supabase.client
        .from('usuarios_perfiles')
        .select('negocio_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        this.negocioId = profile.negocio_id;

        // Load all data using negocio_id
        await Promise.all([
          this.loadBranches(),
          this.loadServices(),
          this.loadEmployees(),
          this.loadClients()
        ]);

        // If a specific branch is selected in the filter, enforce it
        if (this.data.selectedBranchId) {
          this.form.patchValue({ sucursal_id: this.data.selectedBranchId });
          this.form.get('sucursal_id')?.disable(); // Lock the field

          // Load data for this branch
          await Promise.all([
            this.loadServices(this.data.selectedBranchId),
            this.loadEmployees(this.data.selectedBranchId),
            this.loadClients(this.data.selectedBranchId),
            this.loadBranchHours(this.data.selectedBranchId)
          ]);
        }
        // Otherwise, if branches exist and none selected, select the first one
        else if (this.sucursales.length > 0 && !this.form.get('sucursal_id')?.value) {
          const defaultBranchId = this.sucursales[0].id;
          this.form.patchValue({ sucursal_id: defaultBranchId });

          // Re-load/Filter for the default branch
          await Promise.all([
            this.loadServices(defaultBranchId),
            this.loadEmployees(defaultBranchId),
            this.loadClients(defaultBranchId),
            this.loadBranchHours(defaultBranchId)
          ]);
        }
      }

      // Listen for branch changes
      this.form.get('sucursal_id')?.valueChanges.subscribe(async (branchId) => {
        if (branchId) {
          this.loading = true;
          this.form.patchValue({ servicios_ids: [], cliente_id: '', nombre_cliente_manual: '' }); // Reset
          await Promise.all([
            this.loadServices(branchId),
            this.loadEmployees(branchId),
            this.loadClients(branchId),
            this.loadBranchHours(branchId)
          ]);
          this.loading = false;
        }
      });

      // Setup client filter
      this.filteredClients = this.form.get('nombre_cliente_manual')?.valueChanges.pipe(
        startWith(''),
        map(value => {
          const currentName = typeof value === 'string' ? value : '';
          return this._filterClients(currentName);
        })
      );

      this.form.get('nombre_cliente_manual')?.valueChanges.subscribe(val => {
        const selectedId = this.form.get('cliente_id')?.value;
        if (selectedId) {
          const client = this.clientes.find(c => c.id === selectedId);
          if (client && client.nombre !== val) {
            this.form.patchValue({ cliente_id: null }, { emitEvent: false });
          }
        }
      });

      // Listen for service changes to filter employees
      this.form.get('servicios_ids')?.valueChanges.subscribe(async (serviceIds: number[]) => {
        this.form.patchValue({ empleado_id: '' }, { emitEvent: false }); // Reset employee
        await this.filterEmployeesByServices(serviceIds);
      });

      // If edit, patch values
      if (this.isEdit && this.data.cita) {
        const cita = this.data.cita;
        const fecha = new Date(cita.fecha_hora_inicio);

        // Map services to array of IDs
        const serviceIds = cita.citas_servicios?.map((cs: any) => cs.servicio_id) || [];

        // Load data for the existing appointment's branch
        if (cita.sucursal_id) {
          await Promise.all([
            this.loadServices(cita.sucursal_id),
            this.loadEmployees(cita.sucursal_id),
            this.loadBranchHours(cita.sucursal_id)
          ]);
        }

        this.form.patchValue({
          fecha: fecha,
          hora: this.formatTime(fecha),
          cliente_id: cita.cliente_id,
          nombre_cliente_manual: cita.nombre_cliente_manual || cita.clientes_bot?.nombre,
          sucursal_id: cita.sucursal_id,
          empleado_id: cita.empleado_id,
          servicios_ids: serviceIds,
          notas: cita.notas
        });
      }

    } catch (error) {
      console.error('Error init:', error);
    } finally {
      this.loading = false;
    }
  }

  private _filterClients(value: string): Cliente[] {
    const filterValue = value.toLowerCase();
    return this.clientes.filter(client => client.nombre.toLowerCase().includes(filterValue));
  }

  async loadBranchHours(sucursalId: number) {
    const { data } = await this.supabase.client
      .from('horarios_sucursal')
      .select('*')
      .eq('sucursal_id', sucursalId);
    this.horariosSucursal = data || [];
  }

  validateBranchHours(date: Date, time: string, durationMinutes: number): { valid: boolean, message?: string } {
    if (!this.horariosSucursal.length) return { valid: true };

    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    const horario = this.horariosSucursal.find(h => h.dia_semana === dayOfWeek);

    if (!horario) {
      return { valid: false, message: 'La sucursal está cerrada este día.' };
    }

    const [apptHour, apptMinute] = time.split(':').map(Number);
    const apptStartMinutes = apptHour * 60 + apptMinute;
    const apptEndMinutes = apptStartMinutes + durationMinutes;

    const [openHour, openMinute] = horario.hora_inicio.split(':').map(Number);
    const openMinutes = openHour * 60 + openMinute;

    const [closeHour, closeMinute] = horario.hora_fin.split(':').map(Number);
    const closeMinutes = closeHour * 60 + closeMinute;

    if (apptStartMinutes < openMinutes) {
      return { valid: false, message: `La sucursal abre a las ${horario.hora_inicio.substring(0, 5)}.` };
    }

    if (apptEndMinutes > closeMinutes) {
      return { valid: false, message: `La cita termina después del cierre (${horario.hora_fin.substring(0, 5)}).` };
    }

    // Check break time overlap
    if (horario.hora_descanso_inicio && (horario.duracion_descanso_minutos ?? 0) > 0) {
      const [breakHour, breakMinute] = horario.hora_descanso_inicio.split(':').map(Number);
      const breakStartMinutes = breakHour * 60 + breakMinute;
      const breakEndMinutes = breakStartMinutes + (horario.duracion_descanso_minutos ?? 0);

      // Check if appointment overlaps with break time
      const overlapsBreak = (apptStartMinutes < breakEndMinutes) && (apptEndMinutes > breakStartMinutes);

      if (overlapsBreak) {
        const breakEndFormatted = `${Math.floor(breakEndMinutes / 60).toString().padStart(2, '0')}:${(breakEndMinutes % 60).toString().padStart(2, '0')}`;
        return {
          valid: false,
          message: `La cita coincide con la hora de descanso (${horario.hora_descanso_inicio.substring(0, 5)} - ${breakEndFormatted}).`
        };
      }
    }

    return { valid: true };
  }

  async loadBranches() {
    if (!this.negocioId) return;
    const { data } = await this.supabase.client
      .from('sucursales')
      .select('*')
      .eq('negocio_id', this.negocioId);
    this.sucursales = data || [];
  }

  async loadServices(sucursalId?: number) {
    if (!this.negocioId) return;

    // Fetch all services for the business
    // Removed junction table fetch to prevent errors if table is missing
    const { data, error } = await this.supabase.client
      .from('servicios')
      .select('*')
      .eq('negocio_id', this.negocioId)
      .order('nombre');

    if (error) {
      console.error('Error loading services:', error);
      return;
    }

    const allServices = data || [];

    if (sucursalId) {
      this.servicios = allServices.filter(s => {
        // 1. Global service (no specific branch assigned)
        if (!s.sucursal_id) return true;

        // 2. Legacy/Fallback assignment
        if (s.sucursal_id === sucursalId) return true;

        return false;
      });
    } else {
      this.servicios = allServices;
    }
  }

  async loadEmployees(sucursalId?: number) {
    if (!this.negocioId) return;

    let query = this.supabase.client
      .from('empleados')
      .select('*')
      .eq('negocio_id', this.negocioId);

    if (sucursalId) {
      query = query.eq('sucursal_id', sucursalId);
    }

    const { data } = await query.order('nombre');
    this.allEmpleados = data || [];
    this.empleados = [...this.allEmpleados]; // Initially show all employees of the branch
  }

  async filterEmployeesByServices(serviceIds: number[]) {
    if (!serviceIds || serviceIds.length === 0) {
      // No services selected, show all employees
      this.empleados = [...this.allEmpleados];
      return;
    }

    // Get employees who perform ALL selected services
    const { data: employeeServices } = await this.supabase.client
      .from('empleado_servicios')
      .select('empleado_id, servicio_id')
      .in('servicio_id', serviceIds);

    if (!employeeServices || employeeServices.length === 0) {
      this.empleados = [];
      return;
    }

    // Group by employee and check if they have all selected services
    const employeeServiceMap: { [key: number]: Set<number> } = {};
    employeeServices.forEach(es => {
      if (!employeeServiceMap[es.empleado_id]) {
        employeeServiceMap[es.empleado_id] = new Set();
      }
      employeeServiceMap[es.empleado_id].add(es.servicio_id);
    });

    // Filter employees who have ALL selected services
    const qualifiedEmployeeIds = Object.entries(employeeServiceMap)
      .filter(([_, services]) => serviceIds.every(id => services.has(id)))
      .map(([empId, _]) => parseInt(empId));

    this.empleados = this.allEmpleados.filter(emp => qualifiedEmployeeIds.includes(emp.id));
  }

  async loadClients(sucursalId?: number) {
    let query = this.supabase.client
      .from('clientes_bot')
      .select('*')
      .eq('negocio_id', this.negocioId);

    // Filter by branch if specified
    if (sucursalId) {
      query = query.or(`sucursal_id.eq.${sucursalId},sucursal_id.is.null`);
    }

    const { data } = await query.order('nombre');
    this.clientes = data || [];
  }

  onClientSelected(event: any) {
    const client = this.clientes.find(c => c.nombre === event.option.value);
    if (client) {
      this.form.patchValue({ cliente_id: client.id });
    }
  }

  toggleNewClientForm() {
    this.showNewClientForm = !this.showNewClientForm;
  }

  async saveNewClient() {
    if (this.newClientForm.invalid || !this.negocioId) return;
    this.isSaving = true;

    try {
      const { nombre, telefono } = this.newClientForm.value;
      const sucursalId = this.form.getRawValue().sucursal_id;

      const { data, error } = await this.supabase.client
        .from('clientes_bot')
        .insert({
          nombre,
          telefono,
          negocio_id: this.negocioId,
          sucursal_id: sucursalId || null
        })
        .select()
        .single();

      if (error) throw error;

      await this.loadClients(sucursalId);
      this.form.patchValue({
        cliente_id: data.id,
        nombre_cliente_manual: data.nombre
      });
      this.showNewClientForm = false;
      this.newClientForm.reset();

    } catch (error) {
      console.error('Error saving client:', error);
      this.snackBar.open('Error al guardar cliente', 'Cerrar', { duration: 3000 });
    } finally {
      this.isSaving = false;
    }
  }

  async checkAvailability(empleadoId: number, start: string, end: string, excludeCitaId?: number): Promise<boolean> {
    if (!empleadoId) return true; // If no employee selected, assume available (or handle as needed)

    let query = this.supabase.client
      .from('citas')
      .select('id')
      .eq('empleado_id', empleadoId)
      .neq('estado', 'cancelada')
      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      .lt('fecha_hora_inicio', end)
      .gt('fecha_hora_fin', start);

    if (excludeCitaId) {
      query = query.neq('id', excludeCitaId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking availability:', error);
      return false; // Fail safe? Or block? Let's block to be safe.
    }

    return data.length === 0;
  }

  async validateEmployeeServices(empleadoId: number, serviceIds: number[]): Promise<boolean> {
    if (!empleadoId || !serviceIds || serviceIds.length === 0) return true;

    const { data, error } = await this.supabase.client
      .from('empleado_servicios')
      .select('servicio_id')
      .eq('empleado_id', empleadoId)
      .in('servicio_id', serviceIds);

    if (error) {
      console.error('Error validating employee services:', error);
      return false;
    }

    const assignedServiceIds = data?.map(item => item.servicio_id) || [];
    const missingServices = serviceIds.filter(id => !assignedServiceIds.includes(id));

    if (missingServices.length > 0) {
      const missingServiceNames = this.servicios
        .filter(s => missingServices.includes(s.id))
        .map(s => s.nombre)
        .join(', ');

      this.snackBar.open(`El empleado seleccionado no realiza: ${missingServiceNames}`, 'Cerrar', { duration: 4000 });
      return false;
    }

    return true;
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formVal = this.form.getRawValue(); // Use getRawValue() to include disabled fields (sucursal_id)

    // Enforce client selection
    if (!formVal.cliente_id) {
      this.form.get('nombre_cliente_manual')?.setErrors({ 'incorrect': true });
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    try {
      const fecha = new Date(formVal.fecha);
      const [hours, minutes] = formVal.hora.split(':');
      fecha.setHours(parseInt(hours), parseInt(minutes));

      // 1. Validate Past Time (Only for new appointments)
      const now = new Date();
      if (!this.isEdit && fecha < now) {
        this.snackBar.open('No se pueden agendar citas en el pasado.', 'Ok', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isSaving = false;
        return;
      }

      const fechaInicioISO = fecha.toISOString();

      const selectedServices = this.servicios.filter(s => formVal.servicios_ids.includes(s.id));
      const totalDuration = selectedServices.reduce((acc, curr) => acc + curr.duracion_aprox_minutos, 0) || 30;

      // 1.5 Validate Branch Hours
      const hoursValidation = this.validateBranchHours(fecha, formVal.hora, totalDuration);
      if (!hoursValidation.valid) {
        this.snackBar.open(hoursValidation.message || 'Horario no válido', 'Ok', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
        this.isSaving = false;
        return;
      }



      const fechaFin = new Date(fecha.getTime() + totalDuration * 60000).toISOString();

      // 2. Validate Overlap
      if (formVal.empleado_id) {
        // Check if employee performs selected services
        const isValidServices = await this.validateEmployeeServices(formVal.empleado_id, formVal.servicios_ids);
        if (!isValidServices) {
          this.isSaving = false;
          return;
        }

        const isAvailable = await this.checkAvailability(
          formVal.empleado_id,
          fechaInicioISO,
          fechaFin,
          this.isEdit ? this.data.cita.id : undefined
        );

        if (!isAvailable) {
          this.snackBar.open('El empleado ya tiene una cita en ese horario.', 'Ok', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isSaving = false;
          return;
        }
      }

      const citaData = {
        negocio_id: this.negocioId,
        sucursal_id: formVal.sucursal_id,
        fecha_hora_inicio: fechaInicioISO,
        fecha_hora_fin: fechaFin,
        cliente_id: formVal.cliente_id,
        nombre_cliente_manual: null, // Always null as we enforce registered clients
        empleado_id: formVal.empleado_id || null,
        estado: 'pendiente'
      };

      let citaId;

      if (this.isEdit) {
        const { error } = await this.supabase.client
          .from('citas')
          .update(citaData)
          .eq('id', this.data.cita.id);
        if (error) throw error;
        citaId = this.data.cita.id;

        await this.supabase.client.from('citas_servicios').delete().eq('cita_id', citaId);
      } else {
        const { data, error } = await this.supabase.client
          .from('citas')
          .insert(citaData)
          .select()
          .single();
        if (error) throw error;
        citaId = data.id;
      }

      const servicesToInsert = selectedServices.map(s => ({
        cita_id: citaId,
        servicio_id: s.id
      }));

      if (servicesToInsert.length > 0) {
        console.log('Inserting services:', servicesToInsert);
        await this.supabase.client
          .from('citas_servicios')
          .insert(servicesToInsert);
      } else {
        console.warn('No services to insert!');
      }

      this.dialogRef.close(true);

    } catch (error) {
      console.error('Error saving appointment:', error);
      this.snackBar.open('Error al guardar la cita.', 'Cerrar', { duration: 3000 });
    } finally {
      this.isSaving = false;
    }
  }
}
