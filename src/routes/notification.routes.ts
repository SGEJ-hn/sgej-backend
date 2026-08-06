import { Router } from 'express';
import { getMisNotificaciones, putMarcarLeida } from '../controllers/notification.controller';
import { verificarToken } from '../middlewares/auth'; // Verifica que la ruta de importación sea la correcta

const router = Router();

// Protegemos las rutas inyectando el authMiddleware
router.get('/', verificarToken, getMisNotificaciones);
router.put('/:id/leer', verificarToken, putMarcarLeida);

export default router;