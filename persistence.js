var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/v2b');

var callSchema = new mongoose.Schema(
    {
        caller: String,
        callees: [{username: String}],
        type: String
    }
);

var userSchema = new mongoose.Schema(
    {
        username: {type: String, index: true, unique: true, required: true},
        name: String,
        firstSurname: String,
        lastSurname: String,
        email: {type: String, required: true},
        status: {type: String, default: 'OFFLINE'},
        password: {type: String, select: false, required: true},
        contacts: [{username: 'String', relStatus: 'String'}],
        joinDate: {type: Date, default: Date.now()},
        calls: [callSchema]
    }
);

var User = mongoose.model('Usuari', userSchema);
    User.on('error', function(error){
        console.log("hi ha un error");
        console.log(error);
    })

var Call = mongoose.model('Trucada', callSchema);

var xavi = new User(
    {
        username: 'xlagunas',
        name: 'Xavier',
        firstSurname: 'Lagunas',
        lastSurname: 'Calpe',
        email: 'xlagunas@gmail.com',
        password: '123456'
   }
);

    xavi.save(saveCallback);

function saveCallback(error){
    if (error)
        console.log(error);
    else
        console.log("successfully saved");
}


//var relSchema = new mongoose.Schema({contact: mongoose.Schema.ObjectId, proposer: mongoose.Schema.ObjectId, date: Date, status: String});
