import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Cita, CrearCitaRequest } from '../models/citas.model';

@Injectable({
  providedIn: 'root'
})
export class CitasService {
  private apiUrl = `${environment.apiUrl}/citas`;
  private http = inject(HttpClient);

  getAllCitas(filters?: {
    medico_id?: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    estado?: string;
  }): Observable<ApiResponse<Cita[]>> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.medico_id) params = params.set('medico_id', filters.medico_id.toString());
      if (filters.fecha_inicio) params = params.set('fecha_inicio', filters.fecha_inicio);
      if (filters.fecha_fin) params = params.set('fecha_fin', filters.fecha_fin);
      if (filters.estado) params = params.set('estado', filters.estado);
    }

    return this.http.get<ApiResponse<Cita[]>>(this.apiUrl, { params });
  }

  getCitaById(id: number): Observable<ApiResponse<Cita>> {
    return this.http.get<ApiResponse<Cita>>(`${this.apiUrl}/${id}`);
  }

  getCitasDelDia(medicoId: number, fecha: string): Observable<ApiResponse<Cita[]>> {
    const params = new HttpParams()
      .set('medico_id', medicoId.toString())
      .set('fecha', fecha);

    return this.http.get<ApiResponse<Cita[]>>(`${this.apiUrl}/dia`, { params });
  }

  createCita(cita: CrearCitaRequest): Observable<ApiResponse<{ id: number; codigo_confirmacion: string }>> {
    return this.http.post<ApiResponse<{ id: number; codigo_confirmacion: string }>>(this.apiUrl, cita);
  }

  updateCitaEstado(
    id: number, 
    estado: string, 
    motivoCancelacion?: string, 
    notasMedico?: string
  ): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}/estado`, {
      estado,
      motivo_cancelacion: motivoCancelacion,
      notas_medico: notasMedico
    });
  }

  cancelarCita(id: number, motivoCancelacion?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/cancelar`, {
      motivo_cancelacion: motivoCancelacion
    });
  }

  getCitasByMedico(medicoId: number): Observable<ApiResponse<Cita[]>> {
    return this.http.get<ApiResponse<Cita[]>>(`${this.apiUrl}?medico_id=${medicoId}`);
  }
}
