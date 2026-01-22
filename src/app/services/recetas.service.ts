import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecetaMedica, ApiResponse } from '../models/citas.model';

@Injectable({
  providedIn: 'root'
})
export class RecetasService {
  private apiUrl = 'http://localhost:3000/api/recetas';
  private http = inject(HttpClient);

  createReceta(recetaData: any): Observable<ApiResponse<{ id: number; folio: string }>> {
    return this.http.post<ApiResponse<{ id: number; folio: string }>>(this.apiUrl, recetaData);
  }

  getRecetasByMedico(medicoId: number, filters?: any): Observable<ApiResponse<RecetaMedica[]>> {
    let url = `${this.apiUrl}/medico/${medicoId}`;
    const params = new URLSearchParams();
    
    if (filters?.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
    if (filters?.fecha_fin) params.append('fecha_fin', filters.fecha_fin);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.http.get<ApiResponse<RecetaMedica[]>>(url);
  }

  getRecetaById(id: number): Observable<ApiResponse<RecetaMedica>> {
    return this.http.get<ApiResponse<RecetaMedica>>(`${this.apiUrl}/${id}`);
  }

  getRecetaByFolio(folio: string): Observable<ApiResponse<RecetaMedica>> {
    return this.http.get<ApiResponse<RecetaMedica>>(`${this.apiUrl}/folio/${folio}`);
  }

  downloadPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { 
      responseType: 'blob'
    });
  }

  sendByWhatsApp(id: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/whatsapp`, {});
  }

  sendByEmail(id: number, email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${id}/enviar`, { email });
  }
}
