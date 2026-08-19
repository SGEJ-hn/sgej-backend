import { Response } from 'express';
import { obtenerEstadisticas } from '../services/reporte.service';
import { AuthenticatedRequest } from '../middlewares/auth'; // <-- Importar la interfaz

export const getEstadisticas = async (
  req: AuthenticatedRequest, // <-- Usar la interfaz para tener acceso a req.usuario
  res: Response
): Promise<void> => {
  try {
    // Si no hay usuario en el request (no debería pasar por el middleware, pero por precaución)
    if (!req.usuario) {
      res.status(401).json({ error: 'Usuario no autenticado.' });
      return;
    }

    // Pasamos el usuario completo al servicio
    const estadisticas = await obtenerEstadisticas(req.usuario);

    res.status(200).json(estadisticas);

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      error: 'Error interno del servidor al obtener las estadísticas.'
    });
  }
};