import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PacientesService, Paciente } from '../../../services/pacientes.service';
import { MessageService } from 'primeng/api';
import { FloatLabel } from 'primeng/floatlabel';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, FloatLabel, DatePicker, Select, InputText, Toast, NavbarComponent],
  providers: [MessageService],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css']
})
export class PacientesComponent implements OnInit {
  pacientes: Paciente[] = [];
  pacientesFiltrados: Paciente[] = [];
  cargando: boolean = false;
  busqueda: string = '';
  estatusSeleccionado: string = '';
  
  // Modal de nuevo paciente
  mostrarModal: boolean = false;
  pacienteActual: Paciente = this.nuevoPacienteVacio();

  // Menú de estatus
  pacienteMenuEstatus: number | null = null;

  // Opciones para dropdown
  generoOptions = [
    { label: 'Masculino', value: 'masculino' },
    { label: 'Femenino', value: 'femenino' },
    { label: 'Otro', value: 'otro' }
  ];

  estatusOptions = [
    { label: '✓ Activo', value: 'activo' },
    { label: '👁 En Seguimiento', value: 'seguimiento' },
    { label: '↑ Alta Médica', value: 'alta' },
    { label: '✗ Inactivo', value: 'inactivo' }
  ];

  maxDate = new Date();

  // Estadísticas
  estadisticas = {
    total: 0,
    activos: 0,
    seguimiento: 0,
    alta: 0
  };

  private pacientesService = inject(PacientesService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.estatus-dropdown-wrapper')) {
      this.pacienteMenuEstatus = null;
    }
  }

  ngOnInit() {
    this.cargarPacientes();
  }

  cargarPacientes() {
    this.cargando = true;
    
    this.pacientesService.getPacientes().subscribe({
      next: (response) => {
        if (response.success) {
          this.pacientes = response.data;
          this.pacientesFiltrados = this.pacientes;
          this.calcularEstadisticas();
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar pacientes:', error);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  calcularEstadisticas() {
    this.estadisticas.total = this.pacientes.length;
    this.estadisticas.activos = this.pacientes.filter(p => p.estatus === 'activo').length;
    this.estadisticas.seguimiento = this.pacientes.filter(p => p.estatus === 'seguimiento').length;
    this.estadisticas.alta = this.pacientes.filter(p => p.estatus === 'alta').length;
  }

  buscarPacientes() {
    if (!this.busqueda && !this.estatusSeleccionado) {
      this.pacientesFiltrados = this.pacientes;
      return;
    }

    this.pacientesFiltrados = this.pacientes.filter(paciente => {
      const coincideBusqueda = !this.busqueda || 
        `${paciente.nombre} ${paciente.apellido}`.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        paciente.email?.toLowerCase().includes(this.busqueda.toLowerCase()) ||
        paciente.telefono?.includes(this.busqueda);

      const coincideEstatus = !this.estatusSeleccionado || paciente.estatus === this.estatusSeleccionado;

      return coincideBusqueda && coincideEstatus;
    });
  }

  abrirModal() {
    this.pacienteActual = this.nuevoPacienteVacio();
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.pacienteActual = this.nuevoPacienteVacio();
  }

  guardarPaciente() {
    if (!this.validarPaciente()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    this.cargando = true;

    this.pacientesService.crearPaciente(this.pacienteActual).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarPacientes();
          this.cerrarModal();
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al crear paciente:', error);
        alert('Error al crear paciente');
        this.cargando = false;
      }
    });
  }

  verDetalles(paciente: Paciente) {
    this.router.navigate(['/admin/pacientes', paciente.id]);
  }

  validarPaciente(): boolean {
    return !!(this.pacienteActual.nombre && 
              this.pacienteActual.apellido && 
              this.pacienteActual.email);
  }

  nuevoPacienteVacio(): Paciente {
    return {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      estatus: 'activo'
    };
  }

  getEstatusColor(estatus?: string): string {
    switch (estatus) {
      case 'activo': return 'bg-green-100 text-green-800';
      case 'seguimiento': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-blue-100 text-blue-800';
      case 'inactivo': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getEstatusIcon(estatus?: string): string {
    switch (estatus) {
      case 'activo': return '✓';
      case 'seguimiento': return '👁';
      case 'alta': return '↑';
      case 'inactivo': return '✗';
      default: return '•';
    }
  }

  getEstatusBadgeClass(estatus?: string): string {
    switch (estatus) {
      case 'activo': return 'badge-activo';
      case 'seguimiento': return 'badge-seguimiento';
      case 'alta': return 'badge-alta';
      case 'inactivo': return 'badge-inactivo';
      default: return 'badge-inactivo';
    }
  }

  getEstatusTexto(estatus?: string): string {
    switch (estatus) {
      case 'activo': return '✓ Activo';
      case 'seguimiento': return '👁 En Seguimiento';
      case 'alta': return '↑ Alta Médica';
      case 'inactivo': return '✗ Inactivo';
      default: return 'N/A';
    }
  }

  mostrarMenuEstatus(paciente: Paciente) {
    if (this.pacienteMenuEstatus === paciente.id) {
      this.pacienteMenuEstatus = null;
    } else {
      this.pacienteMenuEstatus = paciente.id || null;
    }
  }

  seleccionarEstatus(paciente: Paciente, nuevoEstatus: string) {
    paciente.estatus = nuevoEstatus;
    this.pacienteMenuEstatus = null;
    this.cambiarEstatus(paciente);
  }

  cambiarEstatus(paciente: Paciente) {
    if (!paciente.id) return;

    this.pacientesService.actualizarPaciente(paciente.id, { estatus: paciente.estatus }).subscribe({
      next: (response) => {
        if (response.success) {
          this.messageService.add({
            severity: 'success',
            summary: 'Estatus actualizado',
            detail: `El estatus del paciente ha sido actualizado a: ${this.getEstatusTexto(paciente.estatus)}`
          });
          this.calcularEstadisticas();
        }
      },
      error: (error) => {
        console.error('Error al actualizar estatus:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el estatus del paciente'
        });
        this.cargarPacientes();
      }
    });
  }
}

