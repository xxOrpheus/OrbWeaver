const Config = require("./Config.js");
const Util = require("./Util.js");
const Packets = require("./Packets.js");
const Errors = require("./Errors.js");
const PropHuntUser = require("./PropHuntUser.js");

class PropHuntUserList {
	users = [];
	uuidMap = {};
	regionMap = {};
	server = null;

	constructor(server) {
		this.server = server;
		this.nextId = 0;
		this.uuidMap = {};
		this.recycledIDs = [];
	}

	async login(message, offset, remote, token) {
		try {
			// TODO: I don't feel like this really belongs here but it's ok for now
			const size = 2; //read username, password  (utf8)
			const loginDetails = Packets.utf8Serializer(message, size, offset, remote);
			offset = loginDetails.offset;
			if (loginDetails.data.length >= size) {
				const username = loginDetails.data[0].toLowerCase().trim();
				const password = loginDetails.data[1];
				// do not try to login if they're already logged in
				const playerOnline = this.playerOnline(username);
				if (playerOnline) {
					await Util.verifyPasscode(playerOnline.password, password).then((result) => {
						// try to verify the users previous session
						if (result == false) {
							this.server.sendError(Errors.Error.INVALID_PASSWORD, remote);
						} else {
							this.sendJWT(playerOnline.jwt, remote, server);
						}
					});
				} // make sure it is a valid name first
				else if (Util.isValidName(username)) {
					const worldNumber = message.readUInt16BE(offset);
					// we don't want a valid token as this is supposed to be a new login
					if (this.server.verifyJWT(token)) {
						this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
					} // make sure it is a valid world too
					else if (Util.isValidWorld(worldNumber)) {
						const user = new PropHuntUser(username, password, worldNumber);
						const userId = user.id;
						const numericId = this.recycledIDs.length > 0 ? this.recycledIDs.shift() : this.nextId++;
						user.numericId = numericId;
						this.uuidMap[numericId] = userId;
						this.users[userId] = user;
						this.users[userId].remote = remote;

						await this.users[userId].setPassword(password).then((result) => {
							this.users[userId].jwt = this.server.getJWT().sign({ id: userId }, Config.JWT_SECRET_KEY);
							this.server.serverLog(`[${userId}] ${username} has logged in (World ${worldNumber})`);
							this.sendJWT(this.users[userId].jwt, remote);
						});
					} else {
						this.server.sendError(Errors.Error.INVALID_WORLD, remote);
					}
				} else {
					this.server.serverLog(`invalid name ${JSON.stringify(username)}`);
					this.server.sendError(Errors.Error.INVALID_NAME, remote);
				}
			}
		} catch (error) {
			this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
			console.debug(error);
		}
	}

	logout(message, offset, remote, token) {
		const verify = Util.verifyJWT(token);
		if (verify.id) {
			const userId = verify.id;
			if (this.server.users.users[userId]?.numericId > -1) {
				const numericId = this.server.users.users[userId].numericId;
				delete this.uuidMap[numericId];
				this.recycledIDs.push(numericId);
				delete this.server.users.users[userId];
			}
		}
	}

	playerOnline(username) {
		username = username.toLowerCase().trim();
		for (const u in this.users) {
			if (this.users[u].username && this.users[u].username == username) {
				return this.users[u];
			}
		}
		return false;
	}

	sendJWT(jwt, remote) {
		const actionBuffer = Buffer.alloc(1);
		actionBuffer.writeUInt8(Packets.Packet.USER_GET_JWT, 0);
		const jwtBuffer = Buffer.from(jwt, "utf8");
		const sizeBuffer = Buffer.from([jwtBuffer.length]);
		const packetBuffer = Buffer.concat([actionBuffer, sizeBuffer, jwtBuffer]);

		this.server.server.send(packetBuffer, 0, packetBuffer.length, remote.port, remote.address, (err) => {
			if (err) {
				console.error("Error sending response:", err);
			}
		});
	}

	getUsers() {
		return this.users;
	}
}

module.exports = PropHuntUserList;
