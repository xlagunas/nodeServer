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
               if (cb)
                   cb(retVal);
           }

        });
    });
    socket.on('find candidates', function(msg, cb){
       persistence.User.find({username:  new RegExp(msg.username, "i")}).select("name firstName lastName thumbnail")
           .exec(function(error, users){
               if (error) throw error;
               if (cb)
                   cb(users);
           });
    });
    socket.on('create request', function(msg, cb){
       console.log("entro");
       console.log(msg);

       var rel = new persistence.Relationship({relStatus: 'PENDING', user: msg.requested._id, notify: false});
       rel.save(function(error){
           if (error) throw error;
           persistence.User.findByIdAndUpdate(msg.requester._id,{$addToSet: {contacts: rel}},{upsert: true},function(error, user){
               if (error) throw error;
               console.log(user);

               var rel2 = new persistence.Relationship({relStatus: 'PENDING', user: msg.requester._id, notify: true});
               rel2.save(function(error){
                   if (error) throw error;
                   persistence.User.findByIdAndUpdate(msg.requested._id,{$addToSet: {contacts: rel2}},{upsert: true},function(error, user2){
                       if (error) throw error;
                       console.log(user2);
                       if(cb)
                        cb([rel,rel2]);
                   });
               });
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
        user.socket.emit("duplicated session", 'User has started sesion elsewhere');
    }
    else{
        user.info.status = 'ONLINE';
//        users[user.info.username] = user;
        users[user.info._id] = user;
    }

}

function notifyContacts(user){
    for (var i=0;i<user.contacts.length; i++){
        var contactName = user.contacts[i].user;
        if (contactName in users){
            console.log("notifying contact!");
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
        var parsedContacts = [];
        if (data){
            for(var i=0;i<data.length;i++){
              var user;
              if (data[i]._id in users)
                user = users[data[i]._id].info;
              else
                user = parseUser(data[i]);
              parsedContacts.push(user);
            }
        }
        callback(parsedContacts);
    });
}