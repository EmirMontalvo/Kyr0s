import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SupabaseService } from '../../../services/supabase.service';
import { AuthService } from '../../../services/auth';
import { AppointmentDialog } from './appointment-dialog/appointment-dialog';
import { ConfirmationDialog } from '../shared/confirmation-dialog/confirmation-dialog';
import { BranchSelectorDialog } from './branch-selector-dialog/branch-selector-dialog';

import { Cita, Sucursal } from '../../../models';
import { RealtimeChannel } from '@supabase/supabase-js';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar implements OnInit, OnDestroy {
  selectedDate: Date = new Date();
  // minDate removed to allow viewing past dates
  citas: Cita[] = [];
  sucursales: Sucursal[] = [];
  selectedBranchId: number | null = null;
  loading = false;
  negocioId: number | null = null;
  isBranchUser = false;
  branchName = '';
  private citasSubscription: RealtimeChannel | null = null;

  constructor(
    private supabase: SupabaseService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    await this.loadNegocioId();
    if (this.negocioId) {
      await this.loadBranches();
      this.setupRealtimeSubscription();
    }
    this.loadCitas(this.selectedDate);
  }

  ngOnDestroy() {
    if (this.citasSubscription) {
      this.supabase.client.removeChannel(this.citasSubscription);
    }
  }

  private setupRealtimeSubscription() {
    // Subscribe to changes in citas table for this negocio
    this.citasSubscription = this.supabase.client
      .channel('citas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'citas',
          filter: `negocio_id=eq.${this.negocioId}`
        },
        (payload) => {
          console.log('[Calendar] Realtime update received:', payload);
          // Reload citas when changes occur
          this.ngZone.run(() => {
            this.loadCitas(this.selectedDate);
          });
        }
      )
      .subscribe((status) => {
        console.log('[Calendar] Realtime subscription status:', status);
      });
  }

  async loadNegocioId() {
    const user = this.authService.currentUser;
    if (!user) return;

    const { data: profile } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('negocio_id, sucursal_id, rol')
      .eq('id', user.id)
      .single();

    if (profile) {
      this.negocioId = profile.negocio_id;

      // If branch user, auto-select their branch and get branch name
      if (profile.rol === 'sucursal' && profile.sucursal_id) {
        this.selectedBranchId = profile.sucursal_id;
        this.isBranchUser = true;

        // Fetch branch name
        const { data: branch } = await this.supabase.client
          .from('sucursales')
          .select('nombre')
          .eq('id', profile.sucursal_id)
          .single();

        if (branch) {
          this.branchName = branch.nombre;
        }
      }
    }
  }

  async loadBranches() {
    if (!this.negocioId) return;

    // Branch users don't need to see branch selector
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'sucursal') {
      // Don't load branches for branch users - they only see their own data
      return;
    }

    const { data } = await this.supabase.client
      .from('sucursales')
      .select('*')
      .eq('negocio_id', this.negocioId);
    this.sucursales = data || [];
  }

  onDateChange(date: Date) {
    this.selectedDate = date;
    this.loadCitas(date);
  }

  async loadCitas(date: Date) {
    this.loading = true;
    this.cdr.detectChanges();

    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();

    try {
      let query = this.supabase.client
        .from('citas')
        .select(`
          *,
          empleados (nombre),
          clientes_bot (nombre),
          citas_servicios (
            servicios (nombre, precio_base)
          )
        `)
        .gte('fecha_hora_inicio', start)
        .lt('fecha_hora_inicio', end)
        .neq('estado', 'cancelada')
        .order('fecha_hora_inicio');

      if (this.selectedBranchId) {
        query = query.eq('sucursal_id', this.selectedBranchId);
      } else if (this.negocioId) {
        query = query.eq('negocio_id', this.negocioId);
      }

      const { data, error } = await query;

      this.ngZone.run(() => {
        if (error) {
          console.error('Error loading citas:', error);
          this.snackBar.open('Error al cargar citas', 'Cerrar', { duration: 3000 });
        } else {
          this.citas = data || [];
          console.log('Citas loaded:', this.citas);
        }
        this.loading = false;
        this.cdr.detectChanges();
      });

    } catch (error) {
      console.error('Error loading citas:', error);
      this.ngZone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  getClienteNombre(cita: Cita): string {
    if (cita.clientes_bot) return cita.clientes_bot.nombre;
    if (cita.nombre_cliente_manual) return `${cita.nombre_cliente_manual} (De paso)`;
    return 'Cliente';
  }

  getServiciosNombres(cita: Cita): string {
    if (!cita.citas_servicios || cita.citas_servicios.length === 0) return 'Sin servicios';
    return cita.citas_servicios.map(cs => cs.servicios?.nombre || 'Servicio').join(', ');
  }

  getTotalPrecio(cita: Cita): number {
    if (!cita.citas_servicios || cita.citas_servicios.length === 0) return 0;
    return cita.citas_servicios.reduce((acc, cs) => acc + (cs.servicios?.precio_base || 0), 0);
  }

  formatTime(isoString: string): string {
    // Extract time directly from ISO string to avoid timezone conversion
    // Format: 2026-01-19T10:00:00 -> 10:00 a.m.
    const timePart = isoString.split('T')[1];
    if (!timePart) return '';

    const [hours, minutes] = timePart.split(':').map(Number);
    const period = hours >= 12 ? 'p.m.' : 'a.m.';
    const displayHours = hours % 12 || 12;
    return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  getSelectedBranchName(): string {
    if (!this.selectedBranchId) return 'Todas las sucursales';
    const branch = this.sucursales.find(b => b.id === this.selectedBranchId);
    return branch ? branch.nombre : 'Sucursal seleccionada';
  }

  openBranchSelector() {
    const dialogRef = this.dialog.open(BranchSelectorDialog, {
      width: '350px',
      data: {
        sucursales: this.sucursales,
        selectedBranchId: this.selectedBranchId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        this.selectedBranchId = result;
        this.loadCitas(this.selectedDate);
      }
    });
  }

  openDialog(cita?: Cita) {
    const dialogRef = this.dialog.open(AppointmentDialog, {
      width: '500px',
      data: {
        cita,
        date: this.selectedDate,
        selectedBranchId: this.selectedBranchId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadCitas(this.selectedDate);
        this.snackBar.open(cita ? 'Cita actualizada' : 'Cita creada', 'Cerrar', { duration: 3000 });
      }
    });
  }

  async updateStatus(cita: Cita, status: Cita['estado']) {
    const isCancel = status === 'cancelada';
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '400px',
      data: {
        title: isCancel ? 'Cancelar Cita' : 'Completar Cita',
        message: isCancel
          ? '¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.'
          : '¿Confirmas que esta cita ha sido completada?',
        confirmText: isCancel ? 'Sí, Cancelar' : 'Sí, Completar',
        cancelText: 'No, Volver',
        color: isCancel ? 'warn' : 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        // Calculate total if completing
        let updateData: any = { estado: status };

        if (status === 'completada') {
          // Calculate total from services
          let total = 0;
          if (cita.citas_servicios && cita.citas_servicios.length > 0) {
            total = cita.citas_servicios.reduce((sum, cs) => sum + (cs.precio_actual || 0), 0);
          }
          updateData.total_pagado = total;
          updateData.fecha_completado = new Date().toISOString();
        }

        const { error } = await this.supabase.client
          .from('citas')
          .update(updateData)
          .eq('id', cita.id);

        this.ngZone.run(() => {
          if (error) {
            this.snackBar.open('Error al actualizar estado', 'Cerrar', { duration: 3000 });
          } else {
            this.loadCitas(this.selectedDate);
            this.snackBar.open(`Cita ${status}`, 'Cerrar', { duration: 3000 });
          }
        });
      }
    });
  }
  isPastDate(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(this.selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  }
}
