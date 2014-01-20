var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	mongoose = require('mongoose'),
	nodemailer = require('nodemailer');

server.listen(3000, "192.168.1.35");
mongoose.connect('mongodb://localhost/v2b');

app.get('/', rootGetRequest);

function rootGetRequest(req, res){
	res.sendfile(__dirname + '/index.html');
}

io.sockets.on('connection', function(socket){
	socket.emit("hello", "new msg!");

    socket.on('user:add', function(user, callback){
        if (user.username){
            var addedUser = new User(user);
            console.log(addedUser);
            addedUser.save(saveStatus);
            console.log(User.find({}, function(error, users){
                console.log(users);
                callback(users);
            }));
        }
        else
            callback(false);
    });
    socket.on('user:list', function(){
       return
    });
});

function saveStatus(error){
    if (error){
        console.log(error);
    }
    else
        console.log("Successfully saved");
}

var Cat = mongoose.model('Cat', {name: String});
var userSchema = new mongoose.Schema({username: String, name: String, firstSurname: String, lastSurname: String, email: String, status: String});
var relSchema = new mongoose.Schema({contact: mongoose.Schema.ObjectId, proposer: mongoose.Schema.ObjectId, date: Date, status: String});

var User = mongoose.model('User', userSchema);
var Relationship = mongoose.model('Relationship',relSchema);

//var missi = new Cat({name: 'Missi2'});
//missi.save(function(err){
//	if (err){
//		console.log(err);
//	}
//	else
//		console.log("!err");
//});

/*var transport = nodemailer.createTransport("SMTP", {
    service: "Gmail",
    auth: {
        user: "xlagunas@gmail.com",
        pass: "lagunas2"
    }
});

var mailOptions = {
    from: "xlagunas@gmail.com",
    to: "xavier.lagunas@i2cat.net",
    subject: "node mail!",
    text: "Mail test!! from nodejs!!"
}

transport.sendMail(mailOptions, function(error, responseStatus){
	if (!error){
		console.log(responseStatus.message);
		console.log(responseStatus.messageId);
	}
	else console.log(error);
});
*/