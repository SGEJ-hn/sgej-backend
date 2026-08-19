import { Router } from 'express';
import { getMisNotificaciones, putMarcarLeida } from '../controllers/notification.controller';
import { verificarToken } from '../middlewares/auth'; // Verifica que la ruta de importación sea la correcta
import { marcarTodasComoLeidas } from '../controllers/notification.controller';
const router = Router();

router.put('/marcar-todas', verificarToken, marcarTodasComoLeidas);
router.get('/', verificarToken, getMisNotificaciones);
router.put('/:id/leer', verificarToken, putMarcarLeida);

export default router;