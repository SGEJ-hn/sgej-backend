import { Request, Response } from 'express';
import { obtenerEstadisticas } from '../services/reporte.service';

export const getEstadisticas = async (
  req: Request,
  res: Response
): Promise<void> => {

  try {

    const estadisticas = await obtenerEstadisticas();

    res.status(200).json(estadisticas);

  } catch (error) {

    console.error(
      'Error al obtener estadísticas:',
      error
    );

    res.status(500).json({
      error: 'Error interno del servidor al obtener las estadísticas.'
    });
  }
};