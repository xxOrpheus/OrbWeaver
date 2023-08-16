const dgram = require("dgram");
const Config = require("./Config.js");
var Util = require("./Util.js");
const Packets = require("./Packets.js");
const Errors = require("./Errors.js");
const PropHuntUser = require("./PropHuntUser.js");

class PropHuntUserList {
	users = {};

	async login(server, message, offset, remote, token) {
		try {
			// TODO: I don't feel like this really belongs here but it's ok for now
			var size = 2; //read username, password  (utf8)
			var loginDetails = Packets.utf8Serializer(message, size, offset, remote);
			offset = loginDetails.offset;
			if (loginDetails.data.length >= size) {
				var username = loginDetails.data[0].toLowerCase().trim();
				// do not try to login if they're already logged in
				if (!this.playerOnline(username)) {
					// make sure it is a valid name first
					if (Util.isValidName(username)) {
						var password = loginDetails.data[1];
						var worldNumber = message.readUInt16BE(offset);
						// we don't want a valid token as this is supposed to be a new login
						if (!server.verifyJWT(token)) {
							// make sure it is a valid world too
							if (Util.isValidWorld(worldNumber)) {
								let user = new PropHuntUser(username, password, worldNumber);
								this.users[user.id] = user;
								await this.users[user.id].setPassword(password).then((result) => {
									// TODO: passwords are useless, accounts are not saved so you never really have to "login". leave this for later development
									this.users[user.id].jwt = server.getJWT().sign({ id: user.id, username: user.username }, Config.JWT_SECRET_KEY);
									server.serverLog(username + " has logged in " + user.id);
									// send their JWT
									const actionBuffer = Buffer.alloc(1);
									actionBuffer.writeUInt8(Packets.Packet.USER_GET_JWT, 0);
									const jwtBuffer = Buffer.from(this.users[user.id].jwt, "utf8");
									const sizeBuffer = Buffer.from([jwtBuffer.length]);
									const packetBuffer = Buffer.concat([actionBuffer, sizeBuffer, jwtBuffer]);

									server.server.send(packetBuffer, 0, packetBuffer.length, remote.port, remote.address, (err) => {
										if (err) {
											console.error("Error sending response:", err);
										}
									});
								});
							} else {
								server.sendError(Errors.Error.INVALID_WORLD, remote);
							}
						} else {
							server.sendError(Errors.Error.INVALID_LOGIN, remote);
						}
					} else {
						server.serverLog("invalid name " + JSON.stringify(username));
						server.sendError(Errors.Error.INVALID_NAME, remote);
					}
				} else {
					server.sendError(Errors.Error.ALREADY_LOGGED_IN, remote);
				}
			}
		} catch (error) {
			server.sendError(Errors.Error.INVALID_LOGIN, remote);
            console.debug(error);
		}
	}

	playerOnline(username) {
		username = username.toLowerCase().trim();
		for (const u in this.users) {
			if (this.users[u].username && this.users[u].username == username) {
				return true;
			}
		}
		return false;
	}

	getUsers() {
		return this.users;
	}
}

module.exports = PropHuntUserList;
