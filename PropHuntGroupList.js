var PropHuntGroup = require("./PropHuntGroup.js");
var PropHuntUser = require("./PropHuntUser.js");
var PropHuntUserList = require("./PropHuntUserList.js");

var Packets = require("./Packets.js");
const Errors = require("./Errors.js");
var Util = require("./Util.js");
var Config = require("./Config.js");

class PropHuntGroupList {
	constructor() {
		this.groups = {};
	}

	createGroup(server, message, offset, remote, jwt) {
		let users = server.getUsers();
		let verify = server.verifyJWT(jwt);
		if (verify.id > -1 && verify.id < 65536) {
			var userId = verify.id;
			if (users.users[userId] != null) {
				let world = users.users[userId].world;
				if (Util.isValidWorld(world)) {
					if (!this.groups[userId]) {
						this.groups[userId] = new PropHuntGroup(userId, world);
						// add the creator to the list of users -- group ID is synonymous with the user ID
						this.addUser(server, userId, userId);
						server.serverLog(users.users[userId].username + " has created a group (" + userId + ")");
						this.sendUsers(server, remote, userId);
						this.sendGroupInfo(server, remote, userId);
					} else {
						server.sendError(Errors.Error.ALREADY_IN_GROUP, remote);
					}
				} else {
					server.sendError(Errors.Error.INVALID_WORLD, remote);
				}
			} else {
				server.sendError(Errors.Error.INVALID_LOGIN, remote);
			}
		}
	}

	joinGroup(server, message, offset, remote, token) {
		let groupId = message.readUInt16BE(offset);
		offset += 2;

		if (token) {
			var verify = server.verifyJWT(token);
			if (verify.id) {
				var user = server.getUsers().users[verify.id];
				if (user) {
					if (this.groups[groupId]) {
						if (!this.groups[groupId].users[verify.id]) {
							var userId = token.id;
							server.serverLog(user.username + " joined group " + groupId);
							this.addUser(server, groupId, verify.id);
							this.sendUsers(server, remote, groupId);
							this.sendGroupInfo(server, remote, groupId);
						} else {
							// the user is already in the group
							server.sendError(Errors.Error.ALREADY_IN_GROUP, remote);
						}
					} else {
						server.serverLog(user.username + "tried joining invalid group " + groupId);
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

	setPlayerProp(server, message, offset, remote, token) {
		if (token) {
			groupId = message.readUInt16BE(offset);
			offset += 2;
			var verify = server.verifyJWT(token);
			if (verify.id) {
				var groupId = message.readUInt16BE(offset);
				offset += 2;
				var propId = message.readUInt16BE(offset);
				offset += 2;
			}
		}
	}

	addUser(server, groupId, userId) {
		if (this.groups[groupId] && server.users.users[userId]) {
			if (!this.groups[groupId].users[userId]) {
				server.users.users[userId].groupId = groupId;
				this.groups[groupId].users[userId] = {
					status: 0,
					team: 0,
					prop: 0,
					location: { x: 0, y: 0, z: 0 },
					orientation: 0,
				};
			} else {
				return Errors.Error.ALREADY_IN_GROUP;
			}
		} else {
			return Errors.Error.INVALID_GROUP;
		}
	}

	sendUsers(server, remote, groupId) {
		let packet = server.createPacket(Packets.Packet.GROUP_USERS);
		var usernames = [];
		let groupUsers = this.groups[groupId].users;
		for (const u in groupUsers) {
			if (server.users.users[u]) {
				usernames.push(server.users.users[u].username);
			}
		}
		const serializedUsernames = usernames.map((username) => {
			const usernameBuffer = Buffer.from(username, "utf8");
			const lengthBuffer = Buffer.alloc(2);
			lengthBuffer.writeUInt16BE(usernameBuffer.length, 0);
			return Buffer.concat([lengthBuffer, usernameBuffer]);
		});
		const userListBuffer = Buffer.concat(serializedUsernames);

		// Push the userListBuffer to the packet
		packet.push(userListBuffer);

		// Send the complete packet to the remote client
		server.sendPacket(packet, remote);
	}

	sendGroupInfo(server, remote, groupId) {
		let packet = server.createPacket(Packets.Packet.GROUP_INFO);
		if (this.groups[groupId]) {
			let group = this.groups[groupId];
			let packetBuffer = Buffer.alloc(2);
			packetBuffer.writeUint16BE(this.groups[groupId].creator);
			packet.push(packetBuffer);
			server.sendPacket(packet, remote);
		}
	}
}

module.exports = PropHuntGroupList;
