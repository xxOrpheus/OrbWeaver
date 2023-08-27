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
					let groupId = userId; // just to improve readability lol
					// add the creator to the list of users -- group ID is synonymous with the user ID
					this.addUser(server, groupId, userId);
					server.serverLog(users.users[userId].username + " has created a group (" + userId + ")");
					this.updateUsers(server, remote, groupId, userId);
					this.sendGroupInfo(server, remote, groupId);
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
				/*server.users.users[userId].status = 0;
				server.users.users[userId].team = 0;
				server.users.users[userId].propId = 0;
				server.users.users[userId].propType = Props.Prop.WORLD_OBJECT;
				server.users.users[userId].location = Util.worldPoint(0, 0, 0);
				server.users.users[userId].orientation = 0;*/
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
				if (this.groups[groupId].users.length < 1) {
					console.log("[" + groupId + "] No users left in group, purging...");
					delete this.groups[groupId];
				}
			} else {
				console.log("user was not in group, cannot remove", groupId, userId);
				return Errors.Error.ALREADY_IN_GROUP;
			}
		} else {
			console.log("error removing user from group", this.groups[groupId], server.users.users[userId], server.users.users[userId].groupId == groupId);
		}
	}

	updateUsers(server, remote, groupId, userId) {
		let packet = server.createPacket(Packets.Packet.PLAYER_UPDATES);
		var users = [];
		if (server.users.users[userId] && server.users.users[userId].location != null) {
			let userLocation = server.users.users[userId].location;
			console.log(groupId, userId, this.groups);
			let groupUsers = this.groups[groupId].users;
			for (const u in groupUsers) {
				if (server.users.users[u] && server.users.users[u].location != null) {
					let distance = Util.distance(server.users.users[u].location, userLocation);
					if (distance <= 16) {
						let groupUser = server.users.users[u];
						console.log(groupUser.propId, groupUser.propType, groupUser.orientation, groupUser.team, groupUser.status, groupUser.username);
						let userDataBuffer = Buffer.alloc(7 + groupUser.username.length); // 8 bytes -- 2 for propId, 6 for all 8 bit integers, then add the length of the username  
						userDataBuffer.writeUInt16BE(groupUser.propId, 0);
						userDataBuffer.writeUInt8(groupUser.propType, 2);
						userDataBuffer.writeUInt8(groupUser.orientation, 3);
						userDataBuffer.writeUInt8(groupUser.team, 4);
						userDataBuffer.writeUInt8(groupUser.status, 5);
						userDataBuffer.writeUInt8(groupUser.username.length, 6); // null terminating character indicates when to stop reading username
						userDataBuffer.write(groupUser.username, 7);
						packet.push(userDataBuffer);
					}
				}
			}
			console.log("packet: ", packet.toString("utf8"));
			server.sendPacket(packet, remote);
		}
	}

	sendGroupInfo(server, remote, groupId) {
		let packet = server.createPacket(Packets.Packet.GROUP_INFO);
		if (this.groups[groupId]) {
			let group = this.groups[groupId];
			let creator = server.users.users[group.creator].username;

			let creatorBuffer = Buffer.from(creator, "utf8");
			let groupIdBuffer = Buffer.from(groupId, "utf8");
			const sizeBuffer = Buffer.from([creator.length, groupId.length]);

			packet.push(Buffer.concat([sizeBuffer, creatorBuffer, groupIdBuffer]));
			server.sendPacket(packet, remote);
		}
	}
}

module.exports = PropHuntGroupList;
