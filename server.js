
var Mongoose = require('mongoose'),
    fs = require('fs'),
    User = require('./User').User,
    CalendarEvent = require('./CalEvent').CalendarEvent,
    Call = require('./Call').Call,
    io = require('socket.io').listen(3000),
    _ = require('underscore');

Mongoose.connect('mongodb://localhost/v2b_devel');
var users = {};

io.set('log level', 1); // reduce logging


io.sockets.on('connection', function (socket) {

    socket.on('login', function(msg){
        if (msg && msg.username && msg.password){
            User.login(msg.username, msg.password, function(data){
                if (data.status === 'success'){
                    socket.set('username', data.user.username);
                    socket.set('id', data.user.id);
                    socket.set('status', 'ONLINE');

                    socket.emit('login', data);

                }
            });
        }
    });

    socket.on('roster:ack', function (msg){
        console.log('roster:ack');
        socket.get('id', function(error, idSender){
            if (!error && idSender){
                console.log('sender: '+idSender);
                io.sockets.clients(idSender).forEach(function(socketContact){
                    socketContact.get('id', function(error, idReceiver){
                        //Swap id; the receiver will get sender's id instead of its own
                        console.log('receiver: '+idReceiver);
                        if (idReceiver === msg.id){
                            socket.get('status', function(error, status){
                                if (!error && status){
                                    var newMsg = {id: idSender, status: status};
                                    console.log('envio ack a: '+idReceiver);
                                    socketContact.emit('roster:ack', newMsg);
                                }
                            });

                        }
                    });
                });
            }
        });
    });

    socket.on('user:existing', function (msg){
        User.exists(msg.username, function(exists){
            socket.emit('user:existing', exists);
        });
    });

    socket.on('user:create', function (msg) {
        console.log('./'+msg.username);
        fs.writeFile('./images/'+msg.username+'.png', msg.thumbnail, function (err){
            console.log(err);
        });
        User.create(msg, function(error, newUser){
            if (error) throw error;
            socket.emit('user:create', newUser);
        });
    });

    socket.on('contacts:list', function(msg){
        socket.get('id', function(error, id){
            if (!error && id != null){
                User.listContacts(id, function(data){
                    if (data){
                        socket.emit('contacts:update', data);
                        data.accepted.forEach(function(contact){
                            console.log('subscribing user: '+id+' to '+contact.id);
                            socket.join(contact.id);
                        });
                        console.log('broadcasting to Room: '+id);
                        socket.broadcast.to(id).emit('roster:update', {id: id, status: 'ONLINE'});
                    }
                });
            }
            else
                console.log(error);
        });
    });

    socket.on('contacts:update_list', function (msg){
        console.log('Entra al contacts:update_list')
        if (msg){
            socket.get('id', function(err, id){
                if(!err && id != null){
                    User.swapRelation(id, msg._id, msg.current,msg.future,function(error, updatedUser){
                        if (!error){
                            socket.emit('contacts:update', {
                                accepted:   updatedUser.accepted,
                                requested:  updatedUser.requested,
                                pending:    updatedUser.pending,
                                blocked:    updatedUser.blocked
                            });
                        }
                    });
                    if (msg.current === 'requested' && msg.future === 'accepted'){
                        User.swapRelation(msg._id, id, 'pending', 'accepted',function(error, updatedContact){
                            if (!error){
                                io.sockets.clients().forEach(function(contactSocket){
                                    contactSocket.get('id', function(error, name){
                                        if (!error && name === updatedContact.id){
                                            console.log('callback del changeRelationStatus contact');
                                            contactSocket.emit('contacts:update', {
                                                accepted:   updatedContact.accepted,
                                                requested:  updatedContact.requested,
                                                pending:    updatedContact.pending,
                                                blocked:    updatedContact.blocked
                                            });
                                        }
                                    });
                                });
                            }
                        });
                    }
                }
            });
        }
        else {
            console.log('error al contacts:update_list')
        }
    });

    socket.on('list contacts:accepted', function(msg, callback){
        if (msg.length >0) {
            User
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

    socket.on('contacts:find', function (msg) {
        User.findMatchingUsers(msg.username, function(users){
            if (users)
                socket.emit('contacts:find', users);
        });
    });

    socket.on('contacts:propose', function(msg){
        socket.get('id', function(error, idProposer){

            User.createRelation(idProposer, msg._id, 'pending', function(data){
                if (data){
                    socket.emit('contacts:update', data);
                }
            });

            User.createRelation(msg._id, idProposer, 'requested', function(contactData){
                if (contactData){
                    io.sockets.clients().forEach(function(socketContact){
                        socketContact.get('id', function(err, idContact){
                            if (err)
                                throw err;
                            if (idContact === msg._id){
                                socketContact.emit('contacts:update', contactData);
                            }
                        });
                    });
                }
            });
        });
    });

    socket.on('calendar:createEvent', function(msg){
        console.log('calendar:createEvent');
        console.log('msg');

        CalendarEvent.create(msg, function(error, event){
            if (error){
                console.log(error);
            }
            else{
                socket.get('id', function(error, idUser){
                    if (!error && idUser){
                        CalendarEvent.getUserEvents(idUser, function(data){
                            console.log(data);
                            socket.emit('calendar:getEvents', data);
                        });
                    }
                });
            }
        });
    });

    socket.on('calendar:removeUser', function (msg){
        console.log('calendar:removeUser');
        console.log('id: '+msg.id);
        socket.get('id', function(error, idUser){
            if (!error && idUser){
                CalendarEvent.findById(msg.id, function(error, event){
                    event.delUser(idUser, function(){
                        CalendarEvent.getUserEvents(idUser, function(data){
                            console.log(data);
                            socket.emit('calendar:getEvents', data);
                        });
                    });
                });
            }
        });
    });

    socket.on('calendar:getEvents', function(msg){
        console.log('Rebo calendar:getEvents');
        socket.get('id', function(error, idUser){
            if (!error && idUser){
                CalendarEvent.getUserEvents(idUser, function(data){
                    console.log(data);
                    socket.emit('calendar:getEvents', data);
                });
            }
        });
    })

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

    socket.on('shutdown', function(data){
        if (data._id in users){
            var user = users[data._id];
            user.user.currentStatus = 'OFFLINE';
            notifyContacts(user);
            delete users[data._id];
        }
    });

    socket.on('call:invite', function(msg){
        console.log('call:invite');
        socket.get('id', function(err, idProposer){
            if (!err && idProposer){
                io.sockets.clients().forEach(function(contact){
                    contact.get('id', function(err2, idContact){
                        if (!err2 && idContact){
                            if (idContact === msg.id){
                                if (msg.call.type === 'CREATE'){
                                    console.log('create');
                                    Call.create({caller: idProposer, callee: [idContact]}, function(error, call){
                                        if (!error && call){
                                            Call.populate(call,{ path: 'caller callee',  select: 'name username firstSurname lastSurname email thumbnail'}, function(error, popCall){
                                                if (!error && popCall){
                                                    contact.emit('call:invite', popCall);
                                                }
                                            });
                                        }
                                        else{
                                            console.log(error);
                                        }
                                    });
                                }
                                if (msg.call === 'JOIN'){
                                    console.log('join');
                                    Call.findById(msg.call.id, {path: 'caller callee', select: 'name username firstSurname lastSurname email thumbnail'}, function(err, call){
                                        if (!err && call){
                                            console.log(call);
                                            contact.emit('call:invite', call);
                                        }
                                        else{
                                            console.log(err);
                                        }
                                    });
                                }
                            }
                        }
                    });
                });
            }
        });
    });

    socket.on('call:accept', function(msg){
        console.log('call:accept');
        socket.get('id', function(err, id){
            if (!err && id){
                Call.addUserToCall(msg.id, id, function(data){
                    io.sockets.clients().forEach(function(contact){
                        contact.get('id', function(error2, idContact){
                            if (!error2 && idContact){
                                if (idContact === data.caller.id){
                                    contact.emit('call:accept', data);
                                }
                            }
                        });
                    });
                });
            }
            else {
                console.log('error in call accept');
            }
        });
    });

    socket.on('call:reject', function(msg){
        console.log('call:reject');
        socket.get('id', function(err, id){
            if (!err && id){
                Call.findByIdAndUpdate(msg.id,{status: 'CANCELLED'}).populate( { path: 'caller callee',
                    select: 'name username firstSurname lastSurname email thumbnail'
                }).exec(function(err, data){
                    io.sockets.clients().forEach(function(contact){
                        contact.get('id', function(error2, idContact){
                            if (!error2 && idContact){
                                if (idContact === data.caller.id){
                                    contact.emit('call:reject', data);
                                }
                            }
                        });
                    });
                });

            }
            else {
                console.log('error in call accept');
            }
        });
    });

    socket.on('call:register', function(msg){
        socket.get('id', function(err, id){
            if (!err && id){
                User.findById(id, function(err2, user){
                    if (!err2 && user){
                        console.log('user: '+id+' joined call room: '+msg.id);
                        socket.join('call:'+msg.id);
                        socket.broadcast.to('call:'+msg.id).emit('call:addUser', user);
                    }
                });
            }
        });

    });

    socket.on('call:userDetails', function(msg){
        socket.get('id', function(err, id){
            if (!err && id){
                User
                .findById(id, 'username name firstSurname lastSurname thumbnail email', function(error, user){
                    if (!error && user){
                        io.sockets.clients('call:'+msg.idCall).forEach(function(contact){
                            contact.get('id', function(errId, idContact){
                                if (!errId && idContact){
                                    if (idContact === msg.idUser){
                                        contact.emit('call:userDetails', user);
                                    }
                                }
                            });
                        });
                    }
                });
            }
        });
    });

    socket.on('webrtc:offer', function(msg){
        console.log('webrtc:offer');
        socket.get('id', function(err, id){
            if (!err && id){
                io.sockets.clients('call:'+msg.idCall).forEach(function(contact){
                    contact.get('id', function(errContact, idContact){
                        if (!errContact && idContact){
                            if (idContact === msg.idUser){
                                contact.emit(id+':offer', msg.offer);
                            }
                        }
                    });
                });
            }
        });
    });

    socket.on('webrtc:answer', function(msg){
        console.log('webrtc:answer');
        socket.get('id', function(err, id){
            if (!err && id){
                io.sockets.clients('call:'+msg.idCall).forEach(function(contact){
                    contact.get('id', function(errContact, idContact){
                        if (!errContact && idContact){
                            if (idContact === msg.idUser){
                                contact.emit(id+':answer', msg.answer);
                            }
                        }
                    });
                });
            }
        });
    });

    socket.on('webrtc:iceCandidate', function(msg){
        console.log('webrtc:iceCandidate');
        socket.get('id', function(err, id){
            if (!err && id){
                io.sockets.clients('call:'+msg.idCall).forEach(function(contact){
                    contact.get('id', function(errContact, idContact){
                        if (!errContact && idContact){
                            if (idContact === msg.idUser){
                                contact.emit(id+':iceCandidate', msg.candidate);
                            }
                        }
                    });
                });
            }
        });
    });
});
