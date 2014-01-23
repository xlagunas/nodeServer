var mongoose = require('mongoose');

//mongoose.connect('mongodb://localhost/v2b');
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
        contacts: {type: [{username: {type: 'String'}, relStatus: {type:'String', default: 'PENDING'}}], select: false},
        joinDate: {type: Date, default: Date.now(), select:false},
        thumbnail: {type: String, default: 'profile.png'},
        calls: {type: [callSchema], select: false}
    }
);
userSchema.statics.findByUsername = function(username, cb){
    this.findOne({username: username}, cb);
};
userSchema.statics.addRelationship = function(proposer, proposed, cb){
    this.findOne({username: proposer}).select('+contacts').exec(function(error, user){
        var result = {};
        if (error){
            result.status = 'error'
            result.data = "User not found";
        }
        else{
            user.contacts.create({'username': proposed});
            result.status = 'success';
            user.update();
            if (cb) cb(result);
        }
    })
}
userSchema.statics.login = function(username, password, cb){
    this.findOne({username: username}).select('+password').exec(function(err, user){
        var result = {};
        if (err){
            result.status = 'error'
            result.data = "User not found";
        }
        else{
            if (user.password === password){
                result.status = 'success';
                result.data = user;
            }
            else{
                result.status = 'error';
                result.data = "Password doesn't match";
            }
        }
        if (cb)
            cb(result);
    });
};

userSchema.methods.getContacts = function(relStatus, cb){
    var queryObject = {'username': this.username},
        result = {};

    if (relStatus != 'ALL' || relStatus ==null){
        queryObject.contacts = {'relStatus':  relStatus};
    }

    console.log("queryObject"+ JSON.stringify(queryObject));

//    this.model('Usuari').findOne(queryObject).select('+contacts').exec(function(err, data){
    this.model('Usuari').findOne(queryObject,['contacts'],function(err, data){
        console.log(data);
        if (err){
            result.status = 'error'
            result.data = "Error executing query";
        }
        else{
            result.status = 'success'
            result.data = data.contacts;
        }
        if (cb)
            cb(result);
    });
}

var User = mongoose.model('Usuari', userSchema);
    User.on('error', function(error){
        console.log("hi ha un error");
        console.log(error);
    });


var Call = mongoose.model('Trucada', callSchema);


//var relSchema = new mongoose.Schema({contact: mongoose.Schema.ObjectId, proposer: mongoose.Schema.ObjectId, date: Date, status: String});
exports.userModel = User;
exports.callModel = Call;