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
					this.server.log(`${users.users[userId].username} has created a group (${userId})`);
					this.sendUserList(userId, groupId, userId);
					this.sendGroupInfo(userId, groupId);
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
				this.groups[groupId].users.push(userId); // add the user's id to the group user list
				this.sendGroupInfo(userId, groupId);
				this.sendUserList(userId, groupId);
				this.server.users.setNeedsUpdate(userId);
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
				this.server.debug(`Attempting to remove user ${this.server.users.users[userId].username} from a group`);
				// if no users are in the group we can safely remove the entire group
				if (this.groups[groupId].users.length < 1) {
					this.server.debug(`[${groupId}] No users left in group, purging...`);
					delete this.groups[groupId];
				}
			} else {
				this.server.debug("user was not in group, cannot remove", groupId, userId);
				return Errors.Error.ALREADY_IN_GROUP;
			}
		} else {
			this.server.debug("error removing user from group", this.groups[groupId], this.server.users.users[userId], this.server.users.users[userId].groupId == groupId);
		}
	}

	// called from GameTick where each update is added to a queue sorted by ingame world region, or all updates as a whole if a new player enters the region
	// TODO: updates should probably be modular, i.e. new file struture: Packets/UPDATE_LOCATION.js or similar to avoid spaghetti and improve readability
	sendPlayerUpdate(userToReceiveUpdateId, userToUpdateId, updateType) {
		// packet structure PLAYER_UPDATE UPDATE_TYPE PLAYER_ID UPDATE_DATA...
		if(!this.server.users.users[userToReceiveUpdateId] || !this.server.users.users[userToUpdateId]) {
			console.error(`tried to update players that did not actually exist: ${userToReceiveUpdateId} & ${userToUpdateId}`);
			return Errors.Error.INVALID_UPDATE;
		}
		if(!this.server.users.users[userToReceiveUpdateId].remote) {
			console.error(`${userToReceiveUpdateId} did not have a socket open!`)
			return Errors.Error.NO_CONNECTION_AVAILABLE;
		}
		const updatePacket = this.server.createPacket(Packets.Packet.PLAYER_UPDATE);
		const updateUser = this.server.users.users[userToUpdateId];
		const setup = Buffer.alloc(3); // 1 byte for update type, 2 for user ID
		setup.writeUInt8(updateType, 0);
		setup.writeUInt16BE(updateUser.numericId, 1);
		updatePacket.push(setup);
		this.server.debug(`sending ${this.server.users.users[userToUpdateId].username}'s ${Packets.PlayerUpdates[updateType]} update to ${this.server.users.users[userToReceiveUpdateId].username}`)
		switch (updateType) {
			case Packets.Packet.UPDATE_LOCATION:
				if (updateUser.location != null) {
					let updateLocation = updateUser.location;
					let locationBuffer = Buffer.alloc(2 + 2 + 1 + 2); // 2 x 2 y 1 z 2 orientation
					locationBuffer.writeUInt16BE(updateLocation.x, 0);
					locationBuffer.writeUInt16BE(updateLocation.y, 2);
					locationBuffer.writeUInt8(updateLocation.z, 3);
					locationBuffer.writeUInt16BE(updateUser.orientation, 4);
					updatePacket.push(locationBuffer);
				}
				break;

			case Packets.Packet.UPDATE_PROP:
				let updatePropId = updateUser.propId;
				let updatePropType = updateUser.propType;
				let propUpdateBuffer = Buffer.alloc(2 + 1); // 2 bytes for id (uint16) and 1 for type (uint8);
				propUpdateBuffer.writeUInt16BE(updatePropId, 0);
				propUpdateBuffer.writeUInt8(updatePropType, 2);
				updatePacket.push(propUpdateBuffer);
				break;

			case Packets.Packet.UPDATE_TEAM:
				let updateTeam = updateUser.team;
				break;

			case Packets.Packet.UPDATE_STATUS:
				let updateStatus = updateUser.status;
				break;
		}
		this.server.sendPacket(updatePacket, this.server.users.users[userToReceiveUpdateId].remote);
	}

	// sends the group player list
	sendUserList(userId, groupId, regionUpdate) {
		if(!this.server.users.users[userId]?.remote) {
			return Errors.Error.INVALID_USER_ID || Errors.Error.NO_CONNECTION_AVAILABLE;
		}
		if(!this.server.users.users[groupId]) {
			return Errors.Error.INVALID_GROUP;
		}
		const packet = this.server.createPacket(Packets.Packet.PLAYER_LIST);
		const groupUsers = this.groups[groupId].users;
		const remote = this.server.users.users[userId].remote;
		// calculate the total size needed for the buffer
		let totalSize = 0;
		for (const groupUserId of groupUsers) {
			console.log("groupUser",groupUserId)
			let groupUser = this.server.users.users[groupUserId];
			totalSize += 3 + groupUser.username.length; // allocate 2 bytes (uint16) + 1 bytes (uint8) + username length
		}
		// allocate the entire buffer
		const userBuffer = Buffer.alloc(totalSize);

		let offset = 0;
		for (const groupUserId of groupUsers) {
			console.log("groupUserId",groupUserId);
			// if the user doesn't exist or they don't have any location data that sucks
			if(!this.server.users.users[groupUserId]?.regionId) {
				continue;
			}
			// they're not in the same region so they don't need to know
			if(regionUpdate && this.server.users.users[userId].regionId !== this.server.users.users[groupUserId].regionId) {
				continue;
			}
			let groupUser = this.server.users.users[groupUserId];
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
	sendGroupInfo(userId, groupId) {
		if (!this.groups[groupId]) {
			return Errors.Error.INVALID_GROUP;
		}
		if(!this.server.users.users[userId]?.remote) {
			return Errors.Error.INVALID_USER_ID || Errors.Error.NO_CONNECTION_AVAILABLE;
		}
		const remote = this.server.users.users[userId].remote;
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
