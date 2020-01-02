# Guia de esta cosa

  

Unas definiciones:

- Servicio: El servicio posible a realizar (fontanería, jardinería, etc).

- Trabajo: Solicitud de un servicio por parte de un cliente.

- Trabajador: el prestador del servicio.

- Usuario: el cliente que solicita el servicio.

  

Las rutas son las sgtes

  

## Rutas para el usuario

  

Estas rutas son para ser realizadas desde las vistas como usuario.

### registraUsuario
Agrega el usuario a la base de datos (previo debió hacerse el registro con el sdk de firebase).
Sólo registrará usuarios normales (no trabajadores) por ahora.
Via POST

- Recibe:
	> **idUsr**: el id del usuario
	> **mail**: el mail del usuario
	> **nombre**: nombre del usuario
	> **nacimiento**: fecha de nacimiento
- Retorna:
	> **result**: success o error
	> **message**

### datosUsuario
via GET, retorna los datos del usuario especificado.

- Recibe:
  	> **idUsr**: el id del usuario
- Retorna:
	> **id**: id del usuario
	> **data**: datos del usuario.

### carousel
Retorna los datos de la cosa de arriba de la vista.


 ### serviciosDisponibles
Retorna una lista con todos los servicios disponibles en la aplicación.
- Retorna:
	> **servicios**: lista con todos los servicios

### serviciosPopulares

  

No recibe nada, usa GET. Retorna los primeros 6 servicios, ordenados por popularidad.

Se entiende como popularidad por cantidad total de solicitudes.
- retorna:
	> servicios : lista de servicios.
  

### historialPedidos

  

Recibe el UID del usuario, via GET. Retorna una lista con todos los pedidos realizados por el usuario.

  
- Recibe:
	> **idUsr** : el id del usuarios
- Retorna:
	> **servicios**: lista de servicios
  

### eliminaFavoritos

  

Recibe el UID del usuario y el id del servicio, via POST. Elimina el servicio de la lista de favoritos del usuario.

  
- Recibe:
	> **idUsr** : el id del usuario
	> **idServ** : id del servicio
- Retorna:
	> **result** : success o error
	> **message**

  

### agregaFavoritos


Recibe el UID del usuario y el id del servicio, via POST. Agrega el servicio a la lista de favoritos del usuario.

# verServicio

Retorna los datos de un servicio específico.

- Recibe:
	> **idServ**: id del servicio.
	> **idUsr**: id del usuario iniciado.
- Retorna:
	> cantServicios : La cantidad de trabajadores que ofrecen ese servicio.
	> descripcion : la descripción del servicio.
	> img_url: la url de la imágen de presentación.
	> nombre: el nombre del servicio.
	> precioProm: el precio promedio de las visitas por ese servicio.
	> precioPromE: el precio promedio de visitas de emergencia.
	> solicitudes: la cantidad total de solicitudes

  
- Recibe
	> **idUsr** : el id del usuario
	> **idServ** : id del servicio
- Retorna:
	> **result** : success o error
	> **message**
### verFavoritos

Recibe el UID del usuario, via GET. Retorna la lista de favoritos del usuario.

- Recibe
	> **idUsr**: el id del usuario
- Retorna:
	> **favoritos** : lista de servicios

### cancelarServicio

  

Recibe el UID del usuario, via POST. Cancela el servicio pendiente o con el trabajador en camino, si es que existen.

Se asume que sólo existe una solicitud pendiente

  
- Recibe:
	> **idUsr** : el id del usuario
- Retorna:
	> **result** : success o error
	> **message**
  

### pedirServicio

  

Recibe el UID del usuario, el id del servicio a contratar, la hora del servicio, la dirección donde se irá a hacer el servicio y si es emergencia, via POST. Agrega una solicitud de servicio por parte del usuario en el sistema.

  

- Recibe:
	> ***idServ*** : el id del servicio a solicitar.
	> ***idUsr*** : id del usuario solicitante.
	> ***horaServicio*** : fecha y hora en que se solicita, si es emergencia se puede omitir.
	> ***direccion*** : ubicación donde se tendrá que dirigir el trabajador.
	> ***emergencia*** : booleano para saber si es un servicio de emergencia.

- Retorna:
	> **result**: success o error
	> **id**: en caso de success, el id de la solicitud

  

### verSolicitud

  

- Recibe  el id de la solicitud. Retorna el estado de la solicitud.
	> **idSol** : id de la solicitud.
- Retorna:
	> **result**: success o error
	> **status**: el estado de la solicitud ('pendiente', 'contratado' o 'no_disponible'). Si es no_disponible, no hay trabajadores que acepten la solicitud.
  
 ### mandarCalificacion
 Manda una calificación a un servicio realizado
 - Recibe:
	 > **idUsr** : el id del usuario
	 > **idSol**: id del trabajo.
	 > **cal**: calificación que da el usuario al trabajo.
 - Retorna:
	 > **result**: success o error
	 > **message**

## Rutas para el trabajador

  

### modoEmergencia

  

Recibe el UID del usuario, via POST. Cambia el estado de emergencia (Si atiende en modo emergencia o no).

- Recibe:
	> **idUsr** : el id del usuario.
- Retorna:
	> **result**: success o error
	> **message** 

  

### realizarServicio

Recibe el UID del trabajador, el id del servicio a realizar, el precio de la visita y el precio de la visita en emergencia. Agrega un servicio a realizar (como fontanería, jardinería, etc) si es que no existe.

- Recibe:
	> **idUsr**: id del trabajador
	> **serv** : id del servicio a realizar.
	> **precioE** : precio de emergencia
	> **precio**: precio de visita
- Retorna:
	> **result**: success o error
	> **message**


### buscarTrabajo
Obtiene los datos de un trabajo disponible para el trabajador
- Recibe:
	> **idUsr**: id del trabajador
- Retorna:
	> **id**: el id de la solicitud
	> **data**: los datos de la solicitud
	
### aceptarSolicitud
Acepta un trabajo
- Recibe:
	> **idUsr**: id del trabajador
	> **idSol**: id de la solicitud
- Retorna:
	> **result**: success o error
	> **message**

### rechazarSolicitud
Rechaza un trabajo
- Recibe:
	> **idUsr**: id del trabajador
	> **idSol**: id de la solicitud
- Retorna:
	> **result**: success o error
	> **message**
### terminarTrabajo
Da por terminado el trabajo, pasando a estar disponible.

- Recibe:
	> **idUsr**: el id del trabajador.
	> **idSol**: el id del trabajo realizado.
- Retorna:
	> **result**: success o error
	> **message**

### terminarTrabajo
Muestra los trabajos en los que está contratado y no ha comenzado.

- Recibe:
	> **idUsr**: el id del trabajador.
	> **idSol**: el id del trabajo realizado.
- Retorna:
	> **result**: success o error
	> **message**


### trabajosPendientes

Muestra los trabajos que el usuario ingresado está contratado.

- Recibe:
	> **idUsr**: el id del usuario.
- Retorna:
	> **trabajos** : lista de solicitudes.