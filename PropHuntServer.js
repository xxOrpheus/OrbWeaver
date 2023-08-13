var PropHuntGroupList = require("./PropHuntGroupList.js");
var PropHuntUserList = require('./PropHuntUserList.js');

const dgram = require('dgram');
const Config = require('./Config.js');
const Packets = require('./Packets.js');

class PropHuntServer {
    server;
    #userList;
    groups;

    packetHandlers = {
        [Packets.Packet.USER_LOGIN]: PropHuntUserList.login,
        [Packets.Packet.GROUP_NEW]: PropHuntGroupList.createGroup,
    };

    constructor() {
        this.server = dgram.createSocket("udp4");

        this.server.on("error", (error) => { this.#handleError(error) });

        this.server.on("message", (message, remote) => { this.#handleMessage(message, remote) });

        this.server.on("listening", () => {
            this.serverLog("Prop hunt server started");
        });

        this.server.bind(Config.SERVER_PORT);

        this.groups = new PropHuntGroupList();
        this.#userList = new PropHuntUserList();
    }

    #handleMessage(message, remote) {
        try {
            let rIP = remote.address;
            let rPort = remote.port;

            /* function clientLog(message) {
                 this.serverLog("\x1b[33m" + rIP + ":" + rPort + " " + message + "\x1b[39");
             }*/

            if (message.length < 3) {
                this.serverLog("\x1b[31mMalformed packet: Insufficient data length");
                return;
            }
            
            var offset = 0;

            const action = message.readUInt8(0);
            if (action < 0 || action > Packets.Packet.length) {
                this.serverLog("\x1b[31mUnsupported packet action: " + Packets.Packets[action]);
                return;
            }

            offset += 1;

            if(Packets.Packets[action] != null) {
                switch(Packets.Packet[action]) {
                    case Packets.Packets.USER_LOGIN:
                        this.#userList.login(this, message, offset, remote);
                        break;
                }
            }
        } catch (error) {
            this.serverLog("Error receiving packet");
            console.debug(error);
        }
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