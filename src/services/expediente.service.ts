import { Observable } from 'rxjs';

// Asegúrate de tener tu interfaz importada o definida
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

// Dentro de tu clase de servicio:
obtenerHistorialExpediente(idExpediente: string): Observable<any> {
  // Ajusta 'this.apiUrl' según cómo tengas configurada tu URL base
  return this.http.get(`${this.apiUrl}/expedientes/${idExpediente}/historial`);
}