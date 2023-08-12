var PropHuntGroupList = require("./PropHuntGroupList.js");

const dgram = require('dgram');
const Config = require('./Config.js');
const Packets = require('./Packets.js');

class PropHuntServer {
    #server;
    groups;

    packetHandlers = {
        [Packets.Packet.GROUP_NEW]: PropHuntGroupList.createGroup,
        [Packets.Packet.USER_LOGIN]: PropHuntUser.login,
    };

    constructor() {
        this.#server = dgram.createSocket("udp4");

        this.#server.on("error", (error) => { this.#handleError(error) });

        this.#server.on("message", (message, remote) => { this.#handleMessage(message, remote) });

        this.#server.on("listening", () => {
            this.serverLog("Prop hunt server started");
        });

        this.#server.bind(Config.SERVER_PORT);

        this.groups = new PropHuntGroupList();
    }

    #handleMessage(message, remote) {
        try {
            let rIP = remote.address;
            let rPort = remote.port;

            function clientLog(message) {
                this.serverLog("\x1b[33m" + rIP + ":" + rPort + " " + message + "\x1b[39");
            }

            if (message.length < 3) {
                clientLog("\x1b[31mMalformed packet: Insufficient data length");
                return;
            }

            const tokenLength = message.length - 3; // JWT length
            const token = message.slice(1, 1 + tokenLength).toString('utf8'); // jwt authentication

            if (action < 1 || action > Object.keys(packetHandlers).length) {
                clientLog("\x1b[31mUnsupported packet action: " + action);
                return;
            }

            let packet = Packets.Packet;
            const handler = packetHandlers[action];

            if (handler) {
                clientLog("said " + Packets.Packets[action]);
                handler.call(token, message, remote, this);
            } else {
                clientLog("\x1b[31mUnsupported packet action: " + Packets.Packets[action]);
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
        const address = this.#server.address();
        console.log("[\x1b[34m" + address.address + "\x1b[39m:\x1b[37m" + address.port + "\x1b[39m]: \x1b[32m" + message + "\x1b[39m");
    }

    getGroupList() {
        return this.groups;
    }
}

module.exports = PropHuntServer;