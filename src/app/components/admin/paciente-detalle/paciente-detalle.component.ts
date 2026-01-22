import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PacientesService, PacienteCompleto } from '../../../services/pacientes.service';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';

@Component({
  selector: 'app-paciente-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePicker],
  providers: [MessageService],
  templateUrl: './paciente-detalle.component.html',
  styleUrls: ['./paciente-detalle.component.css']
})
export class PacienteDetalleComponent implements OnInit {
  pacienteId: number = 0;
  datosCompletos: PacienteCompleto | null = null;
  cargando: boolean = false;
  
  // Tabs
  tabActiva: string = 'general';
  
  // Modals
  mostrarModalHistorial: boolean = false;
  mostrarModalAntecedente: boolean = false;
  mostrarModalNota: boolean = false;
  mostrarModalDocumento: boolean = false;
  mostrarModalSignos: boolean = false;
  mostrarModalEtiqueta: boolean = false;
  
  // Formularios
  nuevoHistorial: any = {};
  nuevoAntecedente: any = {};
  nuevaNota: any = {};
  nuevosSignos: any = {};
  nuevaEtiqueta: any = { color: '#667eea' };
  archivoSeleccionado: File | null = null;
  tipoDocumento: string = 'estudio';
  descripcionDocumento: string = '';

  // Colores predefinidos para etiquetas
  coloresPredefinidos = [
    { label: 'Rojo', value: '#ef4444' },
    { label: 'Naranja', value: '#f97316' },
    { label: 'Amarillo', value: '#eab308' },
    { label: 'Verde', value: '#22c55e' },
    { label: 'Azul', value: '#3b82f6' },
    { label: 'Índigo', value: '#6366f1' },
    { label: 'Púrpura', value: '#8b5cf6' },
    { label: 'Rosa', value: '#ec4899' },
    { label: 'Gris', value: '#6b7280' },
    { label: 'Negro', value: '#1f2937' }
  ];

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pacientesService = inject(PacientesService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.pacienteId = +params['id'];
      this.cargarDatos();
    });
  }

  cargarDatos() {
    this.cargando = true;
    this.pacientesService.getPacienteCompleto(this.pacienteId).subscribe({
      next: (response) => {
        if (response.success) {
          this.datosCompletos = response.data;
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarTab(tab: string) {
    this.tabActiva = tab;
  }

  // Historial Médico
  abrirModalHistorial() {
    this.nuevoHistorial = {
      paciente_id: this.pacienteId,
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'consulta',
      titulo: '',
      descripcion: '',
      diagnostico: '',
      tratamiento: '',
      medicamentos: '',
      observaciones: ''
    };
    this.mostrarModalHistorial = true;
  }

  guardarHistorial() {
    this.pacientesService.agregarHistorial(this.nuevoHistorial).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarDatos();
          this.mostrarModalHistorial = false;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  // Antecedentes
  abrirModalAntecedente() {
    this.nuevoAntecedente = {
      paciente_id: this.pacienteId,
      categoria: 'personales',
      condicion: '',
      descripcion: '',
      fecha_diagnostico: '',
      estado: 'activo',
      tratamiento_actual: '',
      notas: ''
    };
    this.mostrarModalAntecedente = true;
  }

  guardarAntecedente() {
    this.pacientesService.agregarAntecedente(this.nuevoAntecedente).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarDatos();
          this.mostrarModalAntecedente = false;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  // Documentos
  abrirModalDocumento() {
    this.archivoSeleccionado = null;
    this.tipoDocumento = 'estudio';
    this.descripcionDocumento = '';
    this.mostrarModalDocumento = true;
  }

  onFileSelected(event: any) {
    this.archivoSeleccionado = event.target.files[0];
  }

  subirDocumento() {
    if (!this.archivoSeleccionado) {
      alert('Selecciona un archivo');
      return;
    }

    const formData = new FormData();
    formData.append('archivo', this.archivoSeleccionado);
    formData.append('paciente_id', this.pacienteId.toString());
    formData.append('tipo_documento', this.tipoDocumento);
    formData.append('descripcion', this.descripcionDocumento);
    formData.append('fecha_documento', new Date().toISOString().split('T')[0]);

    this.pacientesService.subirDocumento(formData).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarDatos();
          this.mostrarModalDocumento = false;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  descargarDocumento(ruta: string, nombre: string) {
    window.open(`http://localhost:3000/${ruta}`, '_blank');
  }

  // Notas Clínicas
  abrirModalNota() {
    this.nuevaNota = {
      paciente_id: this.pacienteId,
      tipo_nota: 'evolucion',
      titulo: '',
      contenido: '',
      importante: false,
      privada: false
    };
    this.mostrarModalNota = true;
  }

  guardarNota() {
    this.pacientesService.agregarNota(this.nuevaNota).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarDatos();
          this.mostrarModalNota = false;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  // Signos Vitales
  abrirModalSignos() {
    this.nuevosSignos = {
      paciente_id: this.pacienteId,
      peso: null,
      altura: null,
      temperatura: null,
      presion_sistolica: null,
      presion_diastolica: null,
      frecuencia_cardiaca: null,
      frecuencia_respiratoria: null,
      saturacion_oxigeno: null,
      glucosa: null,
      notas: ''
    };
    this.mostrarModalSignos = true;
  }

  guardarSignos() {
    this.pacientesService.registrarSignosVitales(this.nuevosSignos).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarDatos();
          this.mostrarModalSignos = false;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  calcularIMC(): string {
    if (this.nuevosSignos.peso && this.nuevosSignos.altura) {
      const imc = this.nuevosSignos.peso / ((this.nuevosSignos.altura / 100) ** 2);
      return imc.toFixed(2);
    }
    return '—';
  }

  // Etiquetas
  abrirModalEtiqueta() {
    this.nuevaEtiqueta = { etiqueta: '', color: '#667eea' };
    this.mostrarModalEtiqueta = true;
  }

  agregarEtiqueta() {
    this.pacientesService.gestionarEtiqueta({
      paciente_id: this.pacienteId,
      etiqueta: this.nuevaEtiqueta.etiqueta,
      color: this.nuevaEtiqueta.color,
      accion: 'agregar'
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarDatos();
          this.mostrarModalEtiqueta = false;
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  quitarEtiqueta(etiqueta: string) {
    this.pacientesService.gestionarEtiqueta({
      paciente_id: this.pacienteId,
      etiqueta: etiqueta,
      accion: 'quitar'
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.cargarDatos();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error:', error);
        this.cdr.detectChanges();
      }
    });
  }

  // Helpers
  getEdad(): number {
    if (!this.datosCompletos?.paciente.fecha_nacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(this.datosCompletos.paciente.fecha_nacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }

  getEstatusColor(estatus?: string): string {
    switch (estatus) {
      case 'activo': return 'bg-green-100 text-green-800';
      case 'seguimiento': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-blue-100 text-blue-800';
      case 'controlado': return 'bg-blue-100 text-blue-800';
      case 'resuelto': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getTipoIcon(tipo: string): string {
    const icons: any = {
      'consulta': '🩺',
      'diagnostico': '📋',
      'procedimiento': '⚕️',
      'hospitalizacion': '🏥',
      'emergencia': '🚨',
      'personales': '👤',
      'familiares': '👨‍👩‍👧',
      'alergias': '⚠️',
      'cirugias': '🔪',
      'cronico': '💊'
    };
    return icons[tipo] || '📄';
  }

  // Método para filtrar antecedentes por categoría
  getAntecedentesPorCategoria(categoria: string): any[] {
    if (!this.datosCompletos || !this.datosCompletos.antecedentes) {
      return [];
    }
    return this.datosCompletos.antecedentes.filter(a => a.categoria === categoria);
  }

  // Métodos para cerrar modales
  cerrarModalHistorial() {
    this.mostrarModalHistorial = false;
  }

  cerrarModalAntecedente() {
    this.mostrarModalAntecedente = false;
  }

  cerrarModalDocumento() {
    this.mostrarModalDocumento = false;
  }

  cerrarModalNota() {
    this.mostrarModalNota = false;
  }

  cerrarModalSignos() {
    this.mostrarModalSignos = false;
  }

  cerrarModalEtiqueta() {
    this.mostrarModalEtiqueta = false;
  }

  volver() {
    this.router.navigate(['/admin/pacientes']);
  }
}
