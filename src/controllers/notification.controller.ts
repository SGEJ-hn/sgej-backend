import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

// Obtener mis notificaciones
export const getMisNotificaciones = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    const notificaciones = await prisma.notificacion.findMany({
      where: { id_usuario: usuario.id_usuario },
      orderBy: { fecha_creacion: 'desc' },
      take: 30 // Traemos las últimas 30
    });

    const sinLeer = notificaciones.filter(n => !n.leida).length;

    return res.status(200).json({ sinLeer, notificaciones });

  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Marcar notificación como leída
export const putMarcarLeida = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuario = req.usuario;    
    const id = String(req.params.id); 

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    const notificacion = await prisma.notificacion.findFirst({
      where: { id_notificacion: id, id_usuario: usuario.id_usuario },
    });
    if (!notificacion) {
      return res.status(404).json({ mensaje: 'Notificación no encontrada' });
    }

    const notificacionActualizada = await prisma.notificacion.update({
      where: { id_notificacion: notificacion.id_notificacion },
      data: { leida: true }
    });

    return res.status(200).json({ 
      mensaje: 'Notificación leída', 
      notificacion: notificacionActualizada 
    });

  } catch (error) {
    console.error('Error al actualizar notificación:', error);
    return res.status(500).json({ mensaje: 'Error al actualizar notificación' });
  }
};
