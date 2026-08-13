import cron from 'node-cron';
import prisma from '../config/prisma';
import { NotificationService } from './notification.service';


export class CronService {
  static iniciarTareasProgramadas() {
    console.log('[CronService] Motor de tareas automáticas iniciado.');

    // Configuramos el Cron para que se ejecute TODOS LOS DÍAS a las 8:00 AM.
    // El formato '0 8 * * *' significa: minuto 0, hora 8, cualquier día del mes, cualquier mes, cualquier día de la semana.
    cron.schedule('0 8 * * *', async () => {
      console.log('[CronService] Ejecutando revisión diaria de recordatorios de citas...');
      await this.procesarRecordatoriosCitas();
    });
  }

  /**
   * Busca las citas del día siguiente y dispara los correos/notificaciones.
   */
  private static async procesarRecordatoriosCitas() {
    try {
      // 1. Calcular la fecha de mañana
      const hoy = new Date();
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      
      // Formateamos para buscar solo por fecha (YYYY-MM-DD), ignorando la hora
      const fechaMananaStr = manana.toISOString().split('T')[0];
      const inicioManana = new Date(`${fechaMananaStr}T00:00:00.000Z`);
      const finManana = new Date(`${fechaMananaStr}T23:59:59.999Z`);

      // 2. Buscar en Prisma las citas que ocurran mañana Y que tengan el recordatorio activado
      const citasManana = await prisma.cita.findMany({
        where: {
          fecha: {
            gte: inicioManana,
            lte: finManana
          },
          recordatorio_automatico: true,
          id_expediente: { not: null } // Solo citas asociadas a un expediente
        }
      });

      if (citasManana.length === 0) {
        console.log('[CronService] No hay citas para recordar mañana.');
        return;
      }

      // 3. Procesar cada cita encontrada
      for (const cita of citasManana) {
        if (!cita.id_expediente) continue;

        // Formatear la hora de inicio para el mensaje (ej. 14:30)
        const horaFormateada = new Date(cita.hora_inicio).toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        // 4. Usar nuestro servicio para notificar a todo el equipo y al cliente
        await NotificationService.notificarEventoExpediente(
          cita.id_expediente,
          'RECORDATORIO: Cita / Audiencia Mañana',
          `Le recordamos que mañana tiene agendada: "${cita.titulo}" a las ${horaFormateada} en ${cita.lugar_sala}. Por favor sea puntual. Notas adicionales: ${cita.notas_recordatorio || 'Ninguna'}`,
          'alerta', // Usamos 'alerta' para mostrar un ícono llamativo en el frontend
          `/expedientes/${cita.id_expediente}/citas`
        );
      }

      console.log(`[CronService] ✅ Se enviaron ${citasManana.length} recordatorios de citas.`);

    } catch (error) {
      console.error('[CronService] ❌ Error al procesar los recordatorios de citas:', error);
    }
  }
}