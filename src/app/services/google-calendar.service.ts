import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private apiUrl = 'http://localhost:3000/api/google-calendar';
  private http = inject(HttpClient);

  // Verificar si está autenticado
  checkAuthStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/status`);
  }

  // Obtener URL de autenticación
  getAuthUrl(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/url`);
  }

  // Agregar evento al calendario
  addEvent(citaId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/events`, { citaId });
  }

  // Eliminar evento del calendario
  deleteEvent(citaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/events/${citaId}`);
  }

  // Iniciar proceso de autenticación
  authenticate() {
    this.getAuthUrl().subscribe({
      next: (response) => {
        // Abrir ventana de autenticación
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        window.open(
          response.authUrl,
          'Google Calendar Auth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      },
      error: (error) => {
        console.error('Error obteniendo URL de autenticación:', error);
        alert('Error al iniciar autenticación con Google Calendar');
      }
    });
  }
}
