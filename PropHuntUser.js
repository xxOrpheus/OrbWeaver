const Util = require("./Util.js");
const { v4: uuidv4 } = require("uuid");
const Props = require("./Props.js");
const Errors = require('./Errors.js');
//uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class PropHuntUser {
	constructor(username, password, worldNumber) {
		this.username = username;
		this.active = Util.currentTime();
		this.id = -1;
		this.uid = uuidv4();
		this.groupId = -1;
		this.world = worldNumber;
		this.jwt = false;
		this.status = 0;
		this.team = 0;
		this.propId = 0;
		this.propType = Props.Prop.WORLD_OBJECT;
		this.location = Util.worldPoint(0, 0, 0);
		this.orientation = 0;
		return this;
	}

	async setPassword(password) {
		this.password = await Util.hash(password).then((result) => {
			return result;
		});
	}

	joinGroup(server, message, offset, remote, token) {
		let groupId = message.readUInt16BE(offset);
		offset += 2;

		if (token) {
			var verify = server.verifyJWT(token);
			var authorized = true;
			if (verify.id > -1) {
				var user = server.getUsers().users[verify.id];
				if (user) {
					if (server.groups.groups[groupId]) {
						if (server.groups.groups[groupId].locked == true) {
							authorized = Util.verifyPasscode(server.groups.groups[groupId].password, passwordInput);
							let passwordSize = message.readUInt16BE(offset);
							offset += 2;
							let passwordInput = Packets.utf8Serializer(message, passwordSize, offset, remote);
							offset = passwordInput.offset;
						}

						if (authorized) {
							if (!server.groups.groups[groupId].users[user.uid]) {
								var userId = token.id;
								server.serverLog(user.username + " joined group " + groupId);
								server.groups.addUser(server, groupId, verify.id);
								server.groups.sendUsers(server, remote, groupId);
								server.groups.sendGroupInfo(server, remote, groupId);
							} else {
								// the user is already in the group
								server.sendError(Errors.Error.ALREADY_IN_GROUP, remote);
							}
						} else {
							server.sendError(Errors.Error.INVALID_PASSWORD, remote);
						}
					} else {
						server.serverLog(user.username + " tried joining invalid group " + groupId);
						server.sendError(Errors.Error.INVALID_GROUP, remote);
					}
				} else {
					server.sendError(Errors.Error.INVALID_LOGIN, remote);
				}
			} else {
				server.sendError(Errors.Error.INVALID_LOGIN, remote);
			}
		}
	}

	setProp(server, message, offset, remote, token) {
		if (token) {
			groupId = message.readUInt16BE(offset);
			offset += 2;
			var verify = server.verifyJWT(token);
			if (verify.id > -1) {
				var userId = verify.id;
				if (this.users[userId].groupId == groupId) {
					var groupId = message.readUInt16BE(offset);
					offset += 2;
					var propType = message.readUInt16BE(offset);
					offset += 2;
					var propId = message.readUInt16BE(offset);
					offset += 2;
					this.propId = propId;
				}
			}
		}
	}
}

module.exports = PropHuntUser;
