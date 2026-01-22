import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'booking',
    pathMatch: 'full'
  },
  {
    path: 'booking',
    loadComponent: () => import('./components/booking/booking.component').then(m => m.BookingComponent)
  },
  {
    path: 'admin',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./components/admin/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'citas',
        loadComponent: () => import('./components/admin/citas-list/citas-list.component').then(m => m.CitasListComponent)
      },
      {
        path: 'horarios',
        loadComponent: () => import('./components/admin/horarios/horarios.component').then(m => m.HorariosComponent)
      },
      {
        path: 'recetas',
        loadComponent: () => import('./components/admin/recetas/recetas.component').then(m => m.RecetasComponent)
      },
      {
        path: 'medicos',
        loadComponent: () => import('./components/admin/medicos-admin/medicos-admin.component').then(m => m.MedicosAdminComponent)
      },
      {
        path: 'pacientes',
        loadComponent: () => import('./components/admin/pacientes/pacientes.component').then(m => m.PacientesComponent)
      },
      {
        path: 'pacientes/:id',
        loadComponent: () => import('./components/admin/paciente-detalle/paciente-detalle.component').then(m => m.PacienteDetalleComponent)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./components/medico-perfil/medico-perfil.component').then(m => m.MedicoPerfilComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'booking'
  }
];
