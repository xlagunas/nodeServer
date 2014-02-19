
var Mongoose = require('mongoose'),
    Persistence = require('./persistence_debug')
    io = require('socket.io').listen(3000),
    _ = require('underscore');

Mongoose.connect('mongodb://localhost/v2b_i2cat');
var users = {};
io.set('log level', 1); // reduce logging

io.sockets.on('connection', function (socket) {
    socket.on('login', function(msg, cb){
        Persistence.User
        .findOne({username: msg.username})
        .exec(function(error, loggedUser){
            if (error) {
                cb({status: 'error',
                    error: error})
            }

            socket.set('username', msg.username);
            socket.set('_id', loggedUser._id);

            if (loggedUser.password === msg.password){
                cb({status: 'success', data: loggedUser});
            }
            else{
                cb({status: 'error',data: 'Error password doesn\'t match'});
            }
        });
    });
    socket.on('user:existing', function(msg, cb){
        Persistence.User
            .find({username: msg.username})
            .exec(function(error, data){
               if (error) throw error;
               if (data.length == 0){
                    cb(false);
               }
                else
                    cb(true);

            });
    });

    socket.on('user:create', function(msg, cb){
        var newUser = new Persistence.User(msg);
        newUser.save(function(error){
            if (error) throw error;
            cb(newUser);
        });
    });

    socket.on('contacts:list', function(msg, callback){
        console.log('contacts:list');
        socket.get('_id', function(error, _id){
            if (!error && _id != null){
                console.log(_id);
                Persistence
                    .User
                    .findById(_id)
                    .populate({path: 'pending accepted requested blocked', select: 'name username firstSurname lastSurname email thumbnail'})
                    .exec(function(error, populatedData){
                        callback({
                            accepted: populatedData.accepted,
                            requested: populatedData.requested,
                            pending: populatedData.pending,
                            blocked: populatedData.bloked
                        });
                    });
            }
            else{ console.log(error);}
        });
    });

    socket.on('contacts:update_list', function (msg){
        if (msg){
            socket.get('_id', function(err, _id){
                if(!err && _id != null){
                    Persistence.User.findById(_id).exec(function(err, user){
                        user[msg.current].pull(msg._id);
                        user[msg.future].addToSet(msg._id);

                        user.save(function(error){
                           if (error) throw error;
                           Persistence.User
                               .populate(user,
                                    {   path: 'pending accepted requested blocked',
                                        select: 'name username firstSurname lastSurname email thumbnail'
                                    },
                                    function(error, populatedData){
                                        socket.emit('contacts:update',
                                        {
                                           accepted: populatedData.accepted,
                                           requested: populatedData.requested,
                                           pending: populatedData.pending,
                                           blocked: populatedData.bloked
                                        });
                               });
                        });
                    });
                    if (msg.current === 'requested'){
                        Persistence.User.findById(msg._id).exec(function(err, user2){
                            if (!err){
                                console.log(user2);
                                if(_.contains(user2['pending'], _id)){
                                    console.log('contains user, go on!');
                                    user2['pending'].pull(_id);
                                    user2['accepted'].addToSet(_id);
                                    user2.save(function(err){
                                        io.sockets.clients().forEach(function(sock){
                                            sock.get('_id', function(err, name){
                                               if (name === user2._id){
                                                   console.log('_id found!, proceeding to update');
                                                   Persistence.User
                                                       .populate(user2,{
                                                           path: 'pending accepted requested blocked',
                                                           select: 'name username firstSurname lastSurname email thumbnail'
                                                       },
                                                       function(error, populatedData){
                                                           sock.emit('contacts:update',
                                                               {
                                                                   accepted: populatedData.accepted,
                                                                   requested: populatedData.requested,
                                                                   pending: populatedData.pending,
                                                                   blocked: populatedData.bloked
                                                               });
                                                       });
                                               }
                                            });
                                        });
                                    });
                                }
                                else{
                                    console.log('_id not found, it\'s extrange');
                                }
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

    socket.on('contacts:find', function(msg, cb){
        Persistence.User.find({username:  new RegExp(msg.username, "i")}).select("-pending -password -accepted -requested -blocked")
            .exec(function(error, users){
                if (error) throw error;
                if (cb)
                    cb(users);
            });
    });

    socket.on('contacts:propose', function(msg){
        socket.get('_id', function(error, idProposer){
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
                        socket.get('_id', function(err, _id){
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

    socket.on('disconnect', function () {
        io.sockets.emit('user disconnected');
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
        socket.get('_id', function(err, id){
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