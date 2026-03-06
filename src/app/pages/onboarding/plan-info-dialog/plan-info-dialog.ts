import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
    selector: 'app-plan-info-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule
    ],
    templateUrl: './plan-info-dialog.html',
    styleUrl: './plan-info-dialog.scss'
})
export class PlanInfoDialog {
    constructor(public dialogRef: MatDialogRef<PlanInfoDialog>) { }

    close() {
        this.dialogRef.close();
    }
}
