import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

interface Notification {
  id: string;
  type: 'pending' | 'confirmed' | 'canceled' | 'today';
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

@Component({
  selector: 'app-notifications-button',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <button mat-icon-button [matMenuTriggerFor]="notificationMenu" class="notification-btn">
      <mat-icon [matBadge]="unreadCount" [matBadgeHidden]="unreadCount === 0" matBadgeColor="warn" matBadgeSize="small">
        notifications
      </mat-icon>
    </button>
    
    <mat-menu #notificationMenu="matMenu" class="notification-menu">
      <div class="notification-header" (click)="$event.stopPropagation()">
        <span>Notificaciones</span>
        <button mat-button color="primary" *ngIf="unreadCount > 0" (click)="markAllRead()">
          Marcar leídas
        </button>
      </div>
      
      <mat-divider></mat-divider>
      
      <div class="notification-list" (click)="$event.stopPropagation()">
        <div *ngIf="notifications.length === 0" class="empty-state">
          <mat-icon>notifications_none</mat-icon>
          <span>Sin notificaciones</span>
        </div>
        
        <div *ngFor="let notif of notifications" 
             class="notification-item" 
             [class.unread]="!notif.read"
             (click)="onNotificationClick(notif)">
          <mat-icon [class]="'icon-' + notif.type">
            {{ getIcon(notif.type) }}
          </mat-icon>
          <div class="notification-content">
            <span class="title">{{ notif.title }}</span>
            <span class="message">{{ notif.message }}</span>
            <span class="time">{{ formatTime(notif.time) }}</span>
          </div>
        </div>
      </div>
    </mat-menu>
  `,
  styles: [`
    :host ::ng-deep .notification-btn .mat-icon {
      color: white !important;
      transition: color 0.2s;
    }
    
    :host ::ng-deep .notification-btn:hover .mat-icon {
      color: #1e293b !important;
    }
    
    .notification-btn {
      margin-right: 8px;
    }
    
    ::ng-deep .mat-mdc-menu-panel {
      background: white !important;
      overflow-x: hidden !important;
    }
    
    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      font-weight: 500;
      background: white;
    }
    
    .notification-list {
      max-height: 400px;
      overflow-y: auto;
      overflow-x: hidden;
      min-width: 320px;
      background: white;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      color: #94a3b8;
      background: white;
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 8px;
      }
    }
    
    .notification-item {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s;
      background: white;
      
      &:hover {
        background: #f1f5f9;
      }
      
      &.unread {
        background: #eff6ff;
      }
      
      mat-icon {
        margin-top: 4px;
        
        &.icon-pending { color: #f59e0b; }
        &.icon-confirmed { color: #10b981; }
        &.icon-canceled { color: #ef4444; }
        &.icon-today { color: #6366f1; }
      }
      
      .notification-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        
        .title {
          font-weight: 500;
          font-size: 14px;
        }
        
        .message {
          font-size: 13px;
          color: #64748b;
        }
        
        .time {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 4px;
        }
      }
    }
  `]
})
export class NotificationsButton implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  private refreshInterval?: number;

  constructor(
    private supabase: SupabaseService,
    private authService: AuthService,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.loadNotifications();
    // Refresh every 60 seconds
    this.refreshInterval = window.setInterval(() => this.loadNotifications(), 60000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadNotifications() {
    const user = this.authService.currentUser;
    if (!user) return;

    const { data: profile } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('negocio_id, sucursal_id, rol')
      .eq('id', user.id)
      .single();

    if (!profile?.negocio_id) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let query = this.supabase.client
      .from('citas')
      .select('id, fecha_hora_inicio, estado, clientes_bot(nombre), empleados(nombre)')
      .eq('negocio_id', profile.negocio_id);

    // Filter by branch for branch users
    if (profile.rol === 'sucursal' && profile.sucursal_id) {
      query = query.eq('sucursal_id', profile.sucursal_id);
    }

    const { data: appointments } = await query
      .gte('fecha_hora_inicio', today.toISOString())
      .order('fecha_hora_inicio', { ascending: true })
      .limit(20);

    this.notifications = [];

    if (appointments) {
      for (const apt of appointments) {
        const aptDate = new Date(apt.fecha_hora_inicio);
        const clientName = (apt.clientes_bot as any)?.nombre || 'Cliente';
        const employeeName = (apt.empleados as any)?.nombre || 'Empleado';

        if (apt.estado === 'pendiente') {
          this.notifications.push({
            id: `pending-${apt.id}`,
            type: 'pending',
            title: 'Cita por confirmar',
            message: `${clientName} con ${employeeName}`,
            time: aptDate,
            read: false
          });
        } else if (apt.estado === 'confirmada') {
          const isToday = aptDate >= today && aptDate < tomorrow;
          if (isToday) {
            this.notifications.push({
              id: `today-${apt.id}`,
              type: 'today',
              title: 'Cita hoy',
              message: `${clientName} a las ${aptDate.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`,
              time: aptDate,
              read: false
            });
          }
        }
      }
    }

    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'pending': return 'schedule';
      case 'confirmed': return 'check_circle';
      case 'canceled': return 'cancel';
      case 'today': return 'today';
      default: return 'notifications';
    }
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (date > now) {
      return date.toLocaleDateString('es', { day: 'numeric', month: 'short' }) +
        ' ' + date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    }

    if (diff < 3600000) {
      return `Hace ${Math.floor(diff / 60000)} min`;
    }
    if (diff < 86400000) {
      return `Hace ${Math.floor(diff / 3600000)} h`;
    }
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  }

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
  }

  onNotificationClick(notif: Notification) {
    notif.read = true;
    this.unreadCount = this.notifications.filter(n => !n.read).length;
    this.router.navigate(['/dashboard/calendar']);
  }
}
