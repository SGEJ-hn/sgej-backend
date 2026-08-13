export interface EventoHistorial {
  id_historial: string;
  id_expediente: string;
  id_autor: string;
  categoria_evento: string;
  titulo_evento: string;
  descripcion: string;
  fecha_modificacion: Date;
  autor?: {
    nombre: string;
  };
}