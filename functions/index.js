const functions = require('firebase-functions');

const app = require('express')();

const FBAuth = require('./util/fbAuth');

const { db } = require('./util/admin');


const { getAllScreams,
    postOneScream,
    getScream,
    deleteScream,
    comentarScream,
    likeScream,
    unlikeScream
} = require('./handlers/screams');


const { signup,
    login,
    uploadImage,
    addUserDetalhes,
    getUserAutenticado,
    getUserDetails,
    notificationsRead
} = require('./handlers/users');




//Route GET Screams (retorno de Mensagens)
app.get('/screams', getAllScreams);
//Requisição POST Screams (mensagens)
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId', FBAuth, deleteScream)
//Requisição GET Likes Scream (mensagens)
app.get('/scream/:screamId/like', FBAuth, likeScream);
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);
app.post('/scream/:screamId/comment', FBAuth, comentarScream);



//Route de criacao de Usuario
app.post('/signup', signup);
//POST de Login de Usuario
app.post('/login', login);
//POST de Upload de Imagem
app.post('/user/image', FBAuth, uploadImage);

app.post('/user', FBAuth, addUserDetalhes);

app.get('/user', FBAuth, getUserAutenticado);

app.get('/user/:handle', getUserDetails);

app.post('/notifications', FBAuth, notificationsRead);

//southamerican-east1 nao esta disponivel
exports.api = functions.region('us-central1').https.onRequest(app);



exports.createNotificationOnLike = functions.region('us-central1')
    .firestore.document('likes/{id}')
    .onCreate((snapshot) => {
        return db
            .doc(`/screams/${snapshot.data().screamId}`)
            .get()
            .then(doc => {
                if (doc.exists) {
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        screamId: doc.id
                    });
                }
            })
            .then(() => {
                return;
            })
            .catch(err => {
                console.error(err);
                return;
            });
    });





exports.deleteNotification = functions.region('us-central1')
    .firestore.document('likes/{id}')
    .onDelete((snapshot) => {
        db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .then(() => {
                return;
            })
            .catch((err) => {
                return;

            })
    })







exports.createNotification = functions.region('us-central1')
    .firestore.document('comments/{id}')
    .onCreate((snapshot) => {

        db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then(doc => {
                if (doc.exists) {
                    return db
                        .doc(`/notifications/${snapshot.id}`).set({
                            createdAt: new Date().toISOString(),
                            recipient: doc.data().userHandle,
                            sender: snapshot.data().userHandle,
                            type: 'comment',
                            read: false,
                            screamId: doc.id
                        });
                }
            })
            .then(() => {
                return;
            })
            .catch(err => {
                console.error(err);
                return;
            });
    });




//Trigger de Notificacao 

exports.createNotification = functions.region('us-central1')
    .firestore.document('comments/{id}')
    .onCreate((snapshot) => {

        return db.doc(`/screams/${snapshot.data().screamId}`).get()
            .then(doc => {
                if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
                    return db
                        .doc(`/notifications/${snapshot.id}`).set({
                            createdAt: new Date().toISOString(),
                            recipient: doc.data().userHandle,
                            sender: snapshot.data().userHandle,
                            type: 'comment',
                            read: false,
                            screamId: doc.id
                        });
                }
            })
            .catch(err => {
                console.error(err);
                return;
            });
    });

    

//Trigger de Notificacao atualizacao de URl da Imagem

exports.imageChange = functions
    .region('us-central1').firestore
    .document('/users/{userId}')
    .onUpdate((change) => {
        console.log(change.before.data());
        console.log(change.after.data());
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
            console.log('Imagem Atualizada');
            let batch = db.batch();
            return db
                .collection('screams')
                .where('userHandle', '==', change.before.data().handle)
                .get()
                .then((data) => {
                    data.forEach(doc => {
                        const scream = db.doc(`/screams/${doc.id}`);
                        batch.update(scream, { userImage: change.after.data().imageUrl })
                    })
                    return batch.commit();
                })
        } else return true;
    })

exports.onScreamDelete = functions
    .region('us-central1').firestore
    .document('/screams/{screamId}')
    .onDelete((snapshot, context) => {
        const screamId = context.params.screamId;
        const batch = db.batch();
        return db
            .collection('comments')
            .where('screamId', '==', screamId)
            .get()
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                });
                return db
                    .collection('likes')
                    .where('screamId', '==', screamId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                });
                return db
                    .collection('notifications')
                    .where('screamId', '==', screamId)
                    .get();
            })
            .then((data) => {
                data.forEach((doc) => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                });
                return batch.commit();
            })
            .catch((err) => console.error(err));
    });