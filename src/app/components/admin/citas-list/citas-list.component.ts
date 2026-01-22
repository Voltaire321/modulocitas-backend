import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';
import { Cita, UsuarioAdmin } from '../../../models/citas.model';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Button } from 'primeng/button';
import { Badge } from 'primeng/badge';
import { DatePicker } from 'primeng/datepicker';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-citas-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePicker, NavbarComponent],
  providers: [MessageService],
  templateUrl: './citas-list.component.html',
  styleUrls: ['./citas-list.component.css']
})
export class CitasListComponent implements OnInit {
  currentUser: UsuarioAdmin | null = null;
  citas: Cita[] = [];
  citasFiltradas: Cita[] = [];
  loading = false;
  error: string | null = null;
  
  // Filtros
  filtroEstado: string = '';
  filtroFecha: string = '';
  
  // Modal
  citaSeleccionada: Cita | null = null;
  mostrarModal = false;
  accionActual: 'confirmar' | 'rechazar' | 'cancelar' | null = null;
  notasAdmin = '';

  private citasService = inject(CitasService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/admin/login']);
      return;
    }

    this.cargarCitas();
  }

  cargarCitas() {
    if (!this.currentUser?.medico_id) return;

    this.loading = true;
    this.error = null;

    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    const filters = {
      medico_id: this.currentUser.medico_id,
      fecha_inicio: hace30Dias.toISOString().split('T')[0],
      fecha_fin: this.getFechaFutura(60)
    };

    this.citasService.getAllCitas(filters).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.citas = response.data;
          this.aplicarFiltros();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar citas:', error);
        this.error = 'Error al cargar las citas';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltros() {
    let resultado = [...this.citas];

    if (this.filtroEstado) {
      resultado = resultado.filter(c => c.estado === this.filtroEstado);
    }

    if (this.filtroFecha) {
      resultado = resultado.filter(c => c.fecha === this.filtroFecha);
    }

    this.citasFiltradas = resultado.sort((a, b) => {
      const fechaA = new Date(a.fecha + 'T' + a.hora_inicio);
      const fechaB = new Date(b.fecha + 'T' + b.hora_inicio);
      return fechaB.getTime() - fechaA.getTime();
    });
  }

  abrirModal(cita: Cita, accion: 'confirmar' | 'rechazar' | 'cancelar') {
    this.citaSeleccionada = cita;
    this.accionActual = accion;
    this.mostrarModal = true;
    this.notasAdmin = '';
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.citaSeleccionada = null;
    this.accionActual = null;
    this.notasAdmin = '';
  }

  confirmarAccion() {
    if (!this.citaSeleccionada || !this.accionActual) return;

    let nuevoEstado = '';
    switch (this.accionActual) {
      case 'confirmar':
        nuevoEstado = 'confirmada';
        break;
      case 'rechazar':
        nuevoEstado = 'rechazada';
        break;
      case 'cancelar':
        nuevoEstado = 'cancelada';
        break;
    }

    this.loading = true;
    this.citasService.updateCitaEstado(
      this.citaSeleccionada.id,
      nuevoEstado,
      this.notasAdmin,
      this.notasAdmin
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarCitas();
          this.cerrarModal();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al actualizar cita:', error);
        this.error = 'Error al actualizar la cita';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'pendiente': 'badge-pending',
      'confirmada': 'badge-confirmed',
      'cancelada': 'badge-cancelled',
      'rechazada': 'badge-rejected'
    };
    return `badge ${classes[estado] || 'badge-pending'}`;
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return 'Sin fecha';
    
    // Si fecha ya viene como Date object desde MySQL
    let dateObj: Date;
    if (fecha instanceof Date) {
      dateObj = fecha;
    } else {
      // Si es string, convertir correctamente
      // Normalizar formato de fecha
      const fechaStr = fecha.toString().split('T')[0];
      dateObj = new Date(fechaStr + 'T12:00:00'); // Usar mediodía para evitar problemas de zona horaria
    }
    
    // Verificar que la fecha sea válida
    if (isNaN(dateObj.getTime())) {
      return 'Fecha inválida';
    }
    
    return dateObj.toLocaleDateString('es-MX', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  formatearHora(hora: string): string {
    return hora.substring(0, 5);
  }

  getFechaFutura(dias: number): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().split('T')[0];
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
