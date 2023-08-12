var PropHuntGroupList = require("./PropHuntGroupList.js");

const dgram = require('dgram');
const Config = require('./Config.js');

const Packet = {};
const Packets = [
    "USER_LOGIN",
    "USER_LOGOUT",

    "GROUP_NEW",
    "GROUP_JOIN",
    "GROUP_START_GAME",
    "GROUP_END_GAME",
    "GROUP_SET_STAGE",
    "GROUP_NOTIFY",
    
    "PLAYER_PROP",
    "PLAYER_LOCATION",
    "PLAYER_ORIENTATION",
    "PLAYER_NOTIFY",

].forEach((action, index) => {
  Packet[action] = index;
});

class PropHuntServer {
    #server;
    groups;

    constructor() {
        this.server = dgram.createSocket("udp4");

        this.server.on("error", this.handleError);

        this.server.on("message", this.handleMessage);

        this.server.on("listening", () => {
            this.serverLog("Prop hunt server started");
        });

        this.server.bind(Config.SERVER_PORT);

        this.groups = new PropHuntGroupList();
    }

    #handleMessage(message, remote) {
        const action = message.readUInt8(0);
        
    }

    #handleError(error) { // i can fix her
        console.debug(error); 
    }

    serverLog(message) {
        const address = this.server.address();
        console.log("[\x1b[34m" + address.address + "\x1b[39m:\x1b[37m" + address.port + "\x1b[39m]: \x1b[32m" + message + "\x1b[39m");
    }

    getGroupList() {
        return this.groups;
    }
}

module.exports = PropHuntServer;