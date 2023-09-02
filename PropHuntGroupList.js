const PropHuntGroup = require("./PropHuntGroup.js");
const Packets = require("./Packets.js");
const Errors = require("./Errors.js");
const Util = require("./Util.js");

class PropHuntGroupList {
	server = null;

	constructor(server) {
		this.groups = {};
		this.server = server;
	}

	createGroup(message, offset, remote, token) {
		const users = this.server.getUsers();
		const verify = this.server.verifyJWT(token);
		const userId = verify.id;
		if (users.users[userId] != null && verify) {
			// TODO: add more sanity checks/verification to createGroup
			const world = users.users[userId].world;
			if (Util.isValidWorld(world)) {
				if (!this.groups[userId]) {
					this.groups[userId] = new PropHuntGroup(userId, world);
					const groupId = userId; // just to improve readability lol
					// add the creator to the list of users -- group ID is synonymous with the user ID
					this.addUser(groupId, userId);
					this.server.serverLog(`${users.users[userId].username} has created a group (${userId})`);
					this.sendUserList(remote, groupId, userId);
					this.sendGroupInfo(remote, groupId);
				} else {
					this.server.sendError(Errors.Error.ALREADY_IN_GROUP, remote);
				}
			} else {
				this.server.sendError(Errors.Error.INVALID_WORLD, remote);
			}
			return;
		}
		this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
	}

	addUser(groupId, userId) {
		if (this.groups[groupId] && this.server.users.users[userId]) {
			if (!this.groups[groupId].users[userId]) {
				// we must reset some data, but not all, as things like location are subject to change constantly
				this.server.users.users[userId].groupId = groupId;
				this.server.users.users[userId].status = 0;
				this.server.users.users[userId].team = 0;
				this.groups[groupId].users[userId] = userId; // add the user's id to the group user list
			} else {
				return Errors.Error.ALREADY_IN_GROUP;
			}
		} else {
			return Errors.Error.INVALID_GROUP;
		}
	}

	removeUser(groupId, userId) {
		if (this.groups[groupId] && this.server.users.users[userId] && this.server.users.users[userId].groupId == groupId) {
			if (this.groups[groupId].users[userId]) {
				this.server.users.users[userId].groupId = "";
				delete this.groups[groupId].users[userId];
				console.log(`Attempting to remove user ${this.server.users.users[userId].username} from a group`);
				// if no users are in the group we can safely remove the entire group
				if (this.groups[groupId].users.length < 1) {
					console.log(`[${groupId}] No users left in group, purging...`);
					delete this.groups[groupId];
				}
			} else {
				console.log("user was not in group, cannot remove", groupId, userId);
				return Errors.Error.ALREADY_IN_GROUP;
			}
		} else {
			console.log("error removing user from group", this.groups[groupId], this.server.users.users[userId], this.server.users.users[userId].groupId == groupId);
		}
	}

	// called from GameTick where each update is added to a queue sorted by ingame world region, or all updates as a whole if a new player enters the region
	// TODO: updates should probably be modular, i.e. new file struture: Packets/UPDATE_LOCATION.js or similar to avoid spaghetti and improve readability
	sendPlayerUpdate(remote, groupId, updateUserId, updateType) {
		// packet structure PLAYER_UPDATE UPDATE_TYPE PLAYER_ID UPDATE_DATA...
		const updatePacket = this.server.createPacket(Packets.Packet.PLAYER_UPDATE);
		if (!this.groups[groupId].users[updateUserId]) {
			return;
		}
		const updateUser = this.groups[groupId].users[updateUserId];
		const setup = Buffer.alloc(3); // 1 byte for update type, 2 for user ID
		setup.writeUInt8(updateType);
		setup.writeUInt16BE(updateUser.numericId);
		updatePacket.push(setup);
		switch (updateType) {
			case Packets.Packet.UPDATE_LOCATION:
				if (updateUser.location != null) {
					let updateLocation = updateUser.location;
					let locationBuffer = Buffer.alloc(2 + 2 + 1 + 2); // 2 x 2 y 1 z 2 orientation
					locationBuffer.writeUInt16BE(updateLocation.x);
					locationBuffer.writeUInt16BE(updateLocation.y);
					locationBuffer.writeUInt8(updateLocation.z);
					locationBuffer.writeUInt16BE(updateUser.orientation);
					updatePacket.push(locationBuffer);
				}
				break;

			case Packets.Packet.UPDATE_PROP:
				let updatePropId = updateUser.propId;
				let updatePropType = updateUser.propType;
				let propUpdateBuffer = Buffer.alloc(2 + 1); // 2 bytes for id (uint16) and 1 for type (uint8);
				updatePacket.push(propUpdateBuffer);
				break;

			case Packets.Packet.UPDATE_TEAM:
				let updateTeam = updateUser.team;
				break;

			case Packets.Packet.UPDATE_STATUS:
				let updateStatus = updateUser.status;
				break;
		}
		this.server.sendPacket(updatePacket, remote);
	}

	// sends the group player list
	sendUserList(remote, groupId) {
		const packet = this.server.createPacket(Packets.Packet.PLAYER_LIST);
		const groupUsers = this.groups[groupId].users;

		// calculate the total size needed for the buffer
		let totalSize = 0;
		for (const groupUser of groupUsers) {
			totalSize += 3 + groupUser.username.length; // allocate 2 bytes (uint16) + 1 bytes (uint8) + username length
		}
		// allocate the entire buffer
		const userBuffer = Buffer.alloc(totalSize);

		let offset = 0;
		for (const groupUser of groupUsers) {
			userBuffer.writeUInt16BE(groupUser.numericId, offset);
			offset += 2;

			const usernameLength = groupUser.username.length;
			userBuffer.writeUInt8(usernameLength, offset);
			offset++;

			userBuffer.write(groupUser.username, offset, usernameLength);
			offset += usernameLength;
		}
		packet.push(userBuffer);
		this.server.sendPacket(packet, remote);
	}

	// used when a new group is created so the player knows what their group ID is for sharing.
	sendGroupInfo(remote, groupId) {
		if (!this.groups[groupId]) {
			return Errors.Error.INVALID_GROUP;
		}
		const packet = this.server.createPacket(Packets.Packet.GROUP_INFO);
		const group = this.groups[groupId];
		const creator = this.server.users.users[group.creator].username;

		const creatorBuffer = Buffer.from(creator, "utf8");
		const groupIdBuffer = Buffer.from(groupId, "utf8");
		const sizeBuffer = Buffer.from([creator.length, groupId.length]);

		packet.push(Buffer.concat([sizeBuffer, creatorBuffer, groupIdBuffer]));
		this.server.sendPacket(packet, remote);
	}
}

module.exports = PropHuntGroupList;
