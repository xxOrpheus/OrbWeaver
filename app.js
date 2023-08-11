var express = require('express');
var app = express();
var fs = require("fs");

var PropHuntServer = require("./PropHuntServer.js");
var phs = new PropHuntServer();

var gg = phs.getGroupList().createGroup("davesnothereman", 420);

var server = app.listen(8081, function() {
    var host = server.address().address;
    var port = server.address().port;
    console.log("http listening on http://%s:%s", host, port);
});

app.use(function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

app.get('/new-group', function(req, res) {
    var username = req.query.username;
    var world = req.query.world;
    var ggg = phs.getGroupList().createGroup(username, world);
    res.end(JSON.stringify(ggg));
});

app.get('/join-group', function(req, res) {
    var group = req.query.group;
    var username = req.query.username;
    var world = req.query.world;
    var g = phs.getGroupList().getGroup(group);
    if(!g.code) {
        var join = phs.getGroupList().joinGroup(username, world, group);
        res.end(JSON.stringify(join));
    } else {
        res.end(JSON.stringify(g));
    }
});

app.get('/leave-group', function(req, res) {

});

app.get('/start-game', function(req, res) {
    var group = phs.getGroupList().getGroup(req.query.group);
    if(!group.code) {
        group.setupTeams();
        
    }
    res.end(JSON.stringify(group));
});

app.get('/end-game', function(req, res) {

});

app.get('/set-prop', function(req, res) {

});

app.get('/leave-group', function(req, res) {

});

app.get('/found-user', function(req, res) {

});

