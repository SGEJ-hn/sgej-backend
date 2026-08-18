import { Response } from 'express';

import {
  obtenerCitas,
  obtenerCitaPorId,
  crearCita,
  actualizarCita,
  eliminarCita
} from '../services/cita.service';

import { AuthenticatedRequest } from '../middlewares/auth';
import { NotificationService } from '../services/notification.service';
import { prisma } from '../config/db';
import { filtroGestionExpedientes } from '../utils/expediente-access';

const puedeGestionarExpediente = async (req: AuthenticatedRequest, idExpediente?: string | null) => {
  if (!idExpediente) return true;
  if (!req.usuario) return false;
  const filtro = filtroGestionExpedientes(req.usuario);
  if (!filtro) return false;
  return Boolean(await prisma.expediente.findFirst({
    where: { id_expediente: idExpediente, ...filtro }, select: { id_expediente: true }
  }));
};


// Obtener citas
export const getCitas = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const usuario = req.usuario;

    if (!usuario) {

      return res.status(401).json({
        mensaje: 'Usuario no autenticado'
      });

    }

    const citas = await obtenerCitas(
      usuario.id_usuario,
      usuario.rol
    );

    return res.status(200).json(citas);

  } catch (error) {

    console.error(
      'Error al obtener las citas:',
      error
    );

    return res.status(500).json({
      mensaje: 'Error al obtener las citas'
    });

  }

};


// Obtener cita por ID
export const getCitaPorId = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const usuario = req.usuario;

    if (!usuario) {

      return res.status(401).json({
        mensaje: 'Usuario no autenticado'
      });

    }

    const id = String(req.params.id);

    const cita = await obtenerCitaPorId(
      id,
      usuario.id_usuario,
      usuario.rol
    );

    if (!cita) {

      return res.status(404).json({
        mensaje: 'Cita no encontrada'
      });

    }

    return res.status(200).json(cita);

  } catch (error) {

    console.error(
      'Error al obtener la cita:',
      error
    );

    return res.status(500).json({
      mensaje: 'Error al obtener la cita'
    });

  }

};


// Crear cita
export const postCita = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const usuario = req.usuario;
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    if (!(await puedeGestionarExpediente(req, req.body.id_expediente))) {
      return res.status(403).json({ mensaje: 'No tiene permisos para crear citas en este expediente.' });
    }

    // 1. Pasamos el body y el id_autor al servicio
    const nuevaCita = await crearCita(req.body, usuario.id_usuario);

    // 2. Disparar la notificación (Tu lógica original)
    if (nuevaCita.id_expediente) {
      const fechaFormateada = new Date(nuevaCita.fecha).toLocaleDateString('es-ES');
      await NotificationService.notificarEventoExpediente(
        nuevaCita.id_expediente,
        'Nueva Cita Agendada',
        `Se ha agendado la cita "${nuevaCita.titulo}" para el día ${fechaFormateada} en ${nuevaCita.lugar_sala}.`,
        'cita', 
        `/expedientes/${nuevaCita.id_expediente}/citas` 
      );
    }

    return res.status(201).json({
      mensaje: 'Cita creada correctamente',
      cita: nuevaCita
    });

  } catch (error) {
    console.error('Error al crear la cita:', error);
    return res.status(500).json({ mensaje: 'Error al crear la cita' });
  }
};


// Actualizar cita
export const putCita = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const usuario = req.usuario;
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    const id = String(req.params.id);

    const citaExistente = await obtenerCitaPorId(id, usuario.id_usuario, usuario.rol);
    if (!citaExistente || !(await puedeGestionarExpediente(req, req.body.id_expediente ?? citaExistente.id_expediente))) {
      return res.status(403).json({ mensaje: 'No tiene permisos para modificar esta cita.' });
    }

    // Pasamos el id, el body y el id_autor al servicio
    const citaActualizada = await actualizarCita(id, req.body, usuario.id_usuario);

    return res.status(200).json({
      mensaje: 'Cita actualizada correctamente',
      cita: citaActualizada
    });

  } catch (error) {
    console.error('Error al actualizar la cita:', error);
    return res.status(500).json({ mensaje: 'Error al actualizar la cita' });
  }
};


// Eliminar cita
export const deleteCita = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const usuario = req.usuario;
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado' });
    }

    const id = String(req.params.id);

    const citaExistente = await obtenerCitaPorId(id, usuario.id_usuario, usuario.rol);
    if (!citaExistente || !(await puedeGestionarExpediente(req, citaExistente.id_expediente))) {
      return res.status(403).json({ mensaje: 'No tiene permisos para eliminar esta cita.' });
    }

    // Pasamos el id y el id_autor al servicio
    await eliminarCita(id, usuario.id_usuario);

    return res.status(200).json({
      mensaje: 'Cita eliminada correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar la cita:', error);
    return res.status(500).json({ mensaje: 'Error al eliminar la cita' });
  }
};
