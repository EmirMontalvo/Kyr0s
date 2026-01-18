import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../services/supabase.service';
import { AuthService } from '../../../services/auth';
import { EmployeeDialog } from './employee-dialog/employee-dialog';

import { Empleado } from '../../../models';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
})
export class Employees implements OnInit {
  displayedColumns: string[] = ['nombre', 'especialidad', 'sucursal', 'acciones'];
  dataSource: Empleado[] = [];
  loading = false;
  negocioId: number | null = null;

  constructor(
    private supabase: SupabaseService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    this.loading = true;
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        try {
          const { data: profile } = await this.supabase.client
            .from('usuarios_perfiles')
            .select('negocio_id')
            .eq('id', user.id)
            .single();

          if (profile) {
            this.negocioId = profile.negocio_id;
            await this.loadEmployees();
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        } finally {
          this.ngZone.run(() => {
            this.loading = false;
            this.cdr.detectChanges();
          });
        }
      }
    });
  }

  async loadEmployees() {
    if (!this.negocioId) return;

    // Check if branch user
    const sucursalId = localStorage.getItem('sucursalId');

    let query = this.supabase.client
      .from('empleados')
      .select('*, sucursales(nombre)')
      .eq('negocio_id', this.negocioId);

    // Branch users only see employees from their branch
    if (sucursalId) {
      query = query.eq('sucursal_id', parseInt(sucursalId, 10));
    }

    const { data, error } = await query.order('nombre');

    this.ngZone.run(() => {
      if (error) {
        this.snackBar.open('Error al cargar empleados', 'Cerrar', { duration: 3000 });
      } else {
        this.dataSource = (data || []).map((e: any) => ({
          ...e,
          sucursal_nombre: e.sucursales?.nombre || 'Sin sucursal'
        }));
        console.log('Fetched Employees:', this.dataSource);
        this.cdr.detectChanges();
      }
    });
  }

  openDialog(empleado?: Empleado) {
    const dialogRef = this.dialog.open(EmployeeDialog, {
      width: '400px',
      data: empleado ? { ...empleado, negocio_id: this.negocioId } : { negocio_id: this.negocioId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadEmployees();
        this.snackBar.open(empleado ? 'Empleado actualizado' : 'Empleado creado', 'Cerrar', { duration: 3000 });
      }
    });
  }

  async deleteEmployee(empleado: Empleado) {
    // Check for pending/future appointments first
    const today = new Date().toISOString();

    const { data: pendingAppointments, error: checkError } = await this.supabase.client
      .from('citas')
      .select('id, fecha_hora_inicio, estado')
      .eq('empleado_id', empleado.id)
      .or(`estado.eq.pendiente,estado.eq.confirmada,estado.eq.en_proceso`)
      .gte('fecha_hora_inicio', today);

    if (checkError) {
      this.snackBar.open('Error al verificar citas', 'Cerrar', { duration: 3000 });
      return;
    }

    if (pendingAppointments && pendingAppointments.length > 0) {
      this.snackBar.open(
        `No se puede eliminar: ${empleado.nombre} tiene ${pendingAppointments.length} cita(s) pendiente(s). Reasígnalas primero.`,
        'Cerrar',
        { duration: 5000 }
      );
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar a "${empleado.nombre}"?`)) return;

    // Delete any canceled/past appointments first
    await this.supabase.client
      .from('citas')
      .delete()
      .eq('empleado_id', empleado.id);

    // Delete employee-service relationships
    await this.supabase.client
      .from('empleado_servicios')
      .delete()
      .eq('empleado_id', empleado.id);

    // Now delete the employee
    const { error } = await this.supabase.client
      .from('empleados')
      .delete()
      .eq('id', empleado.id);

    this.ngZone.run(() => {
      if (error) {
        this.snackBar.open('Error al eliminar empleado', 'Cerrar', { duration: 3000 });
      } else {
        this.snackBar.open('Empleado eliminado', 'Cerrar', { duration: 3000 });
        this.loadEmployees();
      }
    });
  }
}
