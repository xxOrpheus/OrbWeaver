const express = require('express');
var app = express();

var PropHuntServer = require("./PropHuntServer.js");
var phs = new PropHuntServer();
const rateLimit = require('express-rate-limit')

var gg = phs.getGroupList().createGroup("davesnothereman", 420, "hi");
phs.getGroupList().joinGroup("asdfasdf1", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf2", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf3", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf4", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf5", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf6", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf7", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf8", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf9", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf10", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf11", 420, gg.getGroupID());
phs.getGroupList().joinGroup("asdfasdf12", 420, gg.getGroupID());
gg.startGame("hi");




var server = app.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
});

app.use(function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    next();
});

const limiter = rateLimit({
    windowMs: 5000,
    max: 0,
    standardHeaders: true,
    legacyHeaders: false,
})


app.use(limiter);

app.get('/new-group', function (req, res) {
    var username = req.query.username;
    var world = req.query.world;
    var ggg = phs.getGroupList().createGroup(username, world);
    res.end(JSON.stringify(ggg));
});

app.get('/join-group', function (req, res) {
    var group = req.query.group;
    var username = req.query.username;
    var world = req.query.world;
    var g = phs.getGroupList().getGroup(group);
    if (!g.code) {
        var join = phs.getGroupList().joinGroup(username, world, group);
        res.end(JSON.stringify(join));
    } else {
        res.end(JSON.stringify(g));
    }
});

app.get('/leave-group', function (req, res) {

});

app.get('/start-game', function (req, res) {
    var group = phs.getGroupList().getGroup(req.query.group);
    if (!group.code) {

    }
    res.end(JSON.stringify(group));
});

app.get('/end-game', function (req, res) {

});

app.get('/set-prop', function (req, res) {

});

app.get('/leave-group', function (req, res) {

});

app.get('/found-user', function (req, res) {

});

