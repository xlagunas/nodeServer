var mongoose = require('mongoose'),
    user = require('./persistence')

mongoose.connect('mongodb://localhost/v2b');

var josep = new user.userModel(
    {
        username: 'jlagunas',
        name: 'Josep',
        firstSurname: 'Lagunas',
        lastSurname: 'Calpe',
        email: 'josep.lagunas@gmail.com',
        password: '123456'
    }
);
var carles = new user.userModel(
    {
        username: 'clagunas',
        name: 'Carles',
        firstSurname: 'Lagunas',
        lastSurname: 'Calpe',
        email: 'hewson90@gmail.com',
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
        console.log("successfully saved");
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

user.userModel.findByUsername('jlagunas', function(error, josep){
   user.userModel.findByUsername('clagunas', function(error, carles){
       josep.contacts.push(carles);
       josep.save(function(error, retVal){
           if (retVal === 'error')
                console.log("Hi ha hagut un error!");
           else{
               console.log(retVal);
           }
       })
   });
});

user.userModel.findOne({username: 'jlagunas'}).populate('contacts').exec(function(error, data){
//user.userModel.findOne({username: 'jlagunas'}).exec(function(error, data){
    if (error) console.log(error);
    else{
        console.log(data);
    }
});