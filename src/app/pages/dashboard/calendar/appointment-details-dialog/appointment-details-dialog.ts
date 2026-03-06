import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { Cita } from '../../../../models';

@Component({
    selector: 'app-appointment-details-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        MatChipsModule,
        MatCardModule
    ],
    templateUrl: './appointment-details-dialog.html',
    styleUrls: ['./appointment-details-dialog.scss']
})
export class AppointmentDetailsDialog {
    constructor(
        @Inject(MAT_DIALOG_DATA) public data: { cita: Cita }
    ) { }

    getClienteNombre(): string {
        const cita = this.data.cita;
        if (cita.nombre_cliente_manual) return cita.nombre_cliente_manual;
        if (cita.clientes_bot?.nombre) return cita.clientes_bot.nombre;
        if (cita.clientes_bot?.telefono) return cita.clientes_bot.telefono;
        return 'Cliente';
    }

    getClienteTelefono(): string {
        const cita = this.data.cita;
        if (cita.clientes_bot) return cita.clientes_bot.telefono || '';
        // We assume manual clients might not have phone stored here unless added to appointments table directly
        // Checking if cita has a 'telefono' field directly which we might have added or not?
        // Based on previous steps, 'clientes_bot' has the phone.
        return '';
    }

    getTotal(): number {
        const cita = this.data.cita;
        if (cita.citas_servicios && cita.citas_servicios.length > 0) {
            return cita.citas_servicios.reduce((acc: number, cs: any) => acc + (cs.precio_actual || cs.servicios?.precio_base || 0), 0);
        }
        // Fallback for WhatsApp bot appointments
        return (cita as any).monto_total || 0;
    }

    getServicioNombre(): string {
        const cita = this.data.cita;
        if (cita.citas_servicios && cita.citas_servicios.length > 0) {
            return cita.citas_servicios.map((cs: any) => cs.servicios?.nombre || 'Servicio').join(', ');
        }
        // Fallback for WhatsApp bot appointments
        return (cita as any).servicio || 'Sin servicios';
    }

    formatTime(isoString: string): string {
        if (!isoString) return '';
        const timePart = isoString.split('T')[1];
        if (!timePart) return '';
        const [hours, minutes] = timePart.split(':').map(Number);
        const period = hours >= 12 ? 'p.m.' : 'a.m.';
        const displayHours = hours % 12 || 12;
        return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
    }
}
