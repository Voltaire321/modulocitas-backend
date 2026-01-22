import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { MedicosService } from '../../../services/medicos.service';
import { AuthService } from '../../../services/auth.service';
import { Medico, UsuarioAdmin } from '../../../models/citas.model';

@Component({
  selector: 'app-medicos-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './medicos-admin.component.html',
  styleUrls: ['./medicos-admin.component.css']
})
export class MedicosAdminComponent implements OnInit {
  currentUser: UsuarioAdmin | null = null;
  medicos: Medico[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  mostrarFormulario = false;
  medicoEditando: Medico | null = null;
  
  nuevoMedico: any = {
    nombre: '',
    apellido: '',
    especialidad: '',
    email: '',
    telefono: '',
    cedula_profesional: '',
    username: '',
    password: ''
  };

  private medicosService = inject(MedicosService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/admin/login']);
      return;
    }

    if (this.currentUser.rol !== 'superadmin') {
      this.error = 'No tienes permisos para acceder a esta sección';
      setTimeout(() => this.router.navigate(['/admin/dashboard']), 2000);
      return;
    }

    this.cargarMedicos();
  }

  cargarMedicos() {
    this.loading = true;
    this.error = null;

    this.medicosService.getAllMedicosAdmin().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.medicos = response.data || [];
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error al cargar médicos:', error);
        this.error = 'Error al cargar los médicos';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  abrirFormulario() {
    this.mostrarFormulario = true;
    this.medicoEditando = null;
    this.nuevoMedico = {
      nombre: '',
      apellido: '',
      especialidad: '',
      email: '',
      telefono: '',
      cedula_profesional: '',
      username: '',
      password: ''
    };
  }

  editarMedico(medico: Medico) {
    this.mostrarFormulario = true;
    this.medicoEditando = medico;
    this.nuevoMedico = {
      nombre: medico.nombre,
      apellido: medico.apellido,
      especialidad: medico.especialidad,
      email: medico.email,
      telefono: medico.telefono || '',
      cedula_profesional: medico.cedula_profesional || '',
      username: '',
      password: ''
    };
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.medicoEditando = null;
  }

  guardarMedico() {
    this.error = null;
    this.successMessage = null;
    this.loading = true;

    if (this.medicoEditando && this.medicoEditando.id) {
      // Actualizar médico existente
      const data = {
        nombre: this.nuevoMedico.nombre,
        apellido: this.nuevoMedico.apellido,
        especialidad: this.nuevoMedico.especialidad,
        email: this.nuevoMedico.email,
        telefono: this.nuevoMedico.telefono,
        cedula_profesional: this.nuevoMedico.cedula_profesional
      };

      this.medicosService.updateMedico(this.medicoEditando.id, data).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.successMessage = 'Médico actualizado exitosamente';
            this.cargarMedicos();
            this.cerrarFormulario();
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error al actualizar médico:', error);
          this.error = 'Error al actualizar el médico';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      // Crear nuevo médico con usuario
      this.medicosService.createMedicoWithUser(this.nuevoMedico).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.successMessage = 'Médico creado exitosamente';
            this.cargarMedicos();
            this.cerrarFormulario();
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          console.error('Error al crear médico:', error);
          this.error = 'Error al crear el médico';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleActivo(medico: Medico) {
    if (!medico.id) return;

    this.loading = true;
    const accion = medico.activo ? 
      this.medicosService.deactivateMedico(medico.id) : 
      this.medicosService.activateMedico(medico.id);

    accion.subscribe({
      next: (response: any) => {
        if (response.success) {
          this.successMessage = `Médico ${medico.activo ? 'desactivado' : 'activado'} exitosamente`;
          this.cargarMedicos();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Error al cambiar estado:', error);
        this.error = 'Error al cambiar el estado del médico';
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
