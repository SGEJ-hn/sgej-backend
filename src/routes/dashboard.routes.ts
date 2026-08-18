import { Router } from 'express';
import { getAdminDashboard, getAbogadoDashboard } from '../controllers/dashboard.controller';
import { verificarToken } from '../middlewares/auth';
import { soloAdmin, soloAbogado } from '../middlewares/rbac';

const router = Router();

/* 
 * Ruta: GET /api/dashboard/admin
 * Protegida con token válido y acceso exclusivo para el Administrador
 */
router.get('/admin', verificarToken, soloAdmin, getAdminDashboard);

/* 
 * Ruta: GET /api/dashboard/abogado
 * Protegida con token válido y acceso exclusivo para Abogados y Paralegales
 */
router.get('/abogado', verificarToken, soloAbogado, getAbogadoDashboard);
export default router;