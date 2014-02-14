/**
 * Created with JetBrains WebStorm.
 * User: xlagunas
 * Date: 03/02/14
 * Time: 09:48
 * To change this template use File | Settings | File Templates.
 */


var Mongoose = require('mongoose'),
    _ = require('underscore');

var userSchema = Mongoose.Schema(
    {
        username: {type: String, index: true, unique: true, required: true},
        name: String,
        firstSurname: String,
        lastSurname: String,
        email: {type: String, required: true},
        status: {type: String, default: 'OFFLINE'},
        password: {type: String, required: true},
        accepted: [{ type : Mongoose.Schema.ObjectId, ref : 'User' }],
        pending: [{ type : Mongoose.Schema.ObjectId, ref : 'User'  }],
        blocked: [{ type : Mongoose.Schema.ObjectId, ref : 'User' }],
        requested: [{ type : Mongoose.Schema.ObjectId, ref : 'User' }],
        joinDate: {type: Date, default: Date.now()},
        thumbnail: {type: String, default: 'profile.png'}
    }
);

userSchema.virtual('updatedStatus')
    .get( function () {
        if (!this.currentStatus)
            return 'OFFLINE'
        return this.currentStatus;
    }).set(function(v){
        this.currentStatus = v;
    });
userSchema.set('toJSON', { getters: true, virtuals: true });

userSchema.statics.login = function(username, password, cb){
    this.findOne({username: username}).select('+password')
        .populate("accepted", 'name username firstSurname lastSurname email thumbnail _id')
        .populate("rejected", 'name username firstSurname lastSurname email thumbnail _id')
        .populate("pending", 'name username firstSurname lastSurname email thumbnail _id')
        .populate("blocked", 'name username firstSurname lastSurname email thumbnail _id')
        .populate("requested", 'name username firstSurname lastSurname email thumbnail _id')
        .exec(cb)
};

userSchema.statics.findByUsername = function(username, cb){
    this.findOne({username: username}, cb);
}

userSchema.methods.changeRelationStatus = function(oldStatus, newStatus, user, cb){
    console.log(user._id);
    var oldContactIds = _.pluck(this[oldStatus],'id');
    var position = oldContactIds.indexOf(user.id);

    var selectedItems = this[oldStatus].splice(position, 1);
    this[newStatus].addToSet(selectedItems);

    this.save(cb);

}
userSchema.methods.toContact = function(){
    var retObject = this.toJSON();
    delete retObject.pending;
    delete retObject.blocked;
    delete retObject.accepted;
    delete retObject.requested;

    return retObject;
}

userSchema.methods.toSelfUser = function(){
    var retObject = this.toJSON();
}

var User = Mongoose.model('User', userSchema);

//Mongoose.connect('mongodb://localhost/v2b_devel');

function createUsers(){
    var josep = new User(
        {
            username: 'jlagunas',
            name: 'Josep',
            firstSurname: 'Lagunas',
            lastSurname: 'Calpe',
            email: 'josep.lagunas@gmail.com',
            password: '123456'
        }
    );
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
    var carles = new User(
        {
            username: 'clagunas',
            name: 'Carles',
            firstSurname: 'Lagunas',
            lastSurname: 'Calpe',
            email: 'hewson90@gmail.com',
            password: '123456'
        }
    );

    function checkError(error){
        if (error) throw error;
        console.log("ok!");
    }

    josep.save(checkError);
    xavi.save(checkError);
    carles.save(checkError);
}

function assignContact(){
  User.findByUsername("jlagunas", function(error, user){
    if (error) throw error;

        User.findOneAndUpdate({username: 'clagunas'},{$addToSet: {pending: user}},{upsert: true},function(error, user1){
            console.log(user1);
        });

  });
}

function login(){
    User.find({username: 'jlagunas'}).populate("accepted", 'username firstSurname lastSurname emal thumbnail _id')
        .populate("rejected", 'username firstSurname lastSurname emal thumbnail _id')
        .populate("pending", 'username firstSurname lastSurname emal thumbnail _id')
        .populate("blocked", 'username firstSurname lastSurname emal thumbnail _id').exec(function(error, suc){
        if (error) throw error;
        console.log(suc);
        User.login('clagunas','123456', function(error, data){
            if (error) throw error;
            data.changeRelationStatus('accepted','pending', suc, function(error, data2){
//                console.log(data)
                if(error) throw error;
                console.log("data2:"+ data2);
            });
        })
    })

}

function updateContact(){
    User.login('xlagunas','123456', function(error, user){
        user.changeRelationStatus()
    });
}

//createUsers();
//
////assignContact();
//updateContact();
////login();

exports.User = User;
