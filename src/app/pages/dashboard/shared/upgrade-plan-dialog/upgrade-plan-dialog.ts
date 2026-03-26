import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
    selector: 'app-upgrade-plan-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './upgrade-plan-dialog.html',
    styleUrl: './upgrade-plan-dialog.scss',
})
export class UpgradePlanDialog {
    showUpgradeButton: boolean;
    featureName: string;

    constructor(
        private dialogRef: MatDialogRef<UpgradePlanDialog>,
        private router: Router,
        @Inject(MAT_DIALOG_DATA) public data: { showUpgradeButton: boolean; featureName?: string }
    ) {
        this.showUpgradeButton = data?.showUpgradeButton ?? false;
        this.featureName = data?.featureName || 'esta función';
    }

    close() {
        this.dialogRef.close();
        this.router.navigate(['/dashboard/calendar']);
    }

    upgradePlan() {
        this.dialogRef.close('upgrade');
        this.router.navigate(['/dashboard/profile']);
    }
}
