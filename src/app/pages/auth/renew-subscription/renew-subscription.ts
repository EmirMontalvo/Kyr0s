import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { SupabaseService } from '../../../services/supabase.service';
import { AuthService } from '../../../services/auth';
import { Plan } from '../../../models';
import { environment } from '../../../../environments/environment';
import { PlanInfoDialog } from '../../onboarding/plan-info-dialog/plan-info-dialog';

@Component({
  selector: 'app-renew-subscription',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './renew-subscription.html',
  styleUrl: './renew-subscription.scss'
})
export class RenewSubscriptionComponent implements OnInit {
  planes: Plan[] = [];
  loading = false;
  selectedPlanId: number | null = null;
  negocioId: string | null = null;
  selectedChatbotType: 'web' | 'whatsapp' = 'web'; // legacy, kept for compatibility

  constructor(
    private supabase: SupabaseService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) { }

  async ngOnInit() {
    await this.loadPlans();
    await this.checkNegocio();
  }

  async checkNegocio() {
    const user = this.authService.currentUser;
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const { data: profile } = await this.supabase.client
      .from('usuarios_perfiles')
      .select('negocio_id')
      .eq('id', user.id)
      .single();

    if (profile?.negocio_id) {
      this.negocioId = profile.negocio_id;
    } else {
      // If no business, they should go to onboarding
      this.router.navigate(['/onboarding']);
    }
  }

  async loadPlans() {
    const { data } = await this.supabase.client
      .from('planes')
      .select('*')
      .neq('codigo', 'free')
      .eq('activo', true)
      .order('id');

    if (data) {
      this.planes = data;
      // Default to Basic
      const basicPlan = this.planes.find(p => p.codigo === 'basic');
      if (basicPlan) {
        this.selectedPlanId = basicPlan.id;
      }
      this.cdr.detectChanges();
    }
  }

  selectPlan(planId: number) {
    this.selectedPlanId = planId;
  }

  selectChatbotType(type: 'web' | 'whatsapp') {
    this.selectedChatbotType = type;
  }

  getChatbotPrice(): number {
    if (this.selectedChatbotType !== 'whatsapp' || !this.selectedPlanId) return 0;
    const selectedPlan = this.planes.find(p => p.id === this.selectedPlanId);
    if (!selectedPlan) return 0;
    return selectedPlan.codigo === 'basic' ? 99 : 149;
  }

  getTotalPrice(): number {
    const selectedPlan = this.planes.find(p => p.id === this.selectedPlanId);
    if (!selectedPlan) return 0;
    return selectedPlan.precio_mxn + this.getChatbotPrice();
  }

  getSupportLevel(planId: number): string {
    const supportLevels: { [key: number]: string } = {
      1: 'Básico',      // Free
      2: 'Estándar',    // Basic
      3: 'Prioritario'  // Regular
    };
    return supportLevels[planId] || 'Estándar';
  }

  async exit() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }

  async renewSubscription() {
    if (!this.selectedPlanId || !this.negocioId) return;
    this.loading = true;

    try {
      const selectedPlan = this.planes.find(p => p.id === this.selectedPlanId);
      if (!selectedPlan) return;

      if (selectedPlan.codigo === 'free') {
        // Free plan activation
        const { error } = await this.supabase.client
          .from('negocio_suscripciones')
          .upsert({
            negocio_id: this.negocioId,
            plan_id: this.selectedPlanId,
            estado: 'free'
          }, { onConflict: 'negocio_id' });

        if (error) throw error;
        this.router.navigate(['/dashboard']);
      } else {
        // Paid plan -> Stripe
        const { data: fnData, error: fnError } = await this.supabase.client.functions.invoke('create-checkout', {
          body: {
            price_id: environment.stripePrices[selectedPlan.codigo as keyof typeof environment.stripePrices],
            negocio_id: this.negocioId,
            success_url: window.location.origin + '/dashboard'
          }
        });

        if (fnError) throw fnError;
        if (fnData?.url) {
          window.location.href = fnData.url;
        }
      }
    } catch (error: any) {
      console.error('Error renewing:', error);
      this.snackBar.open('Error: ' + error.message, 'Cerrar');
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openPlanInfo() {
    this.dialog.open(PlanInfoDialog, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'plan-info-dialog-panel'
    });
  }
}
