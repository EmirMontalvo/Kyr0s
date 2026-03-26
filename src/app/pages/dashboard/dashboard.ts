import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ConfirmationDialog } from './shared/confirmation-dialog/confirmation-dialog';
<<<<<<< HEAD
import { UpgradePlanDialog } from './shared/upgrade-plan-dialog/upgrade-plan-dialog';
=======
>>>>>>> 7b947f7f6b4b636bdd4a6c675c6014ea74785457
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from '../../services/auth';
import { SupabaseService } from '../../services/supabase.service';
import { SidenavService } from '../../services/sidenav.service';
import { SubscriptionService } from '../../services/subscription.service';
import { ThemeService } from '../../services/theme.service';
import { NotificationsButton } from '../../components/notifications-button/notifications-button';
import { AiChat } from './components/ai-chat/ai-chat';

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
    MatDialogModule,
    MatSlideToggleModule,
    NotificationsButton,
    AiChat
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  @ViewChild('drawer') drawer!: MatSidenav;

  isHandset = false;
  sidenavHidden = false;
  private sidenavSub?: Subscription;

  // Plan restriction
  currentPlanId: number = 1;
  userRole: string = 'dueño';
  private readonly freeRestrictedRoutes: string[] = [];
  private readonly freeRestrictedLabels: Record<string, string> = {};

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
    private subscriptionService: SubscriptionService,
    private sidenavService: SidenavService,
    private dialog: MatDialog,
    public themeService: ThemeService,
    public router: Router
  ) {
    // Check role from localStorage immediately (set during login)
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'sucursal') {
      this.menuItems = this.allMenuItems
        .filter(item => item.route !== '/dashboard/branches')
        .map(item => item.route === '/dashboard/profile'
          ? { ...item, label: 'Mi Sucursal', icon: 'storefront' }
          : item
        );
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
    // Subscribe to user changes to handle initial load and updates
    this.authService.user$.subscribe(user => {
      if (user) {
        this.checkAndFilterMenu(user);
      }
    });

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

  private async checkAndFilterMenu(user: any) {
    console.log('Dashboard: checkAndFilterMenu started with user', user?.id);
    try {
      if (!user) {
        console.log('Dashboard: No user provided, returning.');
        return;
      }

      const { data: profile, error: profileError } = await this.supabase.client
        .from('usuarios_perfiles')
        .select('rol, negocio_id')
        .eq('id', user.id)
        .single();

      console.log('Dashboard: Profile loaded:', profile, 'Error:', profileError);

      // If profile doesn't exist, auto-create it (trigger may have failed during registration)
      if (profileError || !profile) {
        console.log('Dashboard: Profile not found, attempting to auto-create...');
        const userName = user.user_metadata?.nombre_completo || user.user_metadata?.nombre || 'Usuario';
        const { data: newProfile, error: createError } = await this.supabase.client
          .from('usuarios_perfiles')
          .upsert({
            id: user.id,
            nombre: userName,
            rol: user.user_metadata?.rol || 'dueño',
            avatar_url: user.user_metadata?.avatar_url || null
          }, { onConflict: 'id' })
          .select('rol, negocio_id')
          .single();

        console.log('Dashboard: Auto-created profile:', newProfile, 'Error:', createError);
        if (createError || !newProfile) {
          console.log('Dashboard: Could not create profile, redirecting to onboarding');
          this.router.navigate(['/onboarding']);
          return;
        }
        return this.processProfile(newProfile, user);
      }

      await this.processProfile(profile, user);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  private async processProfile(profile: any, user: any) {
<<<<<<< HEAD
    // Store user role
    this.userRole = profile?.rol || 'dueño';

=======
>>>>>>> 7b947f7f6b4b636bdd4a6c675c6014ea74785457
    // Check if user needs onboarding (Owner with no business)
    if (profile?.rol !== 'sucursal') {
      if (!profile?.negocio_id) {
        console.log('Dashboard: No negocio_id, redirecting to onboarding');
        this.router.navigate(['/onboarding']);
        return;
      }

      // Handle Stripe return: if session_id is in the URL, update subscription to active
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      if (sessionId) {
        console.log('Dashboard: Stripe session_id detected, updating subscription to active');
        await this.supabase.client
          .from('negocio_suscripciones')
          .update({ estado: 'active' })
          .eq('negocio_id', profile.negocio_id);
        // Clean the URL
        window.history.replaceState({}, '', '/dashboard');
      }

      console.log('Dashboard: Checking subscription for negocio_id:', profile.negocio_id);
      const { data: subData, error: subError } = await this.subscriptionService.getSubscriptionStatus(profile.negocio_id);

      console.log('Dashboard: Subscription Status Result - Data:', JSON.stringify(subData), 'Error:', subError);

      // If no subscription record found (PGRST116)
      if (subError && subError.code === 'PGRST116') {
        console.log('Dashboard: No subscription found (PGRST116), redirecting to renewal...');
        this.router.navigate(['/renew-subscription']);
        return;
      }

      // If subscription exists but status is not valid
      if (subData) {
        const validStatuses = ['active', 'trialing', 'trial', 'free'];
        if (!validStatuses.includes(subData.estado)) {
          console.log(`Dashboard: Subscription status '${subData.estado}' is not valid. Redirecting to renewal...`);
          this.router.navigate(['/renew-subscription']);
          return;
        }
<<<<<<< HEAD

        // Check expiry dates
        const now = new Date();
        if (subData.estado === 'trialing' || subData.estado === 'trial') {
          if (subData.fecha_fin_prueba && new Date(subData.fecha_fin_prueba) < now) {
            console.log('Dashboard: Trial expired. fecha_fin_prueba:', subData.fecha_fin_prueba);
            this.router.navigate(['/renew-subscription']);
            return;
          }
        } else if (subData.estado === 'active' && subData.fecha_fin_periodo) {
          if (new Date(subData.fecha_fin_periodo) < now) {
            console.log('Dashboard: Subscription period expired. fecha_fin_periodo:', subData.fecha_fin_periodo);
            this.router.navigate(['/renew-subscription']);
            return;
          }
        }

        // Store current plan ID for feature restrictions
        this.currentPlanId = subData.plan_id || 1;
        console.log('Dashboard: Current plan_id:', this.currentPlanId);
=======
>>>>>>> 7b947f7f6b4b636bdd4a6c675c6014ea74785457
      }

      console.log('Dashboard: Subscription found and valid. Not redirecting.');
    } else {
<<<<<<< HEAD
      // For sucursal users, get the plan from the owner's negocio
      console.log('Dashboard: User is sucursal. Loading owner plan...');
      if (profile?.negocio_id) {
        const { data: subData } = await this.subscriptionService.getSubscriptionStatus(profile.negocio_id);
        if (subData) {
          // Check if owner's subscription is expired
          const now = new Date();
          if (subData.estado === 'trialing' || subData.estado === 'trial') {
            if (subData.fecha_fin_prueba && new Date(subData.fecha_fin_prueba) < now) {
              console.log('Dashboard: Owner trial expired for sucursal user.');
              this.router.navigate(['/renew-subscription']);
              return;
            }
          } else if (subData.estado === 'active' && subData.fecha_fin_periodo) {
            if (new Date(subData.fecha_fin_periodo) < now) {
              console.log('Dashboard: Owner subscription expired for sucursal user.');
              this.router.navigate(['/renew-subscription']);
              return;
            }
          }
          this.currentPlanId = subData.plan_id || 1;
          console.log('Dashboard: Sucursal owner plan_id:', this.currentPlanId);
        }
      }
=======
      console.log('Dashboard: User is sucursal. Skipping subscription check.');
>>>>>>> 7b947f7f6b4b636bdd4a6c675c6014ea74785457
    }

    // Only filter if user is a branch user
    if (profile?.rol === 'sucursal') {
      this.menuItems = this.menuItems.filter(item => item.route !== '/dashboard/branches');
    }
  }

<<<<<<< HEAD
  // Handle menu item clicks with plan restriction check
  onMenuClick(item: { label: string; icon: string; route: string }) {
    // Check if route is restricted for free plan
    if (this.currentPlanId === 1 && this.freeRestrictedRoutes.includes(item.route)) {
      const isOwner = this.userRole !== 'sucursal';
      this.dialog.open(UpgradePlanDialog, {
        width: '420px',
        data: {
          showUpgradeButton: isOwner,
          featureName: this.freeRestrictedLabels[item.route] || item.label
        }
      });
      // Close sidenav on mobile
      if (this.isHandset && this.drawer) {
        this.drawer.close();
      }
      return;
    }
    // Navigate normally
    this.router.navigate([item.route]);
    if (this.isHandset && this.drawer) {
      this.drawer.close();
    }
  }

=======
>>>>>>> 7b947f7f6b4b636bdd4a6c675c6014ea74785457
  logout() {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      width: '350px',
      data: {
        title: 'Cerrar Sesión',
        message: '¿Estás seguro de que deseas cerrar tu sesión?',
        confirmText: 'Sí, Cerrar Sesión',
        cancelText: 'Cancelar',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.authService.signOut();
        this.router.navigate(['/login']);
      }
    });
  }
}
