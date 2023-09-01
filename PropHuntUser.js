const Util = require("./Util.js");
const { v4: uuidv4 } = require("uuid");
var Packets = require("./Packets.js");
const Props = require("./Props.js");
const Errors = require("./Errors.js");
const Location = require("./Location.js");
//uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class PropHuntUser {
	constructor(username, password, worldNumber) {
		this.username = username;
		this.active = Util.currentTime();
		this.id = uuidv4();
		this.numericId = -1;
		this.groupId = "";
		this.world = worldNumber;
		this.jwt = false;
		this.status = 0;
		this.team = 0;
		this.propId = 0;
		this.propType = Props.Prop.WORLD_OBJECT;
		this.location = new Location(0, 0, 0);
		this.regionId = 0;
		this.orientation = 0;
		return this;
	}

	async setPassword(password) {
		this.password = await Util.hash(password).then((result) => {
			return result;
		});
	}

	joinGroup(server, message, offset, remote, token) {
		token = server.verifyJWT(token);
		const sizeBuffer = 1; //read groupId
		const groupDetails = Packets.utf8Deserialize(message, sizeBuffer, offset, remote);
		offset = groupDetails.offset;
		if (!(token && groupDetails.data.length >= sizeBuffer)) {
			return Errors.Error.INVALID_GROUP;
		}
		const groupId = groupDetails.data[0];
		let authorized = true; // default true, only subject to change if group.locked == true
		if (token.id) {
			const user = server.getUsers().users[token.id];
			if (user) {
				if (server.groups.groups[groupId]) {
					// if the group is locked try to verify the password
					if (server.groups.groups[groupId].locked == true) {
						// authorize the user to join the game
						authorized = Util.verifyPasscode(server.groups.groups[groupId].password, passwordInput);
						const passwordSize = message.readUInt16BE(offset);
						offset += 2;
						const passwordInput = Packets.utf8Deserialize(message, passwordSize, offset, remote);
						offset = passwordInput.offset;
					}

					if (authorized) {
						if (server.groups.groups[groupId].users[user.id]) {
							// the user is already in the group
							server.sendError(Errors.Error.ALREADY_IN_GROUP, remote);
						} else {
							server.serverLog(`${user.username} joined group ${groupId}`);
							server.groups.addUser(server, groupId, token.id);
							server.groups.updateUsers(server, remote, groupId, token.id);
							server.groups.sendGroupInfo(server, remote, groupId);
						}
					} else {
						server.sendError(Errors.Error.INVALID_PASSWORD, remote);
					}
				} else {
					server.serverLog(`${user.username} tried joining invalid group ${Util.sanitize(groupId)}`);
					server.sendError(Errors.Error.INVALID_GROUP, remote);
				}
			} else {
				server.sendError(Errors.Error.INVALID_LOGIN, remote);
			}
		}
	}

	leaveGroup(server, message, offset, remote, token) {
		if (token.id && this.groupId != null) {
			if (server.groups.groups[this.groupId].users[this.id]) {
				server.serverLog(`[${this.id}] ${this.username} left group ${this.groupId}`);
				const packet = server.createPacket(Packets.Packet.GROUP_LEAVE);
				server.sendPacket(packet, remote);
				server.groups.removeUser(server, this.groupId, this.id);
			} else {
				// the user is not in a group
				server.sendError(Errors.Error.INVALID_GROUP, remote);
			}
		}
	}

	// update their last active time for use in the gametick (log out a user if they're inactive)
	// TODO: we could probably just tie this with the runescape's login/logout events and forget about logging times entirely 
	notify() {
		this.active = Util.currentTime();
	}
}

module.exports = PropHuntUser;
