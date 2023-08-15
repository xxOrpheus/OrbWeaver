const dgram = require("dgram");
const Config = require("./Config.js");
var Util = require("./Util.js");
const Packets = require("./Packets.js");
const Errors = require("./Errors.js");
const PropHuntUser = require("./PropHuntUser.js");

class PropHuntUserList {
	users = {};

	async login(server, message, offset, remote) {
		// TODO: I don't feel like this really belongs here but it's ok for now
		var sizeBuffer = 3; //read jwt, username, password  (utf8)
		var loginDetails = Packets.utf8Serializer(message, sizeBuffer, offset, remote);
		offset = loginDetails.offset;

		if (loginDetails.data.length >= sizeBuffer) {
			var jwt = loginDetails.data[0].toLowerCase().trim();
			var username = loginDetails.data[1];
			// do not try to login if they're already logged in
			if (!this.playerOnline(username)) {
				// make sure it is a valid name first
				if (Util.isValidName(username)) {
					var password = loginDetails.data[2];
					var worldNumber = (loginDetails.data[3] = message.readUInt16BE(offset));
					// we don't want a valid token as this is supposed to be a new login
					if (!server.verifyJWT(jwt)) {
						// make sure it is a valid world too
						if (Util.isValidWorld(worldNumber)) {
							let user = new PropHuntUser(username, password, worldNumber);
							this.users[user.id] = user;
							await this.users[user.id].setPassword(password).then((result) => {
								this.users[user.id].jwt = server.getJWT().sign({ id: user.id, username: user.username }, Config.JWT_SECRET_KEY);
								server.serverLog(username + " has logged in " + user.id);
								// send their user id and jwt
								const actionBuffer = Buffer.alloc(1);
								actionBuffer.writeUInt8(Packets.Packet.USER_GET_ID, 0);

								const jwtBuffer = Buffer.from(this.users[user.id].jwt, "utf8");
								const uidBuffer = Buffer.from(user.id, "utf8");

								const sizeBuffer = Buffer.from([jwtBuffer.length, uidBuffer.length]);

								const packetBuffer = Buffer.concat([actionBuffer, sizeBuffer, jwtBuffer, uidBuffer]);

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
					server.sendError(Errors.Error.INVALID_NAME, remote);
				}
			} else {
				server.sendError(Errors.Error.ALREADY_LOGGED_IN, remote);
			}
		}
	}

	playerOnline(username) {
		username = username.toLowerCase().trim();
		for (const u in this.users) {
			if (this.users[u].username && this.users[u].username.toLowerCase().trim() == username) {
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
