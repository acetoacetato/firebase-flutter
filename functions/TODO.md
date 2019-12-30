# TODO

- [x] Implementar Contratar Servicio.
- [x] Implementar Confirmar/Rechazar Contratación (junto con todo el sistema de match).
- [ ] Agregar al historial de pedidos el nombre del prestador junto al tipo de servicio prestado.
- [ ] Agregar metodo de pago khipu.
- [x] Agregar el  "Seleccionar servicio a realizar" al trabajador.
- [x] Function obtener ofertas de trabajo.
- [x] El trabajador debe tener variable "modo_emergencia".
- [x] Status para status en servicioContratado: pendiente, realizado, contratado.
- [ ] Para eliminar un servicio, quitar servicio de todos los trabajadores que lo tengan.
- [x] Crear función extra, asincrona, que re calcule todos los puntajes para el ranking.
- [x] Agregar precio promedio a servicios.
- [x] Agregar Sistema para match
- [ ] Agregar sistema para arreglar bloqueos.

PAra el match:
    Al crear la solicitud, colocar de nombre al prestador de servicio disponible con mejor ranking.
    El trabajador realiza la consulta, si lo rechaza, le cambia el id del prestador de servicio sgte en la lista.
Agregado booleanos para disponibilidad y para modo emergencia.
  