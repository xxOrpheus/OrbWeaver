const express = require('express');
var Util = require('./Util.js');
const Config = require('./Config.js');
var app = express();
const rateLimit = require('express-rate-limit')

var PropHuntServer = require("./PropHuntServer.js");
var phs = new PropHuntServer();

var server = app.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
});

const limiter = rateLimit({
    windowMs: 2000,
    max: 0,
    standardHeaders: true,
    legacyHeaders: false,
})


app.use(limiter);

app.use(function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    next();
});

app.get("/", function(req, res) {
    res.send(Util.safeResponse(
        phs.getGroupList()
    ));
});