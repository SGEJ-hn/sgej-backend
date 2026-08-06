import { Resend } from 'resend';
import dotenv from 'dotenv';

// Asegurarnos de que las variables de entorno estén cargadas
dotenv.config();

// Inicializamos Resend con la clave de tu .env
const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  /**
   * Envía un correo electrónico estándar utilizando Resend.
   * @param destinatario El correo del usuario (ej. cliente@correo.com)
   * @param asunto El título del correo
   * @param htmlContent El cuerpo del correo en formato HTML
   */
  static async enviarCorreoNotificacion(destinatario: string, asunto: string, htmlContent: string) {
    try {
      const data = await resend.emails.send({
        // IMPORTANTE: Mientras estés en pruebas gratuitas, Resend exige usar 'onboarding@resend.dev' como remitente.
        // Cuando compres un dominio real, esto se cambia a algo como 'notificaciones@justiceattorneylaw.com'
        from: 'Justice Attorney Law <onboarding@resend.dev>',
        to: destinatario,
        subject: asunto,
        html: htmlContent,
      });

      console.log(`[EmailService] Correo enviado a ${destinatario} con éxito. ID: ${data.data?.id}`);
      return data;
    } catch (error) {
      console.error(`[EmailService] Error crítico al enviar correo a ${destinatario}:`, error);
      // No lanzamos el error con 'throw' para evitar que el sistema principal (como subir un documento) 
      // se bloquee o falle solo porque el correo no salió.
      return null;
    }
  }

  /**
   * Genera una plantilla HTML profesional para las notificaciones del bufete.
   */
  static generarPlantillaHTML(titulo: string, mensaje: string, enlace?: string): string {
    const botonHTML = enlace 
      ? `<a href="${enlace}" style="display: inline-block; padding: 12px 24px; background-color: #4B1623; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px;">Ver Detalles</a>`
      : '';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #4B1623; padding: 20px; text-align: center;">
          <h1 style="color: #F3F2EE; margin: 0; font-size: 24px;">Justice Attorney Law</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h2 style="color: #333333; margin-top: 0;">${titulo}</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">${mensaje}</p>
          ${botonHTML}
        </div>
        <div style="background-color: #F3F2EE; padding: 15px; text-align: center; color: #888888; font-size: 12px;">
          <p>Este es un correo automático, por favor no responda a este mensaje.</p>
          <p>Si desea dejar de recibir estas alertas, puede configurar sus preferencias en su panel de usuario.</p>
        </div>
      </div>
    `;
  }
}