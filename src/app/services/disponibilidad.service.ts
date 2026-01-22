import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, SlotTiempo, Disponibilidad } from '../models/citas.model';

@Injectable({
  providedIn: 'root'
})
export class DisponibilidadService {
  private apiUrl = `${environment.apiUrl}/disponibilidad`;
  private http = inject(HttpClient);

  getDisponibilidad(
    medicoId: number,
    fechaInicio: string,
    fechaFin: string
  ): Observable<ApiResponse<Disponibilidad[]>> {
    const params = new HttpParams()
      .set('medico_id', medicoId.toString())
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    return this.http.get<ApiResponse<Disponibilidad[]>>(this.apiUrl, { params });
  }

  getSlotsDelDia(medicoId: number, fecha: string): Observable<ApiResponse<SlotTiempo[]>> {
    const params = new HttpParams()
      .set('medico_id', medicoId.toString())
      .set('fecha', fecha);

    return this.http.get<ApiResponse<SlotTiempo[]>>(`${this.apiUrl}/slots`, { params });
  }
}
