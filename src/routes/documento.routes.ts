import { Router } from 'express';
import { upload } from '../middlewares/upload';
import { 
  subirDocumento, 
  obtenerDocumentosPorExpediente, 
  eliminarDocumento,
  actualizarDocumento // <-- 1. Importamos el nuevo controlador
} from '../controllers/documento.controller';

const router = Router();

// POST: Subir documento
router.post('/upload', upload.single('archivo'), subirDocumento);

// GET: Obtener documentos de un expediente
router.get('/expediente/:id_expediente', obtenerDocumentosPorExpediente);

// DELETE: Eliminar documento
router.delete('/:id_documento', eliminarDocumento);

// PATCH: Actualizar nombre y/o categoría del documento
router.patch('/:id_documento', actualizarDocumento); 

export default router;