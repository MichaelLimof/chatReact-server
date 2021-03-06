const { db } = require('../util/admin');


exports.getAllScreams = (req, res) => {
    db
        .collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
            let screams = [];
            data.forEach((doc) => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                    userImage: doc.data().userImage,
                    commentCount: doc.data().commentCount,
                    likeCount:doc.data().likeCount
                });
            });
            
            return res.json(screams);
            
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.code });
        });
}




exports.postOneScream = (req, res) => {
    if (req.body.body.trim() === '') {
        return res.status(400).json({ body: 'O corpo da Mensagem nao deve estar Vazio' })
    }


    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0

    };

    db.collection('screams')
        .add(newScream)
        .then((doc) => {
            const responseScream = newScream;
            responseScream.screamId = doc.id;
            res.json(responseScream);

        })
        .catch((err) => {
            res.status(500).json({ error: 'Algo deu Errado' });
            console.error(err);
        });
};
//Fetch no Scream
exports.getScream = (req, res) => {
    let screamData = {};
    db.doc(`/screams/${req.params.screamId}`).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({ error: 'Mensagem nao Encontrada' })
            }
            screamData = doc.data();
            screamData.screamId = doc.id;
            return db
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .where('screamId', '==', req.params.screamId)
                .get();
        })
        .then(data => {
            screamData.comments = [];
            data.forEach(doc => {
                screamData.comments.push(doc.data())

            });
            return res.json(screamData)
        })
        .catch(err => {
            console.error(err)
            res.status(500).json({ error: err.code });
        })

}

//Comentar Scream

exports.comentarScream = (req, res) => {

    if (req.body.body.trim() === '') return res.status(400).json({ error: 'Não Pode estar Vazio' });

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        screamId: req.params.screamId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl

    };
    console.log(newComment);

    db.doc(`/screams/${req.params.screamId}`)
        .get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({ error: 'Scream nao encontrado' })
            }
            return doc.ref.update({ commentCount: doc.data().commentCount + 1 });

        })
        .then(() => {
            return db.collection('comments').add(newComment);
        })
        .then(() => {
            res.json(newComment);
        })
        .catch(err => {

            console.log(err)
            res.status(500).json({ error: 'Algo deu errado' })
        })
}







exports.likeScream = (req, res) => {

    const likeDocument = db
        .collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId)
        .limit(1);

    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData;

    screamDocument.get()
        .then(doc => {
            if (doc.exists) {
                screamData = doc.data();
                screamData.screamId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({ error: 'Scream Não Encontrado' })
            }

        })
        .then(data => {
            if (data.empty) {
                return db.collection('likes')
                    .add({
                        screamId: req.params.screamId,
                        userHandle: req.user.handle
                    })
                    .then(() => {
                        screamData.likeCount++
                        return screamDocument.update({ likeCount: screamData.likeCount })
                    })
                    .then(() => {
                        return res.json(screamData)
                    })
            } else {
                return res.status(400).json({ error: 'Scream Ja curtido!' })
            }

        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.code });

        })
}




exports.unlikeScream = (req, res) => {

    const likeDocument = db
        .collection('likes')
        .where('userHandle', '==', req.user.handle)
        .where('screamId', '==', req.params.screamId)
        .limit(1);

    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

    let screamData;

    screamDocument.get()
        .then(doc => {
            if (doc.exists) {
                screamData = doc.data();
                screamData.screamId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({ error: 'Scream Não Encontrado' })
            }

        })
        .then(data => {
            if (data.empty) {
                return res.status(400).json({ error: 'Scream Não curtido!' });

            } else {
                return db.doc(`/likes/${data.docs[0].id}`)
                    .delete()
                    .then(() => {
                        screamData.likeCount--;
                        return screamDocument.update({ likeCount: screamData.likeCount })
                    })
                    .then(() => {
                        res.json(screamData);
                    })
            }

        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.code });

        })

}



exports.deleteScream = (req, res) => {

    const document = db.doc(`/screams/${req.params.screamId}`);
    document.get()
        .then(doc => {

            if (!doc.exists) {
                return res.status(404).json({ error: 'Scream Não Encontrado!' })
            }
            if (doc.data().userHandle !== req.user.handle) {
                return res.status(403).json({ error: 'Não Autorizado' });
            } else {
                return document.delete();
            }
        })
        .then(() => {
            res.json({ message: 'Scream Deletado com Sucesso!' })
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code })
        })
}