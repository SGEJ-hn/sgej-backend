import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export class EmailService {
  // Configuración del transportador usando Mailtrap y las variables de entorno
  private static transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    port: Number(process.env.MAILTRAP_PORT) || 2525,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS,
    },
  });

  /**
   * Envía un correo electrónico utilizando Nodemailer / Mailtrap
   * @param destinatario El correo del usuario
   * @param asunto El título del correo
   * @param htmlContent El cuerpo del correo en formato HTML
   */
  static async enviarCorreoNotificacion(destinatario: string, asunto: string, htmlContent: string) {
    try {
      if (!process.env.MAILTRAP_USER || !process.env.MAILTRAP_PASS) {
        console.warn(`[EmailService] ⚠️ Credenciales de Mailtrap no configuradas en .env. Omitiendo envío a ${destinatario}.`);
        return null;
      }

      const info = await this.transporter.sendMail({
        from: '"Justice Attorney Law" <no-reply@sgej.com>',
        to: destinatario,
        subject: asunto,
        html: htmlContent,
      });

      console.log(`[EmailService] Correo enviado a ${destinatario} con éxito en Mailtrap. ID: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`[EmailService] Error crítico al enviar correo a ${destinatario}:`, error);
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