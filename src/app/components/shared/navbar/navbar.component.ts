import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NotificacionesBellComponent } from '../notificaciones-bell/notificaciones-bell.component';
import { environment } from '../../../../environments/environment';

interface Usuario {
  id_usuario?: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  rol?: string;
  avatar_url?: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificacionesBellComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  currentUser: Usuario | null = null;
  avatarUrl: string | null = null;
  
  private http = inject(HttpClient);
  private router = inject(Router);

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      this.currentUser = JSON.parse(userStr);
      
      // Cargar avatar del perfil del mÃ©dico
      if (this.currentUser?.id_usuario) {
        this.http.get<any>(`${environment.apiUrl}/medicos/perfil/${this.currentUser.id_usuario}`)
          .subscribe({
            next: (response) => {
              if (response.success && response.data?.avatar_url) {
                this.avatarUrl = response.data.avatar_url;
              }
            },
            error: (err) => console.error('Error al cargar avatar:', err)
          });
      }
    }
  }

  logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.router.navigate(['/admin/login']);
  }

  goToProfile() {
    this.router.navigate(['/admin/perfil']);
  }

  get isSuperAdmin(): boolean {
    return this.currentUser?.rol === 'superadmin';
  }

  get isDoctor(): boolean {
    return this.currentUser?.rol === 'doctor' || this.currentUser?.rol === 'superadmin';
  }
}
