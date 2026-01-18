import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { SupabaseService } from '../../../../services/supabase.service';

@Component({
    selector: 'app-add-hour-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule
    ],
    templateUrl: './add-hour-dialog.html',
    styleUrl: './add-hour-dialog.scss',
})
export class AddHourDialog {
    form: FormGroup;
    loading = false;
    diasSemana = [
        { value: 1, label: 'Lunes' },
        { value: 2, label: 'Martes' },
        { value: 3, label: 'Miércoles' },
        { value: 4, label: 'Jueves' },
        { value: 5, label: 'Viernes' },
        { value: 6, label: 'Sábado' },
        { value: 0, label: 'Domingo' }
    ];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<AddHourDialog>,
        private supabase: SupabaseService,
        @Inject(MAT_DIALOG_DATA) public data: { sucursalId: number }
    ) {
        this.form = this.fb.group({
            dia_semana: ['', Validators.required],
            hora_inicio: ['', Validators.required],
            hora_fin: ['', Validators.required]
        });
    }

    async onSubmit() {
        if (this.form.invalid) return;
        this.loading = true;

        try {
            const { dia_semana, hora_inicio, hora_fin } = this.form.value;

            const horarioData = {
                sucursal_id: this.data.sucursalId,
                dia_semana: dia_semana,
                hora_inicio: hora_inicio, // HH:mm format from input type="time"
                hora_fin: hora_fin
            };

            const { error } = await this.supabase.client
                .from('horarios_sucursal')
                .insert(horarioData);

            if (error) throw error;
            this.dialogRef.close(true);

        } catch (error) {
            console.error('Error saving hour:', error);
        } finally {
            this.loading = false;
        }
    }
}
