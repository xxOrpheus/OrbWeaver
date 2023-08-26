var PropHuntGroup = require("./PropHuntGroup.js");
var Packets = require("./Packets.js");
const Errors = require("./Errors.js");
var Util = require("./Util.js");
var Props = require("./Props.js");

class PropHuntGroupList {
	constructor() {
		this.groups = {};
	}

	createGroup(server, message, offset, remote, jwt) {
		let users = server.getUsers();
		let verify = server.verifyJWT(jwt);
		var userId = verify.id;
		if (users.users[userId] != null) {
			let world = users.users[userId].world;
			let user = users.users[userId];
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

	addUser(server, groupId, userId) {
		if (this.groups[groupId] && server.users.users[userId]) {
			if (!this.groups[groupId].users[userId]) {
				server.users.users[userId].groupId = groupId;
				server.users.users[userId].status = 0;
				server.users.users[userId].team = 0;
				server.users.users[userId].prop = 0;
				server.users.users[userId].propType = Props.Prop.WORLD_OBJECT;
				server.users.users[userId].location = Util.worldPoint(0, 0, 0);
				server.users.users[userId].orientation = 0;
				this.groups[groupId].users[userId] = userId;
			} else {
				return Errors.Error.ALREADY_IN_GROUP;
			}
		} else {
			return Errors.Error.INVALID_GROUP;
		}
	}

	removeUser(server, groupId, userId) {
		if (this.groups[groupId] && server.users.users[userId] && server.users.users[userId].groupId == groupId) {
			if (this.groups[groupId].users[userId]) {
				server.users.users[userId].groupId = "";
				delete this.groups[groupId].users[userId];
				console.log("Attempting to remove user " + server.users.users[userId].username + " from a group");
				if(this.groups[groupId].users.length < 1) {
					console.log("[" + groupId + "] No users left in group, purging...");
					delete this.groups[groupId];
				}
			} else {
				console.log("user was not in group, cannot remove", groupId, userId);
				return Errors.Error.ALREADY_IN_GROUP;
			}
		} else {
			console.log("error removing user from group", this.groups[groupId], server.users.users[userId], server.users.users[userId].groupId==groupId);
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
			let creator = server.users.users[group.creator].username;

			let creatorBuffer = Buffer.from(creator, "utf8");
			let groupIdBuffer = Buffer.from(groupId, "utf8");
			const sizeBuffer = Buffer.from([creator.length, groupId.length]);
			const packetBuffer = Buffer.concat([sizeBuffer, creatorBuffer, groupIdBuffer]);

			packet.push(packetBuffer);
			server.sendPacket(packet, remote);
		}
	}
}

module.exports = PropHuntGroupList;
