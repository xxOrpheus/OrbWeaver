var PropHuntGroupList = require("./PropHuntGroupList.js");
var PropHuntUserList = require("./PropHuntUserList.js");

const dgram = require("dgram");
const Config = require("./Config.js");
const Packets = require("./Packets.js");
var Util = require("./Util.js");

const JWT = require("jsonwebtoken");

class PropHuntServer {
	// TODO: Implement AES encryption or some other standard
	packetTimes = new Map();

	#server;
	users;
	groups;

	constructor() {
		this.server = dgram.createSocket("udp4");

		this.server.on("error", (error) => {
			this.#handleError(error);
		});

		this.server.on("message", (message, remote) => {
			this.#handleMessage(message, remote);
		});

		this.server.on("listening", () => {
			this.serverLog("Prop hunt server started");
		});

		this.server.bind(Config.SERVER_PORT);

		this.groups = new PropHuntGroupList();
		this.users = new PropHuntUserList();
	}

	#handleMessage(message, remote) {
		try {
			console.log("Message received: ", message.toString());
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

			offset++;

			var token = Packets.utf8Serializer(message, 1, offset, remote);
			if (token.data.length > 0) {
				offset = token.offset;
				token = token.data[0];
				let user;
				if (Packets.Packets[action] != null) {
					switch (action) {
						case Packets.Packet.USER_LOGIN:
							this.users.login(this, message, offset, remote, token);
							break;

						case Packets.Packet.GROUP_NEW:
							user = this.verifyJWT(token);
							if (user && user.id) {
								this.groups.createGroup(this, message, offset, remote, token);
							}
							break;

						case Packets.Packet.GROUP_JOIN:
							user = this.verifyJWT(token);
							if (user && user.id) {
								this.users.users[user.id].joinGroup(this, message, offset, remote, token);
							}
							break;

						case Packets.Packet.PLAYER_LOCATION:
							 user = this.verifyJWT(token);
							 if (user && user.id) {
								this.users.users[user.id].updateLocation 
							 }

						case Packets.Packet.PLAYER_PROP:
							user = this.verifyJWT(token);
							if (user && user.id) {
								this.users.users[user.id].setProp(this, message, offset, remote);
								
							}
							break;
					}
				}
			}
		} catch (error) {
			console.debug(error);
			// this.handleError ?
		}
	}

	createPacket(packet) {
		let actionBuffer = Buffer.alloc(1);
		actionBuffer.writeUInt8(packet, 0);
		return [actionBuffer];
	}

	sendPacket(packet, remote) {
		packet = Buffer.concat(packet);
		this.server.send(packet, 0, packet.length, remote.port, remote.address, (err) => {
			if (err) {
				console.error("Error sending packet:", err);
			}
		});
	}

	sendError(error, remote) {
		if (remote && remote.address && remote.port) {
			let action = Buffer.alloc(1);
			action.writeUInt8(Packets.Packet.ERROR_MESSAGE);
			let msg = Buffer.alloc(2);
			msg.writeUInt16BE(error);
			let buffer = [action, msg];
			this.sendPacket(buffer, remote);
		} else {
			return false;
		}
	}

	#handleError(error) {
		// i can fix her
		console.debug(error);
	}

	serverLog(message) {
		const address = this.server.address();
		console.log("[\x1b[34m" + address.address + "\x1b[39m:\x1b[37m" + address.port + "\x1b[39m]: \x1b[32m" + message + "\x1b[39m");
	}

	getGroups() {
		return this.groups;
	}

	getUsers() {
		return this.users;
	}

	getJWT() {
		return JWT;
	}

	verifyJWT(jwt) {
		try {
			return this.getJWT().verify(jwt, Config.JWT_SECRET_KEY);
		} catch (error) {
			if (error.message === "jwt malformed") {
				return false;
			}
			console.error(error);
			return false;
		}
	}
}

module.exports = PropHuntServer;
