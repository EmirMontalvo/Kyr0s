import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { SupabaseService } from '../../../../services/supabase.service';
import { HorarioSucursal } from '../../../../models';
import { AddHourDialog } from '../add-hour-dialog/add-hour-dialog';

@Component({
    selector: 'app-branch-hours-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatListModule
    ],
    templateUrl: './branch-hours-dialog.html',
    styleUrl: './branch-hours-dialog.scss',
})
export class BranchHoursDialog implements OnInit {
    horarios: HorarioSucursal[] = [];
    loading = false;
    diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    constructor(
        private dialogRef: MatDialogRef<BranchHoursDialog>,
        private supabase: SupabaseService,
        private dialog: MatDialog,
        private cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: { sucursalId: number, sucursalNombre: string }
    ) { }

    ngOnInit() {
        this.loadHorarios();
    }

    async loadHorarios() {
        this.loading = true;
        this.cdr.detectChanges();

        const { data } = await this.supabase.client
            .from('horarios_sucursal')
            .select('*')
            .eq('sucursal_id', this.data.sucursalId)
            .order('dia_semana');

        this.horarios = data || [];
        this.loading = false;
        this.cdr.detectChanges();
    }

    formatTime(time: string): string {
        return time.substring(0, 5);
    }

    async deleteHorario(id: number) {
        if (!confirm('¿Estás seguro de eliminar este horario?')) return;

        const { error } = await this.supabase.client
            .from('horarios_sucursal')
            .delete()
            .eq('id', id);

        if (!error) {
            this.loadHorarios();
        }
    }

    openAddHourDialog() {
        const dialogRef = this.dialog.open(AddHourDialog, {
            width: '400px',
            data: { sucursalId: this.data.sucursalId }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadHorarios();
            }
        });
    }
}
