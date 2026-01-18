import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { SupabaseService } from '../../../services/supabase.service';
import { AuthService } from '../../../services/auth';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDividerModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  form: FormGroup;
  scheduleForm: FormGroup;
  loading = false;
  savingSchedule = false;
  avatarUrl: string | null = null;
  userId: string | null = null;
  isBranchUser = false;
  sucursalId: number | null = null;
  sucursalNombre: string = '';
  qrCodeUrl: string | null = null;

  // Day labels
  days = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' }
  ];

  weekdays = [1, 2, 3, 4, 5];
  weekendDays = [6, 0];

  constructor(
    private fb: FormBuilder,
    private supabase: SupabaseService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      nombre_negocio: [''],
      telefono: [''] // Phone number for branch
    });

    this.scheduleForm = this.fb.group({
      weekdays_active: [[]],
      weekday_open: ['09:00'],
      weekday_close: ['20:00'],
      weekday_break_start: ['14:00'],
      weekday_break_duration: [60],
      weekend_active: [[]],
      weekend_open: ['10:00'],
      weekend_close: ['18:00'],
      weekend_break_start: [''],
      weekend_break_duration: [0]
    });
  }

  async ngOnInit() {
    this.loading = true;
    const userRole = localStorage.getItem('userRole');
    this.isBranchUser = userRole === 'sucursal';
    const storedSucursalId = localStorage.getItem('sucursalId');
    if (storedSucursalId) {
      this.sucursalId = parseInt(storedSucursalId, 10);
    }

    try {
      const user = this.authService.currentUser;
      if (!user) return;
      this.userId = user.id;
      this.form.patchValue({ email: user.email });

      const { data: profile, error } = await this.supabase.client
        .from('usuarios_perfiles')
        .select(`
          nombre,
          avatar_url,
          negocios (nombre)
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        const negocio = Array.isArray(profile.negocios) ? profile.negocios[0] : profile.negocios;
        this.form.patchValue({
          nombre: profile.nombre,
          nombre_negocio: negocio?.nombre
        });
        if (profile.avatar_url) {
          this.downloadImage(profile.avatar_url);
        }
      }

      // Load branch info for branch users
      if (this.isBranchUser && this.sucursalId) {
        const { data: sucursal } = await this.supabase.client
          .from('sucursales')
          .select('nombre, telefono')
          .eq('id', this.sucursalId)
          .single();

        if (sucursal) {
          this.sucursalNombre = sucursal.nombre;
          this.form.patchValue({
            nombre: sucursal.nombre,
            telefono: sucursal.telefono || ''
          });
        }

        await this.loadSchedule();
        await this.generateQRCode();
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async generateQRCode() {
    if (!this.sucursalId) return;

    // Generate chatbot URL for this branch
    const chatbotUrl = `${window.location.origin}/chat/${this.sucursalId}`;

    try {
      // Generate QR code as data URL
      this.qrCodeUrl = await QRCode.toDataURL(chatbotUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1e40af', // Blue color to match theme
          light: '#ffffff'
        }
      });
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  downloadQR() {
    if (!this.qrCodeUrl) return;

    const link = document.createElement('a');
    link.download = `qr-${this.sucursalNombre || 'sucursal'}.png`;
    link.href = this.qrCodeUrl;
    link.click();
  }

  async loadSchedule() {
    if (!this.sucursalId) return;

    const { data } = await this.supabase.client
      .from('horarios_sucursal')
      .select('*')
      .eq('sucursal_id', this.sucursalId);

    if (data && data.length > 0) {
      const weekdaysActive: number[] = [];
      const weekendActive: number[] = [];
      let weekdaySchedule = data.find(d => this.weekdays.includes(d.dia_semana));
      let weekendSchedule = data.find(d => this.weekendDays.includes(d.dia_semana));

      data.forEach(h => {
        if (this.weekdays.includes(h.dia_semana)) {
          weekdaysActive.push(h.dia_semana);
        } else {
          weekendActive.push(h.dia_semana);
        }
      });

      this.scheduleForm.patchValue({
        weekdays_active: weekdaysActive,
        weekday_open: weekdaySchedule?.hora_inicio?.substring(0, 5) || '09:00',
        weekday_close: weekdaySchedule?.hora_fin?.substring(0, 5) || '20:00',
        weekday_break_start: weekdaySchedule?.hora_descanso_inicio?.substring(0, 5) || '',
        weekday_break_duration: weekdaySchedule?.duracion_descanso_minutos || 0,
        weekend_active: weekendActive,
        weekend_open: weekendSchedule?.hora_inicio?.substring(0, 5) || '10:00',
        weekend_close: weekendSchedule?.hora_fin?.substring(0, 5) || '18:00',
        weekend_break_start: weekendSchedule?.hora_descanso_inicio?.substring(0, 5) || '',
        weekend_break_duration: weekendSchedule?.duracion_descanso_minutos || 0
      });
    }
  }

  async saveSchedule() {
    if (!this.sucursalId) return;
    this.savingSchedule = true;

    try {
      const formVal = this.scheduleForm.value;

      // Delete existing schedule
      await this.supabase.client
        .from('horarios_sucursal')
        .delete()
        .eq('sucursal_id', this.sucursalId);

      const schedules: any[] = [];

      // Create weekday schedules
      (formVal.weekdays_active || []).forEach((day: number) => {
        schedules.push({
          sucursal_id: this.sucursalId,
          dia_semana: day,
          hora_inicio: formVal.weekday_open + ':00',
          hora_fin: formVal.weekday_close + ':00',
          hora_descanso_inicio: formVal.weekday_break_start ? formVal.weekday_break_start + ':00' : null,
          duracion_descanso_minutos: formVal.weekday_break_duration || 0
        });
      });

      // Create weekend schedules
      (formVal.weekend_active || []).forEach((day: number) => {
        schedules.push({
          sucursal_id: this.sucursalId,
          dia_semana: day,
          hora_inicio: formVal.weekend_open + ':00',
          hora_fin: formVal.weekend_close + ':00',
          hora_descanso_inicio: formVal.weekend_break_start ? formVal.weekend_break_start + ':00' : null,
          duracion_descanso_minutos: formVal.weekend_break_duration || 0
        });
      });

      if (schedules.length > 0) {
        const { error } = await this.supabase.client
          .from('horarios_sucursal')
          .insert(schedules);
        if (error) throw error;
      }

      this.snackBar.open('Horarios guardados correctamente', 'Cerrar', { duration: 3000 });
    } catch (error) {
      console.error('Error saving schedule:', error);
      this.snackBar.open('Error al guardar horarios', 'Cerrar', { duration: 3000 });
    } finally {
      this.savingSchedule = false;
      this.cdr.detectChanges();
    }
  }

  async downloadImage(path: string) {
    try {
      if (path.startsWith('http')) {
        this.avatarUrl = path;
      } else {
        const { data } = this.supabase.client.storage
          .from('avatars')
          .getPublicUrl(path);

        if (data) {
          this.avatarUrl = data.publicUrl;
        }
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  }

  async updateProfile() {
    if (this.form.invalid || !this.userId) return;
    this.loading = true;

    try {
      // Update user profile name
      const { error } = await this.supabase.client
        .from('usuarios_perfiles')
        .update({
          nombre: this.form.value.nombre
        })
        .eq('id', this.userId);

      if (error) throw error;

      // For branch users, also update branch name and phone
      if (this.isBranchUser && this.sucursalId) {
        await this.supabase.client
          .from('sucursales')
          .update({
            nombre: this.form.value.nombre,
            telefono: this.form.value.telefono
          })
          .eq('id', this.sucursalId);
      }

      this.snackBar.open('Perfil actualizado', 'Cerrar', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error al actualizar perfil', 'Cerrar', { duration: 3000 });
      console.error('Error updating profile:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  getDayLabel(day: number): string {
    return this.days.find(d => d.value === day)?.label || '';
  }

  toggleDay(controlName: string, day: number, isChecked: boolean) {
    const currentValue: number[] = this.scheduleForm.get(controlName)?.value || [];
    if (isChecked) {
      if (!currentValue.includes(day)) {
        this.scheduleForm.patchValue({ [controlName]: [...currentValue, day] });
      }
    } else {
      this.scheduleForm.patchValue({ [controlName]: currentValue.filter(d => d !== day) });
    }
  }
}
