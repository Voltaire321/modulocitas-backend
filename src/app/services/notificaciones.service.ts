import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, interval } from 'rxjs';

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  usuario_id: number;
  usuario_tipo: string;
  cita_id?: number;
  receta_id?: number;
  leida: boolean;
  fecha_creacion: string;
  cita_info?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {
  private apiUrl = 'http://localhost:3000/api/notificaciones';
  private http = inject(HttpClient);

  getNotificaciones(usuarioId: number, usuarioTipo: string, soloNoLeidas: boolean = false): Observable<any> {
    let params = new HttpParams();
    if (soloNoLeidas) {
      params = params.set('soloNoLeidas', 'true');
    }
    return this.http.get(`${this.apiUrl}/${usuarioTipo}/${usuarioId}`, { params });
  }

  marcarComoLeida(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/leida`, {});
  }

  marcarTodasComoLeidas(usuarioId: number, usuarioTipo: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${usuarioTipo}/${usuarioId}/marcar-todas`, {});
  }

  actualizarEstadoCita(citaId: number, estado: string, motivoRechazo?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/cita/${citaId}/estado`, {
      estado,
      motivo_rechazo: motivoRechazo
    });
  }

  eliminarNotificacion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  eliminarLeidas(usuarioId: number, usuarioTipo: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${usuarioTipo}/${usuarioId}/leidas`);
  }

  eliminarTodas(usuarioId: number, usuarioTipo: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${usuarioTipo}/${usuarioId}/todas`);
  }

  // Polling para actualizar notificaciones automáticamente
  iniciarPolling(usuarioId: number, usuarioTipo: string, intervaloMs: number = 30000) {
    return interval(intervaloMs);
  }
}
