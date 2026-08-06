import { Usuario } from '@prisma/client';
import prisma from '../config/prisma'; 
import { EmailService } from './email.service';


export class NotificationService {
  
  /**
   * Genera notificaciones y correos para todos los involucrados en un expediente
   * (El cliente dueño del caso y el equipo de abogados/asistentes asignados).
   */
  static async notificarEventoExpediente(
    id_expediente: string,
    titulo: string,
    mensaje: string,
    tipo: string, // ej. 'documento', 'cita', 'estado'
    enlace?: string // ej. URL para ver el documento en el frontend
  ) {
    try {
      // 1. Obtener el expediente con su cliente y el equipo de trabajo
      const expediente = await prisma.expediente.findUnique({
        where: { id_expediente },
        include: {
          cliente: true, // Trae los datos del cliente
          equipo: {
            include: {
              user: true // Trae los datos de cada miembro del equipo
            }
          }
        }
      });

      if (!expediente) {
        console.error(`[NotificationService] No se encontró el expediente: ${id_expediente}`);
        return;
      }

      // 2. Agrupar a todas las personas que deben ser notificadas
      const usuariosANotificar: Usuario[] = [];
      
      // Agregamos al cliente
      if (expediente.cliente) {
        usuariosANotificar.push(expediente.cliente);
      }
      
      // Agregamos a cada miembro del equipo (abogados, asistentes)
      expediente.equipo.forEach(miembro => {
        if (miembro.user) {
          usuariosANotificar.push(miembro.user);
        }
      });

      // Filtramos para evitar duplicados (por si alguien es cliente y parte del equipo por error)
      const usuariosUnicos = Array.from(new Set(usuariosANotificar.map(u => u.id_usuario)))
        .map(id => usuariosANotificar.find(u => u.id_usuario === id));

      // 3. Procesar la notificación para cada usuario de forma individual
      for (const usuario of usuariosUnicos) {
        if (!usuario) continue;

        // A. Guardar el registro en la base de datos (Para que aparezca en la campanita)
        await prisma.notificacion.create({
          data: {
            id_usuario: usuario.id_usuario,
            titulo: titulo,
            mensaje: mensaje,
            tipo: tipo,
            enlace_referencia: enlace
          }
        });

        // B. Evaluar las preferencias del usuario para enviar (o no) el correo electrónico
        if (usuario.recibir_alertas_correo && usuario.correo) {
          const html = EmailService.generarPlantillaHTML(titulo, mensaje, enlace);
          
          // NOTA: No usamos 'await' aquí a propósito. 
          // Queremos que el correo se envíe en segundo plano para que el sistema siga rápido
          // y no haga esperar al usuario mientras Resend procesa el email.
          EmailService.enviarCorreoNotificacion(usuario.correo, titulo, html);
        }
      }

      console.log(`[NotificationService] Notificaciones despachadas para el expediente ${expediente.numero_expediente}`);

    } catch (error) {
      console.error('[NotificationService] Error crítico al procesar notificaciones:', error);
    }
  }
}