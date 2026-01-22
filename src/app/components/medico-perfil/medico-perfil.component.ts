import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { environment } from '../../../environments/environment';

interface MedicoStatus {
  whatsappConnected: boolean;
  googleCalendarConnected: boolean;
  configuracionCompletada: boolean;
}

interface MedicoPerfil {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string;
  email: string;
  telefono: string;
  cedula_profesional: string;
  avatar_url: string | null;
  whatsapp_connected: boolean;
  google_calendar_connected: boolean;
  google_calendar_email: string | null;
  configuracion_completada: boolean;
}

@Component({
  selector: 'app-medico-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './medico-perfil.component.html',
  styleUrls: ['./medico-perfil.component.css']
})
export class MedicoPerfilComponent implements OnInit, OnDestroy {
  private apiUrl = environment.apiUrl;
  
  medicoId: number = 1; // TODO: Obtener del auth service
  perfil: MedicoPerfil | null = null;
  
  // Estados de carga
  loading = true;
  guardando = false;
  
  // QR de WhatsApp
  qrCode: string | null = null;
  mostrarQR = false;
  whatsappStatus = '';
  
  // Avatar
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploadingAvatar = false;
  
  // Intervals para polling
  private whatsappInterval: any = null;
  private calendarInterval: any = null;
  
  // Alertas personalizadas
  alertMessage: string | null = null;
  alertType: 'success' | 'error' | null = null;
  
  // Modal de confirmación
  showConfirmModal = false;
  confirmMessage = '';
  confirmAction: (() => void) | null = null;
  
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.cargarPerfil();
  }

  ngOnDestroy() {
    // Limpiar intervals al destruir el componente
    if (this.whatsappInterval) {
      clearInterval(this.whatsappInterval);
    }
    if (this.calendarInterval) {
      clearInterval(this.calendarInterval);
    }
  }

  // Mostrar alerta personalizada
  showAlert(message: string, type: 'success' | 'error') {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = null;
      this.alertType = null;
    }, 4000);
  }

  openConfirmModal(message: string, action: () => void) {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
    this.confirmMessage = '';
    this.confirmAction = null;
  }

  confirmModalAction() {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.closeConfirmModal();
  }

  volverAlDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  cargarPerfil() {
    this.loading = true;
    this.http.get<{ success: boolean, data: MedicoPerfil }>
      (`${this.apiUrl}/medicos/perfil/${this.medicoId}`)
      .subscribe({
        next: (response) => {
          console.log('Perfil cargado:', response);
          this.perfil = response.data;
          if (this.perfil.avatar_url) {
            // Construir la URL completa para el preview
            this.previewUrl = `http://localhost:3000${this.perfil.avatar_url}`;
            console.log('Preview URL inicial:', this.previewUrl);
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error cargando perfil:', error);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  guardarCambios() {
    if (!this.perfil) return;
    
    this.guardando = true;
    this.http.put<{ success: boolean }>
      (`${this.apiUrl}/medicos/perfil/${this.medicoId}`, this.perfil)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showAlert('Perfil actualizado correctamente', 'success');
          }
          this.guardando = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error guardando perfil:', error);
          this.showAlert('Error al guardar el perfil', 'error');
          this.guardando = false;
          this.cdr.detectChanges();
        }
      });
  }

  // ============================================
  // AVATAR
  // ============================================
  
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        this.showAlert('Solo se permiten imágenes', 'error');
        return;
      }
      
      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showAlert('La imagen no debe superar 5MB', 'error');
        return;
      }
      
      this.selectedFile = file;
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  subirAvatar() {
    if (!this.selectedFile) return;
    
    const formData = new FormData();
    formData.append('avatar', this.selectedFile);
    formData.append('medicoId', this.medicoId.toString());
    
    this.uploadingAvatar = true;
    this.http.post<{ success: boolean, avatarUrl: string }>
      (`${this.apiUrl}/medicos/upload-avatar`, formData)
      .subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          if (response.success && this.perfil) {
            this.perfil.avatar_url = response.avatarUrl;
            // Actualizar previewUrl con la URL completa
            this.previewUrl = `http://localhost:3000${response.avatarUrl}`;
            console.log('Avatar URL actualizado:', this.perfil.avatar_url);
            console.log('Preview URL actualizado:', this.previewUrl);
            this.showAlert('Avatar actualizado correctamente', 'success');
          }
          this.uploadingAvatar = false;
          this.selectedFile = null;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error subiendo avatar:', error);
          this.showAlert('Error al subir la imagen', 'error');
          this.uploadingAvatar = false;
          this.cdr.detectChanges();
        }
      });
  }

  // ============================================
  // WHATSAPP
  // ============================================
  
  conectarWhatsApp() {
    this.mostrarQR = true;
    this.qrCode = null;
    this.whatsappStatus = 'Generando QR...';
    
    // Intentar obtener el QR, si no está listo, reintentar
    this.intentarObtenerQR(0);
  }

  private intentarObtenerQR(intento: number) {
    if (intento > 10) {
      this.whatsappStatus = 'Error: No se pudo generar el QR';
      this.showAlert('No se pudo conectar WhatsApp. Intenta de nuevo.', 'error');
      this.mostrarQR = false;
      return;
    }

    this.http.get<{ success: boolean, qr?: string, status?: string }>
      (`${this.apiUrl}/medicos/${this.medicoId}/whatsapp/connect`)
      .subscribe({
        next: (response) => {
          if (response.qr) {
            this.qrCode = response.qr;
            this.whatsappStatus = 'Escanea el código QR con WhatsApp';
            this.verificarEstadoWhatsApp();
          } else if (response.status === 'connected') {
            this.whatsappStatus = 'Conectado';
            if (this.perfil) {
              this.perfil.whatsapp_connected = true;
            }
            this.mostrarQR = false;
          } else if (response.status === 'initializing') {
            // Reintentar después de 2 segundos
            this.whatsappStatus = 'Inicializando WhatsApp...';
            setTimeout(() => {
              this.intentarObtenerQR(intento + 1);
            }, 2000);
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error conectando WhatsApp:', error);
          this.whatsappStatus = 'Error al generar QR';
          this.showAlert('No se pudo conectar WhatsApp', 'error');
          this.mostrarQR = false;
          this.cdr.detectChanges();
        }
      });
  }

  verificarEstadoWhatsApp() {
    // Limpiar interval anterior si existe
    if (this.whatsappInterval) {
      clearInterval(this.whatsappInterval);
    }
    
    // Polling cada 3 segundos
    this.whatsappInterval = setInterval(() => {
      this.http.get<{ success: boolean, connected: boolean }>
        (`${this.apiUrl}/medicos/${this.medicoId}/whatsapp/status`)
        .subscribe({
          next: (response) => {
            if (response.connected) {
              this.whatsappStatus = 'Conectado';
              this.qrCode = null;
              if (this.perfil) {
                this.perfil.whatsapp_connected = true;
              }
              // ✅ DETENER EL POLLING
              if (this.whatsappInterval) {
                clearInterval(this.whatsappInterval);
                this.whatsappInterval = null;
              }
              this.showAlert('WhatsApp conectado correctamente', 'success');
              setTimeout(() => {
                this.mostrarQR = false;
              }, 2000);
            }
          },
          error: () => {
            if (this.whatsappInterval) {
              clearInterval(this.whatsappInterval);
              this.whatsappInterval = null;
            }
          }
        });
    }, 3000);
    
    // Timeout después de 2 minutos
    setTimeout(() => {
      if (this.whatsappInterval) {
        clearInterval(this.whatsappInterval);
        this.whatsappInterval = null;
      }
    }, 120000);
  }

  desconectarWhatsApp() {
    this.openConfirmModal(
      '¿Deseas desconectar WhatsApp? Deberás escanear el QR nuevamente.',
      () => {
        this.http.post<{ success: boolean }>
          (`${this.apiUrl}/medicos/${this.medicoId}/whatsapp/disconnect`, {})
          .subscribe({
            next: (response) => {
              if (response.success && this.perfil) {
                this.perfil.whatsapp_connected = false;
                this.whatsappStatus = 'Desconectado';
                this.showAlert('WhatsApp desconectado correctamente', 'success');
              }
              this.cdr.detectChanges();
            },
            error: (error) => {
              console.error('Error desconectando WhatsApp:', error);
              this.showAlert('No se pudo desconectar WhatsApp', 'error');
              this.cdr.detectChanges();
            }
          });
      }
    );
  }

  // ============================================
  // GOOGLE CALENDAR
  // ============================================
  
  conectarGoogleCalendar() {
    console.log('🔵 Botón de Google Calendar presionado');
    console.log('🔵 URL a llamar:', `${this.apiUrl}/medicos/${this.medicoId}/google-calendar/auth`);
    
    this.http.get<{ success: boolean, authUrl: string }>
      (`${this.apiUrl}/medicos/${this.medicoId}/google-calendar/auth`)
      .subscribe({
        next: (response) => {
          console.log('🔵 Respuesta recibida:', response);
          if (response.authUrl) {
            console.log('🔵 Abriendo ventana con URL:', response.authUrl);
            // Abrir en nueva ventana
            window.open(response.authUrl, '_blank', 'width=600,height=700');
            
            // Escuchar cuando se complete
            this.verificarEstadoCalendar();
          } else {
            console.error('⚠️ No se recibió authUrl en la respuesta');
          }
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error obteniendo URL de auth:', error);
          this.showAlert('No se pudo iniciar la autenticación', 'error');
          this.cdr.detectChanges();
        }
      });
  }

  verificarEstadoCalendar() {
    // Limpiar interval anterior si existe
    if (this.calendarInterval) {
      clearInterval(this.calendarInterval);
    }
    
    this.calendarInterval = setInterval(() => {
      // Llamar al endpoint de perfil solo para verificar el estado
      this.http.get<{ success: boolean, data: MedicoPerfil }>
        (`${this.apiUrl}/medicos/perfil/${this.medicoId}`)
        .subscribe({
          next: (response) => {
            if (response.data.google_calendar_connected) {
              // ✅ ACTUALIZAR SOLO LOS DATOS DE CALENDAR
              if (this.perfil) {
                this.perfil.google_calendar_connected = response.data.google_calendar_connected;
                this.perfil.google_calendar_email = response.data.google_calendar_email;
              }
              // ✅ DETENER EL POLLING
              if (this.calendarInterval) {
                clearInterval(this.calendarInterval);
                this.calendarInterval = null;
              }
              this.showAlert('Google Calendar conectado correctamente', 'success');
            }
            this.cdr.detectChanges();
          },
          error: () => {
            if (this.calendarInterval) {
              clearInterval(this.calendarInterval);
              this.calendarInterval = null;
            }
            this.cdr.detectChanges();
          }
        });
    }, 3000);
    
    // Timeout 5 minutos
    setTimeout(() => {
      if (this.calendarInterval) {
        clearInterval(this.calendarInterval);
        this.calendarInterval = null;
      }
    }, 300000);
  }

  desconectarGoogleCalendar() {
    this.openConfirmModal(
      '¿Deseas desconectar Google Calendar?',
      () => {
        this.http.post<{ success: boolean }>
          (`${this.apiUrl}/medicos/${this.medicoId}/google-calendar/disconnect`, {})
          .subscribe({
            next: (response) => {
              if (response.success && this.perfil) {
                this.perfil.google_calendar_connected = false;
                this.perfil.google_calendar_email = null;
                this.showAlert('Google Calendar desconectado correctamente', 'success');
              }
              this.cdr.detectChanges();
            },
            error: (error) => {
              console.error('Error desconectando Calendar:', error);
              this.showAlert('No se pudo desconectar Google Calendar', 'error');
              this.cdr.detectChanges();
            }
          });
      }
    );
  }
}
