import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SupabaseService } from '../../../services/supabase.service';
import { AuthService } from '../../../services/auth';
import { SidenavService } from '../../../services/sidenav.service';

@Component({
    selector: 'app-statistics',
    standalone: true,
    imports: [
        CommonModule,
        NgxChartsModule,
        MatCardModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatFormFieldModule,
        MatIconModule,
        MatButtonModule,
        MatButtonToggleModule
    ],
    templateUrl: './statistics.html',
    styleUrl: './statistics.scss',
})
export class Statistics implements OnInit {
    loading = true;
    isOwner = false;
    negocioId: string | null = null;
    sucursalId: number | null = null;

    // Chart data
    appointmentsByBranch: any[] = [];
    popularServicesGeneral: any[] = [];
    servicesByBranch: any[] = [];
    selectedBranchForServices: number | null = null;
    branches: any[] = [];
    fullscreenChart: string | null = null;

    // Revenue chart data (for branch users)
    revenueViewMode: 'day' | 'week' | 'month' = 'day';
    revenueData: any[] = [];
    currentDate: Date = new Date();
    revenueTotal = 0;
    revenuePeriodLabel = '';

    // Chart options
    colorScheme: Color = {
        name: 'custom',
        selectable: true,
        group: ScaleType.Ordinal,
        domain: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#6366f1']
    };

    constructor(
        private supabase: SupabaseService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef,
        private sidenavService: SidenavService
    ) { }

    async ngOnInit() {
        const userRole = localStorage.getItem('userRole');
        this.isOwner = userRole === 'dueno';

        const storedSucursalId = localStorage.getItem('sucursalId');
        if (storedSucursalId) {
            this.sucursalId = parseInt(storedSucursalId, 10);
        }

        console.log('[Statistics] Role:', userRole, 'isOwner:', this.isOwner, 'storedSucursalId:', storedSucursalId);

        await this.loadNegocioId();

        console.log('[Statistics] After loadNegocioId - negocioId:', this.negocioId, 'sucursalId:', this.sucursalId);

        await this.loadStatistics();
        this.loading = false;
        this.cdr.detectChanges();
    }

    async loadNegocioId() {
        const user = this.authService.currentUser;
        if (!user) return;

        const { data: profile } = await this.supabase.client
            .from('usuarios_perfiles')
            .select('negocio_id, sucursal_id')
            .eq('id', user.id)
            .single();

        this.negocioId = profile?.negocio_id;

        // For branch users, use sucursal_id from profile if not in localStorage
        if (!this.isOwner && profile?.sucursal_id && !this.sucursalId) {
            this.sucursalId = profile.sucursal_id;
        }
    }

    async loadStatistics() {
        if (!this.negocioId) return;

        if (this.isOwner) {
            await this.loadBranches();
            await this.loadAppointmentsByBranch();
            await this.loadPopularServicesGeneral();
        } else if (this.sucursalId) {
            await this.loadPopularServicesByBranch(this.sucursalId);
            await this.loadRevenueData();
        }
    }

    async loadBranches() {
        const { data } = await this.supabase.client
            .from('sucursales')
            .select('id, nombre')
            .eq('negocio_id', this.negocioId);

        this.branches = data || [];
        if (this.branches.length > 0) {
            this.selectedBranchForServices = this.branches[0].id;
            await this.loadServicesBySelectedBranch();
        }
    }

    async loadAppointmentsByBranch() {
        const { data } = await this.supabase.client
            .from('citas')
            .select('sucursal_id, sucursales(nombre)')
            .eq('negocio_id', this.negocioId);

        if (data) {
            const counts: { [key: string]: number } = {};
            data.forEach((cita: any) => {
                const branchName = cita.sucursales?.nombre || 'Sin sucursal';
                counts[branchName] = (counts[branchName] || 0) + 1;
            });

            this.appointmentsByBranch = Object.entries(counts).map(([name, value]) => ({
                name,
                value
            }));
        }
    }

    async loadPopularServicesGeneral() {
        const { data } = await this.supabase.client
            .from('citas_servicios')
            .select('servicios(nombre), citas!inner(negocio_id)')
            .eq('citas.negocio_id', this.negocioId);

        if (data) {
            const counts: { [key: string]: number } = {};
            data.forEach((item: any) => {
                const serviceName = item.servicios?.nombre || 'Sin nombre';
                counts[serviceName] = (counts[serviceName] || 0) + 1;
            });

            this.popularServicesGeneral = Object.entries(counts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);
        }
    }

    async loadPopularServicesByBranch(branchId: number) {
        console.log('[Statistics] loadPopularServicesByBranch for branchId:', branchId);

        // First get cita IDs for this branch
        const { data: citas } = await this.supabase.client
            .from('citas')
            .select('id')
            .eq('sucursal_id', branchId);

        if (!citas || citas.length === 0) {
            console.log('[Statistics] No citas found for branch');
            this.servicesByBranch = [];
            return;
        }

        const citaIds = citas.map(c => c.id);
        console.log('[Statistics] Found citas:', citaIds);

        // Then get services for those citas
        const { data, error } = await this.supabase.client
            .from('citas_servicios')
            .select('servicio_id, servicios(nombre)')
            .in('cita_id', citaIds);

        if (error) {
            console.error('[Statistics] Error loading services:', error);
            return;
        }

        console.log('[Statistics] Service data:', data);

        if (data && data.length > 0) {
            const counts: { [key: string]: number } = {};
            data.forEach((item: any) => {
                const serviceName = item.servicios?.nombre || 'Sin nombre';
                counts[serviceName] = (counts[serviceName] || 0) + 1;
            });

            this.servicesByBranch = Object.entries(counts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10);

            console.log('[Statistics] servicesByBranch:', this.servicesByBranch);
        } else {
            this.servicesByBranch = [];
        }
    }

    async onBranchChange(branchId: number) {
        this.selectedBranchForServices = branchId;
        await this.loadServicesBySelectedBranch();
    }

    async loadServicesBySelectedBranch() {
        if (this.selectedBranchForServices) {
            await this.loadPopularServicesByBranch(this.selectedBranchForServices);
        }
    }

    openFullscreen(chartType: string) {
        this.fullscreenChart = chartType;
        this.sidenavService.hideSidenav();
        this.cdr.detectChanges();
    }

    closeFullscreen() {
        this.fullscreenChart = null;
        this.sidenavService.showSidenav();
        this.cdr.detectChanges();
    }

    // Revenue chart methods
    async setRevenueViewMode(mode: 'day' | 'week' | 'month') {
        this.revenueViewMode = mode;
        await this.loadRevenueData();
    }

    async navigatePeriod(direction: 'prev' | 'next') {
        const date = new Date(this.currentDate);

        if (this.revenueViewMode === 'day') {
            date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
        } else if (this.revenueViewMode === 'week') {
            date.setDate(date.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
        }

        this.currentDate = date;
        await this.loadRevenueData();
    }

    async loadRevenueData() {
        if (!this.sucursalId) return;

        const { startDate, endDate } = this.getDateRange();
        this.updatePeriodLabel();

        const { data, error } = await this.supabase.client
            .from('citas')
            .select('id, total_pagado, fecha_completado')
            .eq('sucursal_id', this.sucursalId)
            .eq('estado', 'completada')
            .gte('fecha_completado', startDate)
            .lte('fecha_completado', endDate);

        if (error) {
            console.error('Error loading revenue data:', error);
            return;
        }

        if (this.revenueViewMode === 'day') {
            // Group by hour
            this.revenueData = this.groupByHour(data || []);
        } else if (this.revenueViewMode === 'week') {
            // Group by day of week
            this.revenueData = this.groupByDayOfWeek(data || []);
        } else {
            // Group by day of month
            this.revenueData = this.groupByDayOfMonth(data || []);
        }

        this.revenueTotal = (data || []).reduce((sum, cita) => sum + (cita.total_pagado || 0), 0);
        this.cdr.detectChanges();
    }

    private getDateRange(): { startDate: string, endDate: string } {
        const date = new Date(this.currentDate);

        if (this.revenueViewMode === 'day') {
            date.setHours(0, 0, 0, 0);
            const start = date.toISOString();
            date.setHours(23, 59, 59, 999);
            return { startDate: start, endDate: date.toISOString() };
        } else if (this.revenueViewMode === 'week') {
            // Get start of week (Monday)
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            date.setDate(diff);
            date.setHours(0, 0, 0, 0);
            const start = date.toISOString();
            date.setDate(date.getDate() + 6);
            date.setHours(23, 59, 59, 999);
            return { startDate: start, endDate: date.toISOString() };
        } else {
            // Month
            date.setDate(1);
            date.setHours(0, 0, 0, 0);
            const start = date.toISOString();
            date.setMonth(date.getMonth() + 1);
            date.setDate(0);
            date.setHours(23, 59, 59, 999);
            return { startDate: start, endDate: date.toISOString() };
        }
    }

    private updatePeriodLabel() {
        const date = new Date(this.currentDate);
        const options: Intl.DateTimeFormatOptions = { timeZone: 'America/Mexico_City' };

        if (this.revenueViewMode === 'day') {
            this.revenuePeriodLabel = date.toLocaleDateString('es-MX', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', ...options
            });
        } else if (this.revenueViewMode === 'week') {
            const { startDate, endDate } = this.getDateRange();
            const start = new Date(startDate);
            const end = new Date(endDate);
            this.revenuePeriodLabel = `${start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else {
            this.revenuePeriodLabel = date.toLocaleDateString('es-MX', {
                month: 'long', year: 'numeric', ...options
            });
        }
    }

    private groupByHour(citas: any[]): any[] {
        const hours: { [key: string]: number } = {};
        for (let i = 8; i <= 20; i++) {
            hours[`${i}:00`] = 0;
        }

        citas.forEach(cita => {
            if (cita.fecha_completado) {
                const hour = new Date(cita.fecha_completado).getHours();
                const key = `${hour}:00`;
                if (hours[key] !== undefined) {
                    hours[key] += cita.total_pagado || 0;
                }
            }
        });

        return Object.entries(hours).map(([name, value]) => ({ name, value }));
    }

    private groupByDayOfWeek(citas: any[]): any[] {
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const dayData: { [key: string]: number } = {};
        days.forEach(d => dayData[d] = 0);

        citas.forEach(cita => {
            if (cita.fecha_completado) {
                const date = new Date(cita.fecha_completado);
                const dayIndex = (date.getDay() + 6) % 7; // Monday = 0
                dayData[days[dayIndex]] += cita.total_pagado || 0;
            }
        });

        return days.map(name => ({ name, value: dayData[name] }));
    }

    private groupByDayOfMonth(citas: any[]): any[] {
        const { endDate } = this.getDateRange();
        const daysInMonth = new Date(endDate).getDate();
        const dayData: { [key: string]: number } = {};

        for (let i = 1; i <= daysInMonth; i++) {
            dayData[i.toString()] = 0;
        }

        citas.forEach(cita => {
            if (cita.fecha_completado) {
                const day = new Date(cita.fecha_completado).getDate().toString();
                if (dayData[day] !== undefined) {
                    dayData[day] += cita.total_pagado || 0;
                }
            }
        });

        return Object.entries(dayData).map(([name, value]) => ({ name, value }));
    }
}
