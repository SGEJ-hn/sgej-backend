import { Router } from 'express';
import { obtenerHistorialExpediente } from '../controllers/historial.controller';
import { verificarToken } from '../middlewares/auth';

const router = Router();

// GET /api/historial/expediente/:id_expediente?categoria=Documentos
router.get(
  '/expediente/:id_expediente',
  verificarToken,
  obtenerHistorialExpediente
);

export default router;