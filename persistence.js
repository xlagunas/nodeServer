var mongoose = require('mongoose'),
    _ = require('underscore');

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
        contacts: [
            {
                username: String,
                relStatus: {type:'String', default: 'PENDING'},
                displayable: Boolean
            }
        ],
        joinDate: {type: Date, default: Date.now(), select:false},
        thumbnail: {type: String, default: 'profile.png'},
        calls: {type: [callSchema], select: false}
    }
);
userSchema.statics.findByUsername = function(username, cb){
    this.findOne({username: username}, cb);
};
userSchema.statics.addRelationship = function(proposer, proposed, displayable, cb){
    this.findByUsername(proposer, function(error, user){
        var result = {};
        if (error){
            result.status = 'error'
            result.data = "User not found";

            if (cb)
                return cb(result);
        }
        else{
            var ids = _.pluck(user.contacts, 'username');
            console.log(ids);
            console.log(_.contains(ids, proposed));
            if (_.contains(ids, proposed)){
                result.status = 'error'
                result.data = "relationship already exists";

                if (cb)
                    return cb(result);
            }
            else{
                user.contacts.push({username: proposed, displayable: displayable});
                user.save(function(error, data){
                    if (error){
                        result.status = 'error';
                        result.data = 'Error updating model';
                    }
                    else{
                        result.status = 'success';
                        result.data = data;
                    }
                    if (cb)
                        return cb(result);

                });
            }
        }
    })
};

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
userSchema.methods.createRelationship = function(contact, displayable, cb){
    var result = {};
    var ids = _.pluck(this.contacts, 'username');
    console.log(ids);
    console.log(_.contains(ids, contact));

    if (_.contains(ids, contact)){
        result.status = 'error'
        result.data = "relationship already exists";

        if (cb)
            return cb(result);
    }
    else{
        this.contacts.push({username: contact, displayable: displayable});
        this.save(function(error, data){
            if (error){
                result.status = 'error';
                result.data = 'Error updating model';
            }
            else{
                result.status = 'success';
                result.data = data;
            }
            if (cb)
                return cb(result);

        });
    }
};
userSchema.methods.updateRelationship = function(contact, status, cb){
    var contact = _.where(this.contacts,{username: contact});
    var result = {};
    if (contact.length == 0){
        result.error = 'error';
        result.data = 'No relationship found';
        if(cb)
            return cb(result);
    }
    else{
        contact[0].relStatus = status;

        this.save(function(error, object){
            if (err){
                result.status = 'error';
                result.data = "User not found";
            }
            else{
                result.status = 'success';
                result.data = object;
            }
            return cb(result);
        });
    }
};

userSchema.methods.getContacts = function(relStatus, cb){
    var queryObject = {'username': this.username},
        result = {};

    if (relStatus != 'ALL' || relStatus ==null){
        queryObject.contacts = {'relStatus':  relStatus};
    }

    console.log("queryObject"+ JSON.stringify(queryObject));

    this.model('Usuari').findOne(queryObject).select('+contacts').exec(function(err, data){
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

//var User = mongoose.model('Usuari', userSchema);
//    User.on('error', function(error){
//        console.log("hi ha un error");
//        console.log(error);
//    });


var Call = mongoose.model('Call', callSchema);
var User = mongoose.model('User', callSchema);

exports.User = User;
exports.Call = Call;
