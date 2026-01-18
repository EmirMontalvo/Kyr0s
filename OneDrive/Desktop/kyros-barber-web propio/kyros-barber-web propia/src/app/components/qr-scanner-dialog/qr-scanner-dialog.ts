import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-qr-scanner-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="qr-dialog-card">
      <div class="dialog-header">
        <mat-icon class="header-icon">qr_code_scanner</mat-icon>
        <h2>Escanear QR para Agendar Cita</h2>
      </div>
      <mat-dialog-content>
        <div class="scanner-options" *ngIf="!scanning && !processing">
          <p class="instructions">Escanea el código QR de la sucursal para agendar tu cita</p>
          <button mat-raised-button color="primary" (click)="startCameraScanner()">
            <mat-icon>photo_camera</mat-icon>
            Escanear con Cámara
          </button>
          <button mat-stroked-button color="primary" (click)="triggerFileInput()">
            <mat-icon>image</mat-icon>
            Subir Imagen de QR
          </button>
          <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" hidden>
        </div>

        <div class="camera-container" *ngIf="scanning">
          <div id="qr-reader" #qrReader></div>
          <button mat-button color="warn" (click)="stopCamera()">Cancelar</button>
        </div>

        <div class="processing" *ngIf="processing">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Procesando QR...</p>
        </div>

        <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .qr-dialog-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
    }
    .dialog-header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 12px;

      .header-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 500;
      }
    }
    mat-dialog-content {
      min-width: 320px;
      min-height: 200px;
      padding: 24px !important;
    }
    .instructions {
      text-align: center;
      color: #666;
      margin-bottom: 20px;
    }
    .scanner-options {
      display: flex;
      flex-direction: column;
      gap: 16px;

      button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 24px;
        font-size: 1rem;
      }
    }
    .camera-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;

      #qr-reader {
        width: 100%;
        max-width: 400px;
        border-radius: 8px;
        overflow: hidden;
      }
    }
    .processing {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px;
    }
    .error {
      color: #ef4444;
      text-align: center;
      margin-top: 16px;
      padding: 12px;
      background: #fef2f2;
      border-radius: 8px;
    }
    mat-dialog-actions {
      padding: 16px 24px !important;
      border-top: 1px solid #e5e7eb;
    }
  `]
})
export class QrScannerDialog implements OnDestroy, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('qrReader') qrReaderElement!: ElementRef;

  scanning = false;
  processing = false;
  errorMessage = '';
  private html5QrCode: Html5Qrcode | null = null;

  constructor(
    private dialogRef: MatDialogRef<QrScannerDialog>,
    private router: Router
  ) { }

  ngAfterViewInit() { }

  ngOnDestroy() {
    this.stopCamera();
  }

  async startCameraScanner() {
    this.errorMessage = '';
    this.scanning = true;

    // Wait for view to update
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      this.html5QrCode = new Html5Qrcode('qr-reader');
      await this.html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => this.handleQRCode(decodedText),
        () => { } // Ignore errors during scanning
      );
    } catch (error) {
      this.errorMessage = 'No se pudo acceder a la cámara. Intenta subir una imagen.';
      this.scanning = false;
    }
  }

  async stopCamera() {
    if (this.html5QrCode) {
      try {
        await this.html5QrCode.stop();
      } catch (e) { }
      this.html5QrCode = null;
    }
    this.scanning = false;
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.processing = true;
    this.errorMessage = '';

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-hidden');
      const result = await html5QrCode.scanFile(file, true);
      this.handleQRCode(result);
    } catch (error) {
      this.errorMessage = 'No se pudo leer el código QR. Asegúrate de que la imagen sea clara.';
      this.processing = false;
    }
  }

  private handleQRCode(decodedText: string) {
    this.stopCamera();
    this.processing = true;

    // Check if it's a valid chatbot URL
    const chatMatch = decodedText.match(/\/chat\/(\d+)/);
    if (chatMatch) {
      const sucursalId = chatMatch[1];
      this.dialogRef.close();
      this.router.navigate(['/chat', sucursalId]);
    } else if (decodedText.includes('chat')) {
      // Try to extract from full URL
      try {
        const url = new URL(decodedText);
        const pathMatch = url.pathname.match(/\/chat\/(\d+)/);
        if (pathMatch) {
          const sucursalId = pathMatch[1];
          this.dialogRef.close();
          this.router.navigate(['/chat', sucursalId]);
          return;
        }
      } catch (e) { }
      this.errorMessage = 'Código QR inválido. Escanea un QR de Kyros Barber.';
      this.processing = false;
    } else {
      this.errorMessage = 'Código QR inválido. Escanea un QR de Kyros Barber.';
      this.processing = false;
    }
  }
}
