import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificacionesService, Notificacion } from '../../../services/notificaciones.service';
import { AuthService } from '../../../services/auth.service';
import { ModalCitaComponent } from '../modal-cita/modal-cita.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-notificaciones-bell',
  standalone: true,
  imports: [CommonModule, ModalCitaComponent, ConfirmModalComponent],
  template: `
    <div class="relative">
      <!-- Campanita -->
      <button 
        (click)="toggleDropdown()"
        class="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        [class.bg-gray-100]="showDropdown">
        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        
        <!-- Badge de contador -->
        <span 
          *ngIf="noLeidasCount > 0"
          class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
          {{ noLeidasCount > 9 ? '9+' : noLeidasCount }}
        </span>
      </button>

      <!-- Dropdown -->
      <div 
        *ngIf="showDropdown"
        class="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] animate-scale-in origin-top-right">
        
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-200">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-lg font-semibold text-gray-800">Notificaciones</h3>
            <button 
              (click)="toggleMenu()"
              class="p-1 rounded hover:bg-gray-100 transition-colors">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
            </button>
          </div>
          
          <!-- Menú de opciones -->
          <div *ngIf="showMenu" class="absolute right-4 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50 animate-fade-in-up origin-top-right">
            <div class="py-1">
              <button 
                *ngIf="noLeidasCount > 0"
                (click)="marcarTodasLeidas()"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Marcar todas como leídas
              </button>
              <button 
                *ngIf="leidasCount > 0"
                (click)="limpiarLeidas()"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Limpiar leídas ({{ leidasCount }})
              </button>
              <button 
                *ngIf="notificaciones.length > 0"
                (click)="limpiarTodas()"
                class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Eliminar todas
              </button>
            </div>
          </div>
        </div>

        <!-- Lista de notificaciones -->
        <div class="max-h-96 overflow-y-auto">
          <div *ngIf="notificaciones.length === 0" class="px-4 py-8 text-center text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
            </svg>
            <p>No hay notificaciones</p>
          </div>

          <div *ngFor="let notif of notificaciones" 
               class="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors relative group"
               [class.bg-blue-50]="!notif.leida">
            
            <!-- Botón eliminar (aparece al hacer hover) -->
            <button
              (click)="eliminarNotificacion(notif.id, $event)"
              class="absolute top-2 right-2 p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Eliminar notificación">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            
            <div class="flex items-start space-x-3">
              <!-- Icono -->
              <div class="flex-shrink-0 mt-1">
                <div 
                  class="w-10 h-10 rounded-full flex items-center justify-center"
                  [ngClass]="{
                    'bg-green-100 text-green-600': notif.tipo === 'cita_nueva',
                    'bg-blue-100 text-blue-600': notif.tipo === 'cita_aceptada',
                    'bg-red-100 text-red-600': notif.tipo === 'cita_rechazada',
                    'bg-purple-100 text-purple-600': notif.tipo === 'receta_nueva'
                  }">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path *ngIf="notif.tipo === 'cita_nueva'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    <path *ngIf="notif.tipo === 'cita_aceptada'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    <path *ngIf="notif.tipo === 'cita_rechazada'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    <path *ngIf="notif.tipo === 'receta_nueva'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
              </div>

              <!-- Contenido -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900">{{ notif.titulo }}</p>
                <p class="text-sm text-gray-600 mt-1">{{ notif.mensaje }}</p>
                <p class="text-xs text-gray-400 mt-2">{{ getTimeAgo(notif.fecha_creacion) }}</p>
                
                <!-- Botones de acción para cita nueva -->
                <div *ngIf="notif.tipo === 'cita_nueva'" class="flex gap-2 mt-3" (click)="$event.stopPropagation()">
                  <button 
                    (click)="verNotificacion(notif)"
                    class="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white 
                           bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                           rounded-lg shadow-sm hover:shadow-md transition-all duration-200 
                           transform hover:scale-[1.02] active:scale-95">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span>Aceptar</span>
                  </button>
                  <button 
                    (click)="abrirModalRechazar(notif)"
                    class="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white 
                           bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 
                           rounded-lg shadow-sm hover:shadow-md transition-all duration-200 
                           transform hover:scale-[1.02] active:scale-95">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>

              <!-- Indicador no leída -->
              <div *ngIf="!notif.leida" class="flex-shrink-0">
                <span class="inline-block w-2 h-2 bg-primary-600 rounded-full"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 border-t border-gray-200 text-center">
          <a href="/admin/notificaciones" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Ver todas las notificaciones
          </a>
        </div>
      </div>
    </div>

    <!-- Modal de Aceptar/Rechazar -->
    <app-modal-cita
      [isOpen]="showModal"
      [cita]="citaSeleccionada"
      [accion]="accionModal"
      (closed)="cerrarModal()"
      (confirmed)="onModalConfirmed($event)">
    </app-modal-cita>

    <!-- Modal de Confirmación -->
    <app-confirm-modal
      [isOpen]="showConfirmModal"
      [title]="confirmModalData.title"
      [message]="confirmModalData.message"
      [confirmText]="confirmModalData.confirmText"
      [cancelText]="confirmModalData.cancelText"
      [type]="confirmModalData.type"
      (confirmed)="onConfirmModalConfirmed()"
      (cancelled)="onConfirmModalCancelled()">
    </app-confirm-modal>

    <!-- Overlay para cerrar el dropdown -->
    <div 
      *ngIf="showDropdown"
      (click)="showDropdown = false"
      class="fixed inset-0 z-40"
      style="background: transparent;"></div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class NotificacionesBellComponent implements OnInit, OnDestroy {
  notificaciones: Notificacion[] = [];
  noLeidasCount = 0;
  leidasCount = 0;
  showDropdown = false;
  showMenu = false;
  showModal = false;
  showConfirmModal = false;
  citaSeleccionada: any = null;
  accionModal: 'aceptar' | 'rechazar' = 'aceptar';
  usuarioId: number = 1;
  usuarioTipo: string = 'medico';
  private subscription?: Subscription;
  
  confirmModalData = {
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'warning' as 'danger' | 'warning' | 'info' | 'success',
    action: '' as 'eliminar' | 'limpiarLeidas' | 'limpiarTodas'
  };
  notificacionParaEliminar: number | null = null;

  constructor(
    private notificacionesService: NotificacionesService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Obtener usuario actual
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.medico_id) {
      this.usuarioId = currentUser.medico_id;
      this.usuarioTipo = 'medico';
      console.log('Usuario cargado:', { id: this.usuarioId, tipo: this.usuarioTipo });
    }

    this.cargarNotificaciones();
    
    // Polling cada 30 segundos
    this.subscription = this.notificacionesService
      .iniciarPolling(this.usuarioId, this.usuarioTipo)
      .subscribe(() => {
        this.cargarNotificaciones();
      });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  cargarNotificaciones() {
    console.log('Cargando notificaciones para:', { id: this.usuarioId, tipo: this.usuarioTipo });
    this.notificacionesService
      .getNotificaciones(this.usuarioId, this.usuarioTipo)
      .subscribe({
        next: (response) => {
          console.log('Notificaciones recibidas:', response);
          this.notificaciones = response.data || [];
          // Usar setTimeout para evitar el error ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            this.noLeidasCount = this.notificaciones.filter(n => !n.leida).length;
            this.leidasCount = this.notificaciones.filter(n => n.leida).length;
            this.cdr.detectChanges();
          }, 0);
        },
        error: (error) => console.error('Error al cargar notificaciones:', error)
      });
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    if (!this.showDropdown) {
      this.showMenu = false;
    }
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;
  }

  verNotificacion(notif: Notificacion) {
    console.log('Ver notificación:', notif);
    
    // Marcar como leída
    if (!notif.leida) {
      this.notificacionesService.marcarComoLeida(notif.id).subscribe({
        next: () => {
          notif.leida = true;
          this.noLeidasCount--;
        }
      });
    }

    // Si es una notificación de cita nueva, mostrar modal
    if (notif.tipo === 'cita_nueva' && notif.cita_info) {
      console.log('Abriendo modal con cita:', notif.cita_info);
      this.citaSeleccionada = notif.cita_info;
      this.accionModal = 'aceptar';
      this.showDropdown = false;
      this.showModal = true;
    } else {
      console.log('No se puede abrir modal:', { tipo: notif.tipo, cita_info: notif.cita_info });
    }
  }

  abrirModalRechazar(notif: Notificacion) {
    console.log('Rechazar notificación:', notif);
    
    // Marcar como leída
    if (!notif.leida) {
      this.notificacionesService.marcarComoLeida(notif.id).subscribe({
        next: () => {
          notif.leida = true;
          this.noLeidasCount--;
        }
      });
    }
    
    if (notif.cita_info) {
      console.log('Abriendo modal rechazar con cita:', notif.cita_info);
      this.citaSeleccionada = notif.cita_info;
      this.accionModal = 'rechazar';
      this.showDropdown = false;
      this.showModal = true;
    } else {
      console.log('No hay cita_info para rechazar');
    }
  }

  cerrarModal() {
    this.showModal = false;
    this.citaSeleccionada = null;
  }

  onModalConfirmed(event: any) {
    console.log('Modal confirmado:', event);
    // Recargar notificaciones después de confirmar
    this.cargarNotificaciones();
  }

  marcarTodasLeidas() {
    this.notificacionesService
      .marcarTodasComoLeidas(this.usuarioId, this.usuarioTipo)
      .subscribe({
        next: () => {
          this.notificaciones.forEach(n => n.leida = true);
          this.noLeidasCount = 0;
          this.leidasCount = this.notificaciones.length;
          this.showMenu = false;
        }
      });
  }

  eliminarNotificacion(id: number, event: Event) {
    event.stopPropagation();
    
    this.notificacionParaEliminar = id;
    this.confirmModalData = {
      title: '¿Eliminar notificación?',
      message: 'Esta notificación se eliminará permanentemente.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      action: 'eliminar'
    };
    this.showConfirmModal = true;
  }

  limpiarLeidas() {
    this.confirmModalData = {
      title: '¿Limpiar notificaciones leídas?',
      message: `Se eliminarán ${this.leidasCount} notificación(es) que ya has leído.`,
      confirmText: 'Limpiar',
      cancelText: 'Cancelar',
      type: 'warning',
      action: 'limpiarLeidas'
    };
    this.showConfirmModal = true;
  }

  limpiarTodas() {
    this.confirmModalData = {
      title: '¿Eliminar todas las notificaciones?',
      message: 'Esta acción eliminará TODAS tus notificaciones de forma permanente y no se puede deshacer.',
      confirmText: 'Eliminar todas',
      cancelText: 'Cancelar',
      type: 'danger',
      action: 'limpiarTodas'
    };
    this.showConfirmModal = true;
  }

  onConfirmModalConfirmed() {
    this.showConfirmModal = false;
    
    switch (this.confirmModalData.action) {
      case 'eliminar':
        if (this.notificacionParaEliminar !== null) {
          this.notificacionesService.eliminarNotificacion(this.notificacionParaEliminar).subscribe({
            next: () => {
              this.notificaciones = this.notificaciones.filter(n => n.id !== this.notificacionParaEliminar);
              this.noLeidasCount = this.notificaciones.filter(n => !n.leida).length;
              this.leidasCount = this.notificaciones.filter(n => n.leida).length;
              this.notificacionParaEliminar = null;
            },
            error: (error) => console.error('Error al eliminar notificación:', error)
          });
        }
        break;
        
      case 'limpiarLeidas':
        this.notificacionesService.eliminarLeidas(this.usuarioId, this.usuarioTipo).subscribe({
          next: (response) => {
            this.notificaciones = this.notificaciones.filter(n => !n.leida);
            this.leidasCount = 0;
            this.showMenu = false;
            console.log(response.message);
          },
          error: (error) => console.error('Error al limpiar notificaciones:', error)
        });
        break;
        
      case 'limpiarTodas':
        this.notificacionesService.eliminarTodas(this.usuarioId, this.usuarioTipo).subscribe({
          next: (response) => {
            this.notificaciones = [];
            this.noLeidasCount = 0;
            this.leidasCount = 0;
            this.showMenu = false;
            this.showDropdown = false;
            console.log(response.message);
          },
          error: (error) => console.error('Error al eliminar todas las notificaciones:', error)
        });
        break;
    }
  }

  onConfirmModalCancelled() {
    this.showConfirmModal = false;
    this.notificacionParaEliminar = null;
  }

  getTimeAgo(fecha: string): string {
    const now = new Date();
    const then = new Date(fecha);
    const diff = now.getTime() - then.getTime();
    
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} h`;
    if (dias < 7) return `Hace ${dias} d`;
    return then.toLocaleDateString('es-MX');
  }
}
