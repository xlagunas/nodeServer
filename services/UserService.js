/**
 * Created with JetBrains WebStorm.
 * User: xlagunas
 * Date: 05/02/14
 * Time: 15:36
 * To change this template use File | Settings | File Templates.
 */
var Persistence = require('../persistence_debug'),
    _ = require('underscore');

var users = [];


//exports.getUserContacts = function (idUser, cb){
//    var user = this.getUserById(idUser, function(data){
//    var contacts =
//        {
//            accepted:   _.omit(data.accepted, 'accepted','rejected', 'blocked','pending'),
//            blocked:    _.omit(data.blocked, 'accepted','rejected', 'blocked','pending'),
//            pending:    _.omit(data.blocked, 'accepted','rejected', 'blocked','pending'),
//            requested:  _.omit(data.blocked, 'accepted','rejected', 'blocked','pending')
//        }
//     cb(contacts);
//    });
//};
exports.getUserContacts = function (idUser, cb){
    var user = this.getUserById(idUser, function(data){
     cb(data);
    });
};

exports.getUserById = function (idUser,cb){
    if (users.length>0){
        var user = _.find(users, function(user){
            console.log("proxying user");
            return user._id == idUser;
         });
        if (user) cb(user);
    }

    if (!user){
        Persistence.User.findById(idUser, function(error, data){
            console.log("querying user to db");
            users.push(data);
            cb(data);
        });
    }
};
exports.getUserByUsername = function (username, cb){
    var user;
    if (users.length>0){
        user = _.find(users, function(user){
            console.log("proxying user");
            return user.username == username;
        });
        if (user) cb(user);
    }
    if (!user){
        Persistence.User.findOne({username: username}, function(error, data){
            console.log("querying user to db");
            users.push(data);
            cb(null, data);
        });
    }
};

exports.addContactToList = function (user, contact, listName, reverseListName,callback){
    this.getUserByUsername(user, function (error, selfUser){
        if (error) throw error;
        this.getUserByUsername(contact, function(error, contactUser){
            selfUser[listName].addToSet(contactUser);
            //Add it to the other user
            contactUser[reverseListName].addToSet(selfUser);

            contactUser.save(function(error, updatedContactUser){
                if (error) throw error;
                selfUser.save(function(error, updatedSelfUser){
                    if (error) throw error;
                    callback({user: updatedSelfUser, contact: updatedContactUser});
                });
            });
        });
    });
}




