import Group from '#group/Group';
import * as Packets from '#server/Packets';
import * as Errors from '#config/Errors';
import Util from '#server/Util';

class GroupList {
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
					this.groups[userId] = new Group(userId, world);
					const groupId = userId; // just to improve readability lol
					// add the creator to the list of users -- group ID is synonymous with the user ID
					this.server.log(`${users.users[userId].username} has created a group (${userId})`);
					this.addUser(groupId, userId);
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
				//this.sendUserList(userId, groupId);
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
		if (!this.server.users.users[userToReceiveUpdateId] || !this.server.users.users[userToUpdateId]) {
			console.error(`tried to update players that did not actually exist: ${userToReceiveUpdateId} & ${userToUpdateId}`);
			return Errors.Error.INVALID_UPDATE;
		}

		if (!this.server.users.users[userToReceiveUpdateId].remote) {
			console.error(`${userToReceiveUpdateId} did not have a socket open!`);
			return Errors.Error.NO_CONNECTION_AVAILABLE;
		}
		// they don't need to update themselves that would be ridiculous
		if (userToReceiveUpdateId == userToUpdateId) {
			return;
		}

		const updatePacket = this.server.createPacket(Packets.Packet.PLAYER_UPDATE);
		const updateUser = this.server.users.users[userToUpdateId];
		const setup = Buffer.alloc(3); // 1 byte for update type, 2 for user ID
		setup.writeUInt8(updateType, 0);
		setup.writeUInt16BE(updateUser.numericId, 1);
		updatePacket.push(setup);
		//this.server.debug(`sending ${this.server.users.users[userToUpdateId].username}'s ${Packets.PlayerUpdates[updateType]} update to ${this.server.users.users[userToReceiveUpdateId].username}`);
		if (updateType == Packets.PlayerUpdate.LOCATION) {
			let updateLocation = updateUser.location;
			let locationBuffer = Buffer.alloc(2 + 2 + 1 + 2); // 2 x 2 y 1 z 2 orientation
			locationBuffer.writeUInt16BE(updateLocation.getX(), 0);
			locationBuffer.writeUInt16BE(updateLocation.getY(), 2);
			locationBuffer.writeUInt8(updateLocation.getZ(), 4);
			locationBuffer.writeUInt16BE(updateUser.orientation, 5);
			updatePacket.push(locationBuffer);
		}
		this.server.sendPacket(updatePacket, this.server.users.users[userToReceiveUpdateId].remote);
	}

	// sends the group player list
	sendUserList(userId, groupId, regionUpdate) {
		const user = this.server.users.users[userId];
		const group = this.server.groups.groups[groupId];

		if (!user?.remote) {
			return Errors.Error.INVALID_USER;
		}

		if (!group) {
			return Errors.Error.INVALID_GROUP;
		}

		const remote = user.remote;
		const groupUsers = group.users.filter((groupUserId) => groupUserId !== userId); // remove the user requesting the list to reduce bandwidth
		let totalSize = 0;
		const userBuffer = [];

		for (const groupUserId of groupUsers) {
			const groupUser = this.server.users.users[groupUserId];

			// if this is a region specific update (regionUpdate boolean), check that the users share the same region 
			if (groupUser?.regionId && (!regionUpdate || user.regionId === groupUser.regionId)) {
				const usernameLength = groupUser.username.length;
				const userData = Buffer.alloc(3 + usernameLength);

				userData.writeUInt16BE(groupUser.numericId, 0);
				userData.writeUInt8(usernameLength, 2);
				userData.write(groupUser.username, 3, usernameLength);

				userBuffer.push(userData);
				totalSize += userData.length;
			}
		}

		if (totalSize === 0) {
			return; // no data to send
		}

		const sizeBuffer = Buffer.alloc(2);
		sizeBuffer.writeUInt16BE(totalSize);
		const packet = this.server.createPacket(Packets.Packet.PLAYER_LIST);
		packet.push(Buffer.concat([sizeBuffer, ...userBuffer]));
		this.server.sendPacket(packet, remote);
	}

	// used when a new group is created so the player knows what their group ID is for sharing.
	sendGroupInfo(userId, groupId) {
		if (!this.groups[groupId]) {
			return Errors.Error.INVALID_GROUP;
		}
		if (!this.server.users.users[userId]?.remote) {
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

export default GroupList;
