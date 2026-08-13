import { Router } from 'express';
import {
  obtenerConfiguracion,
  actualizarConfiguracion,
} from '../controllers/configuracion.controller';
import { verificarToken } from '../middlewares/auth';
import { soloAdmin } from '../middlewares/rbac';

const router = Router();

// =========================================================================
// RUTAS DE CONFIGURACIÓN DEL SISTEMA — Solo Administrador
// =========================================================================

// GET /api/configuracion -> Obtener configuración actual
router.get('/', verificarToken, soloAdmin, obtenerConfiguracion);

// PUT /api/configuracion -> Actualizar configuración
router.put('/', verificarToken, soloAdmin, actualizarConfiguracion);

export default router;
