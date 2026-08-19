import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth';
import { filtroLecturaExpedientes } from '../utils/expediente-access';
import { NotificationService } from '../services/notification.service'; // 🔥 IMPORTAMOS EL SERVICIO DE NOTIFICACIONES

// ─────────────────────────────────────────────
// POST /api/expedientes
// Crear un nuevo expediente
// ─────────────────────────────────────────────
export const createExpediente = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const usuario = req.usuario;

        if (!usuario) {
            res.status(401).json({ error: 'Usuario no autenticado.' });
            return;
        }

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
            equipo,                
            partes,               
            partes_involucradas   
        } = req.body;

        const listaPartes = partes || partes_involucradas;

        // Validación de campos obligatorios
        if (!numero_expediente || !id_cliente || !materia || !estado || !tribunal_juzgado || !fecha_apertura || !descripcion_hechos) {
            res.status(400).json({ error: 'Los campos número de expediente, cliente, materia, estado, tribunal, fecha de apertura y descripción de hechos son obligatorios.' });
            return;
        }

        // Verificar si el expediente ya existe
        const existe = await prisma.expediente.findUnique({
            where: { numero_expediente },
        });

        if (existe) {
            res.status(409).json({ error: `El número de expediente '${numero_expediente}' ya está registrado.` });
            return;
        }

        // Verificar si el cliente existe
        const cliente = await prisma.usuario.findUnique({
            where: { id_usuario: id_cliente },
        });

        if (!cliente) {
            res.status(404).json({ error: 'El cliente especificado no existe.' });
            return;
        }

        // Creación del expediente con relaciones anidadas
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
                
                // Guardar integrantes del equipo (Abogado y Paralegales)
                ...(equipo && equipo.length > 0 && {
                    equipo: {
                        create: equipo.map((m: any) => ({
                            id_usuario: m.id_usuario,
                            rol_en_caso: m.rol_en_caso
                        }))
                    }
                }),

                // Guardar partes involucradas (Demandante y Demandado)
                ...(listaPartes && listaPartes.length > 0 && {
                    partes_involucradas: {
                        create: listaPartes.map((p: any) => ({
                            clasificacion: p.clasificacion,
                            tipo_persona: p.tipo_persona,
                            nombre_completo: p.nombre_completo,
                            identificacion: p.identificacion ?? null,
                            correo_contacto: p.correo_contacto ?? null,
                            direccion: p.direccion ?? null
                        }))
                    }
                })
            },
            include: {
                cliente: {
                    select: { id_usuario: true, nombre: true, correo: true },
                },
                equipo: {
                    include: {
                        user: { select: { id_usuario: true, nombre: true, rol: true, correo: true } },
                    },
                },
                partes_involucradas: true,
            },
        });

        // 🔥 NOTIFICACIÓN 1: Creación de expediente
        // Hacemos el envío de forma asíncrona sin bloquear la respuesta del servidor
        NotificationService.notificarEventoExpediente(
            expediente.id_expediente,
            'Nuevo Expediente Aperturado',
            `Se ha creado el expediente ${numero_expediente} correspondiente a la materia de ${materia}.`,
            'expediente'
        ).catch(err => console.error("Error al notificar creación de expediente:", err));

        res.status(201).json({ message: 'Expediente creado exitosamente.', expediente });
    } catch (error) {
        console.error('Error al crear expediente:', error);
        res.status(500).json({ error: 'Error interno del servidor al crear el expediente.' });
    }
};

// ─────────────────────────────────────────────
// GET /api/expedientes
// Listar expedientes según el usuario
// ─────────────────────────────────────────────
export const getExpedientes = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const usuario = req.usuario;

        if (!usuario) {
            res.status(401).json({ error: 'Usuario no autenticado.' });
            return;
        }

        const { estado, materia, buscar } = req.query as {
            estado?: string;
            materia?: string;
            buscar?: string;
        };

        const filtroUsuario = filtroLecturaExpedientes(usuario);
        if (!filtroUsuario) {
            res.status(403).json({ error: 'No tiene permisos para consultar los expedientes.' });
            return;
        }

        const expedientes = await prisma.expediente.findMany({
            where: {
                ...filtroUsuario,
                ...(estado ? { estado: String(estado) } : {}),
                ...(materia ? { materia: String(materia) } : {}),
                ...(buscar ? {
                    OR: [
                        { numero_expediente: { contains: String(buscar), mode: 'insensitive' } },
                        { tribunal_juzgado: { contains: String(buscar), mode: 'insensitive' } },
                        { descripcion_hechos: { contains: String(buscar), mode: 'insensitive' } },
                    ],
                } : {}),
            },
            include: {
                cliente: {
                    select: { id_usuario: true, nombre: true, correo: true },
                },
                equipo: {
                    include: {
                        user: { select: { id_usuario: true, nombre: true, rol: true, correo: true } },
                    },
                },
                partes_involucradas: true, // Listado devuelve Demandante/Demandado
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
// GET /api/expedientes/:id
// Obtener detalle de un expediente
// ─────────────────────────────────────────────
export const getExpediente = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const usuario = req.usuario;

        if (!usuario) {
            res.status(401).json({ error: 'Usuario no autenticado.' });
            return;
        }

        const { id } = req.params as { id: string };

        const filtroUsuario = filtroLecturaExpedientes(usuario);
        if (!filtroUsuario) {
            res.status(403).json({ error: 'No tiene permisos para consultar este expediente.' });
            return;
        }

        const expediente = await prisma.expediente.findFirst({
            where: {
                id_expediente: id,
                ...filtroUsuario,
            },
            include: {
                cliente: { select: { id_usuario: true, nombre: true, correo: true } },
                equipo: {
                    include: {
                        user: { select: { id_usuario: true, nombre: true, rol: true, correo: true } },
                    },
                },
                partes_involucradas: true,
                citas: {
                    include: { participantes: true },
                },
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
            res.status(404).json({ error: 'Expediente no encontrado o no tiene permisos para visualizarlo.' });
            return;
        }

        res.json(expediente);
    } catch (error) {
        console.error('Error al obtener expediente:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener el expediente.' });
    }
};

// PUT /api/expedientes/:id
export const updateExpediente = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const usuario = req.usuario;
        if (!usuario) {
            res.status(401).json({ error: 'Usuario no autenticado.' });
            return;
        }

        const { id } = req.params as { id: string };

        let filtroUsuario = {};
        if (usuario.rol === 'Abogado' || usuario.rol === 'Paralegal') {
            filtroUsuario = { equipo: { some: { id_usuario: usuario.id_usuario } } };
        } else if (usuario.rol !== 'Administrador') {
            res.status(403).json({ error: 'No tiene permisos para modificar expedientes.' });
            return;
        }

        const existente = await prisma.expediente.findFirst({
            where: { id_expediente: id, ...filtroUsuario },
        });

        if (!existente) {
            res.status(404).json({ error: 'Expediente no encontrado o sin permisos.' });
            return;
        }

        const {
            materia,
            estado,
            tribunal_juzgado,
            juez_cargo,
            cuantia_litigio,
            fecha_apertura,
            descripcion_hechos,
            equipo,
            partes,
            partes_involucradas
        } = req.body;

        const listaPartes = partes_involucradas || partes;

        const expediente = await prisma.expediente.update({
            where: { id_expediente: id },
            data: {
                ...(materia !== undefined && { materia }),
                ...(estado !== undefined && { estado }),
                ...(tribunal_juzgado !== undefined && { tribunal_juzgado }),
                ...(juez_cargo !== undefined && { juez_cargo }),
                ...(cuantia_litigio !== undefined && { cuantia_litigio: cuantia_litigio ? Number(cuantia_litigio) : null }),
                ...(fecha_apertura !== undefined && { fecha_apertura: new Date(fecha_apertura) }),
                ...(descripcion_hechos !== undefined && { descripcion_hechos }),

                // Reemplazo e inserción de partes involucradas
                ...(listaPartes && {
                    partes_involucradas: {
                        deleteMany: {},
                        create: listaPartes.map((p: any) => ({
                            clasificacion: p.clasificacion,
                            tipo_persona: p.tipo_persona || 'Física',
                            nombre_completo: p.nombre_completo,
                            identificacion: p.identificacion ?? null,
                            correo_contacto: p.correo_contacto ?? null,
                            direccion: p.direccion ?? null
                        }))
                    }
                }),

                // Reemplazo e inserción de integrantes del equipo
                ...(equipo && {
                    equipo: {
                        deleteMany: {},
                        create: equipo.map((m: any) => ({
                            id_usuario: m.id_usuario,
                            rol_en_caso: m.rol_en_caso
                        }))
                    }
                })
            },
            include: {
                cliente: { select: { id_usuario: true, nombre: true, correo: true } },
                equipo: {
                    include: { user: { select: { id_usuario: true, nombre: true, rol: true, correo: true } } },
                },
                partes_involucradas: true,
            },
        });

        NotificationService.notificarEventoExpediente(
            expediente.id_expediente,
            'Actualización en su Expediente',
            `Se han realizado actualizaciones en la información del expediente ${existente.numero_expediente}.`,
            'estado'
        ).catch(err => console.error("Error al notificar actualización:", err));

        res.json({ message: 'Expediente actualizado exitosamente.', expediente });
    } catch (error) {
        console.error('Error al actualizar expediente:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el expediente.' });
    }
};

// ─────────────────────────────────────────────
// DELETE /api/expedientes/:id
// Eliminar un expediente
// ─────────────────────────────────────────────
export const deleteExpediente = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const usuario = req.usuario;

        if (!usuario) {
            res.status(401).json({ error: 'Usuario no autenticado.' });
            return;
        }

        const { id } = req.params as { id: string };

        let filtroUsuario = {};

        if (usuario.rol === 'Abogado' || usuario.rol === 'Paralegal') {
            filtroUsuario = {
                equipo: {
                    some: { id_usuario: usuario.id_usuario },
                },
            };
        } else if (usuario.rol !== 'Administrador') {
            res.status(403).json({ error: 'No tiene permisos para eliminar expedientes.' });
            return;
        }

        const existente = await prisma.expediente.findFirst({
            where: {
                id_expediente: id,
                ...filtroUsuario,
            },
        });

        if (!existente) {
            res.status(404).json({ error: 'Expediente no encontrado o no tiene permisos para eliminarlo.' });
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

// ─────────────────────────────────────────────
// POST /api/expedientes/:id/equipo
// Asignar un Abogado o Paralegal a un expediente
// ─────────────────────────────────────────────
export const asignarUsuarioExpediente = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const usuario = req.usuario;

        if (!usuario) {
            res.status(401).json({ error: 'Usuario no autenticado.' });
            return;
        }

        // Solo el Administrador puede realizar asignaciones
        if (usuario.rol !== 'Administrador') {
            res.status(403).json({ error: 'Solo el Administrador puede asignar usuarios a un expediente.' });
            return;
        }

        const { id } = req.params as { id: string };
        const { id_usuario, rol_en_caso } = req.body;

        if (!id_usuario || !rol_en_caso) {
            res.status(400).json({ error: 'Los campos id_usuario y rol_en_caso son obligatorios.' });
            return;
        }

        if (rol_en_caso !== 'Abogado' && rol_en_caso !== 'Paralegal') {
            res.status(400).json({ error: 'El rol en el caso debe ser Abogado o Paralegal.' });
            return;
        }

        const expediente = await prisma.expediente.findUnique({
            where: { id_expediente: id },
        });

        if (!expediente) {
            res.status(404).json({ error: 'Expediente no encontrado.' });
            return;
        }

        const usuarioAsignar = await prisma.usuario.findUnique({
            where: { id_usuario },
        });

        if (!usuarioAsignar) {
            res.status(404).json({ error: 'El usuario que intenta asignar no existe.' });
            return;
        }

        if (usuarioAsignar.rol !== 'Abogado' && usuarioAsignar.rol !== 'Paralegal') {
            res.status(400).json({ error: 'Solo se pueden asignar usuarios con rol Abogado o Paralegal.' });
            return;
        }

        const asignacionExistente = await prisma.expedienteEquipo.findFirst({
            where: {
                id_expediente: id,
                id_usuario,
            },
        });

        if (asignacionExistente) {
            res.status(409).json({ error: 'El usuario ya está asignado a este expediente.' });
            return;
        }

        const asignacion = await prisma.expedienteEquipo.create({
            data: {
                id_expediente: id,
                id_usuario,
                rol_en_caso,
            },
            include: {
                user: {
                    select: { id_usuario: true, nombre: true, correo: true, rol: true },
                },
                expediente: {
                    select: { id_expediente: true, numero_expediente: true },
                },
            },
        });

        // 🔥 NOTIFICACIÓN 3: Asignación de equipo
        NotificationService.notificarEventoExpediente(
            asignacion.id_expediente,
            'Nuevo Integrante en el Equipo',
            `Se ha asignado a ${usuarioAsignar.nombre} con el rol de ${rol_en_caso} para el expediente ${expediente.numero_expediente}.`,
            'equipo'
        ).catch(err => console.error("Error al notificar asignación de equipo:", err));

        res.status(201).json({ message: 'Usuario asignado al expediente exitosamente.', asignacion });
    } catch (error) {
        console.error('Error al asignar usuario al expediente:', error);
        res.status(500).json({ error: 'Error interno del servidor al asignar el usuario al expediente.' });
    }
};