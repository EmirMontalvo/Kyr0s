import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SupabaseService } from '../../../services/supabase.service';
import { AuthService } from '../../../services/auth';
import { ServiceDialog } from './service-dialog/service-dialog';

import { Servicio } from '../../../models';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class Services implements OnInit {
  displayedColumns: string[] = ['id', 'nombre', 'precio', 'duracion', 'sucursal', 'acciones'];
  dataSource: Servicio[] = [];
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
            await this.loadServices();
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

  async loadServices() {
    if (!this.negocioId) return;

    // Check if branch user
    const sucursalId = localStorage.getItem('sucursalId');

    let query = this.supabase.client
      .from('servicios')
      .select('*, sucursales(nombre)')
      .eq('negocio_id', this.negocioId);

    // Branch users only see services from their branch or global services (null sucursal_id)
    if (sucursalId) {
      query = query.or(`sucursal_id.eq.${sucursalId},sucursal_id.is.null`);
    }

    const { data, error } = await query.order('nombre');

    this.ngZone.run(() => {
      if (error) {
        this.snackBar.open('Error al cargar servicios', 'Cerrar', { duration: 3000 });
      } else {
        this.dataSource = data?.map((s: any) => ({
          ...s,
          sucursal: s.sucursales?.nombre || 'Todas'
        })) || [];

        this.cdr.detectChanges();
      }
    });
  }

  openDialog(servicio?: Servicio) {
    const dialogRef = this.dialog.open(ServiceDialog, {
      width: '400px',
      data: servicio ? { ...servicio, negocio_id: this.negocioId } : { negocio_id: this.negocioId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadServices();
        this.snackBar.open(servicio ? 'Servicio actualizado' : 'Servicio creado', 'Cerrar', { duration: 3000 });
      }
    });
  }

  async deleteService(servicio: Servicio) {
    if (!confirm(`¿Estás seguro de eliminar "${servicio.nombre}" ? `)) return;

    const { error } = await this.supabase.client
      .from('servicios')
      .delete()
      .eq('id', servicio.id);

    this.ngZone.run(() => {
      if (error) {
        this.snackBar.open('Error al eliminar servicio', 'Cerrar', { duration: 3000 });
      } else {
        this.snackBar.open('Servicio eliminado', 'Cerrar', { duration: 3000 });
        this.loadServices();
      }
    });
  }
}
