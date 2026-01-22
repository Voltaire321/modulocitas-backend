import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Medico } from '../models/citas.model';

@Injectable({
  providedIn: 'root'
})
export class MedicosService {
  private apiUrl = `${environment.apiUrl}/medicos`;
  private http = inject(HttpClient);

  // Obtener información del médico único del sistema
  getMedicoInfo(): Observable<ApiResponse<Medico>> {
    return this.http.get<ApiResponse<Medico>>(`${this.apiUrl}/info`);
  }

  // Actualizar información del médico único
  updateMedicoInfo(medico: Partial<Medico>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/info`, medico);
  }

  // Métodos legacy mantenidos por compatibilidad (pueden ser removidos después)
  getAllMedicos(): Observable<ApiResponse<Medico[]>> {
    return this.http.get<ApiResponse<Medico[]>>(this.apiUrl);
  }

  getAllMedicosAdmin(): Observable<ApiResponse<Medico[]>> {
    return this.http.get<ApiResponse<Medico[]>>(`${this.apiUrl}/admin/all`);
  }

  getMedicoById(id: number): Observable<ApiResponse<Medico>> {
    return this.http.get<ApiResponse<Medico>>(`${this.apiUrl}/${id}`);
  }

  createMedico(medico: Partial<Medico>): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(this.apiUrl, medico);
  }

  createMedicoWithUser(data: any): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${this.apiUrl}/with-user`, data);
  }

  updateMedico(id: number, medico: Partial<Medico>): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, medico);
  }

  deactivateMedico(id: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}/deactivate`, {});
  }

  activateMedico(id: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${id}/activate`, {});
  }
}
