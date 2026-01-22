import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { UsuarioAdmin } from '../../../models/citas.model';

interface Horario {
  id?: number;
  medico_id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_cita_minutos: number;
  tiempo_entre_citas_minutos: number;
  activo?: boolean;
}

@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './horarios.component.html',
  styleUrls: ['./horarios.component.css']
})
export class HorariosComponent implements OnInit {
  currentUser: UsuarioAdmin | null = null;
  horarios: Horario[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  diasSemana = [
    { value: 'lunes', label: 'Lunes' },
    { value: 'martes', label: 'Martes' },
    { value: 'miercoles', label: 'Miércoles' },
    { value: 'jueves', label: 'Jueves' },
    { value: 'viernes', label: 'Viernes' },
    { value: 'sabado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' }
  ];

  nuevoHorario: Horario = {
    medico_id: 0,
    dia_semana: 'lunes',
    hora_inicio: '09:00',
    hora_fin: '17:00',
    duracion_cita_minutos: 30,
    tiempo_entre_citas_minutos: 0
  };

  mostrarFormulario = false;
  horarioEditando: Horario | null = null;

  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/admin/login']);
      return;
    }

    if (!this.currentUser.medico_id) {
      this.error = 'No tienes un médico asociado';
      return;
    }

    this.nuevoHorario.medico_id = this.currentUser.medico_id;
    this.cargarHorarios();
  }

  cargarHorarios() {
    if (!this.currentUser?.medico_id) return;

    this.loading = true;
    this.error = null;

    this.http.get<{ success: boolean; data: Horario[] }>(
      `${environment.apiUrl}/horarios/medico/${this.currentUser.medico_id}`
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.horarios = response.data;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar horarios:', error);
        this.error = 'Error al cargar los horarios';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirFormulario() {
    this.mostrarFormulario = true;
    this.horarioEditando = null;
    this.nuevoHorario = {
      medico_id: this.currentUser!.medico_id!,
      dia_semana: 'lunes',
      hora_inicio: '09:00',
      hora_fin: '17:00',
      duracion_cita_minutos: 30,
      tiempo_entre_citas_minutos: 0
    };
  }

  editarHorario(horario: Horario) {
    this.mostrarFormulario = true;
    this.horarioEditando = horario;
    this.nuevoHorario = { ...horario };
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.horarioEditando = null;
  }

  guardarHorario() {
    this.error = null;
    this.successMessage = null;

    // Validaciones
    if (this.nuevoHorario.hora_inicio >= this.nuevoHorario.hora_fin) {
      this.error = 'La hora de inicio debe ser menor que la hora de fin';
      return;
    }

    if (this.nuevoHorario.duracion_cita_minutos < 10 || this.nuevoHorario.duracion_cita_minutos > 180) {
      this.error = 'La duración de cita debe estar entre 10 y 180 minutos';
      return;
    }

    this.loading = true;

    if (this.horarioEditando && this.horarioEditando.id) {
      // Actualizar
      this.http.put<{ success: boolean; message: string }>(
        `${environment.apiUrl}/horarios/${this.horarioEditando.id}`,
        this.nuevoHorario
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Horario actualizado exitosamente';
            this.cargarHorarios();
            this.cerrarFormulario();
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al actualizar horario:', error);
          this.error = 'Error al actualizar el horario';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      // Crear nuevo
      this.http.post<{ success: boolean; message: string }>(
        `${environment.apiUrl}/horarios`,
        this.nuevoHorario
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Horario creado exitosamente';
            this.cargarHorarios();
            this.cerrarFormulario();
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error al crear horario:', error);
          this.error = 'Error al crear el horario';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  eliminarHorario(horario: Horario) {
    if (!confirm('¿Estás seguro de eliminar este horario?')) return;

    this.loading = true;
    this.error = null;

    this.http.delete<{ success: boolean; message: string }>(
      `${environment.apiUrl}/horarios/${horario.id}`
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Horario eliminado exitosamente';
          this.cargarHorarios();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al eliminar horario:', error);
        this.error = 'Error al eliminar el horario';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleActivo(horario: Horario) {
    const nuevoEstado = !horario.activo;
    
    this.http.put<{ success: boolean; message: string }>(
      `${environment.apiUrl}/horarios/${horario.id}`,
      { ...horario, activo: nuevoEstado }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          horario.activo = nuevoEstado;
          this.successMessage = `Horario ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cambiar estado:', error);
        this.error = 'Error al cambiar el estado del horario';
        this.cdr.detectChanges();
      }
    });
  }

  getDiaLabel(dia: string): string {
    return this.diasSemana.find(d => d.value === dia)?.label || dia;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
