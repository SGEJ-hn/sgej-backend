import { Request, Response } from 'express';
import { prisma } from '../config/db';

/**
 * Obtener la configuración actual del sistema.
 * Si no existe ninguna, crea una con valores por defecto.
 */
export const obtenerConfiguracion = async (req: Request, res: Response): Promise<void> => {
  try {
    let config = await prisma.configuracionSistema.findFirst();

    // Si no existe configuración, crear una por defecto
    if (!config) {
      config = await prisma.configuracionSistema.create({
        data: {
          nombre_bufete: 'Justice Attorney Law',
          cedula_rtn: '',
          sitio_web: '',
          telefono: '',
          correo_electronico: '',
          direccion: '',
          descripcion_bufete: '',
          notificaciones_push: true,
          recordatorios_audiencias: true,
          tiempo_inactividad_min: 30,
          longitud_min_contrasena: 10,
          intentos_max_login: 5,
          duracion_bloqueo_min: 15,
          requerir_2fa: false,
        },
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener la configuración del sistema' });
  }
};

/**
 * Actualizar la configuración del sistema.
 */
export const actualizarConfiguracion = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre_bufete,
      cedula_rtn,
      sitio_web,
      telefono,
      correo_electronico,
      direccion,
      descripcion_bufete,
      notificaciones_push,
      recordatorios_audiencias,
      tiempo_inactividad_min,
      longitud_min_contrasena,
      intentos_max_login,
      duracion_bloqueo_min,
      requerir_2fa,
    } = req.body;

    // Buscar la configuración existente
    let config = await prisma.configuracionSistema.findFirst();

    if (!config) {
      res.status(404).json({ error: 'No se encontró configuración del sistema' });
      return;
    }

    const configActualizada = await prisma.configuracionSistema.update({
      where: { id_configuracion: config.id_configuracion },
      data: {
        nombre_bufete,
        cedula_rtn,
        sitio_web,
        telefono,
        correo_electronico,
        direccion,
        descripcion_bufete,
        notificaciones_push,
        recordatorios_audiencias,
        tiempo_inactividad_min,
        longitud_min_contrasena,
        intentos_max_login,
        duracion_bloqueo_min,
        requerir_2fa,
      },
    });

    res.json({
      message: 'Configuración actualizada exitosamente',
      configuracion: configActualizada,
    });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración del sistema' });
  }
};
