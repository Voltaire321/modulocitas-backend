import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { DashboardStats, UsuarioAdmin } from '../../../models/citas.model';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentUser: UsuarioAdmin | null = null;
  stats: DashboardStats | null = null;
  loading = false;
  avatarUrl: string | null = null;

  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/admin/login']);
      return;
    }

    this.cargarEstadisticas();
  }

  cargarEstadisticas() {
    if (!this.currentUser?.medico_id) return;

    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/admin/dashboard?medico_id=${this.currentUser.medico_id}`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.stats = response.data;
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al cargar estadísticas:', error);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
