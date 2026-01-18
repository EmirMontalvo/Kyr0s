import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth';
import { AppointmentDialog } from '../dashboard/calendar/appointment-dialog/appointment-dialog';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './reception.html',
  styleUrl: './reception.scss',
})
export class Reception {

  menuItems = [
    {
      title: 'Servicio al Momento',
      subtitle: 'Sin Cita (Walk-in)',
      icon: 'accessibility_new',
      color: '#4caf50', // Green
      action: 'walk-in'
    },
    {
      title: 'Agenda del Día',
      subtitle: 'Ver turnos y ocupación',
      icon: 'calendar_view_day',
      color: '#ff9800', // Orange
      action: 'calendar'
    },
    {
      title: 'Agendar Cita Futura',
      subtitle: 'Reservar otro día',
      icon: 'calendar_today',
      color: '#2196f3', // Blue
      action: 'future'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }

  handleAction(action: string) {
    switch (action) {
      case 'walk-in':
        this.openAppointmentDialog(new Date(), true);
        break;
      case 'calendar':
        this.router.navigate(['/dashboard/calendar']);
        break;
      case 'future':
        this.openAppointmentDialog();
        break;
    }
  }

  openAppointmentDialog(date?: Date, isWalkIn = false) {
    const dialogRef = this.dialog.open(AppointmentDialog, {
      width: '500px',
      data: {
        date: date || new Date(),
        isWalkIn
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Cita agendada correctamente', 'Cerrar', { duration: 3000 });
      }
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
