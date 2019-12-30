const functions = require("firebase-functions");
const admin = require("firebase-admin");
var serviceAccount = require("./testflutter-2a3a0-firebase-adminsdk-x5jfn-c467f7ccde.json");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const escapeHtml = require('escape-html');



//Inicializa con las credenciales del archivo, para poder
//  escribir sobre firestore
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://testflutter-2a3a0.firebaseio.com"
});

//Inicializa las cosas necesarias
const db = admin.firestore();
const app = express();
const main = express();

app.use(cors({ origin: true }));

//Función que retorna todos los registros que tengan el mismo nombre
// que lo pasado por POST
exports.api = functions.https.onRequest(async (req, res) =>{
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    const db = admin.firestore();
    cosas = {};
    console.log(req.query.nombre);
    if (req.method === 'GET') {
        var query = db.collection('garabatos').where('nombre', '==', req.query.nombre.toString());
        var queryRes = await query.get().catch(err => { res.json(err); });
        console.log(queryRes);
        queryRes.forEach(doc => {
            console.log(doc.data());
            cosas[doc.id] = doc.data();
        });

        res.json(cosas);
      }
});

//Función que le suma 1 al primer registro con nombre ingresado por POST
exports.updateNumber = functions.https.onRequest(async (req, res) =>{

    //Headers necesarios para que funke la api rest
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    //Referencia a la base de datos
    const db = admin.firestore();
    let nombre;
    if (req.method === 'POST') {
        //Se obtiene el valor de la clave "nombre" dentro
        //  del json del body de la solicitud
        ({nombre} = req.body);
    } else {
        //En caso que el método no sea post, se manda error
        res.send('Faltan datos en la solicitud');
    }
    //Se inicia una query
    var query = db.collection('garabatos').where('nombre', '==',nombre);

    //Se ejecuta la query
    var queryRes = await query.get().catch(err => { res.json(err); });

    //Si no hay documentos que coincidan con ese nombre
    if(queryRes.empty){
        res.send(`Hello ${escapeHtml(nombre || 'World')}, no existes`);
    }

    //Se obtiene el primer elemento de la query
    var item = queryRes.docs[0];
    
    //Esto es para ver los datos estos por los registros
    //  de firebase
    console.log(item.id);
    console.log(item.data());

    //Uso el id del documento para actualizar la clave
    //  "cantidad" con el valor+1
    db.collection("garabatos").doc(item.id).update({
        "cantidad": item.data().cantidad + 1
    });

    //Mando una respuesta genérica, hay que ver como mandar su success piola
    res.send(`Hello ${escapeHtml(nombre || 'World')} json = ${item.data().cantidad + 1}!`);

    
    
});

exports.serviciosPopulares = functions.https.onRequest(async (req, res) => {
    //Headers necesarios para que funke la api rest
    res.header('Content-Type', 'application/json');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    //Referencia a la base de datos
    const db = admin.firestore();
    //if (req.method !== 'GET') {
    //    //En caso que el método no sea post, se manda error
    //    res.send('Debe ser GET');
    //}

    //Se inicia una query
    var query = db.collection('Servicios').orderBy('solicitudes', "desc").limit(6);

    //Se ejecuta la query
    var queryRes = await query.get().catch(err => { res.json(err); });
    var resultados = {servicios: []};
    if(queryRes.empty){
        res.send(JSON.stringify(resultados));
    }
    queryRes.forEach((doc) => {
        resultados.servicios.push({id : doc.id, data: doc.data()});
    });
    res.send(resultados);

});

exports.serviciosDisponibles = functions.https.onRequest(async (req, res) => {
    //Referencia a la base de datos
    const db = admin.firestore();
    if (req.method !== 'GET') {
        //En caso que el método no sea post, se manda error
        res.send({'result' : 'error', 'message' : 'Método incorrecto.'});
        return;
    }

    //Se inicia una query
    var query = db.collection('Servicios').orderBy('solicitudes', "desc");

    //Se ejecuta la query
    var queryRes = await query.get().catch(err => { res.json(err); });
    var resultados = {servicios: []};
    if(queryRes.empty){
        res.send(resultados);
        return;
    }
    queryRes.forEach((doc) => {
        resultados.servicios.push({id : doc.id, data: doc.data()});
    });
    res.send(resultados);

});


exports.agregaFavoritos = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
    }

    ({idUsr} = req.body);
    ({idServ} = req.body);

    if(idUsr === null || idServ === null){
        res.send({'result' : 'error', 'message' : 'Faltan datos'});
    }

    var query = await db.collection('Usuarios').doc(idUsr).update({
        serviciosFav: admin.firestore.FieldValue.arrayUnion(idServ)
    }).catch(err => { res.send(err) });

    res.send({'result' : 'success', 'message' : 'agregado correctamente'});

});





exports.eliminaFavoritos = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
    }

    ({idUsr} = req.body);
    ({idServ} = req.body);

    if(idUsr === null || idServ === null){
        res.send({'result' : 'error', 'message' : 'Faltan datos'});
    }

    var query = await db.collection('Usuarios').doc(idUsr).update({
        serviciosFav: admin.firestore.FieldValue.arrayRemove(idServ)
    }).catch(err => { res.send(err) });

    res.send({'result' : 'success', 'message' : 'eliminado correctamente'});

});



exports.historialPedidos = functions.https.onRequest(async (req, res) => {
    const db = admin.firestore();

    var idUsr = req.query.idUsr.toString();
    console.log(idUsr);
    if(req.query.idUsr === null){
        res.send({'result': 'error', 'message' : 'faltan datos (idUsr)'});
        return;
    }
    //TODO: agregar tipo de servicio y nombre del prestador al json
    var query = db.collection('ServiciosRealizados').where('cliente', '==', idUsr).where('status', '==', 'realizado');
    console.log(typeof(query));
    queryRes = await query.get().catch((err) => { res.send(err)});
    var servicios = {"servicios" : [] };
    if(queryRes.empty){
        console.log('vacio');
        res.send(servicios);
        return;
    }else{
        queryRes.forEach( (doc) => {
            servicios.servicios.push({"id" : doc.id, "data" : doc.data()});
        });
    }

    res.send(servicios);

});

// Recibe idUsr, idServ, emergencia, horario de contratacion, direccion contratador
//   Genera una solicitud de servicio si es que todo es correcto y el usuario no
//   tenga una solicitud en pendiente aún.
exports.pedirServicio = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'método incorrecto'});
    }

    ({idUsr} = req.body);
    ({idServ} = req.body);
    ({horaServicio} = req.body);
    ({direccion} = req.body);
    ({emergencia} = req.body);

    //Es emergencia, se pone de hora 
    if( emergencia === undefined){
        emergencia = false;
        horaServ = admin.firestore.Timestamp.fromDate(new Date(horaServicio));
    } else{
        emergencia = true;
        horaServ = admin.firestore.Timestamp.now();
    }
    if(idUsr === null || idServ === null || direccion === null){
        res.send({'result' : 'error', 'message' : 'faltan datos (idUsr, idServ, direccion)'});
    }

    if(emergencia === null && horaServicio === null){
        res.send({'result' :  'error', 'message' : 'faltan datos (o emergencia o horaServicio)'});
    }

    primero = await db.collection('Servicios').doc(idServ).collection('trabajadores').orderBy('ranking').get();
    if(primero.empty){
        res.send({'result' :  'error', 'message' : 'No existen trabajadores disponibles.'});
    }

    //Se le suma 1 a la cantidad de solicitudes
    db.collection('Servicios').doc(idServ).update({
        solicitudes : admin.firestore.FieldValue.increment(1)
    });
    propuesto = primero.docs[0].id;
    flag = false;
    primero.forEach(doc => {
        if(!flag && doc.data().disponible && !doc.data().bloqueado){
            propuesto = doc.id;
            flag = true;
        }
    });
    

    // Se forma el json a agregar eventualmente
    var jsonServicio = {
        'calificacion' : 0.0,
        'cliente' : idUsr,
        'servicio' : idServ,
        'status' : 'pendiente',
        'trabajador' : propuesto.id,
        'emergencia' : emergencia,
        'precio' : 0,
        'fecha' : horaServ
    }
    var flag = true;
    var flag2 = true;
    
    // Se comprueba que el cliente y el servicio existan
    query = db.collection('Usuarios').doc(idUsr);
    await query.get().then( (doc) => {
        if(!doc.exists){
            console.log('No existe');
            res.send({'result' : 'error', 'message' : 'No existe el usuario'});
            flag = false;
            return "";
        }
        return "";
    }).catch( err => {res.send(err)});

    if(!flag){
        return;
    }

    flag = true;
    query =  db.collection('Servicios').doc(idServ);
    await query.get().then((doc) => {
        if(!doc.exists){
            console.log('No existe');
            res.send({'result' : 'error', 'message' : 'No existe el servicio'});
            flag = false; 
            return "";
        }
        return "";
    }).catch(err => {res.send(err)});

    if(!flag){
        return;
    }

    // Se comprueba que la fecha es válida (no pasada)
    if(emergencia === undefined && new Date(horaServ) < new Date()){
        res.send({'result' : 'error', 'message' : 'Fecha debe ser mayor que el momento actual'});
        return;
    }
    flag = true;
    flag2 = true;

    //Se comprueba que el usuario no tenga ningún servicio como pendiente
    query = db.collection('ServiciosRealizados').where('cliente', '==', idUsr).where('status', '==', 'pendiente');
    queryRes = await query.get();
    if(!queryRes.empty){
        flag = false;
    }
    //Como el OR no existe, compruebo si no está en camino.
    query = db.collection('ServiciosRealizados').where('cliente', '==', idUsr).where('status', '==', 'contratado');
    queryRes = await query.get();
    if(!queryRes.empty){
        flag2 = false;
    }

    if(flag  || flag2){
        res.send({'result' : 'error', 'message' : 'Ya hay un servicio en camino o pendiente'});
        return;
    }

    //Si todo es válido, se agrega y se manda success
    resultado = await db.collection('ServiciosRealizados').add(jsonServicio);

    res.send({'result' : 'success', 'message' : 'solicitado correctamente', 'id' : resultado.id});
});


//Cancela servicio si no está realizandose, 
//  ni idea si vamos a agregarle una penalización
exports.cancelarServicio = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método inválido.'});
        return;
    }

    ({idUsr} = req.body);
    
    query = db.collection('ServiciosRealizados').where('cliente', '==', idUsr).where('status', '==', 'pendiente');
    queryRes = await query.get();
    query2 = db.collection('ServiciosRealizados').where('cliente', '==', idUsr).where('status', '==', 'contratado');
    queryRes2 = await query2.get();

    if(!queryRes.empty || !queryRes2.empty){
        var solicitud = (queryRes.empty)? queryRes2.docs[0] : queryRes.docs[0];
        await db.collection('ServiciosRealizados').doc(solicitud.id).update({
            status : 'cancelado'
        });
        res.send({'result' : 'success', 'message' : 'Cancelado correctamente'});
        return;
    }

    res.send({'status' : 'error', 'message' : 'No hay nada que cancelar.'})
});


exports.modoEmergencia = functions.https.onRequest(async (req, res) => {
    ({idUsr} = req.body);
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
    }
    if(idUsr === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos'});
    }

    query = await db.collection('Usuarios').doc(idUsr).get();

    if(query.empty){
        res.send({'result' : 'error', 'message' : 'No existe el usuario'});
        return;
    }
    if(!query.data().trabajador){
        res.send({'result' : 'error', 'message' : 'El usuario no es trabajador'});
        return;
    }
    emergencia = query.data().modoEmergencia;

    //Detesto demasiado a firebase por obligarme a hacer esto
    
    await db.collection('Usuarios').doc(idUsr).update({
        modoEmergencia : !emergencia
    });
    
    

    res.send({'result' : 'success', 'message' : 'Cambiado correctamente', 'valor' : !emergencia});
});

exports.realizarServicio = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto.'});
        return;
    }

    ({idUsr} = req.body);
    ({serv} = req.body);
    ({precioE} = req.body);
    ({precio} = req.body);

    if(idUsr === undefined || serv === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUSr, servicio)'});
        return;
    }

    query = await db.collection('Usuarios').doc(idUsr).get();

    //Si el usuario no es trabajador
    if(query.empty){
        res.send({'result' : 'error', 'message' : 'No existe el usuario.'});
        return;
    }

    if(!query.data().trabajador){
        res.send({'result' : 'error', 'message' : 'El usuario no es trabajador.'});
        return;
    }
    //Si el usuario tiene un servicio ofrecido
    if(query.data().servicio !== ''){
        res.send({'result' : 'error', 'message' : 'El usuario ya tiene un servicio.'});
        return;
    }
    //Entonces está todo ok, se realiza
    //Se actualiza el servicio de la coleccion usuarios
    await db.collection('Usuarios').doc(idUsr).update({
        servicio : serv
    });

    let servicioRef = db.collection('Servicios').doc(serv).collection('trabajadores').doc(idUsr);
    await servicioRef.set({
        calificacion : 0.0,
        cantidadServ : 0,
        precioEmer : precioE,
        precioVisita : precio
    });

    //Se agrega el servicio en las  
    res.send({'result' : 'success', 'Message' : 'Agregado correctamente'});

});


//Recalcula los ranking
exports.recalcula = functions.firestore.document('Servicios/{serviceId}/trabajadores/{uId}').onUpdate(async (snap, context) => {
    datos = snap.after.data();
    datosAntes = snap.before.data();

    if(datos.precioEmer === datosAntes.precioEmer && datos.precioVisita === datosAntes.precioVisita && datos.calificacion === datosAntes.calificacion){
        return 0;
    }
 

    idUsr = context.params.uId;
    idServ = context.params.serviceId;
    docServicio = await db.collection('Servicios').doc(idServ).get();
    docTrabajadores = await db.collection('Servicios').doc(idServ).collection('trabajadores').get();
    trabajoNuevo = await db.collection('Servicios').doc(idServ).collection('trabajadores').doc(idUsr).get();
    cantSer = docServicio.data().cantServicios;
    precioP = docServicio.data().precioProm;
    precioPE = docServicio.data().precioPromE;
    console.log(cantSer);
    console.log(precioP);
    console.log(precioPE);
    console.log(trabajoNuevo);
    console.log(docTrabajadores);

    precioPromN = ((precioP * cantSer) + trabajoNuevo.data().precioVisita) / (cantSer + 1);
    precioPromEmerN = ((precioPE * cantSer) + trabajoNuevo.data().precioEmer) / (cantSer + 1);

    await db.collection('Servicios').doc(idServ).update({
        precioProm : precioPromN,
        precioPromE : precioPromEmerN,
        cantServicios : cantSer + 1
    });

    //Se actualizan todos los puntajes.
    docTrabajadores.forEach(doc => {
        db.collection('Servicios').doc(idServ).collection('trabajadores').doc(doc.id).update({
            ranking : doc.data().calificacion + precioPromN/doc.data().precioVisita
        });
    });


    return 0;
});

/*
exports.functionTest = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }
    ({idServ} = req.body);
    //El id del usuario es para confirmar que está autentificado
    ({idUsr} = req.body);
    if(idUsr === undefined || idServ === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos(idServ, idUsr)'});
        return;
    }

    usrRef = await db.collection('Usuarios').doc(idUsr).get();
    if(usrRef.empty){
        res.send({'result' : 'error', 'message' : 'Usuario inexistente.'});
        return;
    }

    docServicio = await db.collection('Servicios').doc(idServ).get();
    docTabajadores = await db.collection('Servicios').doc(idServ).collection('trabajadores').get();
    trabajoNuevo = await db.collection('Servicios').doc(idServ).collection('trabajadores').doc(idUsr).get();

    cantSer = docServicio.data().cantServicios;
    precioP = docServicio.data().precioProm;
    precioPE = docServicio.data().precioPromEmergencia

    precioPromN = ((precioP * cantSer) + trabajoNuevo.data().precioVisita) / (cantServ + 1);
    precioPromEmerN = ((precioPE * cantSer) + trabajoNuevo.data().precioEmer) / (cantServ + 1);
    // Se actualizan los precios promedios y la cantidad de servicios.
    await db.collection('Servicios').doc(idServ).update({
        precioProm : precioPromN,
        precioPromEmergencia : precioPromEmerN,
        cantServicios : cantSer + 1
    });
    //Se actualizan todos los puntajes.
    docTabajadores.forEach(doc => {
        db.collection('Servicios').doc(idServ).collection('trabajadores').doc(doc.id).update({
            ranking : doc.data().calificacion + precioPromN/doc.data().precioVisita
        });
    });

});*/

exports.terminarTrabajo = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }
    ({idUsr} = req.body);
    ({idSol} = req.body);

    if(idUsr === undefined || idSol === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUsr, idSol)'});
        return;
    }

    solicitud = await db.collection('ServiciosRealizados').doc(idSol).get();
    if(solicitud.empty){
        res.send({'result' : 'error', 'message' : 'Solicitud no existe'});
        return;
    }
    servicio = await db.collection('Servicios').doc(solicitud.data().servicio).collection('trabajadores').doc(idUsr).get();

    if(solicitud.data().trabajador !== idUsr){
        res.send({'result' : 'error', 'message' : 'Trabajador no coincide'});
        return;
    }
    precioT = (solicitud.data().emergencia)? servicio.data().precioE : servicio.data().precioVisita;
    db.collection('ServiciosRealizados').doc(idSol).update({
        status : 'realizado',
        precio : precioT
    });

    db.collection('Usuarios').doc(idUsr).update({
        disponible : true
    });
});

exports.mandarCalificacion = functions.https.onRequest(async (req, res) => {
    ({idUsr} = req.body);
    ({idSol} = req.body);
    ({cal} = req.body);

    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }

    if(idUsr === undefined || idSol === undefined || cal === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUsr, idSol, cal)'});
        return;
    }

    solicitud = await db.collection('ServiciosRealizados').doc(idSol).get();
    if(solicitud.empty){
        res.send({'result' : 'error', 'message' : 'Solicitud no existe'});
        return;
    }
    if(solicitud.data().status !== 'realizado' || solicitud.data().calificado === true){
        res.send({'result' : 'error', 'message' : 'Servicio no terminado o ya calificado.'});
        return;
    }

    servId = solicitud.data().servicio;
    trabajadorId = solicitud.data().trabajador;
    servicioRef = await db.collection('Servicios').doc(servId).collection('trabajadores').doc(trabajadorId).get();
    servAntes = servicioRef.data();
    calificacionN = ((servAntes.calificacion * servAntes.cantidadServ) + cal)/(servAntes.cantidadServ + 1);
    db.collection('Servicios').doc(servId).collection('trabajadores').doc(trabajadorId).update({
        calificacion : calificacionN,
        cantServicios : servAntes.cantidadServ + 1
    });
    res.send({'result' : 'success', 'message' : 'Calificado correctamente'});
});


exports.buscarTrabajo = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto.'});
        return;
    }

    ({idUsr} = req.body);

    if(idUsr === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUsr).'});
        return;
    }
    
    usuario = await db.collection('Usuarios').doc(idUsr).get();

    if(usuario.empty){
        res.send({'result' : 'error', 'message' : 'Usuario inexistente'});
    }

    servicio = usuario.data().servicio;
    if(servicio === ''){
        res.send({'result' : 'error', 'message' : 'El usuario no tiene un servicio asociado'});
    }

    //Se obtienen las solicitudes del trabajador
    solicitudes = await db.collection('ServiciosRealizados').where('trabajador', '==', idUsr).where('status', '==', 'pendiente').get();

    if(solicitudes.empty){
        res.send({'result' : 'error', 'message' : 'El usuario no tiene solicitudes.'});
    }

    solicitud = solicitudes.docs[0];

    res.send({ 'id' : solicitud.id, 'data' : solicitud.data()});
});




exports.aceptarSolicitud = functions.https.onRequest(async (req, res) => {
    ({idUsr} = req.body);
    ({idSol} = req.body);

    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }

    if(idUsr === undefined || idSol === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUSr, idSol)'});
        return;
    }

    usuario = await db.collection('Usuarios').doc(idUsr).get();
    if(usuario.empty){
        res.send({'result' : 'error', 'message' : 'Usuario inexistente.'});
        return;
    }

    if(!usuario.data().trabajador){
        res.send({'result' : 'error', 'message' : 'Usuario no es trabajador.'});
        return;
    }

    //Se actualiza el estado del servicio
    db.collection('ServiciosRealizados').doc(idSol).update({status: 'contratado'});
    
    //Se actualiza el estado del trabajador
    db.collection('Usuarios').doc(idUsr).update({disponible : false});
    res.send({'result' : 'success', 'message' : 'actualizado correctamente'});

});




exports.rechazarSolicitud = functions.https.onRequest(async (req, res) => {
    ({idUsr} = req.body);
    ({idSol} = req.body);

    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }

    if(idUsr === undefined || idSol === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUSr, idSol)'});
        return;
    }

    usuario = await db.collection('Usuarios').doc(idUsr).get();
    if(usuario.empty){
        res.send({'result' : 'error', 'message' : 'Usuario inexistente.'});
        return;
    }

    if(!usuario.data().trabajador){
        res.send({'result' : 'error', 'message' : 'Usuario no es trabajador.'});
        return;
    }

    await db.collection('ServiciosRealizados').doc(idSol).update({
        status : 'rechazado'
    });
    res.send({'result' : 'success', 'message' : 'Rechazado correctamente.'});
});

exports.reAsignaUno = functions.firestore.document('ServiciosRealizados/{solId}').onUpdate(async (snap, context) => {
    idSolicitud= context.params.solId;
    servicio = await db.collection('ServiciosRealizados').doc(idSolicitud).get();
    idRechazado = servicio.data().trabajador;
    if(servicio.data().status !== 'rechazado'){
        return "";
    }
    

    trabajadores = await db.collection('Servicios').doc(servicio.data().servicio).collection('trabajadores').orderBy('ranking').get();
    flag = false;
    if(trabajadores.empty){
        console.log("no hay nah");
        return "";
    }
    trabajadores.forEach(doc => {
        if(flag){
            return "";
        }
        console.log(doc.id);
        resultado = db.collection('Usuarios').doc(doc.id).get().then( trabajador => {
            if(trabajador.data().disponible && !trabajador.data().bloqueado && trabajador.id !== idRechazado){
                console.log('disponible');
                flag = true;
                db.collection('ServiciosRealizados').doc(idSolicitud).update({trabajador : doc.id, status : 'pendiente'});
            }
            return "";
        }).catch(err => {return err});
        console.log(resultado);
        return "";
    });
    //TODO: Ver que hacer cuando un servicio rechazado no tiene a nadie que lo quiera hacer
    //Si no está el flag, entonces no hay personas disponibles
    if(!flag){
        db.collection('ServiciosRealizados').doc(idSolicitud).update({trabajador : '', status : 'no_disponible'});
    }
    return "";

});



//Esto se trigerea si se acepta
exports.reAsignaTodo = functions.firestore.document('ServiciosRealizados/{serviceId}').onUpdate(async (snap, context) => {
    idServicio = context.params.serviceId;
    servicio = await db.collection('ServiciosRealizados').doc(idServicio).get();
    if(servicio.data().status !== 'contratado'){
        return;
    }
    coleccion = await db.collection('ServiciosRealizados').where('status', '==', 'pendiente').where('trabajador', '==', servicio.id).get();
    if(coleccion.empty){
        return;
    }

    flag = false;
    trabajadores = await db.collection('Servicios').doc(idServicio).orderBy('ranking').get();
    trabajadores.forEach(doc => {
        if(flag){
            return "";
        }

        trabajador = db.collection('Usuarios').doc(doc.id).get();
        if(trabajador.data().disponible && !trabajador.data().bloqueado){
            flag = true;
            coleccion.forEach(doc2 => {
                db.collection('ServiciosRealizados').doc(doc2.id).update({
                    trabajador : doc.id
                });
            });
        }
        return "";
    });

    if(!flag){
        coleccion.forEach(doc2 => {
            db.collection('ServiciosRealizados').doc(doc2.id).update({
                trabajador : '',
                status : 'no_disponible'
            });
        });
    }

    return;
});

exports.verSolicitud = functions.https.onRequest(async (req, res) => {
    idSol = req.query.idSol;

    if(req.method !== 'GET'){
        res.send({'result' : 'error', 'message' : 'método incorrecto'});
        return;
    }


    docRef = await db.collection('ServiciosRealizados').doc(idSol).get();
    
    status = docRef.data().status;

    if(status === 'rechazado' || status === 'pendiente'){
        res.send({'retult' : 'success', status : 'pendiente'});
        return;
    }

    res.send({'status' : status});
});



exports.bloquearUsuario = functions.https.onCall(async (data, context) => {
    
    idUsr = data.idUsr;
    idAdmin = data.idAdmin;

    if(idUsr === undefined || idAdmin === undefined){
        return {'result' : 'error', 'message' : 'Faltan datos (idUsr, idAdmin)'};
    }

    adminRef = await db.collection('Administradores').doc(idAdmin).get();
    if(adminRef.empty){
        return {'result' : 'error', 'message' : 'El admin no existe'};
    }
    usuarioRef = await db.collection('Usuarios').doc(idUsr).get();
    if(usuarioRef.empty){
        return {'result' : 'error', 'message' : 'El usuario no existe'};
        
    }
    valor = usuarioRef.data().bloqueado;
    db.collection('Usuarios').doc(idUsr).update({
        bloqueado : !valor
    });

    return {'result' : 'success', 'message' : 'Bloqueo/Desbloqueo Realizado correctamente'};
    
});
/**
 * 
 */

exports.buscarUsuario = functions.https.onCall(async (data, context) => {
    idAdmin = data.idAdmin;
    idUsr = data.idUsr;

    if(idUsr === undefined || idAdmin === undefined){
        return {'result' : 'error', 'message' : 'Faltan datos (idUsr, idAdmin)'};
    }

    adminRef = await db.collection('Administradores').doc(idAdmin).get();
    if(adminRef.empty){
        return {'result' : 'error', 'message' : 'El admin no existe'};
    }
    usuarioRef = await db.collection('Usuarios').doc(idUsr).get();
    if(usuarioRef.empty){
        return {'result' : 'error', 'message' : 'El usuario no existe'};
    }

    return usuarioRef.data();


});
