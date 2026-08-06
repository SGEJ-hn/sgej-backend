import { Request, Response } from 'express';
import { prisma } from '../config/db';

// ─────────────────────────────────────────────
// POST /api/expedientes — Crear un nuevo expediente
// ─────────────────────────────────────────────
export const createExpediente = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      numero_expediente,
      id_cliente,
      materia,
      estado,
      tribunal_juzgado,
      juez_cargo,
      cuantia_litigio,
      fecha_apertura,
      descripcion_hechos,
    } = req.body;

    // Validación de campos obligatorios
    if (!numero_expediente || !id_cliente || !materia || !estado || !tribunal_juzgado || !fecha_apertura || !descripcion_hechos) {
      res.status(400).json({ error: 'Los campos número de expediente, cliente, materia, estado, tribunal, fecha de apertura y descripción de hechos son obligatorios.' });
      return;
    }

    // Verificar que el número de expediente no esté duplicado
    const existe = await prisma.expediente.findUnique({
      where: { numero_expediente },
    });
    if (existe) {
      res.status(409).json({ error: `El número de expediente '${numero_expediente}' ya está registrado.` });
      return;
    }

    // Verificar que el cliente (usuario) existe
    const cliente = await prisma.usuario.findUnique({
      where: { id_usuario: id_cliente },
    });
    if (!cliente) {
      res.status(404).json({ error: 'El cliente especificado no existe.' });
      return;
    }

    const expediente = await prisma.expediente.create({
      data: {
        numero_expediente,
        id_cliente,
        materia,
        estado,
        tribunal_juzgado,
        juez_cargo: juez_cargo ?? null,
        cuantia_litigio: cuantia_litigio ?? null,
        fecha_apertura: new Date(fecha_apertura),
        descripcion_hechos,
      },
      include: {
        cliente: {
          select: { id_usuario: true, nombre: true, correo: true },
        },
      },
    });

    res.status(201).json({ message: 'Expediente creado exitosamente.', expediente });
  } catch (error) {
    console.error('Error al crear expediente:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear el expediente.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/expedientes — Listar todos los expedientes
// ─────────────────────────────────────────────
export const getExpedientes = async (req: Request, res: Response): Promise<void> => {
  try {
const { estado, materia, buscar } = req.query as { estado?: string; materia?: string; buscar?: string };

    const expedientes = await prisma.expediente.findMany({
      where: {
        ...(estado ? { estado: String(estado) } : {}),
        ...(materia ? { materia: String(materia) } : {}),
        ...(buscar
          ? {
              OR: [
                { numero_expediente: { contains: String(buscar), mode: 'insensitive' } },
                { tribunal_juzgado: { contains: String(buscar), mode: 'insensitive' } },
                { descripcion_hechos: { contains: String(buscar), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        cliente: {
          select: { id_usuario: true, nombre: true, correo: true },
        },
        equipo: {
          include: {
            user: { select: { id_usuario: true, nombre: true, rol: true } },
          },
        },
      },
      orderBy: { fecha_apertura: 'desc' },
    });

    res.json({ total: expedientes.length, expedientes });
  } catch (error) {
    console.error('Error al listar expedientes:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener los expedientes.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/expedientes/:id — Obtener un expediente por ID
// ─────────────────────────────────────────────
export const getExpediente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const expediente = await prisma.expediente.findUnique({
      where: { id_expediente: id },
      include: {
        cliente: {
          select: { id_usuario: true, nombre: true, correo: true },
        },
        equipo: {
          include: {
            user: { select: { id_usuario: true, nombre: true, rol: true } },
          },
        },
        partes_involucradas: true,
        citas: true,
        documentos: true,
        historial: {
          include: {
            autor: { select: { id_usuario: true, nombre: true } },
          },
          orderBy: { fecha_modificacion: 'desc' },
        },
      },
    });

    if (!expediente) {
      res.status(404).json({ error: 'Expediente no encontrado.' });
      return;
    }

    res.json(expediente);
  } catch (error) {
    console.error('Error al obtener expediente:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener el expediente.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/expedientes/:id — Actualizar un expediente
// ─────────────────────────────────────────────
export const updateExpediente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const {
      materia,
      estado,
      tribunal_juzgado,
      juez_cargo,
      cuantia_litigio,
      fecha_apertura,
      descripcion_hechos,
    } = req.body;

    // Verificar que el expediente existe
    const existente = await prisma.expediente.findUnique({
      where: { id_expediente: id },
    });
    if (!existente) {
      res.status(404).json({ error: 'Expediente no encontrado.' });
      return;
    }

    const expediente = await prisma.expediente.update({
      where: { id_expediente: id },
      data: {
        ...(materia !== undefined && { materia }),
        ...(estado !== undefined && { estado }),
        ...(tribunal_juzgado !== undefined && { tribunal_juzgado }),
        ...(juez_cargo !== undefined && { juez_cargo }),
        ...(cuantia_litigio !== undefined && { cuantia_litigio }),
        ...(fecha_apertura !== undefined && { fecha_apertura: new Date(fecha_apertura) }),
        ...(descripcion_hechos !== undefined && { descripcion_hechos }),
      },
      include: {
        cliente: {
          select: { id_usuario: true, nombre: true, correo: true },
        },
      },
    });

    res.json({ message: 'Expediente actualizado exitosamente.', expediente });
  } catch (error) {
    console.error('Error al actualizar expediente:', error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar el expediente.' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/expedientes/:id — Eliminar un expediente
// ─────────────────────────────────────────────
export const deleteExpediente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    // Verificar que el expediente existe
    const existente = await prisma.expediente.findUnique({
      where: { id_expediente: id },
    });
    if (!existente) {
      res.status(404).json({ error: 'Expediente no encontrado.' });
      return;
    }

    await prisma.expediente.delete({
      where: { id_expediente: id },
    });

    res.json({ message: `Expediente '${existente.numero_expediente}' eliminado exitosamente.` });
  } catch (error) {
    console.error('Error al eliminar expediente:', error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar el expediente.' });
  }
};
