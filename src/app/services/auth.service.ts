import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse, UsuarioAdmin } from '../models/citas.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<UsuarioAdmin | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Verificar si hay un token almacenado (solo en navegador)
    if (this.isBrowser) {
      const token = this.getToken();
      const userStr = localStorage.getItem('currentUser');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          this.currentUserSubject.next(user);
          // No verificar token automáticamente para evitar cierre de sesión al recargar
        } catch (e) {
          this.logout();
        }
      }
    }
  }

  login(username: string, password: string): Observable<ApiResponse<{ token: string; usuario: UsuarioAdmin }>> {
    return this.http.post<ApiResponse<{ token: string; usuario: UsuarioAdmin }>>(
      `${this.apiUrl}/login`,
      { username, password }
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setToken(response.data.token);
          this.currentUserSubject.next(response.data.usuario);
          // Guardar usuario en localStorage para persistencia
          if (this.isBrowser) {
            localStorage.setItem('currentUser', JSON.stringify(response.data.usuario));
          }
        }
      })
    );
  }

  verifyToken(): Observable<ApiResponse<UsuarioAdmin>> {
    return this.http.get<ApiResponse<UsuarioAdmin>>(`${this.apiUrl}/verify`).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.currentUserSubject.next(response.data);
        }
      })
    );
  }

  register(usuario: {
    medico_id?: number;
    username: string;
    password: string;
    nombre: string;
    apellido: string;
    email: string;
    rol?: string;
  }): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${this.apiUrl}/register`, usuario);
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    if (this.isBrowser) {
      return localStorage.getItem('token');
    }
    return null;
  }

  setToken(token: string): void {
    if (this.isBrowser) {
      localStorage.setItem('token', token);
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUserSubject.value;
  }

  getCurrentUser(): UsuarioAdmin | null {
    return this.currentUserSubject.value;
  }
}
