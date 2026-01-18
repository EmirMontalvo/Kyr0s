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
import { ClientDialog } from './client-dialog/client-dialog';

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  negocio_id: number;
}

@Component({
  selector: 'app-clients',
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
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients implements OnInit {
  displayedColumns: string[] = ['nombre', 'telefono', 'sucursal', 'acciones'];
  dataSource: Cliente[] = [];
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
            await this.loadClients();
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

  async loadClients() {
    if (!this.negocioId) return;

    // Check if branch user
    const sucursalId = localStorage.getItem('sucursalId');

    let query = this.supabase.client
      .from('clientes_bot')
      .select('*, sucursales(nombre)')
      .eq('negocio_id', this.negocioId);

    // Branch users only see clients from their branch
    if (sucursalId) {
      query = query.eq('sucursal_id', parseInt(sucursalId, 10));
    }

    const { data, error } = await query.order('nombre');

    this.ngZone.run(() => {
      if (error) {
        this.snackBar.open('Error al cargar clientes', 'Cerrar', { duration: 3000 });
      } else {
        // Map data to include sucursal name
        this.dataSource = (data || []).map((c: any) => ({
          ...c,
          sucursal_nombre: c.sucursales?.nombre || 'Sin sucursal'
        }));
        this.cdr.detectChanges();
      }
    });
  }

  openDialog(cliente?: Cliente) {
    const dialogRef = this.dialog.open(ClientDialog, {
      width: '400px',
      data: cliente ? { ...cliente, negocio_id: this.negocioId } : { negocio_id: this.negocioId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadClients();
        this.snackBar.open(cliente ? 'Cliente actualizado' : 'Cliente creado', 'Cerrar', { duration: 3000 });
      }
    });
  }

  async deleteClient(cliente: Cliente) {
    if (!confirm(`¿Estás seguro de eliminar a "${cliente.nombre}"?`)) return;

    const { error } = await this.supabase.client
      .from('clientes_bot')
      .delete()
      .eq('id', cliente.id);

    this.ngZone.run(() => {
      if (error) {
        this.snackBar.open('Error al eliminar cliente', 'Cerrar', { duration: 3000 });
      } else {
        this.snackBar.open('Cliente eliminado', 'Cerrar', { duration: 3000 });
        this.loadClients();
      }
    });
  }
}
