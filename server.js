/**
 * Created by xlagunas on 24/01/14.
 */
// note, io.listen(<port>) will create a http server for you
var mongoose = require('mongoose'),
    persistence = require('./persistence_debug'),
    io = require('socket.io').listen(3000),
    _ = require('underscore');

mongoose.connect('mongodb://localhost/v2b_devel');
var users = {};
io.set('log level', 1); // reduce logging

io.sockets.on('connection', function (socket) {
    socket.on('login', function(msg, cb){
        persistence.User.login(msg.username, msg.password, function(error, loggedUser){
            if (error) throw error;
               console.log("user: "+loggedUser);
               var user = {
                   socket: socket,
                   info: parseUser(loggedUser),
                   contacts: {
                       accepted: parseAcceptedContacts(loggedUser.accepted),
                       pending: loggedUser.pending,
                       blocked: loggedUser.blocked
                   }
               };
            registerUser(user);

            cb({user: user.info, contacts: user.contacts});
        });
    });
    socket.on('find candidates', function(msg, cb){
       persistence.User.find({username:  new RegExp(msg.username, "i")}).select("_id name firstSurname lastSurname thumbnail email")
           .exec(function(error, users){
               if (error) throw error;
               if (cb)
                   cb(users);
           });
    });
    socket.on('create request', function(msg, cb){
        persistence.User.findByIdAndUpdate(msg.requester._id,{$addToSet: {pending: msg.requested._id}},{upsert: true},function(error, user){
            if (error) throw error;
            persistence.User.findByIdAndUpdate(msg.requested._id,{$addToSet: {requested: msg.requester._id}},{upsert: true},function(error, user2){
                if(error) throw error;
                //al user li retornare un cb amb ok!;
                cb(parseUser("pending acceptance"))
                if (msg.requested._id in users){
                    users[msg.requested._id].socket.emit("asked request", msg.requester);
                }
                //al remot li enviare un event amb les dades del requester
            });
        });


    });

    socket.on('pending requests', function(msg, cb){
        persistence.User.findByUsername(msg.username, function(error, user){
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
        console.log(msg);
        persistence.User.findOne({username: msg.proposer.username})
            .populate("accepted", 'name username firstSurname lastSurname email thumbnail _id')
            .populate("rejected", 'name username firstSurname lastSurname email thumbnail _id')
            .populate("pending", 'name username firstSurname lastSurname email thumbnail _id')
            .populate("blocked", 'name username firstSurname lastSurname email thumbnail _id').exec(function(error, proposer){
            if (error) throw error;
                if(error) throw error;
                persistence.User.findOne({username: msg.contact.username})
                    .populate("accepted", 'name username firstSurname lastSurname email thumbnail _id')
                    .populate("rejected", 'name username firstSurname lastSurname email thumbnail _id')
                    .populate("pending", 'name username firstSurname lastSurname email thumbnail _id')
                    .populate("blocked", 'name username firstSurname lastSurname email thumbnail _id').exec(function(error, contact){
                        if (error) throw error;
                    console.log("proposer: "+proposer);
                    console.log("contact: "+contact);
                    proposer.changeRelationStatus('pending', msg.status, contact, function(error, success){
                        if (error) throw error;
                        if (msg.status === 'accepted')
                            contact.changeRelationStatus('requested', 'accepted', proposer, function(error, succ){
                            cb({status: "accepted", contact: parseUser(contact)});
                        });
                });
            });
        });

//        proposer.changeRelationStatus('pending', 'accepted', contact, cb);
//        contact.changeRelationStatus('requested', 'accepted', proposer, function(error, data){
//
//        });
    });

    socket.on('disconnect', function () {
        io.sockets.emit('user disconnected');
    });

    socket.on('shutdown', function(data){
        if (data._id in users){
            var user = users[data._id];
            user.info.status = 'OFFLINE';
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

    if (user.info._id in users){
        user.socket.emit("duplicated session", 'User has started session elsewhere');
    }
    else{
        user.info.status = 'ONLINE';
//        users[user.info.username] = user;
        users[user.info._id] = user;
    }

}

function notifyContacts(user){
    if (user.accepted){
        for (var i=0;i<user.accepted.length; i++){
            var contactName = user.contacts[i].user;
            if (contactName in users){
                console.log("notifying contact!");
                users[contactName].socket.emit("roster", user.info);
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