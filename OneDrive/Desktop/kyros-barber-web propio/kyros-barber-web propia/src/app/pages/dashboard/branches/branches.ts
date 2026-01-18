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
import { BranchDialog } from './branch-dialog/branch-dialog';
import { BranchHoursDialog } from './branch-hours-dialog/branch-hours-dialog';
import { Sucursal } from '../../../models';

@Component({
  selector: 'app-branches',
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
  templateUrl: './branches.html',
  styleUrl: './branches.scss',
})
export class Branches implements OnInit {
  displayedColumns: string[] = ['id', 'nombre', 'direccion', 'acciones'];
  dataSource: Sucursal[] = [];
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
            await this.loadBranches();
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

  async loadBranches() {
    if (!this.negocioId) return;

    const { data, error } = await this.supabase.client
      .from('sucursales')
      .select('*')
      .eq('negocio_id', this.negocioId)
      .order('nombre');

    this.ngZone.run(() => {
      if (error) {
        this.snackBar.open('Error al cargar sucursales', 'Cerrar', { duration: 3000 });
      } else {
        this.dataSource = data || [];
        this.cdr.detectChanges();
      }
    });
  }

  openDialog(sucursal?: any) {
    const dialogRef = this.dialog.open(BranchDialog, {
      width: '400px',
      data: sucursal
        ? { ...sucursal, negocio_id: this.negocioId }
        : { negocio_id: this.negocioId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBranches();
      }
    });
  }

  openHoursDialog(sucursal: Sucursal) {
    this.dialog.open(BranchHoursDialog, {
      width: '500px',
      data: { sucursalId: sucursal.id, sucursalNombre: sucursal.nombre }
    });
  }

  async deleteBranch(sucursal: Sucursal) {
    // Check for pending/future appointments first
    const today = new Date().toISOString();

    const { data: pendingAppointments } = await this.supabase.client
      .from('citas')
      .select('id')
      .eq('sucursal_id', sucursal.id)
      .or(`estado.eq.pendiente,estado.eq.confirmada,estado.eq.en_proceso`)
      .gte('fecha_hora_inicio', today);

    if (pendingAppointments && pendingAppointments.length > 0) {
      this.snackBar.open(
        `No se puede eliminar: La sucursal tiene ${pendingAppointments.length} cita(s) pendiente(s). Cancélalas o reasígnalas primero.`,
        'Cerrar',
        { duration: 5000 }
      );
      return;
    }

    // Check for employees
    const { data: employees } = await this.supabase.client
      .from('empleados')
      .select('id')
      .eq('sucursal_id', sucursal.id);

    if (employees && employees.length > 0) {
      this.snackBar.open(
        `No se puede eliminar: La sucursal tiene ${employees.length} empleado(s) asignado(s). Elimínalos o reasígnalos primero.`,
        'Cerrar',
        { duration: 5000 }
      );
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar la sucursal "${sucursal.nombre}"?`)) return;

    // Delete old/canceled appointments
    await this.supabase.client
      .from('citas')
      .delete()
      .eq('sucursal_id', sucursal.id);

    // Delete services assigned to this branch
    await this.supabase.client
      .from('servicios')
      .delete()
      .eq('sucursal_id', sucursal.id);

    // Delete clients registered at this branch
    await this.supabase.client
      .from('clientes_bot')
      .delete()
      .eq('sucursal_id', sucursal.id);

    // Delete user profiles for this branch
    await this.supabase.client
      .from('usuarios_perfiles')
      .delete()
      .eq('sucursal_id', sucursal.id);

    // Now delete the branch
    const { error } = await this.supabase.client
      .from('sucursales')
      .delete()
      .eq('id', sucursal.id);

    this.ngZone.run(() => {
      if (error) {
        this.snackBar.open('Error al eliminar sucursal', 'Cerrar', { duration: 3000 });
      } else {
        this.snackBar.open('Sucursal eliminada', 'Cerrar', { duration: 3000 });
        this.loadBranches();
      }
    });
  }
}
