# Guia de la api

El glosario es el sgte:
    - Servicio: El servicio posible a realizar (fontanería, jardinería, etc).
    - Trabajo: Solicitud de un servicio por parte de un cliente.
    - Trabajador: el prestador del servicio.
    - Usuario: el cliente que solicita el servicio.

Las rutas son las sgtes

## Rutas para el usuario

 Estas rutas son para ser realizadas desde las vistas como usuario que solicita el servicio

### serviciosPopulares

No recibe nada, usa GET. Retorna los primeros 6 servicios, ordenados por popularidad.
Se entiende como popularidad por cantidad total de solicitudes.

### historialPedidos

Recibe el UID del usuario, via GET. Retorna una lista con todos los pedidos realizados por el usuario.

### eliminaFavoritos

Recibe el UID del usuario y el id del servicio, via POST. Elimina el servicio de la lista de favoritos del usuario.

### agregaFavoritos

Recibe el UID del usuario y el id del servicio, via POST. Agrega el servicio a la lista de favoritos del usuario.

### cancelarServicio

Recibe el UID del usuario, via POST. Cancela el servicio pendiente o con el trabajador en camino, si es que existen.

### pedirServicio

Recibe el UID del usuario, el id del servicio a contratar, la hora del servicio, la dirección donde se irá a hacer el servicio y si es emergencia, via POST. Agrega una solicitud de servicio por parte del usuario en el sistema.

## Rutas para el trabajador

### modoEmergencia

Recibe el UID del usuario, via POST. Cambia el estado de emergencia (Si atiende en modo emergencia o no).

### realizarServicio

Recibe el UID del trabajador, el id del servicio a realizar, el precio de la visita y el precio de la visita en emergencia. Agrega un servicio a realizar (como fontanería, jardinería, etc) si es que no existe.
