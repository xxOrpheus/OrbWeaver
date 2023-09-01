const PropHuntGroupList = require("./PropHuntGroupList.js");
const PropHuntUserList = require("./PropHuntUserList.js");
const GameTick = require("./GameTick.js");

const dgram = require("dgram");
const Config = require("./Config.js");
const Packets = require("./Packets.js");

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

		this.groups = new PropHuntGroupList(this);
		this.users = new PropHuntUserList(this);
		this.gametick = new GameTick(this);
	}

	#handleMessage(message, remote) {
		try {
			if (message.length < 3) {
				this.serverLog("\x1b[31mMalformed packet: Insufficient data length");
				return;
			}

			let offset = 0;

			const action = message.readUInt8(0);
			if (action < 0 || action > Packets.Packet.length) {
				this.serverLog(`\x1b[31mUnsupported packet action: ${action}`);
				return;
			}

			offset++;

			let token = Packets.utf8Deserialize(message, 1, offset, remote);
			if (token.data.length > 0) {
				offset = token.offset;
				token = token.data[0];
				let user;
				if (Packets.Packets[action] != null) {
					switch (action) {
						case Packets.Packet.USER_LOGIN:
							this.users.login(message, offset, remote, token);
							break;

						case Packets.Packet.USER_LOGOUT:
							this.users.logout(message, offset, remote, token);
							break;

						case Packets.Packet.GROUP_NEW:
							this.groups.createGroup(message, offset, remote, token);
							break;

						case Packets.Packet.GROUP_JOIN:
							this.users.users[user.id].joinGroup(message, offset, remote, token);
							break;

						case Packets.Packet.GROUP_LEAVE:
							this.users.users[user.id].leaveGroup(message, offset, remote, token);
							break;

						case Packets.Packet.PLAYER_UPDATE:
							console.log("Received player_update");
							this.gametick.enqueueUpdate(message, offset, remote, token);
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
		const actionBuffer = Buffer.alloc(1);
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
		if (remote?.address && remote.port) {
			const action = Buffer.alloc(1);
			action.writeUInt8(Packets.Packet.ERROR_MESSAGE);
			const msg = Buffer.alloc(2);
			msg.writeUInt16BE(error);
			const buffer = [action, msg];
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
		console.log(`[\x1b[34m${address.address}\x1b[39m:\x1b[37m${address.port}\x1b[39m]: \x1b[32m${message}\x1b[39m`);
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
