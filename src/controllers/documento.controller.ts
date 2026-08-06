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

export const obtenerDocumentosPorExpediente = async (req: Request, res: Response) => {
  try {
    const { id_expediente } = req.params as { id_expediente: string };

    if (!id_expediente) {
      return res.status(400).json({ error: 'El id_expediente es obligatorio.' });
    }

    const documentos = await prisma.documento.findMany({
      where: {
        id_expediente: id_expediente,
      },
      orderBy: {
        fecha_carga: 'desc', 
      },
    });

    return res.status(200).json({ documentos });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return res.status(500).json({ error: 'Error interno del servidor al consultar documentos.' });
  }
};

export const eliminarDocumento = async (req: Request, res: Response) => {
  try {
    
    const { id_documento } = req.params as { id_documento: string };

    if (!id_documento) {
      return res.status(400).json({ error: 'El id_documento es obligatorio.' });
    }

    const documento = await prisma.documento.findUnique({
      where: { id_documento: id_documento },
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado en la base de datos.' });
    }

    const urlParts = documento.url_archivo.split('/expedientes_documentos/');
    const filePath = urlParts.length > 1 ? urlParts[1] : null;

    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('expedientes_documentos')
        .remove([filePath]);

      if (storageError) {
        console.error('Error eliminando de Supabase:', storageError);
        return res.status(500).json({ error: 'No se pudo eliminar el archivo de la nube.' });
      }
    }
    await prisma.documento.delete({
      where: { id_documento: id_documento },
    });

    return res.status(200).json({ mensaje: 'Documento eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    return res.status(500).json({ error: 'Error interno del servidor al eliminar.' });
  }
};

// Agrega esto al final de tu documento.controller.ts

export const actualizarDocumento = async (req: Request, res: Response) => {
  try {
    const { id_documento } = req.params as { id_documento: string };
    const { nombre_documento, categoria } = req.body;

    if (!id_documento) {
      return res.status(400).json({ error: 'El id_documento es obligatorio.' });
    }

    // Actualizamos el registro en la base de datos con Prisma
    const documentoActualizado = await prisma.documento.update({
      where: { id_documento: id_documento },
      data: {
        ...(nombre_documento && { nombre_documento }),
        ...(categoria && { categoria }),
      },
    });

    return res.status(200).json({ 
      mensaje: 'Documento actualizado exitosamente.',
      documento: documentoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    return res.status(500).json({ error: 'Error interno del servidor al actualizar el documento.' });
  }
};