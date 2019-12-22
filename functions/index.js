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


