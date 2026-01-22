import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificacionesService } from '../../../services/notificaciones.service';

@Component({
  selector: 'app-modal-cita',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <!-- Overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" (click)="cerrar()"></div>

      <!-- Modal -->
      <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg" 
             (click)="$event.stopPropagation()">
          
          <!-- Header -->
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10"
                   [ngClass]="{
                     'bg-green-100': accion === 'aceptar',
                     'bg-red-100': accion === 'rechazar'
                   }">
                <svg class="h-6 w-6" 
                     [ngClass]="{
                       'text-green-600': accion === 'aceptar',
                       'text-red-600': accion === 'rechazar'
                     }" 
                     fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path *ngIf="accion === 'aceptar'" stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path *ngIf="accion === 'rechazar'" stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 class="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                  {{ accion === 'aceptar' ? 'Confirmar Cita' : 'Rechazar Cita' }}
                </h3>
                <div class="mt-4">
                  <!-- Información de la cita -->
                  <div *ngIf="cita" class="bg-gray-50 rounded-lg p-4 mb-4">
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600">Paciente:</span>
                        <span class="font-medium text-gray-900">{{ cita.paciente?.nombre }} {{ cita.paciente?.apellido }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Fecha:</span>
                        <span class="font-medium text-gray-900">{{ formatFecha(cita.fecha) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600">Hora:</span>
                        <span class="font-medium text-gray-900">{{ formatHora(cita.hora_inicio) }}</span>
                      </div>
                      <div *ngIf="cita.motivo_consulta" class="pt-2 border-t border-gray-200">
                        <span class="text-gray-600">Motivo:</span>
                        <p class="text-gray-900 mt-1">{{ cita.motivo_consulta }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Campo de motivo de rechazo -->
                  <div *ngIf="accion === 'rechazar'" class="mt-4">
                    <label for="motivo" class="block text-sm font-medium text-gray-700 mb-2">
                      Motivo del rechazo <span class="text-red-500">*</span>
                    </label>
                    <textarea
                      id="motivo"
                      [(ngModel)]="motivoRechazo"
                      rows="3"
                      class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                      placeholder="Explica brevemente el motivo del rechazo..."></textarea>
                  </div>

                  <p class="mt-4 text-sm text-gray-500">
                    {{ accion === 'aceptar' 
                      ? 'El paciente recibirá una notificación por WhatsApp confirmando la cita.' 
                      : 'El paciente será notificado del rechazo de la cita por WhatsApp.' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              (click)="confirmar()"
              [disabled]="procesando || (accion === 'rechazar' && !motivoRechazo)"
              class="inline-flex w-full justify-center rounded-md px-4 py-2 text-base font-semibold text-white shadow-sm sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              [ngClass]="{
                'bg-green-600 hover:bg-green-500': accion === 'aceptar' && !procesando,
                'bg-red-600 hover:bg-red-500': accion === 'rechazar' && !procesando,
                'bg-gray-400': procesando
              }">
              <span *ngIf="!procesando">{{ accion === 'aceptar' ? 'Confirmar Cita' : 'Rechazar Cita' }}</span>
              <span *ngIf="procesando" class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            </button>
            <button
              type="button"
              (click)="cerrar()"
              [disabled]="procesando"
              class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2 text-base font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ModalCitaComponent {
  @Input() isOpen = false;
  @Input() cita: any = null;
  @Input() accion: 'aceptar' | 'rechazar' = 'aceptar';
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<any>();

  motivoRechazo = '';
  procesando = false;

  constructor(private notificacionesService: NotificacionesService) {}

  cerrar() {
    if (!this.procesando) {
      this.motivoRechazo = '';
      this.closed.emit();
    }
  }

  confirmar() {
    if (this.procesando) return;
    
    if (this.accion === 'rechazar' && !this.motivoRechazo.trim()) {
      alert('Por favor indica el motivo del rechazo');
      return;
    }

    this.procesando = true;
    const estado = this.accion === 'aceptar' ? 'confirmada' : 'rechazada';

    this.notificacionesService
      .actualizarEstadoCita(this.cita.id, estado, this.motivoRechazo)
      .subscribe({
        next: (response) => {
          this.procesando = false;
          this.confirmed.emit({ estado, motivo: this.motivoRechazo });
          this.cerrar();
        },
        error: (error) => {
          this.procesando = false;
          console.error('Error:', error);
          alert('Error al procesar la solicitud. Intenta de nuevo.');
        }
      });
  }

  formatFecha(fecha: string): string {
    if (!fecha) return 'Fecha no disponible';
    
    try {
      const [year, month, day] = fecha.split('T')[0].split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      return dateObj.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  formatHora(hora: string): string {
    if (!hora) return '';
    // Tomar solo HH:MM de HH:MM:SS o HH:MM:SS.000000
    return hora.substring(0, 5);
  }
}
