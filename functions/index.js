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

    
    // Se forma el json a agregar eventualmente
    var jsonServicio = {
        'calificacion' : 0.0,
        'cliente' : idUsr,
        'servicio' : idServ,
        'status' : 'pendiente',
        'trabajador' : '',
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

    res.send({'result' : 'success', 'message' : 'solicitado correctamente'});
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
    
    

    res.send({'result' : 'success', 'message' : 'Cambiado correctamente'});
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
    res.send({'result' : 'Success', 'Message' : 'Agregado correctamente'});

});


exports.buscarTrabajo = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'GET'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto.'});
        return;
    }

    ({idUsr} = req.body);

    if(idUsr === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUsr).'});
        return;
    }

    
});

