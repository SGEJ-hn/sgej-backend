import { Router } from 'express';

import { getEstadisticas } from '../controllers/reporte.controller';

import { verificarToken } from '../middlewares/auth';

const router = Router();

// Obtener estadísticas generales
router.get(
  '/estadisticas',
  verificarToken,
  getEstadisticas
);

export default router;