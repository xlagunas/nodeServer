/**
 * Created with JetBrains WebStorm.
 * User: xlagunas
 * Date: 04/02/14
 * Time: 11:42
 * To change this template use File | Settings | File Templates.
 */
var mongoose = require('mongoose'),
    persistence = require('./persistence_debug'),
    _ = require('underscore');


mongoose.connect('mongodb://localhost/v2b_devel');

function createUsers(){
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

    function checkError(error){
        if (error) throw error;
        console.log("ok!");
    }

//    josep.save(checkError);
//    xavi.save(checkError);
//    carles.save(checkError);
//    raquel.save(checkError);
}

//createUsers();

function findUser(){
    persistence.User.findOne({username: 'jlagunas'}, function(error, user){
//        console.log(error);
//        console.log(user);

        persistence.User.findOne({username: 'xlagunas'})
            .populate("pending", 'name username firstSurname lastSurname email thumbnail _id')
            .exec(function(error, user2){
//            console.log(error);
//            console.log(user2);
            user2.pending.addToSet(user);
            user2.save(function (error, data){
                console.log(data.toJSON())
            });
        });
    });
}

findUser();