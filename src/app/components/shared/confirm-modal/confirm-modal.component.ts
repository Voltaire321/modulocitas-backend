import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-[99999] overflow-y-auto animate-fade-in" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <!-- Overlay -->
      <div class="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity backdrop-blur-sm"
           (click)="onCancel()"></div>

      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="modal-content relative transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all w-full max-w-md animate-bounce-in opacity-0">
          
          <!-- Icono superior -->
          <div class="flex items-center justify-center pt-8 pb-4">
            <div [ngClass]="getIconClass()" class="rounded-full p-3">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path *ngIf="type === 'danger'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                <path *ngIf="type === 'warning'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                <path *ngIf="type === 'info'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                <path *ngIf="type === 'success'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
          </div>

          <!-- Contenido -->
          <div class="px-8 pb-6 text-center">
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              {{ title }}
            </h3>
            <p class="text-sm text-gray-600 leading-relaxed">
              {{ message }}
            </p>
          </div>

          <!-- Botones -->
          <div class="flex gap-3 px-8 pb-8">
            <button
              (click)="onCancel()"
              class="flex-1 px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 
                     rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95
                     focus:outline-none focus:ring-2 focus:ring-gray-300">
              {{ cancelText }}
            </button>
            <button
              (click)="onConfirm()"
              [ngClass]="getButtonClass()"
              class="flex-1 px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 
                     transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-content {
      animation: slideIn 0.3s ease-out forwards;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class ConfirmModalComponent {
  @Input() isOpen = false;
  @Input() title = '¿Estás seguro?';
  @Input() message = 'Esta acción no se puede deshacer.';
  @Input() confirmText = 'Confirmar';
  @Input() cancelText = 'Cancelar';
  @Input() type: 'danger' | 'warning' | 'info' | 'success' = 'warning';
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  getIconClass(): string {
    const classes = {
      danger: 'bg-red-100 text-red-600',
      warning: 'bg-amber-100 text-amber-600',
      info: 'bg-blue-100 text-blue-600',
      success: 'bg-green-100 text-green-600'
    };
    return classes[this.type];
  }

  getButtonClass(): string {
    const classes = {
      danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
      info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
    };
    return classes[this.type];
  }

  onConfirm() {
    this.confirmed.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }
}
