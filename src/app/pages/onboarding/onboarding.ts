import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth';
import { Plan } from '../../models';
import { environment } from '../../../environments/environment';
import { PlanInfoDialog } from './plan-info-dialog/plan-info-dialog';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss'
})
export class Onboarding implements OnInit {
  planForm: FormGroup;
  planes: Plan[] = [];
  loading = false;
  selectedPlanId: number | null = null;
  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {
    this.planForm = this.fb.group({
      planId: ['', Validators.required]
    });
  }

  async ngOnInit() {
    await this.loadPlans();
  }

  openPlanInfo() {
    this.dialog.open(PlanInfoDialog, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'plan-info-dialog-panel'
    });
  }

  async loadPlans() {
    const { data, error } = await this.supabase.client
      .from('planes')
      .select('*')
      .eq('activo', true)
      .order('id');

    if (data) {
      this.planes = data;
      const basicPlan = this.planes.find(p => p.codigo === 'basic');
      if (basicPlan) {
        this.planForm.patchValue({ planId: basicPlan.id });
        this.selectedPlanId = basicPlan.id;
      }
      this.cdr.detectChanges();
    }
  }

  selectPlan(planId: number) {
    this.selectedPlanId = planId;
    this.planForm.patchValue({ planId: planId });
  }

  getTotalPrice(): number {
    const selectedPlan = this.planes.find(p => p.id === this.selectedPlanId);
    if (!selectedPlan) return 0;
    return selectedPlan.precio_mxn;
  }

  async exit() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }

  async initiatePayment() {
    if (!this.selectedPlanId) return;
    this.loading = true;

    try {
      const user = this.authService.currentUser;
      if (!user) throw new Error('No user found');

      // 1. Ensure Negocio Exists
      let negocioId: string;

      const { data: profile } = await this.supabase.client
        .from('usuarios_perfiles')
        .select('nombre, negocio_id')
        .eq('id', user.id)
        .single();

      if (profile?.negocio_id) {
        negocioId = profile.negocio_id;
      } else {
        // Create Negocio
        const negocioNombre = `Barbería de ${profile?.nombre || 'Mi Negocio'}`;
        const { data: negocio, error: negError } = await this.supabase.client
          .from('negocios')
          .insert({ nombre: negocioNombre })
          .select()
          .single();

        if (negError) throw negError;
        negocioId = negocio.id;

        // Link to Profile
        await this.supabase.client
          .from('usuarios_perfiles')
          .update({ negocio_id: negocioId })
          .eq('id', user.id);
      }

      // 2. Get selected plan
      const selectedPlan = this.planes.find(p => p.id === this.selectedPlanId);
      if (!selectedPlan) throw new Error('Plan not found');

      // Free plan: activate as 7-day trial
      if (selectedPlan.codigo === 'free') {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);

        await this.supabase.client
          .from('negocio_suscripciones')
          .upsert({
            negocio_id: negocioId,
            plan_id: this.selectedPlanId,
            estado: 'trialing',
            fecha_fin_prueba: trialEnd.toISOString()
          }, { onConflict: 'negocio_id' });

        this.router.navigate(['/dashboard']);
        return;
      }

      // 3. Create trial subscription record
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      await this.supabase.client
        .from('negocio_suscripciones')
        .upsert({
          negocio_id: negocioId,
          plan_id: this.selectedPlanId,
          estado: 'trialing',
          fecha_fin_prueba: trialEnd.toISOString()
        }, { onConflict: 'negocio_id' });

      // 4. Redirect to Stripe Checkout
      const { data: fnData, error: fnError } = await this.supabase.client.functions.invoke('create-checkout', {
        body: {
          price_id: this.getPriceId(selectedPlan.codigo),
          negocio_id: negocioId
        }
      });

      if (fnError) throw fnError;
      if (fnData?.url) {
        window.location.href = fnData.url;
        return;
      }

    } catch (error: any) {
      console.error('Error in payment flow:', error);
      this.snackBar.open('Error al procesar: ' + error.message, 'Cerrar');
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  getPriceId(planCode: string): string {
    return environment.stripePrices[planCode as keyof typeof environment.stripePrices] || '';
  }

  getSupportLevel(planCode: string): string {
    switch (planCode) {
      case 'free': return 'Soporte Básico (Autoservicio)';
      case 'basic': return 'Soporte Estándar (Respuesta 24h)';
      case 'regular': return 'Soporte Prioritario (Salto de fila)';
      default: return 'Soporte Estándar';
    }
  }
}
