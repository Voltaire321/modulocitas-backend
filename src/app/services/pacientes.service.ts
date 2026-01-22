import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Paciente {
  id?: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  fecha_nacimiento?: string;
  genero?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  ocupacion?: string;
  estado_civil?: string;
  tipo_sangre?: string;
  estatus?: string;
  foto_perfil?: string;
  email_secundario?: string;
  telefono_emergencia?: string;
  contacto_emergencia_nombre?: string;
  contacto_emergencia_relacion?: string;
  seguro_medico?: string;
  numero_poliza?: string;
  notas_generales?: string;
  total_citas?: number;
  ultima_cita?: string;
  etiquetas?: string;
}

export interface PacienteCompleto {
  paciente: Paciente;
  historial: any[];
  antecedentes: any[];
  documentos: any[];
  notas: any[];
  etiquetas: any[];
  signosVitales: any[];
  citas: any[];
}

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private apiUrl = `${environment.apiUrl}/pacientes`;
  private http = inject(HttpClient);

  // Obtener todos los pacientes con filtros
  getPacientes(filtros?: { busqueda?: string, estatus?: string, desde?: number, limite?: number }): Observable<any> {
    let params = new HttpParams();
    
    if (filtros?.busqueda) {
      params = params.set('busqueda', filtros.busqueda);
    }
    if (filtros?.estatus) {
      params = params.set('estatus', filtros.estatus);
    }
    if (filtros?.desde !== undefined) {
      params = params.set('desde', filtros.desde.toString());
    }
    if (filtros?.limite) {
      params = params.set('limite', filtros.limite.toString());
    }

    return this.http.get<any>(this.apiUrl, { params });
  }

  // Obtener perfil completo de un paciente
  getPacienteCompleto(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Crear nuevo paciente
  crearPaciente(paciente: Paciente): Observable<any> {
    return this.http.post<any>(this.apiUrl, paciente);
  }

  // Actualizar paciente
  actualizarPaciente(id: number, datos: Partial<Paciente>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, datos);
  }

  // Agregar entrada al historial médico
  agregarHistorial(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/historial`, datos);
  }

  // Agregar antecedente
  agregarAntecedente(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/antecedentes`, datos);
  }

  // Subir documento
  subirDocumento(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/documentos`, formData);
  }

  // Agregar nota clínica
  agregarNota(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/notas`, datos);
  }

  // Gestionar etiquetas
  gestionarEtiqueta(datos: { paciente_id: number, etiqueta: string, color?: string, accion: 'agregar' | 'quitar' }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/etiquetas`, datos);
  }

  // Registrar signos vitales
  registrarSignosVitales(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/signos-vitales`, datos);
  }
}
