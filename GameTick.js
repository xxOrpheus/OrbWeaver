const Packets = require("./Packets.js");
const Errors = require("./Errors.js");

class GameTick {
	tick = null;
	freq = 600;
	server = null;
	updateQueue = {};

	constructor(server) {
		this.server = server;
		this.initializeUpdateQueue();
		this.startTick();
	}

	startTick() {
		try {
			// TODO: we could put this tick to rest when there is nothing happening (no players in games)
			this.tick = setInterval(() => this.cycle(), this.freq);
			this.running = true;
		} catch (error) {
			this.server.debug(error);
		}
	}

	// TODO : there is repeated logic in this block, let's break it down later
	cycle() {
		// if a player enters a new region, they need to receive all player's data as they will have no prior knowledge
		for (const userIdToUpdate in this.server.users.needsUpdate) {
			const userToUpdateId = this.server.users.needsUpdate[userIdToUpdate];
			const userToUpdate = this.server.users.users[userToUpdateId];
			const userRegionId = userToUpdate.regionId;
			for (const userIdInSameRegion in this.server.users.regionMap[userRegionId]) {
				// make sure the user still exists, if they don't they should be removed from the regionMap
				if (!this.server.users.users[this.server.users.regionMap[userRegionId][userIdInSameRegion]]) {
					delete this.server.users.regionMap[userRegionId][userIdInSameRegion];
					continue;
				}
				const userInSameRegion = this.server.users.users[this.server.users.regionMap[userRegionId][userIdInSameRegion]];
				if (userInSameRegion.id !== userToUpdateId) {
					//this.server.debug(`${userToUpdate.username} should receive ${userInSameRegion.username}'s updates`);

					// i guess we actually only need the prop and location to be updated, the rest only the server needs to know
					this.updateQueue[Packets.PlayerUpdate.LOCATION].push(userIdInSameRegion);
					this.updateQueue[Packets.PlayerUpdate.PROP].push(userIdInSameRegion);
				}
			}
		}
		// all needed player updates should have been processed and the array can be reset
		this.server.users.needsUpdate = [];

		// otherwise we will only send updates as needed from the queue
		for (const updateType in this.updateQueue) {
			if (this.updateQueue[updateType].length > 0) {
				let usersToUpdate = this.updateQueue[updateType];
				for (const userToUpdateId of usersToUpdate) {
					// if the user doesn't exist we go to the next cycle
					if (!this.server.users.users[userToUpdateId]) {
						continue;
					}
					let userToUpdate = this.server.users.users[userToUpdateId];
					let regionUsersMap = this.server.users.regionMap[userToUpdate.regionId];
					userToUpdate.notify(); // set their last active time
					/// We only need to update users in the same region
					for (const userToReceiveUpdateId of regionUsersMap) {
						if(userToUpdate.groupId.length > 0 && this.server.groups.groups[groupId]) {
							if (userToReceiveUpdateId !== userToUpdateId && !!this.server.users.users[userToReceiveUpdateId] && userToUpdate.groupId === this.server.users.users[userToReceiveUpdateId].groupId) {
								this.server.groups.sendPlayerUpdate(userToReceiveUpdateId, userToUpdateId, updateType);
							}
						}
					}
				}
				this.updateQueue[updateType] = [];
			}
		}
	}

	updateUsersInSameRegion(userIdToUpdate, callback) {}

	stopTick() {
		clearInterval(this.tick);
		this.running = false;
	}

	initializeUpdateQueue() {
		for (const update of Object.values(Packets.PlayerUpdate)) {
			this.updateQueue[update] = [];
		}
	}

	// TODO: sanity checks (verify player movement, etc);
	// TODO: updates should probably be modular to avoid spaghetti and improve code readability / management
	enqueueUpdate(message, offset, remote, token) {
		// handles back end logic for the actual player updating, and subsequently enqueues the data to be pushed to other players

		// packet structure PLAYER_UPDATE UPDATE_TYPE PLAYER_ID<omitted when receiving an update, only used for sending updates> UPDATE_DATA...
		let user = this.server.verifyJWT(token);
		if (user?.id && this.server.users.users[user.id]) {
			console.log("message: " + message.toString());
			console.log("message length: " + message.length);
			console.log("offset: " + offset);
			if (offset < message.length) {
				// offset cant be longer than the length or something is seriously fucked up
				const updateType = message.readUInt8(offset);
				console.log("update: " + updateType);
				offset++;
				user = this.server.users.users[user.id];
				if (this.updateQueue[updateType]?.[user.id]) {
					delete this.updateQueue[updateType][user.id]; // if there are previous updates queued we can safely remove them. (e.g. location updates would stack very fast but we only need the most recent one)
				}
				switch (updateType) {
					case Packets.PlayerUpdate.LOCATION:
						const x = message.readUInt16BE(offset);
						offset += 2;
						const y = message.readUInt16BE(offset);
						offset += 2;
						const z = message.readUInt8(offset);
						offset++;
						const orientation = message.readUInt16BE(offset);
						offset += 2;
						const location = user.location;
						location.setAbsX(x);
						location.setAbsY(y);
						location.setZ(z);
						const regionId = location.getPaletteId(0, 0);
						// if the region hasn't been entered before we need to instantiate a new array before we can populate it
						if (!this.server.users.regionMap[regionId]) {
							this.server.users.regionMap[regionId] = [];
						}
						if (user.regionId != regionId) {
							// we must remove them from their previous region mapping
							const oldRegion = this.server.users.users[user.id].regionId;
							if (this.server.users.regionMap[oldRegion]?.[user.id] != null) {
								delete this.server.users.regionMap[oldRegion][user.id];
							}
							// we can remove the region mapping if there is no one in it
							if (this.server.users.regionMap[oldRegion]?.length < 1) {
								delete this.server.users.regionMap[oldRegion];
							}
							// assign the new region id and add them to the region map, add them to the list of users that need a full update
							this.server.users.users[user.id].regionId = regionId;
							this.server.users.users[user.id].orientation = orientation;
							this.server.users.regionMap[regionId].push(user.id);
							// they're in a new region so they need to receive the updated player list
							if (!!user.groupId) {
								this.server.groups.groups[user.groupId].sendUserList(user.id, user.groupId);
							}
							this.server.users.setNeedsUpdate(user.id);
						}
						this.server.users.users[user.id].location = location;
						this.server.debug(`${user.username} new location: ${location}`);
						break;

					case Packets.PlayerUpdate.PROP:
						const propId = message.readUInt16BE(offset);
						offset += 2;
						const propType = message.readUInt8(offset);
						offset++;
						if (propId < 0 || propId > 65535) {
							this.server.sendError(Errors.Error.INVALID_PROP, remote);
						} else {
							this.server.users.users[user.id].propId = propId;
							this.server.users.users[user.id].propType = propType == 0 ? 0 : 1;
						}
						break;
				}
				this.updateQueue[updateType].push(user.id);
			}
		}
	}
}

module.exports = GameTick;
