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

app.get('/new-group', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    var username = req.query.username;
    var world = req.query.world;
    var ggg = phs.getGroupList().createGroup(username, world);
    res.end(JSON.stringify(ggg));
});

app.get('/join-group', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    var group = req.query.group;
    var username = req.query.username;
    var world = req.query.world;
    var g = phs.getGroupList().getGroup(group);
    if(!g.code) {
        var join = phs.getGroupList().joinGroup(username, world, group);
        if(!join.code) {
            res.end(JSON.stringify(join));
            return;
        } else {
            res.end(join);
        }
    } else {
        res.end(JSON.stringify(g));
    }
});