import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from '../../services/auth';
import { SupabaseService } from '../../services/supabase.service';
import { SidenavService } from '../../services/sidenav.service';
import { NotificationsButton } from '../../components/notifications-button/notifications-button';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    NotificationsButton
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  @ViewChild('drawer') drawer!: MatSidenav;

  isHandset = false;
  sidenavHidden = false;
  private sidenavSub?: Subscription;

  private readonly allMenuItems = [
    { label: 'Calendario', icon: 'calendar_today', route: '/dashboard/calendar' },
    { label: 'Servicios', icon: 'content_cut', route: '/dashboard/services' },
    { label: 'Empleados', icon: 'people', route: '/dashboard/employees' },
    { label: 'Sucursales', icon: 'store', route: '/dashboard/branches' },
    { label: 'Clientes', icon: 'contact_phone', route: '/dashboard/clients' },
    { label: 'Estadísticas', icon: 'bar_chart', route: '/dashboard/statistics' },
    { label: 'Mi Perfil', icon: 'person', route: '/dashboard/profile' },
  ];

  // Menu items - filtered based on role
  menuItems: { label: string; icon: string; route: string }[];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private authService: AuthService,
    private supabase: SupabaseService,
    private sidenavService: SidenavService,
    public router: Router
  ) {
    // Check role from localStorage immediately (set during login)
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'sucursal') {
      this.menuItems = this.allMenuItems.filter(item => item.route !== '/dashboard/branches');
    } else {
      this.menuItems = [...this.allMenuItems];
    }

    this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches),
        shareReplay()
      ).subscribe(matches => this.isHandset = matches);
  }

  async ngOnInit() {
    // Check role and filter menu if needed
    this.checkAndFilterMenu();

    // Subscribe to sidenav visibility changes
    this.sidenavSub = this.sidenavService.sidenavHidden$.subscribe(hidden => {
      this.sidenavHidden = hidden;
      if (this.drawer) {
        if (hidden) {
          this.drawer.close();
        } else if (!this.isHandset) {
          this.drawer.open();
        }
      }
    });
  }

  ngOnDestroy() {
    this.sidenavSub?.unsubscribe();
  }

  private async checkAndFilterMenu() {
    try {
      const user = this.authService.currentUser;
      if (!user) return;

      const { data: profile } = await this.supabase.client
        .from('usuarios_perfiles')
        .select('rol')
        .eq('id', user.id)
        .single();

      // Only filter if user is a branch user
      if (profile?.rol === 'sucursal') {
        this.menuItems = this.menuItems.filter(item => item.route !== '/dashboard/branches');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      // Keep default menu (all items) on error
    }
  }

  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
