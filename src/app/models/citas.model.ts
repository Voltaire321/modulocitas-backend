// Modelo de Médico
export interface Medico {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string;
  email: string;
  telefono?: string;
  cedula_profesional?: string;
  foto_url?: string;
  avatar_url?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Modelo de Paciente
export interface Paciente {
  id: number;
  nombre: string;
  apellido: string;
  email?: string;
  telefono: string;
  fecha_nacimiento?: string;
  genero?: 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir';
  direccion?: string;
  notas_medicas?: string;
  created_at?: string;
  updated_at?: string;
}

// Modelo de Cita
export interface Cita {
  id: number;
  medico_id: number;
  paciente_id: number;
  fecha: string;
  hora: string; // Para compatibilidad en templates
  hora_inicio: string;
  hora_fin: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'rechazada' | 'completada' | 'no_asistio';
  motivo_consulta?: string;
  notas_paciente?: string;
  notas_medico?: string;
  motivo_cancelacion?: string;
  cancelado_por?: 'paciente' | 'medico' | 'sistema';
  codigo_confirmacion?: string;
  recordatorio_enviado?: boolean;
  confirmacion_enviada?: boolean;
  created_at?: string;
  updated_at?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  // Datos relacionados
  paciente_nombre?: string;
  paciente_apellido?: string;
  paciente_email?: string;
  paciente_telefono?: string;
  medico_nombre?: string;
  medico_apellido?: string;
  especialidad?: string;
}

// Modelo de Horario
export interface ConfiguracionHorario {
  id: number;
  medico_id: number;
  dia_semana: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  hora_inicio: string;
  hora_fin: string;
  duracion_cita_minutos: number;
  tiempo_entre_citas_minutos: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

// Modelo de Día No Laborable
export interface DiaNoLaborable {
  id: number;
  medico_id: number;
  fecha: string;
  motivo?: string;
  todo_el_dia: boolean;
  hora_inicio?: string;
  hora_fin?: string;
  created_at?: string;
}

// Modelo de Slot de Tiempo
export interface SlotTiempo {
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

// Modelo de Disponibilidad
export interface Disponibilidad {
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

// Request para crear cita
export interface CrearCitaRequest {
  medico_id: number;
  paciente_nombre: string;
  paciente_apellido: string;
  paciente_email: string;
  paciente_telefono: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo_consulta?: string;
  notas_paciente?: string;
}

// Response genérico de API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// Usuario Admin
export interface UsuarioAdmin {
  id: number;
  medico_id?: number;
  username: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'superadmin' | 'doctor' | 'secretaria' | 'medico' | 'admin';
  activo: boolean;
  medico_nombre?: string;
  medico_apellido?: string;
}

// Dashboard Stats
export interface DashboardStats {
  citasHoy: number;
  citasPendientes: number;
  citasConfirmadas: number;
  citasSemana: number;
  citasMes: number;
  pacientesMes: number;
}

// Modelo de Receta Médica
export interface RecetaMedica {
  id?: number;
  cita_id: number;
  medico_id: number;
  paciente_id: number;
  fecha_emision: string;
  diagnostico: string;
  indicaciones?: string;
  vigencia_dias: number;
  folio?: string;
  created_at?: string;
  updated_at?: string;
  // Datos relacionados
  medico_nombre?: string;
  medico_apellido?: string;
  especialidad?: string;
  cedula_profesional?: string;
  paciente_nombre?: string;
  paciente_apellido?: string;
  paciente_email?: string;
  medicamentos?: MedicamentoReceta[];
}

// Modelo de Medicamento en Receta
export interface MedicamentoReceta {
  id?: number;
  receta_id?: number;
  medicamento: string;
  presentacion?: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  cantidad?: string;
  via_administracion: 'oral' | 'topica' | 'intravenosa' | 'intramuscular' | 'subcutanea' | 'otra';
  indicaciones_especiales?: string;
  orden?: number;
}
