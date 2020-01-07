const functions = require("firebase-functions");
const admin = require("firebase-admin");
var serviceAccount = require("./testflutter-2a3a0-firebase-adminsdk-x5jfn-c467f7ccde.json");
const paypalData = require("./paypal.json");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const escapeHtml = require('escape-html');
const paypal = require('paypal-rest-sdk');



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

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': paypalData.clientID,
    'client_secret': paypalData.secret
});

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

function actualizaTokenPayPal(){
    cuerpo = {
        'grant_type' : 'client_credentials'
    }
    auth = {
        'user' : paypalData.clientID,
        'pass' : paypakData.secret
    }
    post = {
        'url' : 'https://api.sandbox.paypal.com/v1/oauth2/token',
        'form' : cuerpo,
        'auth' : auth
    }
    resultado = {};
    req = request.post(post, (err, res, body) => {
        if(err){
            console.log('Error');
            return;
        }
        resultado = body;
        db.collection('Paypal').doc(paypalData.id_doc).set(body);
    });

    return resultado;

}


function paypalQl(){
    

    var create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "https://testflutter-2a3a0.web.app/pagoRetornado",
            "cancel_url": "https://testflutter-2a3a0.web.app/pagoCancelado"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "nombre_servicio",
                    "sku": "id_servicio",
                    "price": "10.00",
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": "10.00"
            },
            "description": "descripcion_servicio."
        }]
    };
    pago = {};
    paypal.payment.create(create_payment_json, (error, payment) => {
        if (error) {
            console.log(error);
            console.log(error.response.details);
            throw error;
        } else {
            console.log("Create Payment Response");
            console.log(payment);
            pago = payment;
        }
    });

    return pago;
}

exports.pagoPaypal = functions.https.onRequest((req, res) => {
    datos = paypalQl();
    res.send(datos);
});

exports.pagoRetornado = functions.https.onRequest((req, res) => {
    console.log(req);
    res.send("Pagado correctamente");
})

exports.pagoCancelado = functions.https.onRequest((req, res) => {
    res.send("Pagado correctamente");
})

exports.obtenerMetodoPago = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'GET'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }   
    idUsr = req.query.idUsr;

    if(idUsr === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos(idUsr, numTarjeta, expiracion, cvv)'});
        return;
    }

    usuario = await db.collection('Usuarios').doc(idUsr).get();

    if(!usuario.exists){
        res.send({'result' : 'error', 'message' : 'Usuario no existe.'});
        return;
    }

    if(usuario.data().tarjeta === undefined){
        res.send({'tarjeta' : ''});
        return;
    }
    nTarjeta = usuario.data().tarjeta.toString();
    tarjetaF = nTarjeta.replace(/^[0-9]{12}/ , 'xxxxxxxxxxxx');
    datos = {
        'tarjeta' : tarjetaF
    }

    res.send(datos);
});


exports.agregaMetodoPago = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }    

    //El cvv no se va a insertar en la db
    ({idUsr} = req.body);
    ({numTarjeta} = req.body);
    ({expiracion} = req.body);
    ({cvv} = req.body);

    //TODO: método para validar que la tarjeta funka correctamente.

    if(idUsr === undefined || numTarjeta === undefined || expiracion === undefined || cvv === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos(idUsr, numTarjeta, expiracion, cvv)'});
        return;
    }

    expr = /([^0-9])/gi;
    exprF = /(^[0-9]{2}\/[0-9]{2}$)/gi;


    if(numTarjeta.length !== 16 || numTarjeta.match(expr) !== null){
        res.send({'result' : 'error', 'message' : 'Num de tarjeta incorrecto.'});
        return;
    }

    if(cvv.match(expr) !== null){
        res.send({'result' : 'error', 'message' : 'cvv incorrecto.'});
        return;
    }

    if(expiracion.match(exprF) === null){
        res.send({'result' : 'error', 'message' : 'Expiración incorrecta'});
        return;
    }

    usuario = await db.collection('Usuarios').doc(idUsr).get();

    if(!usuario.exists){
        res.send({'result' : 'error', 'message' : 'Usuario no existe.'});
        return;
    }

    db.collection('Usuarios').doc(idUsr).update({
        tarjeta : numTarjeta,
        exp : expiracion
    });

    res.send({'result' : 'success', 'message' : 'Agregado pago correctamente'});
});


exports.actualizaDatos = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }

    ({idUsr} = req.body);
    ({mail} = req.body);
    ({nombre} = req.body);
    ({nacimiento} = req.body);

    if(idUsr === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUsr)'});
        return;
    }

    usuario = await db.collection('Usuarios').doc(idUsr).get();


    await db.collection('Usuarios').doc(idUsr).update({
        'mail' : mail,
        'serviciosFav' : [], 
        'nacimiento' : nacimiento,
        'bloqueado' : false
    });

});


exports.registraUsuario = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'POST'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }

    ({idUsr} = req.body);
    ({mail} = req.body);
    ({nombre} = req.body);
    ({nacimiento} = req.body);
    ({trabajador} = req.body);


    if(idUsr === undefined || mail === undefined || nombre === undefined || trabajador === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUsr, mail, nombre)'});
        return;
    }
    usuario = await db.collection('Usuarios').doc(idUsr).get();
    if(usuario.exists){
        res.send({'result' : 'error', 'message' : 'Uid ya existente'});
        return;
    }

    if(trabajador === 'true'){
        trabajador = true;
    } else if(trabajador === 'false'){
        trabajador = false;
    } else {
        res.send({'result' : 'error', 'message' : 'Valor de "trabajador" incorrecto (true, false)'});
        return;
    }

    if(!trabajador){
        datos = {
            'nombre' : nombre,
            'mail' : mail,
            'serviciosFav' : [], 
            'nacimiento' : nacimiento,
            'bloqueado' : false,
            'trabajador' : trabajador
        };
    }else{
        datos = {
            'nombre' : nombre,
            'mail' : mail,
            'servicio' : '', 
            'nacimiento' : nacimiento,
            'bloqueado' : false,
            'trabajador' : trabajador,
            'disponible' : true, 
            'emergencia' : false
        };
        
    }

    await db.collection('Usuarios').doc(idUsr).set(datos);

    res.send({'result' : 'success', 'message' : 'Registrado orrectamente.'});
});

exports.datosUsuario = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'GET'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }

    idUsr = req.query.idUsr;


    if(idUsr === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUsr, mail, nombre)'});
        return;
    }

    usuario = await db.collection('Usuarios').doc(idUsr).get();

    if(usuario === undefined || !usuario.exists){
        res.send({'result' : 'error', 'message' : 'Usuario inexistente en la base de datos.'});
        return;
    }

    auxData = usuario.data();

    //Para quitar los datos de la tarjeta.
    datos = {
        'bloqueado' : auxData.bloqueado,
        'mail' : auxData.mail,
        'nacimiento' : auxData.nacimiento,
        'nombre' : auxData.nombre,
        'serviciosFav' : auxData.serviciosFav,
        'trabajador' : auxData.trabajador,
        'servicio' : auxData.servicio,
        'disponible' : auxData.disponible,
        'emergencia' : auxData.emergencia
    };

    res.send({'id' : usuario.id, 'data' : datos});
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
        datos = doc.data();
        cantS = (datos.cantServicios === undefined)? 0:datos.cantServicios;
        precio = (datos.precioProm === undefined)? 0:datos.precioProm;
        resultados.servicios.push({
            'id' : doc.id, 
            'data': {
                'descripcion' : datos.descripcion,
                'img_url' : datos.img_url,
                'nombre' : datos.nombre,
                'solicitudes' : datos.solicitudes,
                'cantServicios' : cantS,
                'precio' :  precio
            }
        });
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
    emergencia = req.query.emergencia;
    if(emergencia === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (emergencia)'});
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
    console.log(emergencia);
    queryRes.forEach((doc) => {
        datos = doc.data();
        console.log(typeof(emergencia));
        if(emergencia === 'true'){
            precioV = datos.precioPromE;
        } else{
            precioV = datos.precioProm;
        }
        cantS = (datos.cantServicios === undefined)? 0:datos.cantServicios;
        resultados.servicios.push({
            'id' : doc.id, 
            'data': {
                'descripcion' : datos.descripcion,
                'img_url' : datos.img_url,
                'nombre' : datos.nombre,
                'solicitudes' : datos.solicitudes,
                'cantServicios' : cantS,
                'precio' :  precioV
            }
        });
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
    datoServ = await db.collection('Servicios').doc(idServ).get();
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

exports.verFavoritos = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'GET'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }
    idUsr = req.query.idUsr;

    if(idUsr === null){
        res.send({'result' : 'error', 'message' : 'Faltan datos'});
        return;
    }

    favoritos = {serviciosFav: []};
    documentos = []

    //Esta linea es un error peor que mi existencia
    //TODO: eliminar esta atrocidad
    coleccion = await  db.collection('Usuarios').doc(idUsr).get().then(data => {return data}).catch(err => console.log(err));
    favs = coleccion.data().serviciosFav;
    console.log(favs);

    //Recordar: await no se puede usar en loops uwu, ESLint me pega si lo hago
    for(id of favs){
        documentos.push(db.collection('Servicios').doc(id).get());
    }

    //Con esto espero a que se cumplan todas las promesas
    datitos = await Promise.all(documentos);

    datitos.forEach(doc => {
        favoritos.serviciosFav.push({'id' : doc.id, 'data' : doc.data()});
    })
    console.log(favoritos);
    res.send(favoritos);
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
            datos = doc.data();
            fechaN = datos.fecha;
            datos.fecha = fechaN.toLocaleString('es-CL');
            servicios.servicios.push({"id" : doc.id, "data" : doc.data()});
        });
    }

    res.send(servicios);

});

exports.esFavorito = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'GET'){
        res.send({'result' : 'error', 'message' : 'método incorrecto'});
    }
    ({idUsr} = req.body);
    ({idServ} = req.body);

    if(idUsr === null || idServ === null || direccion === null){
        res.send({'result' : 'error', 'message' : 'faltan datos (idUsr, idServ, direccion)'});
    }

    usuario = await db.collection('Usuarios').doc(idUsr).get();

    if(!usuario.exists){
        res.send({'result' : 'error', 'message' : 'Usuario inexistente'});
        return;
    }

    for(item in usuario.serviciosFav){
        if(item === idServ){
            res.send({'result' : 'success', 'fav' : true});
            return;
        }
    }

    res.send({'result' : 'success', 'fav' : false});
    return;
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

    direccion.replace(/ /g,'%20');

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
        if(emergencia && !doc.data().emergencia){
            return;
        }
        if(!flag && doc.data().disponible && !doc.data().bloqueado){
            propuesto = doc.id;
            flag = true;
        }
    });
    if(!flag){
        res.send({'result' : 'error', 'message' : 'No hay trabajadores disponibles'});
        return;
    }

    //Armar la url de esta cosa
    key = 'key=' + serviceAccount.api_key_maps;
    size = '&size=350x450';
    markers = '&markers=color:red|' + direccion;

    url = 'https://maps.googleapis.com/maps/api/staticmap?' + key + size + markers;


    // Se forma el json a agregar eventualmente
    var jsonServicio = {
        'calificacion' : 0.0,
        'cliente' : idUsr,
        'servicio' : idServ,
        'status' : 'pendiente',
        'trabajador' : propuesto.id,
        'emergencia' : emergencia,
        'precio' : 0,
        'fecha' : horaServ,
        'img_url' : url
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
    query = db.collection('ServiciosRealizados').where('cliente', '==', idUsr).where('status', '==', 'en_camino');
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

    //FIXME: para cancelar un en camino
    query3 = db.collection('ServiciosRealizados').where('cliente', '==', idUsr).where('status', '==', 'contratado');
    queryRes3 = await query2.get();

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

exports.eliminaServicio = functions.firestore.document('Servicios/{serviceId}').onDelete(async (snap, context) => {
    clave = snap.key();

    documentos = await db.collection('Usuarios').where('servicio', '==', clave).get();

    documentos.forEach(doc => {
        usr = db.collection('Usuarios').doc(doc.id).get();
        if(!usr.data().trabajador){
            arreglo = usr.filter(e => e !== clave);
            db.collection('Usuarios').doc(doc.id).update({
                serviciosFav : arreglo
            });
        } else {
            db.collection('Usuarios').doc(doc.id).update({servicio : ''});
        }
        
        
    });

    return '';

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



exports.trabajosPendientes = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'GET'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }
    idUsr = req.query.idUsr;
    if(idUsr === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUsr)'});
        return;
    }

    var trabajos = { 'trabajos' : [] };

    coleccion = await db.collection('ServiciosRealizados').where('trabajador', '==', idUsr).where('status', '==', 'contratado').get();

    coleccion.forEach(doc => {
        datos = doc.data();
        fechaN = new Date(datos.fecha._seconds * 1000);
        datos.fecha = fechaN.toLocaleString('es-CL');
        trabajos.trabajos.push({'id' : doc.id, 'data' : datos});
    });

    res.send(trabajos);
    return;
});

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
    datos = solicitud.data();
    fechaN = new Date(datos.fecha._seconds * 1000);
    datos.fecha = fechaN.toLocaleString('es-CL');
    res.send({ 'id' : solicitud.id, 'data' : datos});
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
    
    solicitudRef = await db.collection('ServiciosRealizados').doc(idSol).get();

    //Si se ejecuta la función para empezar a realizar el servicio, entonces se le interpreta como uno de emergencia.
    if(solicitudRef.data().status === 'contratado'){
        db.collection('ServiciosRealizados').doc(idSol).update({status: 'en_camino'});
        db.collection('Usuarios').doc(idUsr).update({disponible : false});
    }
    //Se actualiza el estado del trabajador *Solo si es emergencia*
    if(solicitudRef.data().emergencia){
        db.collection('ServiciosRealizados').doc(idSol).update({status: 'en_camino'});
        db.collection('Usuarios').doc(idUsr).update({disponible : false});
    }else{
        db.collection('ServiciosRealizados').doc(idSol).update({status: 'contratado'});
    }
    res.send({'result' : 'success', 'message' : 'actualizado correctamente'});

});


exports.verServicio = functions.https.onRequest(async (req, res) => {
    idUsr = req.query.idUsr;
    idServ = req.query.idServ;

    if(req.method !== 'GET'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto'});
        return;
    }

    if(idUsr === undefined || idServ === undefined){
        res.send({'result' : 'error', 'message' : 'Faltan datos (idUSr, idServ)'});
        return;
    }

    usuario = await db.collection('Usuarios').doc(idUsr).get();

    if(usuario.empty){
        res.send({'result' : 'error', 'message' : 'Usuario inexistente.'});
        return;
    }

    servicio = await db.collection('Servicios').doc(idServ).get();

    if(servicio.empty){
        res.send({'result' : 'error', 'message' : 'Servicio inexistente.'});
        return;
    }

    res.send({'id' : servicio.id, 'data' : servicio.data()});

});

exports.carousel = functions.https.onRequest(async (req, res) => {
    if(req.method !== 'GET'){
        res.send({'result' : 'error', 'message' : 'Método incorrecto.'});
        return;
    }

    collectionRef = await db.collection('Carousel').get();
    var retorno = {'datos' : []};

    collectionRef.forEach( doc => {
        datos = doc.data();
        retorno.datos.push({'titulo' : datos.titulo, 'img_url' : datos.img});
    });

    res.send(retorno);
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
            //Si el servicio es de emergencia pero el trabajador no quiere de ese tipo, se salta
            if(servicio.data().emergencia && !trabajador.data().emergencia){
                return "";
            }
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

    //Si no está el flag, entonces no hay personas disponibles
    if(!flag){
        db.collection('ServiciosRealizados').doc(idSolicitud).update({trabajador : '', status : 'no_disponible'});
    }
    return "";

});



//Esto se trigerea si se acepta un servicio de emergencia o se empieza a trabajar en uno
exports.reAsignaTodo = functions.firestore.document('ServiciosRealizados/{serviceId}').onUpdate(async (snap, context) => {
    idServicio = context.params.serviceId;
    servicio = await db.collection('ServiciosRealizados').doc(idServicio).get();
    if(servicio.data().status !== 'en_camino'){
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
        res.send({'result' : 'success', status : 'pendiente'});
        return;
    }

    res.send({'result' : 'success', 'status' : status});
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
