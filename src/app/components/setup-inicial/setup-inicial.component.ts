import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-setup-inicial',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="mostrarAviso" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 animate-fade-in-up">
        <div class="text-center mb-6">
          <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-gray-800 mb-2">¡Bienvenido al Sistema!</h2>
          <p class="text-gray-600">
            Para comenzar, necesitamos configurar algunos servicios esenciales
          </p>
        </div>

        <div class="space-y-4 mb-8">
          <!-- WhatsApp -->
          <div class="flex items-start gap-4 p-4 rounded-lg" [class.bg-green-50]="configuracion.whatsappOk" [class.bg-gray-50]="!configuracion.whatsappOk">
            <div class="flex-shrink-0">
              <div *ngIf="configuracion.whatsappOk" class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div *ngIf="!configuracion.whatsappOk" class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-gray-800 mb-1">WhatsApp</h3>
              <p class="text-sm text-gray-600">
                Envía confirmaciones automáticas a tus pacientes
              </p>
              <p *ngIf="configuracion.whatsappOk" class="text-sm text-green-600 font-medium mt-1">
                ✓ Configurado correctamente
              </p>
            </div>
          </div>

          <!-- Google Calendar -->
          <div class="flex items-start gap-4 p-4 rounded-lg" [class.bg-blue-50]="configuracion.calendarOk" [class.bg-gray-50]="!configuracion.calendarOk">
            <div class="flex-shrink-0">
              <div *ngIf="configuracion.calendarOk" class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div *ngIf="!configuracion.calendarOk" class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
                </svg>
              </div>
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-gray-800 mb-1">Google Calendar</h3>
              <p class="text-sm text-gray-600">
                Sincroniza automáticamente tus citas con tu calendario
              </p>
              <p *ngIf="configuracion.calendarOk" class="text-sm text-blue-600 font-medium mt-1">
                ✓ Configurado correctamente
              </p>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button 
            (click)="irAConfiguracion()"
            class="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            Configurar Ahora
          </button>
          <button 
            (click)="cerrarAviso()"
            class="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Más Tarde
          </button>
        </div>

        <p class="text-xs text-gray-500 text-center mt-4">
          Podrás configurar estos servicios en cualquier momento desde tu perfil
        </p>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .animate-fade-in-up {
      animation: fade-in-up 0.5s ease-out forwards;
    }
  `]
})
export class SetupInicialComponent implements OnInit {
  mostrarAviso = false;
  configuracion = {
    whatsappOk: false,
    calendarOk: false
  };
  
  medicoId = 1; // TODO: Obtener del auth service
  private apiUrl = environment.apiUrl;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.verificarConfiguracion();
  }

  verificarConfiguracion() {
    this.http.get<any>(`${this.apiUrl}/medicos/perfil/${this.medicoId}`)
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.configuracion.whatsappOk = response.data.whatsapp_connected || false;
            this.configuracion.calendarOk = response.data.google_calendar_connected || false;
            
            // Mostrar aviso solo si falta alguna configuración y no se marcó como completada
            const faltaConfiguracion = !this.configuracion.whatsappOk || !this.configuracion.calendarOk;
            const yaCompletada = response.data.configuracion_completada || false;
            
            this.mostrarAviso = faltaConfiguracion && !yaCompletada;
          }
        },
        error: (error) => {
          console.error('Error verificando configuración:', error);
        }
      });
  }

  irAConfiguracion() {
    this.mostrarAviso = false;
    this.router.navigate(['/admin/perfil']);
  }

  cerrarAviso() {
    this.mostrarAviso = false;
    // Marcar como completada para no mostrar más
    this.http.put(`${this.apiUrl}/medicos/perfil/${this.medicoId}/setup-completado`, {})
      .subscribe({
        next: () => console.log('Setup marcado como completado'),
        error: (error) => console.error('Error marcando setup:', error)
      });
  }
}
