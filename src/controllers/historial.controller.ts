import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { filtroLecturaExpedientes } from '../utils/expediente-access';


export const obtenerHistorialExpediente = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id_expediente } = req.params as { id_expediente: string };
    const { categoria } = req.query as { categoria?: string };
    
    // 👇 NUEVO: Parámetros de paginación con valores por defecto
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    if (!id_expediente) {
      return res.status(400).json({ error: 'El id_expediente es requerido.' });
    }

    const filtroAcceso = req.usuario ? filtroLecturaExpedientes(req.usuario) : null;
    const expedienteAutorizado = filtroAcceso && await prisma.expediente.findFirst({
      where: { id_expediente, ...filtroAcceso }, select: { id_expediente: true }
    });
    if (!expedienteAutorizado) {
      return res.status(403).json({ error: 'No tiene permisos para consultar el historial de este expediente.' });
    }

    const dondeFiltro: any = { id_expediente };

    // Filtros de compatibilidad
    if (categoria && categoria !== 'Todos') {
      if (categoria === 'Citas') {
        dondeFiltro.categoria_evento = { in: ['Citas', 'Audiencia', 'Audiencias'] };
      } else if (categoria === 'Expediente') {
        dondeFiltro.categoria_evento = { in: ['Expediente', 'Resoluciones', 'EXPEDIENTE'] };
      } else if (categoria === 'Documentos') {
        dondeFiltro.categoria_evento = { in: ['Documentos', 'Escritos'] };
      } else {
        dondeFiltro.categoria_evento = categoria;
      }
    }

    // 👇 NUEVO: Contamos el total de registros para saber cuántas páginas habrá
    const totalRegistros = await prisma.historialExpediente.count({
      where: dondeFiltro,
    });
    const totalPaginas = Math.ceil(totalRegistros / limit);

    // Aplicamos skip y take a la consulta
    const historial = await prisma.historialExpediente.findMany({
      where: dondeFiltro,
      skip: skip,
      take: limit,
      include: {
        autor: {
          select: { nombre: true, rol: true },
        },
      },
      orderBy: { fecha_modificacion: 'desc' },
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
      total_paginas: totalPaginas, // 👈 Enviamos el total de páginas
      pagina_actual: page,         // 👈 Enviamos la página actual
      numero_expediente: numExp,
      nombre_cliente: nombreCliente,
      historial,
    });
  } catch (error) {
    console.error('Error al obtener el historial:', error);
    return res.status(500).json({ error: 'Error al consultar el historial del expediente.' });
  }
};
