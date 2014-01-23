var mongoose = require('mongoose'),
    user = require('./persistence')

mongoose.connect('mongodb://localhost/v2b');

//var josep = new user.userModel(
//    {
//        username: 'jlagunas',
//        name: 'Josep',
//        firstSurname: 'Lagunas',
//        lastSurname: 'Calpe',
//        email: 'josep.lagunas@gmail.com',
//        password: '123456'
//    }
//);
//var carles = new user.userModel(
//    {
//        username: 'clagunas',
//        name: 'Carles',
//        firstSurname: 'Lagunas',
//        lastSurname: 'Calpe',
//        email: 'hewson90@gmail.com',
//        password: '123456'
//    }
//);
//
//josep.save(saveCallback);
//carles.save(saveCallback);
//
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
        console.log("successfully saved");
}



//user.userModel.login('xlagunas','123456', function(error, data){
////        data.contacts.create({username: "rlopez"});
////        data.update(function(error){
//            if(error) console.log(error)
//            else
//            console.log("Successfully updated");
////        });
//    }
//);
user.userModel.addRelationship('xlagunas','rlopez', function(data){
    console.log(data);
})