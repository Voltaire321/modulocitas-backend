import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MedicosService } from '../../services/medicos.service';
import { DisponibilidadService } from '../../services/disponibilidad.service';
import { CitasService } from '../../services/citas.service';
import { Medico, SlotTiempo, CrearCitaRequest } from '../../models/citas.model';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  medicoInfo: Medico | null = null; // Información del médico único
  fechaSeleccionada: string = '';
  slots: SlotTiempo[] = [];
  slotSeleccionado: SlotTiempo | null = null;
  
  // Formulario de paciente
  formulario = {
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    motivoConsulta: ''
  };
  
  // Verificación de teléfono
  telefonoVerificado = false;
  codigoVerificacion = '';
  mostrarInputCodigo = false;
  enviandoCodigo = false;
  verificandoCodigo = false;
  mensajeVerificacion = '';
  tiempoRestante = 0;
  timerInterval: any = null;
  
  // Validaciones
  erroresFormulario: any = {};

  loading = false;
  error: string | null = null;
  success: string | null = null;
  paso: number = 1; // Wizard de 3 pasos: 1=fecha, 2=hora, 3=datos paciente
  codigoConfirmacion: string = '';

  // Exponer Math para usar en template
  Math = Math;

  // Fechas disponibles (próximos 30 días)
  fechasDisponibles: Date[] = [];
  
  // Calendario
  mesActual: Date = new Date();
  diasMes: any[] = [];

  private medicosService = inject(MedicosService);
  private disponibilidadService = inject(DisponibilidadService);
  private citasService = inject(CitasService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.cargarMedicoInfo();
    this.generarFechasDisponibles();
    this.generarCalendario();
  }

  cargarMedicoInfo() {
    this.loading = true;
    this.medicosService.getMedicoInfo().subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          this.medicoInfo = response.data;
          console.log('Información del médico cargada en booking:', this.medicoInfo);
          console.log('Avatar URL:', this.medicoInfo?.avatar_url);
        }
        this.loading = false;
        this.cdr.detectChanges(); // Forzar detección de cambios
      },
      error: (error: any) => {
        console.error('Error al cargar información del médico:', error);
        this.error = 'Error al cargar información del médico. Por favor, intenta de nuevo.';
        this.loading = false;
        this.cdr.detectChanges(); // Forzar detección de cambios
      }
    });
  }

  generarFechasDisponibles() {
    const hoy = new Date();
    for (let i = 0; i < 30; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      this.fechasDisponibles.push(fecha);
    }
  }
  
  // Generar calendario mensual
  generarCalendario() {
    const year = this.mesActual.getFullYear();
    const month = this.mesActual.getMonth();
    
    // Primer y último día del mes
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    
    // Días que necesitamos mostrar del mes anterior
    const diasAntes = primerDia.getDay();
    
    this.diasMes = [];
    
    // Agregar días del mes anterior (en gris)
    for (let i = diasAntes - 1; i >= 0; i--) {
      const dia = new Date(year, month, -i);
      this.diasMes.push({
        fecha: dia,
        esOtroMes: true,
        esHoy: false,
        esSeleccionado: false,
        esPasado: dia < new Date(new Date().setHours(0,0,0,0))
      });
    }
    
    // Agregar días del mes actual
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(year, month, dia);
      const hoy = new Date();
      hoy.setHours(0,0,0,0);
      
      this.diasMes.push({
        fecha: fecha,
        esOtroMes: false,
        esHoy: fecha.getTime() === hoy.getTime(),
        esSeleccionado: this.fechaSeleccionada === this.formatearFecha(fecha),
        esPasado: fecha < hoy
      });
    }
    
    // Completar con días del siguiente mes
    const diasRestantes = 42 - this.diasMes.length; // 6 semanas x 7 días
    for (let i = 1; i <= diasRestantes; i++) {
      const dia = new Date(year, month + 1, i);
      this.diasMes.push({
        fecha: dia,
        esOtroMes: true,
        esHoy: false,
        esSeleccionado: false,
        esPasado: false
      });
    }
  }
  
  mesAnterior() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.generarCalendario();
  }
  
  mesSiguiente() {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.generarCalendario();
  }
  
  getNombreMes(): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[this.mesActual.getMonth()];
  }

  seleccionarFecha(diaInfo: any) {
    if (diaInfo.esPasado || diaInfo.esOtroMes) return;
    
    this.fechaSeleccionada = this.formatearFecha(diaInfo.fecha);
    this.generarCalendario(); // Actualizar el calendario para marcar la fecha seleccionada
    this.cargarSlots();
  }

  cargarSlots() {
    if (!this.medicoInfo || !this.fechaSeleccionada) return;

    this.loading = true;
    this.error = null;
    
    this.disponibilidadService.getSlotsDelDia(
      this.medicoInfo.id,
      this.fechaSeleccionada
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.slots = response.data.filter(slot => slot.disponible);
          if (this.slots.length === 0) {
            this.error = 'No hay horarios disponibles para esta fecha.';
          } else {
            this.paso = 2; // Pasar a selección de hora
          }
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar slots:', error);
        this.error = 'Error al cargar horarios disponibles.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarSlot(slot: SlotTiempo) {
    this.slotSeleccionado = slot;
    this.paso = 3; // Pasar a formulario de datos del paciente
    this.error = null;
  }

  agendarCita() {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;
    this.error = null;

    const request: CrearCitaRequest = {
      medico_id: this.medicoInfo!.id, // Usar médico único del sistema
      paciente_nombre: this.formulario.nombre,
      paciente_apellido: this.formulario.apellido,
      paciente_email: this.formulario.email,
      paciente_telefono: this.formulario.telefono,
      fecha: this.fechaSeleccionada,
      hora_inicio: this.slotSeleccionado!.hora_inicio,
      hora_fin: this.slotSeleccionado!.hora_fin,
      motivo_consulta: this.formulario.motivoConsulta
    };

    this.citasService.createCita(request).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.codigoConfirmacion = response.data.codigo_confirmacion;
          this.success = '¡Cita agendada exitosamente! Se ha enviado la confirmación a tu WhatsApp.';
          
          // Ya no abrimos WhatsApp manualmente, el backend enviará el mensaje
          this.paso = 4; // Paso de confirmación
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al agendar cita:', error);
        this.error = error.error?.message || 'Error al agendar la cita. Por favor, intenta de nuevo.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  generarMensajeWhatsApp(citaData: any): string {
    const medico = this.medicoInfo;
    const fechaLegible = this.formatearFechaLegible(this.fechaSeleccionada);
    const horaInicio = this.formatearHora(this.slotSeleccionado!.hora_inicio);
    const horaFin = this.formatearHora(this.slotSeleccionado!.hora_fin);
    
    return `🏥 *CONFIRMACIÓN DE CITA MÉDICA*\n\n` +
           `Hola ${this.formulario.nombre} ${this.formulario.apellido},\n\n` +
           `Tu cita ha sido agendada exitosamente:\n\n` +
           `📅 *Fecha:* ${fechaLegible}\n` +
           `🕐 *Hora:* ${horaInicio} - ${horaFin}\n` +
           `👨‍⚕️ *Médico:* Dr(a). ${medico?.nombre} ${medico?.apellido}\n` +
           `🏥 *Especialidad:* ${medico?.especialidad}\n` +
           `📋 *Motivo:* ${this.formulario.motivoConsulta}\n\n` +
           `🔑 *Código de confirmación:* ${citaData.codigo_confirmacion}\n\n` +
           `⚠️ *Estado:* PENDIENTE DE CONFIRMACIÓN\n\n` +
           `El médico confirmará tu cita próximamente. Te notificaremos cuando sea aprobada.\n\n` +
           `Gracias por confiar en nosotros.`;
  }

  validarFormulario(): boolean {
    this.erroresFormulario = {};
    let esValido = true;
    
    // Validar que el teléfono esté verificado
    if (!this.telefonoVerificado) {
      this.erroresFormulario.telefono = 'Debes verificar tu teléfono primero';
      this.error = 'Por favor, verifica tu número de teléfono con el código enviado por WhatsApp';
      esValido = false;
      return esValido;
    }
    
    // Validar nombre
    if (!this.formulario.nombre.trim()) {
      this.erroresFormulario.nombre = 'El nombre es requerido';
      esValido = false;
    } else if (this.formulario.nombre.trim().length < 2) {
      this.erroresFormulario.nombre = 'El nombre debe tener al menos 2 caracteres';
      esValido = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(this.formulario.nombre)) {
      this.erroresFormulario.nombre = 'El nombre solo puede contener letras';
      esValido = false;
    }
    
    // Validar apellido
    if (!this.formulario.apellido.trim()) {
      this.erroresFormulario.apellido = 'El apellido es requerido';
      esValido = false;
    } else if (this.formulario.apellido.trim().length < 2) {
      this.erroresFormulario.apellido = 'El apellido debe tener al menos 2 caracteres';
      esValido = false;
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(this.formulario.apellido)) {
      this.erroresFormulario.apellido = 'El apellido solo puede contener letras';
      esValido = false;
    }
    
    // Validar teléfono
    if (!this.formulario.telefono.trim()) {
      this.erroresFormulario.telefono = 'El teléfono es requerido';
      esValido = false;
    } else if (!/^\d{10}$/.test(this.formulario.telefono.replace(/\s/g, ''))) {
      this.erroresFormulario.telefono = 'El teléfono debe tener 10 dígitos';
      esValido = false;
    }
    
    // Validar email (opcional pero si se ingresa debe ser válido)
    if (this.formulario.email && this.formulario.email.trim()) {
      if (!this.validarEmail(this.formulario.email)) {
        this.erroresFormulario.email = 'El email no es válido (ejemplo: correo@dominio.com)';
        esValido = false;
      }
    }
    
    if (!esValido) {
      this.error = 'Por favor, corrige los errores en el formulario';
    }
    
    return esValido;
  }
  
  // Validación en tiempo real
  validarCampo(campo: string) {
    switch(campo) {
      case 'nombre':
        if (!this.formulario.nombre.trim()) {
          this.erroresFormulario.nombre = 'El nombre es requerido';
        } else if (this.formulario.nombre.trim().length < 2) {
          this.erroresFormulario.nombre = 'Mínimo 2 caracteres';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(this.formulario.nombre)) {
          this.erroresFormulario.nombre = 'Solo letras';
        } else {
          delete this.erroresFormulario.nombre;
        }
        break;
      case 'apellido':
        if (!this.formulario.apellido.trim()) {
          this.erroresFormulario.apellido = 'El apellido es requerido';
        } else if (this.formulario.apellido.trim().length < 2) {
          this.erroresFormulario.apellido = 'Mínimo 2 caracteres';
        } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(this.formulario.apellido)) {
          this.erroresFormulario.apellido = 'Solo letras';
        } else {
          delete this.erroresFormulario.apellido;
        }
        break;
      case 'telefono':
        const telefonoLimpio = this.formulario.telefono.replace(/\s/g, '');
        if (!this.formulario.telefono.trim()) {
          this.erroresFormulario.telefono = 'El teléfono es requerido';
          this.telefonoVerificado = false;
          this.mostrarInputCodigo = false;
        } else if (!/^\d{10}$/.test(telefonoLimpio)) {
          this.erroresFormulario.telefono = '10 dígitos requeridos';
          this.telefonoVerificado = false;
          this.mostrarInputCodigo = false;
        } else {
          delete this.erroresFormulario.telefono;
        }
        break;
      case 'email':
        if (this.formulario.email && this.formulario.email.trim()) {
          if (!this.validarEmail(this.formulario.email)) {
            this.erroresFormulario.email = 'Email inválido';
          } else {
            delete this.erroresFormulario.email;
          }
        } else {
          delete this.erroresFormulario.email;
        }
        break;
    }
  }

  validarEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatearFechaLegible(fecha: string): string {
    const [year, month, day] = fecha.split('-');
    const f = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dias[f.getDay()]} ${f.getDate()} ${meses[f.getMonth()]}`;
  }

  formatearHora(hora: string): string {
    if (!hora) return '';
    // Si es un string, tomar solo HH:MM
    if (typeof hora === 'string') {
      return hora.substring(0, 5);
    }
    return String(hora);
  }

  getDiaSemana(fecha: Date): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[fecha.getDay()];
  }

  getMes(fecha: Date): string {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return meses[fecha.getMonth()];
  }

  reiniciar() {
    this.fechaSeleccionada = '';
    this.slots = [];
    this.slotSeleccionado = null;
    this.formulario = {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      motivoConsulta: ''
    };
    this.erroresFormulario = {};
    this.telefonoVerificado = false;
    this.codigoVerificacion = '';
    this.mostrarInputCodigo = false;
    this.mensajeVerificacion = '';
    this.tiempoRestante = 0;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.paso = 1;
    this.error = null;
    this.success = null;
    this.codigoConfirmacion = '';
    this.mesActual = new Date();
    this.generarCalendario();
  }

  // Enviar código de verificación por WhatsApp
  enviarCodigoVerificacion() {
    if (!this.formulario.telefono || this.formulario.telefono.length !== 10) {
      this.mensajeVerificacion = 'Ingresa un teléfono válido de 10 dígitos';
      return;
    }

    this.enviandoCodigo = true;
    this.mensajeVerificacion = '';

    this.http.post('http://localhost:3000/api/verificacion/enviar-codigo', {
      telefono: this.formulario.telefono
    }).subscribe({
      next: (response: any) => {
        this.enviandoCodigo = false;
        if (response.success) {
          this.mostrarInputCodigo = true;
          this.mensajeVerificacion = '✅ Código enviado por WhatsApp. Revisa tu teléfono.';
          // Iniciar timer de 5 minutos (300 segundos)
          this.tiempoRestante = 300;
          this.iniciarTimer();
        } else {
          this.mensajeVerificacion = '⚠️ ' + response.message;
        }
        this.cdr.detectChanges(); // Forzar actualización de UI
      },
      error: (error) => {
        this.enviandoCodigo = false;
        this.mensajeVerificacion = '❌ Error al enviar código. Verifica que WhatsApp esté conectado.';
        console.error('Error:', error);
        this.cdr.detectChanges(); // Forzar actualización de UI
      }
    });
  }

  // Iniciar timer de cuenta regresiva
  iniciarTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = setInterval(() => {
      this.tiempoRestante--;
      this.cdr.detectChanges(); // Actualizar el contador en la UI
      if (this.tiempoRestante <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.mensajeVerificacion = '⚠️ El código ha expirado. Solicita uno nuevo.';
        this.mostrarInputCodigo = false;
        this.cdr.detectChanges(); // Actualizar la UI al expirar
      }
    }, 1000);
  }

  // Formatear tiempo restante para mostrar
  formatearTiempo(): string {
    const minutos = Math.floor(this.tiempoRestante / 60);
    const segundos = this.tiempoRestante % 60;
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
  }

  // Calcular minutos para poder reenviar
  minutosParaReenviar(): number {
    return Math.ceil((this.tiempoRestante - 240) / 60);
  }

  // Verificar código ingresado
  verificarCodigoIngresado() {
    if (!this.codigoVerificacion || this.codigoVerificacion.length !== 6) {
      this.mensajeVerificacion = 'Ingresa el código de 6 dígitos';
      return;
    }

    this.verificandoCodigo = true;
    this.mensajeVerificacion = '';

    this.http.post('http://localhost:3000/api/verificacion/verificar-codigo', {
      telefono: this.formulario.telefono,
      codigo: this.codigoVerificacion
    }).subscribe({
      next: (response: any) => {
        this.verificandoCodigo = false;
        if (response.success) {
          this.telefonoVerificado = true;
          this.mostrarInputCodigo = false;
          this.mensajeVerificacion = '✅ Teléfono verificado correctamente';
        } else {
          this.mensajeVerificacion = '❌ ' + response.message;
        }
        this.cdr.detectChanges(); // Forzar actualización de UI
      },
      error: (error) => {
        this.verificandoCodigo = false;
        this.mensajeVerificacion = '❌ Error al verificar código';
        console.error('Error:', error);
        this.cdr.detectChanges(); // Forzar actualización de UI
      }
    });
  }

  volverPaso(pasoDestino: number) {
    this.paso = pasoDestino;
    this.error = null;
    // Limpiar datos según el paso al que volvemos
    if (pasoDestino < 3) {
      this.slotSeleccionado = null;
    }
    if (pasoDestino < 2) {
      this.fechaSeleccionada = '';
      this.slots = [];
    }
  }
}
