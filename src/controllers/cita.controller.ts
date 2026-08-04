import { Response } from 'express';

import {
  obtenerCitas,
  obtenerCitaPorId,
  crearCita,
  actualizarCita,
  eliminarCita
} from '../services/cita.service';

import { AuthenticatedRequest } from '../middlewares/auth';


// Obtener citas
export const getCitas = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const usuario = req.usuario;

    // Prueba del usuario recibido
    console.log('==============================');
    console.log('USUARIO DEL TOKEN:', usuario);
    console.log('ROL DEL TOKEN:', usuario?.rol);
    console.log('ID DEL USUARIO:', usuario?.id_usuario);
    console.log('==============================');

    if (!usuario) {

      return res.status(401).json({
        mensaje: 'Usuario no autenticado'
      });

    }

    const citas = await obtenerCitas(
      usuario.id_usuario,
      usuario.rol
    );

    // Prueba de las citas encontradas
    console.log('CITAS ENCONTRADAS:', citas.length);
    console.log('CITAS:', citas);

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

    const nuevaCita = await crearCita(
      req.body
    );

    return res.status(201).json({
      mensaje: 'Cita creada correctamente',
      cita: nuevaCita
    });

  } catch (error) {

    console.error(
      'Error al crear la cita:',
      error
    );

    return res.status(500).json({
      mensaje: 'Error al crear la cita'
    });

  }

};


// Actualizar cita
export const putCita = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const id = String(req.params.id);

    const citaActualizada =
      await actualizarCita(
        id,
        req.body
      );

    return res.status(200).json({
      mensaje: 'Cita actualizada correctamente',
      cita: citaActualizada
    });

  } catch (error) {

    console.error(
      'Error al actualizar la cita:',
      error
    );

    return res.status(500).json({
      mensaje: 'Error al actualizar la cita'
    });

  }

};


// Eliminar cita
export const deleteCita = async (
  req: AuthenticatedRequest,
  res: Response
) => {

  try {

    const id = String(req.params.id);

    await eliminarCita(id);

    return res.status(200).json({
      mensaje: 'Cita eliminada correctamente'
    });

  } catch (error) {

    console.error(
      'Error al eliminar la cita:',
      error
    );

    return res.status(500).json({
      mensaje: 'Error al eliminar la cita'
    });

  }

};