var Mongoose = require('mongoose'),
    _ = require('underscore');

Mongoose.connect('mongodb://localhost/v2b_debug');

var relationSchema = new Mongoose.Schema({
//    user: [userSchema],
    user: {type: Mongoose.Schema.ObjectId, ref: 'User'},
    relStatus: {type: String, enum: ['ACCEPTED', 'REJECTED', 'PENDING', 'BLOCKED']}
});

var userSchema = new Mongoose.Schema(
    {
        username: {type: String, index: true, unique: true, required: true},
        name: String,
        firstSurname: String,
        lastSurname: String,
        email: {type: String, required: true},
        status: {type: String, default: 'OFFLINE'},
        password: {type: String, select: false, required: true},
//        contacts: {type: Mongoose.Schema.ObjectId, ref: 'Relation'},
        contacts: [relationSchema],
        joinDate: {type: Date, default: Date.now(), select:false},
        thumbnail: {type: String, default: 'profile.png'}
    }
);


var User = Mongoose.model('User', userSchema);
var Relation = Mongoose.model('Relation', relationSchema);

function checkCorrectCreation(error){
    if (error) throw error;
    console.log("save ok!");
};

var u1 = new User({username: 'xlagunas', name: 'Xavier', firstSurname:'Lagunas', lastSurname: 'Calpe', email: 'xlagunas@gmail.com', password: '123456'});
var u2 = new User({username: 'clagunas', name: 'Carles', firstSurname:'Lagunas', lastSurname: 'Calpe', email: 'clagunas@gmail.com', password: '123456'});
var u3 = new User({username: 'jlagunas', name: 'Josep', firstSurname:'Lagunas', lastSurname: 'Calpe', email: 'jlagunas@gmail.com', password: '123456'});
function _create(){
//    u1.save(checkCorrectCreation);
//    u2.save(checkCorrectCreation);
    u3.save(checkCorrectCreation);

}

function _login(){
    User.findOne({username: 'xlagunas'}, function(error, user){
        if (error) throw error;

        User.findOne({username: 'jlagunas'}).select("+password").exec(function(error, user2){
            if (error) throw error;
            console.log(user2);
            var rel = new Relation({relStatus: 'PENDING', user: user2});
            rel.save(checkCorrectCreation);
        });
    });
}

function _addRelationToUser(){
    Relation.findOne({user: '52e9914c9bbdf88775e81850'}, function(error, relation){
        if (error) throw error;

        User.findOneAndUpdate({username: 'xlagunas'},{$addToSet: {contacts: relation}},{upsert: true},function(error, user){
            if (error) throw error;
            console.log(user);
        });
    });
}

function _getAllInfo(){
    User.findOne({username: 'xlagunas'}).populate("+contacts").populate("+contacts.user").exec(function(error, user){
        if (error)
            throw error;
//        User.find({_id: {$in: _.pluck(user.contacts,'user')}},'-contacts -status', function(error, object){
        User.find({_id: {$elemMatch: user.contacts.user}},'-contacts -status', function(error, object){
            if (error) throw error;
            console.log(object);
        });
    })
}

//_create();
//_login();
_addRelationToUser();
//_getAllInfo();