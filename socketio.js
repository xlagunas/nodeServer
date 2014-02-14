/**
 * Created with JetBrains WebStorm.
 * User: xlagunas
 * Date: 14/02/14
 * Time: 09:21
 * To change this template use File | Settings | File Templates.
 */

var io = require('socket.io').listen(3000);

io.sockets.on('connection', function (socket) {

    socket.on('login', function(msg, cb){
        socket.set('username', msg.username);
        socket.join('xat');
        var roster = io.sockets.clients('xat');
        cb(msg);
        roster.forEach(function (user){
            user.get('username', function(err, name){
                if (err) throw err;
                console.log(name);
            });
        })
    });
    socket.on('contact:find', function(msg, cb){
        if (msg.username){

        }
    });
});
