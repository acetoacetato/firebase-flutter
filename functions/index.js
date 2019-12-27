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


