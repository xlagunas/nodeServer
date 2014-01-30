/**
 * Created by xlagunas on 24/01/14.
 */
// note, io.listen(<port>) will create a http server for you
var mongoose = require('mongoose'),
    persistence = require('./persistence'),
    io = require('socket.io').listen(3000),
    _ = require('underscore');

mongoose.connect('mongodb://localhost/v2b');
var users = {};
io.set('log level', 1); // reduce logging

io.sockets.on('connection', function (socket) {
    socket.on('login', function(msg, cb){
        persistence.User.login(msg.username, msg.password, function(retVal){
           if (retVal.status === 'success'){
               var user = {socket: socket, info: parseUser(retVal.data), contacts: retVal.data.contacts};
               registerUser(user);
               notifyContacts(user);
               sendOwnContacts(retVal.data, function(sock){
                   return function(contacts){
                       if (contacts && contacts.length>0){
                           sock.emit('contacts list', {'contacts': contacts});
                       }
                   }
               }(socket));
           }
           if (cb)
            cb(retVal);
        });
    });

    socket.on('pending requests', function(msg, cb){
//        console.log(msg);
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

    });

    socket.on('disconnect', function () {
        io.sockets.emit('user disconnected');
    });

    socket.on('shutdown', function(data){
        if (data.username in users){
            var user = users[data.username];
            user.info.status = 'OFFLINE';
            notifyContacts(user);
            delete users[data.username];
        }
    })
});

/**
 * Warning, status forced to OFFLINE!
 * */
function parseUser(user){
    var parsedUser = (user.username in users)
        ? users[user.username]
        :{
            'idUser': user._id,
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
    if (user.info.username in users){
        user.socket.emit("duplicated session", 'User has started sesion elsewhere');
    }
    else{
        user.info.status = 'ONLINE';
        users[user.info.username] = user;
    }
}

function notifyContacts(user){
    for (var i=0;i<user.contacts.length; i++){
        var contactName = user.contacts[i].username;
        if (contactName in users){
            users[contactName].socket.emit("roster", user.info);
        }
    }
}
/**
 * First query database for contacts, for each of them, we check if that user is logged in searching in users array
 * if (user is found, we get that same user (it is already parsed and its status is synched), else we parse the contact
 * */
function sendOwnContacts(user, callback){
        user.getAllContacts(function(data){
//        console.log(data);
        var parsedContacts = [];
        for(var i=0;i<data.length;i++){
          var user;
          if (data[i].username in users)
            user = users[data[i].username].info;
          else
            user = parseUser(data[i]);
          parsedContacts.push(user);
        }
        callback(parsedContacts);
    });
}