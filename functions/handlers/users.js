const { admin, db } = require('../util/admin');

const config = require('../util/config');

const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignupData, validateLoginData, reduceUserDetalhes } = require('../util/validators');










exports.signup = (req, res) => {

    const newUser = {
        email: req.body.email,
        handle: req.body.handle,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
        
    };


    const { valid, errors } = validateSignupData(newUser);

    if (!valid) return res.status(400).json(errors);

    const semImagem = 'no-profile-image.png';

    //validando dados
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                return res.status(400).json({ handle: `Handle já Existe` });
            } else {
                return firebase.auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(idToken => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${semImagem}?alt=media`,
                userId

            };
            db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch(err => {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                return res.status(400).json({ email: 'Esse Email Ja esta em Uso' })
            } else {
                return res.status(500).json({ error: err.code })
            }
        });
};








exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const { valid, errors } = validateLoginData(user);

    if (!valid) return res.status(400).json(errors);


    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({ token });
        })
        .catch((err) => {
            if (err.code === 'auth/wrong-password') {
                return res.status(403).json({ general: 'Credenciais Invalidas, tente Novamente!' })
            } else {
                return res.status(500).json({ error: err.code });
            }
        });
};







//Adiciona detalhes do Usuario
exports.addUserDetalhes = (req, res) => {
    let userDetalhes = reduceUserDetalhes(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetalhes)
        .then(() => {

            return res.json({ message: 'Detalhes Adicionados com Sucesso!' })
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        })
}






//Autentica Usuario e lhe mostra os detalhes
exports.getUserAutenticado = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`)
        .get()
        .then(doc => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db
                    .collection('likes')
                    .where('userHandle', '==', req.user.handle)
                    .get()
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            });

            return db.collection('notifications')
                .where('recipient', '==', req.user.handle)
                .orderBy('createdAt', 'desc').limit(10).get();

        })
        .then(data => {
            userData.notifications = []
            data.forEach(doc => {
                userData.notifications.push({
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    read: doc.data().read,
                    screamId: doc.data().screamId,
                    type: doc.data().type,
                    createdAt: doc.data().createdAt,
                    notificationId: doc.id
                })
            })
            return res.json(userData)
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        })
}







exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers });

    let imageToBeUploaded = {};
    let imageFileName;

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log(fieldname, file, filename, encoding, mimetype);
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({ error: 'Tipo de Imagem Invalido!' });
        }
        // my.image.png => ['my', 'image', 'png']
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        // 32756238461724837.png
        imageFileName = `${Math.round(
            Math.random() * 1000000000000
        ).toString()}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
        admin
            .storage()
            .bucket()
            .upload(imageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
                    config.storageBucket
                    }/o/${imageFileName}?alt=media`;
                return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
            })
            .then(() => {
                return res.json({ message: 'Imagem Upada com Sucesso!' });
            })
            .catch((err) => {
                console.error(err);
                return res.status(500).json({ error: 'Algo deu errado ao Upar a Imagem!' });
            });
    });
    busboy.end(req.rawBody);
};


//Get qualquer  Usuario Detalhe
exports.getUserDetails = (req, res) => {

    let userData = {}

    db.doc(`/users/${req.params.handle}`)
        .get()
        .then(doc => {
            if (doc.exists) {
                userData.user = doc.data();
                return db
                    .collection('screams')
                    .where('userHandle', '==', req.params.handle)
                    .orderBy('createdAt', 'desc')
                    .get()
            } else {
                return res.status(404).json({ error: 'Usuario não Encontrado!' });
            }
        })
        .then(data => {
            userData.screams = []
            data.forEach(doc => {
                userData.screams.push({
                    body: doc.data().body,
                    createdAt: doc.data().createdAt,
                    userHandle: doc.data().userHandle,
                    userImage: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    screamId: doc.id
                })
            });
            return res.json(userData);
        })
        .catch(err => {

            console.error(err);
            return res.status(500).json({ error: err.code })
        })

}

exports.notificationsRead = (req, res) => {

    let batch = db.batch();
    req.body.forEach(notificationId => {

        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, { read: true })
    });
    batch.commit()
        .then(() => {
            return res.json({ message: 'Notificações Lidas' });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code })

        })
}