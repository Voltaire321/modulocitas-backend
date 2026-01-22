import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error: string | null = null;

  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    // Si ya está autenticado, redirigir al dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  login() {
    if (!this.username || !this.password) {
      this.error = 'Usuario y contraseña son requeridos';
      return;
    }

    this.loading = true;
    this.error = null;

    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/admin/dashboard']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error en login:', error);
        this.error = error.error?.message || 'Credenciales inválidas';
        this.loading = false;
      }
    });
  }
}
