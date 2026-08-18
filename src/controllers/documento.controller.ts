import { Response } from 'express';
import { supabase } from '../config/storage';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { filtroGestionExpedientes, filtroLecturaExpedientes } from '../utils/expediente-access';

import { registrarEventoHistorial } from '../services/historial.service';

const sanitizeFilename = (filename: string): string => {
  return filename
    .normalize("NFD") 
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-zA-Z0-9.-]/g, "_");
};

// Función auxiliar segura para extraer el ID del usuario
const obtenerIdUsuario = (req: AuthenticatedRequest): string | null => req.usuario?.id_usuario ?? null;

const tieneAccesoExpediente = async (req: AuthenticatedRequest, id_expediente: string, requiereGestion: boolean) => {
  if (!req.usuario) return false;
  const filtro = requiereGestion ? filtroGestionExpedientes(req.usuario) : filtroLecturaExpedientes(req.usuario);
  if (!filtro) return false;
  return Boolean(await prisma.expediente.findFirst({
    where: { id_expediente, ...filtro }, select: { id_expediente: true }
  }));
};

export const subirDocumento = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const file = req.file;
    const { id_expediente, categoria, nombre_documento } = req.body;
    const id_autor = obtenerIdUsuario(req);

    if (!file) {
      return res.status(400).json({ error: 'No se adjuntó ningún archivo.' });
    }

    if (!id_expediente || !categoria) {
      return res.status(400).json({ error: 'id_expediente y categoria son obligatorios.' });
    }

    if (!(await tieneAccesoExpediente(req, id_expediente, true))) {
      return res.status(403).json({ error: 'No tiene permisos para subir documentos a este expediente.' });
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

    // 🌟 Registro en Historial
    if (id_autor) {
      await registrarEventoHistorial({
        id_expediente: id_expediente,
        id_autor: id_autor,
        categoria_evento: 'Documentos',
        titulo_evento: nuevoDocumento.nombre_documento,
        descripcion: `Se adjuntó el documento "${nuevoDocumento.nombre_documento}" en la categoría ${categoria}.`,
      });
    } else {
      console.warn('[Historial] No se registró el evento porque no se encontró el id_autor del usuario.');
    }

    return res.status(201).json({
      mensaje: 'Documento subido y registrado exitosamente',
      documento: nuevoDocumento,
    });
  } catch (error) {
    console.error('Error en el controlador:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

export const obtenerDocumentosPorExpediente = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id_expediente } = req.params as { id_expediente: string };
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const skip = (page - 1) * limit;

    if (!id_expediente) {
      return res.status(400).json({ error: 'El id_expediente es obligatorio.' });
    }

    if (!(await tieneAccesoExpediente(req, id_expediente, false))) {
      return res.status(403).json({ error: 'No tiene permisos para consultar documentos de este expediente.' });
    }

    const dondeFiltro: any = {
      id_expediente: id_expediente,
    };

    if (search.trim() !== '') {
      dondeFiltro.OR = [
        { nombre_documento: { contains: search, mode: 'insensitive' } },
        { categoria: { contains: search, mode: 'insensitive' } }
      ];
    }

    const totalRegistros = await prisma.documento.count({
      where: dondeFiltro,
    });
    const totalPaginas = Math.ceil(totalRegistros / limit);

    const documentos = await prisma.documento.findMany({
      where: dondeFiltro, 
      skip: skip,
      take: limit,
      orderBy: {
        fecha_carga: 'desc', 
      },
    });

    const expedienteInfo = await prisma.expediente.findUnique({
      where: { id_expediente },
      select: { 
        numero_expediente: true,
        partes_involucradas: {
          where: { clasificacion: 'Demandante' },
          select: { nombre_completo: true },
          take: 1
        }
      }
    });

    const numExp = expedienteInfo?.numero_expediente || 'Número no encontrado';
    const nombreCliente = expedienteInfo?.partes_involucradas?.[0]?.nombre_completo || 'Sin Cliente Asignado';

    return res.status(200).json({ 
      total: totalRegistros,
      total_paginas: totalPaginas,
      pagina_actual: page,
      documentos,
      numero_expediente: numExp,
      nombre_cliente: nombreCliente
    });
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return res.status(500).json({ error: 'Error interno del servidor al consultar documentos.' });
  }
};

export const eliminarDocumento = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id_documento } = req.params as { id_documento: string };
    const id_autor = obtenerIdUsuario(req);

    if (!id_documento) {
      return res.status(400).json({ error: 'El id_documento es obligatorio.' });
    }

    const documento = await prisma.documento.findUnique({
      where: { id_documento: id_documento },
    });

    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado en la base de datos.' });
    }

    if (!(await tieneAccesoExpediente(req, documento.id_expediente, true))) {
      return res.status(403).json({ error: 'No tiene permisos para eliminar este documento.' });
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

    // 🌟 Registro en Historial
    if (id_autor) {
      await registrarEventoHistorial({
        id_expediente: documento.id_expediente,
        id_autor: id_autor,
        categoria_evento: 'Documentos',
        titulo_evento: 'Documento Eliminado',
        descripcion: `Se eliminó el documento "${documento.nombre_documento}".`,
      });
    } else {
      console.warn('[Historial] No se registró la eliminación porque no se encontró el id_autor del usuario.');
    }

    return res.status(200).json({ mensaje: 'Documento eliminado exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    return res.status(500).json({ error: 'Error interno del servidor al eliminar.' });
  }
};

export const actualizarDocumento = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id_documento } = req.params as { id_documento: string };
    const { nombre_documento, categoria } = req.body;
    const id_autor = obtenerIdUsuario(req);

    if (!id_documento) {
      return res.status(400).json({ error: 'El id_documento es obligatorio.' });
    }

    const documentoExistente = await prisma.documento.findUnique({
      where: { id_documento }, select: { id_expediente: true }
    });
    if (!documentoExistente) {
      return res.status(404).json({ error: 'Documento no encontrado.' });
    }
    if (!(await tieneAccesoExpediente(req, documentoExistente.id_expediente, true))) {
      return res.status(403).json({ error: 'No tiene permisos para modificar este documento.' });
    }

    const documentoActualizado = await prisma.documento.update({
      where: { id_documento: id_documento },
      data: {
        ...(nombre_documento && { nombre_documento }),
        ...(categoria && { categoria }),
      },
    });

    // 🌟 Registro en Historial
    if (id_autor) {
      await registrarEventoHistorial({
        id_expediente: documentoActualizado.id_expediente,
        id_autor: id_autor,
        categoria_evento: 'Documentos',
        titulo_evento: 'Documento Modificado',
        descripcion: `Se actualizaron los datos del documento "${documentoActualizado.nombre_documento}".`,
      });
    } else {
      console.warn('[Historial] No se registró la actualización porque no se encontró el id_autor del usuario.');
    }

    return res.status(200).json({ 
      mensaje: 'Documento actualizado exitosamente.',
      documento: documentoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    return res.status(500).json({ error: 'Error interno del servidor al actualizar el documento.' });
  }
};
