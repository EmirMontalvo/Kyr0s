import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { Sucursal } from '../../../../models';

export interface BranchSelectorData {
    sucursales: Sucursal[];
    selectedBranchId: number | null;
}

@Component({
    selector: 'app-branch-selector-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatListModule, MatIconModule],
    template: `
    <h2 mat-dialog-title>Filtrar por Sucursal</h2>
    <mat-dialog-content>
      <mat-selection-list [multiple]="false" (selectionChange)="onSelectionChange($event)">
        <mat-list-option [value]="null" [selected]="data.selectedBranchId === null">
          <mat-icon matListItemIcon>store</mat-icon>
          <div matListItemTitle>Todas las sucursales</div>
        </mat-list-option>
        <mat-list-option *ngFor="let branch of data.sucursales" [value]="branch.id" [selected]="data.selectedBranchId === branch.id">
          <mat-icon matListItemIcon>place</mat-icon>
          <div matListItemTitle>{{ branch.nombre }}</div>
        </mat-list-option>
      </mat-selection-list>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
    </mat-dialog-actions>
  `,
    styles: [`
    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-surface {
      border-radius: 16px !important;
      background-color: #ffffff !important;
      padding: 10px;
    }
    mat-dialog-content {
      max-height: 400px;
      min-width: 300px;
    }
  `]
})
export class BranchSelectorDialog {
    constructor(
        public dialogRef: MatDialogRef<BranchSelectorDialog>,
        @Inject(MAT_DIALOG_DATA) public data: BranchSelectorData
    ) { }

    onSelectionChange(event: any): void {
        const selectedValue = event.options[0].value;
        this.dialogRef.close(selectedValue);
    }

    onCancel(): void {
        this.dialogRef.close(undefined);
    }
}
