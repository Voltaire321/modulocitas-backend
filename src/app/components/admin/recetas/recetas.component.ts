import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { RecetasService } from '../../../services/recetas.service';
import { CitasService } from '../../../services/citas.service';
import { AuthService } from '../../../services/auth.service';
import { RecetaMedica, MedicamentoReceta, Cita, UsuarioAdmin } from '../../../models/citas.model';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './recetas.component.html',
  styleUrls: ['./recetas.component.css']
})
export class RecetasComponent implements OnInit {
  currentUser: UsuarioAdmin | null = null;
  recetas: RecetaMedica[] = [];
  citasCompletadas: Cita[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  mostrarFormulario = false;
  recetaActual: any = {
    cita_id: 0,
    diagnostico: '',
    indicaciones: '',
    vigencia_dias: 30,
    medicamentos: []
  };

  nuevoMedicamento: MedicamentoReceta = {
    medicamento: '',
    presentacion: '',
    dosis: '',
    frecuencia: '',
    duracion: '',
    cantidad: '',
    via_administracion: 'oral',
    indicaciones_especiales: ''
  };

  private recetasService = inject(RecetasService);
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

    if (!this.currentUser.medico_id) {
      this.error = 'No tienes un médico asociado';
      return;
    }

    this.cargarRecetas();
    this.cargarCitasCompletadas();
  }

  cargarRecetas() {
    if (!this.currentUser?.medico_id) return;

    this.loading = true;
    this.error = null;

    this.recetasService.getRecetasByMedico(this.currentUser.medico_id).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.recetas = response.data || [];
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error al cargar recetas:', error);
        this.error = 'Error al cargar las recetas';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarCitasCompletadas() {
    if (!this.currentUser?.medico_id) return;

    const filters = {
      medico_id: this.currentUser.medico_id,
      estado: 'completada'
    };

    this.citasService.getAllCitas(filters).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.citasCompletadas = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error al cargar citas:', error);
      }
    });
  }

  abrirFormulario() {
    this.mostrarFormulario = true;
    this.recetaActual = {
      cita_id: 0,
      medico_id: this.currentUser!.medico_id,
      paciente_id: 0,
      diagnostico: '',
      indicaciones: '',
      vigencia_dias: 30,
      medicamentos: []
    };
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
  }

  onCitaChange() {
    const cita = this.citasCompletadas.find(c => c.id === this.recetaActual.cita_id);
    if (cita) {
      this.recetaActual.paciente_id = cita.paciente_id;
    }
  }

  agregarMedicamento() {
    if (!this.nuevoMedicamento.medicamento || !this.nuevoMedicamento.dosis || 
        !this.nuevoMedicamento.frecuencia || !this.nuevoMedicamento.duracion) {
      this.error = 'Complete los campos requeridos del medicamento';
      return;
    }

    this.recetaActual.medicamentos.push({ ...this.nuevoMedicamento });
    
    this.nuevoMedicamento = {
      medicamento: '',
      presentacion: '',
      dosis: '',
      frecuencia: '',
      duracion: '',
      cantidad: '',
      via_administracion: 'oral',
      indicaciones_especiales: ''
    };
  }

  eliminarMedicamento(index: number) {
    this.recetaActual.medicamentos.splice(index, 1);
  }

  guardarReceta() {
    this.error = null;
    this.successMessage = null;

    if (!this.recetaActual.cita_id || !this.recetaActual.diagnostico) {
      this.error = 'Complete todos los campos requeridos';
      return;
    }

    if (this.recetaActual.medicamentos.length === 0) {
      this.error = 'Debe agregar al menos un medicamento';
      return;
    }

    this.loading = true;

    this.recetasService.createReceta(this.recetaActual).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.successMessage = `Receta creada exitosamente. Folio: ${response.data?.folio}`;
          this.cargarRecetas();
          this.cerrarFormulario();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error al crear receta:', error);
        this.error = 'Error al crear la receta';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  descargarPDF(id: number) {
    this.loading = true;
    this.error = null;
    
    this.recetasService.downloadPDF(id).subscribe({
      next: (blob: Blob) => {
        // Crear un link temporal y descarg el archivo
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receta-${id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        this.successMessage = 'PDF descargado exitosamente';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error al descargar PDF:', error);
        this.error = 'Error al generar el PDF';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  enviarPorWhatsApp(receta: RecetaMedica) {
    if (confirm(`¿Enviar receta por WhatsApp al paciente ${receta.paciente_nombre}?`)) {
      this.loading = true;
      this.error = null;

      this.recetasService.sendByWhatsApp(receta.id!).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.successMessage = 'Receta enviada por WhatsApp exitosamente';
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error al enviar receta:', error);
          this.error = 'Error al enviar la receta por WhatsApp';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  volverADashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/admin/login']);
  }
}
