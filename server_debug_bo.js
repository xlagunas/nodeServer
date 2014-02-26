
var Mongoose = require('mongoose'),
    Persistence = require('./persistence_debug')
    io = require('socket.io').listen(3000),
    _ = require('underscore'),
    ldap = require('./ldap');

Mongoose.connect('mongodb://localhost/v2b_devel');
var users = {};

io.set('log level', 1); // reduce logging


io.sockets.on('connection', function (socket) {
    function login (msg){
        if (msg == null || msg.username == null){
            socket.emit('login',{status: 'error', data: 'Username can\'t be empty!'});
        }
        else{
            Persistence.User.findOne({username: msg.username},function(err, user){
                if (!err && user != null){
                    if (user.ldap){
                        ldap.ldapLogin()
                    }
                    else{
                        if (user.password === msg.password){
                            socket.set('username', msg.username);
                            socket.set('id', user.id);
                            socket.set('status', 'ONLINE');
                            socket.emit('login',{status: 'success', data: user});

                            user.accepted.forEach(function(contact){
                                console.log('subscribing '+user.username+' to '+contact);
                                socket.join(contact);
                            });
                            console.log('broadcasting to Room: '+user.id);
                            socket.broadcast.to(user.id).emit('roster', {_id: user.id, status: 'ONLINE'});

                        }
                        else {
                            socket.emit('login',{status: 'error', data:'Error password doesn\'t match'});
                        }
                    }
                }
                else{

                    socket.emit('login',{status: 'error', data: 'User '+msg.username+'not found in db'});
                }
            });
        }
    }

    function exists (msg){
        console.log('checking if user exists...');
        Persistence.User
            .find({username: msg.username},
                function(error, data){
                    if (error) throw error;
                    if (data.length == 0){
                        socket.emit('user:existing', false);
                    }
                    else
                        socket.emit('user:existing', true);

                });
    }

    function create (msg) {
        var newUser = new Persistence.User(msg);
        newUser.save(function(error){
            if (error) throw error;
            socket.emit('user:create',newUser);
        });
    }

    function listContacts (msg) {
        socket.get('id', function(error, _id){
            if (!error && _id != null){
                Persistence
                .User
                .findById(_id)
                .populate({path: 'pending accepted requested blocked', select: 'name username firstSurname lastSurname email thumbnail'})
                .exec(function(error, populatedData){
                        socket.emit('contacts:update',{
                            accepted: populatedData.accepted,
                            requested: populatedData.requested,
                            pending: populatedData.pending,
                            blocked: populatedData.blocked
                        });
                    });
            }
            else{ console.log(error);}
        });
    }

    function findNewContacts (msg) {
        Persistence.User.find({username:  new RegExp(msg.username, "i")}).select("-pending -password -accepted -requested -blocked")
            .exec(function(error, users){
                if (error)
                    throw error;
                socket.emit('contacts:find', users);
            });
    }

    socket.on('login', login);

    socket.on('user:existing', exists);

    socket.on('user:create', create);

    socket.on('contacts:list', listContacts);

    socket.on('contacts:update_list', function (msg){
        if (msg){
            socket.get('id', function(err, _id){
                if(!err && _id != null){
                    Persistence.User.findById(_id).exec(function(err, user){

                        user.changeRelationStatus(msg.current,msg.future,msg._id,function(error, updatedUser){
                            console.log('callback del changeRelationStatus');
                            console.log('updatedUser al callback: '+updatedUser);
                            socket.emit('contacts:update', {
                                accepted: updatedUser.accepted,
                                requested: updatedUser.requested,
                                pending: updatedUser.pending,
                                blocked: updatedUser.blocked
                            } )
                        });


                    });
                    if (msg.current === 'requested'){
                        console.log('_id:'+_id);
                        Persistence.User.findById(msg._id).exec(function(err, contact){
                            if (!err){
                                contact.changeRelationStatus('pending', 'accepted',_id, function(error, updatedContact){
                                    if (!error){
                                        //notify contact of the changes;
                                        io.sockets.clients().forEach(function(contactSocket){
                                            contactSocket.get('id', function(error, name){
                                                if (!error && name === updatedContact.id){
                                                    console.log('callback del changeRelationStatus contact');
                                                    contactSocket.emit('contacts:update', {
                                                        accepted: updatedContact.accepted,
                                                        requested: updatedContact.requested,
                                                        pending: updatedContact.pending,
                                                        blocked: updatedContact.blocked
                                                    });
                                                }
                                            });
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
                else{
                    console.log(error);
                }
            });
        }
    });

    socket.on('list contacts:accepted', function(msg, callback){
        if (msg.length >0) {
            Persistence.User
                .find({_id: {$in: msg}})
                .select('-pending -password -accepted -requested -blocked')
                .exec(function(error, data){
                    if (error) throw error;
                    callback(data);
                });
        }
        else {
            callback([]);
        }
    });

    socket.on('contacts:find', findNewContacts);

    socket.on('contacts:propose', function(msg){
        socket.get('id', function(error, idProposer){
            Persistence.User.findOneAndUpdate({_id: idProposer}, {$addToSet:{pending: msg._id}}, function(error, data){
                if (data){
                    Persistence.User.populate(data,{path: 'pending', select: 'name username firstSurname lastSurname email thumbnail'} ,function(error, populatedData){
                        socket.emit('contacts:update', { pending: populatedData.pending });
                    });
                }
            });

            Persistence.User.findOneAndUpdate({_id: msg._id}, {$addToSet:{requested: idProposer}}, function(error, data2){
                if (data2){
                    var identifier = {};
                    identifier = msg._id;
                    io.sockets.clients().forEach(function(socket){
                        socket.get('id', function(err, _id){
                            if (err)
                                throw err;
                            if (identifier === msg._id){
                                Persistence.User.populate(data2,{path: 'requested', select: 'name username firstSurname lastSurname email thumbnail'} ,function(error, populatedData){
                                    socket.emit('contacts:update', { requested: populatedData.requested });
                                });
                            }
                        });
                    });
                }
            });

        });
    });

    socket.on('disconnect', function () {
        socket.get('id', function(error, id){
            if (!error){
                console.log('user: '+id+' disconnected');
                socket.broadcast.to(id).emit('roster', {_id: id, status: 'OFFLINE'});
                socket.leave(id);
            }
            else{
                console.log('unknown user disconnected');
            }
        })
    });
 /***** Refactored until here *****/
    socket.on('find candidates', function(msg, cb){
       Persistence.User.find({username:  new RegExp(msg.username, "i")}).select("-password")
           .exec(function(error, users){
               if (error) throw error;
               if (cb)
                   cb(users);
           });
    });

    socket.on('create request', function(msg, cb){

        var requester = users[msg.requester._id].user;
        var requested = users[msg.requested._id].user;

        if (requested){
            requester.requested.addToSet(requested);
            requested.pending.addToSet(requester);

            requester.save(function(error){
                if (error) throw error;
                cb({
                    accepted: requester.accepted,
                    requested:requester.requested,
                    pending: requester.pending,
                    blocked: requester.blocked
                });
                requested.save(function(error){
                    if (error) throw error;
                    var retVal =
                    users[msg.requested._id].socket.emit("asked request",
                        {
                            accepted: requested.accepted,
                            requested:requested.requested,
                            pending: requested.pending,
                            blocked: requested.blocked
                        })
                });
            });
        }
        else {
            Persistence.User.findById(msg.requested._id, function (error, contact) {
                if (error)  throw error;
                requester.requested.addToSet(contact);
                contact.pending.addToSet(requester);

                contact.save(function (error) {
                    if (error) throw error;
                    requester.save(function (error) {
                        if (error) throw error;
                        cb({
                            accepted: requester.accepted,
                            requested:requester.requested,
                            pending: requester.pending,
                            blocked: requester.blocked
                        });
                    });
                });

            })
        }
    });
    socket.on('pending requests', function(msg, cb){
        Persistence.User.findByUsername(msg.username, function(error, user){
            if (error){
                throw error;
            }
            else{
                var contacts = user.contacts;
                var pendingContacts = [];
                for(var i=0;i<contacts.length;i++){
                    if (contacts[i].relStatus === 'PENDING' && contacts[i].displayable){
                       pendingContacts.push(parseUser(contacts[i]));
                    }
                }
                if (cb)
                    cb(pendingContacts);
            }
        })
    });
    socket.on('update request', function(msg, cb){
        var currentUser = users[msg.proposer._id].user;

        if (msg.contact._id in users){
            var proposedUser = users[msg.contact._id];
            currentUser = moveContact(currentUser, 'pending', 'accepted', msg.contact._id);
            proposedUser = moveContact(proposedUser, 'requested', 'accepted', currentUser._id);

            currentUser.save(function(error){
                if (error) throw error;
                cb({
                    accepted: currentUser.accepted,
                    requested:currentUser.requested,
                    pending: currentUser.pending,
                    blocked: currentUser.blocked
                });
                proposedUser.save(function(error){
                    if (error) throw error;
                    users[msg.contact._id].socket.emit("accepted request",
                        {
                        accepted: proposedUser.accepted,
                        requested:proposedUser.requested,
                        pending: proposedUser.pending,
                        blocked: proposedUser.blocked
                        }
                    );
                });
            });

        }
        else
            Persistence.User.findById(msg.contact.id, function(error, contactUser){
                currentUser = moveContact(currentUser, 'pending', 'accepted', msg.contact._id);
                var proposedUser = moveContact(proposedUser, 'requested', 'accepted', currentUser._id);

                currentUser.save(function(error){
                    if (error) throw error;
                    cb({
                        accepted: currentUser.accepted,
                        requested:currentUser.requested,
                        pending: currentUser.pending,
                        blocked: currentUser.blocked
                    });
                    proposedUser.save(function(error){
                        if (error) throw error;
                    });
                });
            });

//         FUNCIONA BE
//        var extractedContact = currentUser.pending.pull(msg.contact._id);
//        currentUser.accepted.push(msg.contact);
//        currentUser.save(function(error){
//            if (error) throw error;
//            console.log(currentUser.toJSON());
//            cb({
//                    accepted: currentUser.accepted,
//                    requested:currentUser.requested,
//                    pending: currentUser.pending,
//                    blocked: currentUser.blocked
//            });
//        });
    });

    socket.on('shutdown', function(data){
        if (data._id in users){
            var user = users[data._id];
            user.user.currentStatus = 'OFFLINE';
            notifyContacts(user);
            delete users[data._id];
        }
    });
});

/**
 * Warning, status forced to OFFLINE!
 * */
function parseUser(user){
    var parsedUser = (user.username in users)
        ? users[user.username]
        :{
            '_id': user._id,
            'username' : user.username,
            'name' : user.name,
            'middlename': user.firstSurname,
            'surname' : user.lastSurname,
            'thumbnail': user.thumbnail,
            'status': 'OFFLINE'
        }
    return parsedUser;
}

function registerUser(user){

    if (user.user._id in users){
        user.socket.emit("duplicated session", 'User has started session elsewhere');
    }
    else{
        user.user.currentStatus = 'ONLINE';
        users[user.user._id] = user;
    }

}

function notifyContacts(user){
    if (user.accepted){
        for (var i=0;i<user.accepted.length; i++){
            var contactName = user.contacts[i].user;
            if (contactName in users){
                console.log("notifying contact!");
                users[contactName].socket.emit("roster", user.user.toJSON());
            }
        }
    }
}
/**
 * First query database for contacts, for each of them, we check if that user is logged in searching in users array
 * if (user is found, we get that same user (it is already parsed and its status is synched), else we parse the contact
 * */
//function sendOwnContacts(user, callback){
//        user.getAllContacts(function(data){
//        var parsedContacts = [];
//        if (data){
//            for(var i=0;i<data.length;i++){
//              var user;
//              if (data[i]._id in users)
//                user = users[data[i]._id].info;
//              else
//                user = parseUser(data[i]);
//              parsedContacts.push(user);
//            }
//        }
//        callback(parsedContacts);
//    });
//}
function parseAcceptedContacts(selContacts){
    var parsedAcceptedContacts = [];
    for (var i=0;i<selContacts.length;i++){
        if (selContacts[i]._id in users)
            parsedAcceptedContacts.push(users[selContacts[i]._id].info);
        else
            parsedAcceptedContacts.push(parseUser(selfContacts[i]));
    }
    return parsedAcceptedContacts;

}

function initLoggedUser(user){

}

function moveContact(user, source, destination, contactId){
    var idArray = _.pluck(user[source], 'id');
    var idPos = idArray.indexOf(contactId);
    if (idPos>-1){
        var contact = user[source].splice(idPos, 1);
        user[destination].addToSet(contact);
        return user;
    }
    else
    return null;
}

function updateContactsForId(idUser){
    io.sockets.clients().forEach(function (socket){
        socket.get('id', function(err, id){
            if (err){
                console.log('podria ser que tingues error');
                throw error;
            }
            if (id === idUser){
                Persistence.User.findOne({_id: idUser})
                    .select('pending blocked accepted requested')
                    .populate('pending blocked accepted requested')
                    .exec(function (err, contacts){
                        console.log('contacts:'+ contacts);
                        socket.emit('contacts:update', contacts);
                    });
            }
        });
    });
}