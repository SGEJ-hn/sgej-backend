import { Request, Response } from 'express';
import { supabase } from '../config/storage';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const sanitizeFilename = (filename: string): string => {
  return filename
    .normalize("NFD") 
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-zA-Z0-9.-]/g, "_");
};

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

    const cleanOriginalName = sanitizeFilename(file.originalname);
    const fileName = `${Date.now()}_${cleanOriginalName}`;
    const filePath = `expedientes/${id_expediente}/${fileName}`;

    console.log('Ruta limpia a subir en Storage:', filePath);
    console.log('ID Expediente recibido:', id_expediente);

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

    const { data: publicUrlData } = supabase.storage
      .from('expedientes_documentos')
      .getPublicUrl(filePath);

    const fileUrl = publicUrlData.publicUrl;
    const sizeInMB = parseFloat((file.size / (1024 * 1024)).toFixed(2));
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