var mongoose = require('mongoose'),
    persistence = require('./persistence'),
    _ = require('underscore');

mongoose.connect('mongodb://localhost/v2b');

var josep = new persistence.User(
    {
        username: 'jlagunas',
        name: 'Josep',
        firstSurname: 'Lagunas',
        lastSurname: 'Calpe',
        email: 'josep.lagunas@gmail.com',
        password: '123456'
    }
);
var xavi = new persistence.User(
    {
        username: 'xlagunas',
        name: 'Xavier',
        firstSurname: 'Lagunas',
        lastSurname: 'Calpe',
        email: 'xlagunas@gmail.com',
        password: '123456'
    }
);
var carles = new persistence.User(
    {
        username: 'clagunas',
        name: 'Carles',
        firstSurname: 'Lagunas',
        lastSurname: 'Calpe',
        email: 'hewson90@gmail.com',
        password: '123456'
    }
);

var raquel = new persistence.User(
    {
        username: 'rlopez',
        name: 'Raquel',
        firstSurname: 'Lopez',
        lastSurname: 'Mallebrera',
        email: 'raquel.lopez.mallebrera@gmail.com',
        password: '123456'
    }
);

//josep.save(saveCallback);
//carles.save(saveCallback);

//user.userModel.findByUsername('xlagunas', function(err, users){
//    console.log(users);
//});
//user.userModel.login('xlagunas', '123456', function(data){
//    console.log(data);
//    if (data.status ==='success'){
//        data.data.getContacts('ACCEPTED', function(data){console.log(data)});
//    }
//});
//
//var raquel = new user.userModel({username: "rlopez", name: "Raquel", surname:"Lopez", lastname: "Mallebrera",
//    "password": "123456", email: "raquel.lopez.mallebrera@gmail.com"});

function saveCallback(error){
    if (error)
        console.log(error);
    else
        console.log("save successful");
}



//user.userModel.login('jlagunas','123456', function(data){
//        console.log("entra!")
//        if(data.status === 'error')
//            console.log(error)
//        else{
//            console.log("Successfully updated");
//            data.data.contacts.push({contact: 'rlopez'});
//            data.data.save(function(error, data){
//                if (error) console.log(error)
//                else
//                    console.log(data);
//            });
//        }
//    }
//);

//User.update({username: 'xlagunas'}, {})
//user.userModel.addRelationship('jlagunas','clagunas', function(data){
//    console.log(data);
//})
function createUsers(){
    josep.save(saveCallback);
    carles.save(saveCallback);
    xavi.save(saveCallback);
    raquel.save(saveCallback);
}

function login(){
    console.log("trying to log with xlagunas 123456");
    persistence.User.login('jlagunas', '123456', function(login){
        if (login.status === 'error'){
            console.log("there is an error");
        }
        else{
            console.log("sucessful login: ");
            var u = login.data;
//            u.updateRelationship('clagunas', 'ACCEPTED');
//            u.createRelationship('clagunas', false, function(data){
//                console.log(data);
            u.getAllContacts(function(data){
                console.log(data);
            });

//            })
        }
    })
}
function addContact(){
    persistence.User.addRelationship('clagunas','xlagunas' , true, function(result){
        console.log(result);
    });
}

function getContact(){
    persistence.User.findOne({'username': 'jlagunas'})
        .exec(function(err, obj){
        if (err)
            console.log(err);
        else{
            console.log("vull mirar aqui");
            for(var i=0;i<obj.contacts.length;i++){
                console.log(obj.contacts[i]);
            }
//            console.log(obj);
        }

    });
}

createUsers();
//login();
//addContact();
//getContacts();
//user.userModel.find({'contacts.username': 'xlagunas'}, function(err, obj){
//    if (err) throw err;
//    console.log(obj);
//})
