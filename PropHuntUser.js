const Util = require("./Util.js");
const { v4: uuidv4 } = require("uuid");
var Packets = require("./Packets.js");
const Props = require("./Props.js");
const Errors = require("./Errors.js");
//uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class PropHuntUser {
	constructor(username, password, worldNumber) {
		this.username = username;
		this.active = Util.currentTime();
		//this.id = -1;
		//this.uniqueId = uuidv4(); // this was a bad idea
		this.id = uuidv4();
		this.groupId = "";
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
		var sizeBuffer = 1; //read groupId
		var groupDetails = Packets.utf8Serializer(message, sizeBuffer, offset, remote);
		offset = groupDetails.offset;

		if (token) {
			if (groupDetails.data.length >= sizeBuffer) {
				let groupId = groupDetails.data[0];
				let verify = server.verifyJWT(token);
				let authorized = true; // default true, only subject to change if group.locked == true
				if (verify.id) {
					var user = server.getUsers().users[verify.id];
					if (user) {
						if (server.groups.groups[groupId]) {
							if (server.groups.groups[groupId].locked == true) { // authorize the user to join the game
								authorized = Util.verifyPasscode(server.groups.groups[groupId].password, passwordInput);
								let passwordSize = message.readUInt16BE(offset);
								offset += 2;
								let passwordInput = Packets.utf8Serializer(message, passwordSize, offset, remote);
								offset = passwordInput.offset;
							}

							if (authorized) {
								if (!server.groups.groups[groupId].users[user.id]) {
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
							server.serverLog(user.username + " tried joining invalid group " + Util.sanitize(groupId));
							server.sendError(Errors.Error.INVALID_GROUP, remote);
						}
					} else {
						server.sendError(Errors.Error.INVALID_LOGIN, remote);
					}
				}
			}
		}
	}

	leaveGroup(server, message, offset, remote, token) {
		let verify = server.verifyJWT(token);
		if (verify.id) {
			if (this.groupId != null) {
				if (server.groups.groups[this.groupId].users[this.id]) {
					server.serverLog("[" + this.id + "] " + this.username + " left group " + this.groupId);
					let packet = server.createPacket(Packets.Packet.GROUP_LEAVE);
					server.sendPacket(packet, remote);
					server.groups.removeUser(server, this.groupId, this.id);
				} else {
					// the user is not in a group
					server.sendError(Errors.Error.INVALID_GROUP, remote);
				}
			}
		}
	}

	setProp(server, message, offset, remote) {
		var propType = message.readUInt8(offset);
		offset++;
		var propId = message.readUInt16BE(offset);
		offset += 2;

		if (propType == Props.Prop.WORLD_OBJECT || propType == Props.Prop.NPC) {
			this.propType = propType;
			this.propId = propId;
		} else {
			server.sendError(Errors.Error.INVALID_PROP_TYPE, remote);
		}
	}
}

module.exports = PropHuntUser;
