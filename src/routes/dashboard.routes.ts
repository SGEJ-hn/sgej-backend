import { Router } from 'express';
import { getAdminDashboard } from '../controllers/dashboard.controller';
import { verificarToken } from '../middlewares/auth';
import { soloAdmin } from '../middlewares/rbac';

const router = Router();

/* 
 * Ruta: GET /api/dashboard/admin
 * Protegida con token válido y acceso exclusivo para el Administrador
 */
router.get('/admin', verificarToken, soloAdmin, getAdminDashboard);

export default router;