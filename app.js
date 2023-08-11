var express = require('express');
var app = express();
var fs = require("fs");
var PropHuntGroupList = require("./PropHuntGroupList.js");

app.get('/new-group', function(req, res) {
    var groupID = uuidv4();
});

const groups = new PropHuntGroupList();

var newGroup = groups.createGroup("davesnothere", 420);
var d = newGroup.addUser("dovahnow", 420);
newGroup.addUser("dovahnowwww", 420);
newGroup.addUser("dovahnoaaaaw", 420);
var u = newGroup.addUser("dovahnoggggw", 420);
newGroup.setUserTeam(d.id, 1);
console.log(newGroup.getUsers());
console.log(newGroup.userInSession(u.name));



var server = app.listen(8081, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Prop hunt server launched on http://%s:%s", host, port);
});