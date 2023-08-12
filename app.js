const express = require('express');
var Util = require('./Util.js');
var app = express();

var PropHuntServer = require("./PropHuntServer.js");
var phs = new PropHuntServer();
const rateLimit = require('express-rate-limit')



var server = app.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
});

app.use(function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    next();
});

const limiter = rateLimit({
    windowMs: 2000,
    max: 0,
    standardHeaders: true,
    legacyHeaders: false,
})


app.use(limiter);

app.get('/new-group', async function (req, res) {
    var username = req.query.username;
    var world = req.query.world;
    var passcode = req.query.passcode;
    await phs.getGroupList().createGroup(username, world, passcode).then((result) => {
        res.end(Util.safeResponse(result));
    });

});

app.get('/join-group', function (req, res) {
    var group = req.query.group;
    var username = req.query.username;
    var world = req.query.world;
    var g = phs.getGroupList().getGroup(group);
    if (!g.code) {
        var join = phs.getGroupList().joinGroup(username, world, group);
        res.end(Util.safeResponse(join));
    } else {
        res.end(Util.safeResponse(g));
    }
});

app.get('/leave-group', function (req, res) {

});

app.get('/start-game', async function (req, res) {
    var group = phs.getGroupList().getGroup(req.query.group);
    var start;
    var passcode = req.query.passcode;
    if (passcode) {
        if (!group.code) {
            group = await group.startGame(passcode).then((result) => {
                return result;
            });
        }
    } else {
        group = Util.jsonError("please enter your passcode", 20);
    }
    res.end(Util.safeResponse(group));
});

app.get('/end-game', function (req, res) {

});

app.get('/set-prop', function (req, res) {

});

app.get('/leave-group', function (req, res) {

});

app.get('/found-user', function (req, res) {

});

