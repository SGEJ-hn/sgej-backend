import { Request, Response } from 'express';
import { supabase } from '../config/storage';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const subirDocumento = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { id_expediente, categoria, nombre_documento } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No se adjuntó ningún archivo.' });
    }

    if (!id_expediente || !categoria) {
      return res.status(400).json({ error: 'id_expediente y categoria son obligatorios.' });
    }

    // Nombre único para evitar colisiones en Supabase Storage
    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    const filePath = `expedientes/${id_expediente}/${fileName}`;

    // Agrega este console.log justo antes de "const { data, error } = await supabase.storage..."
    console.log('Ruta a subir:', filePath);
    console.log('ID Expediente recibido:', id_expediente);
    
    // 1. Subir el buffer del archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from('expedientes_documentos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Error en Supabase Storage:', error);
      return res.status(500).json({ error: 'Error al almacenar el archivo en la nube.' });
    }

    // 2. Obtener URL Pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from('expedientes_documentos')
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;
    const sizeInMB = parseFloat((file.size / (1024 * 1024)).toFixed(2));

    // 3. Registrar el documento en la base de datos con Prisma
    const nuevoDocumento = await prisma.documento.create({
      data: {
        id_expediente: id_expediente,
        nombre_documento: nombre_documento || file.originalname,
        categoria: categoria,
        url_archivo: fileUrl,
        tamano_mb: sizeInMB,
      },
    });

    return res.status(201).json({
      mensaje: 'Documento subido y registrado exitosamente',
      documento: nuevoDocumento,
    });
  } catch (error) {
    console.error('Error en el controlador:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};