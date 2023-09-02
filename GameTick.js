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
			this.tick = setInterval(() => {
				// if a player enters a new region, they need to receive all player's data as they will have no prior knowledge
				for (const userIdToUpdate in this.server.users.needsUpdate) {
					const userToUpdateId = this.server.users.needsUpdate[userIdToUpdate];
					const userToUpdate = this.server.users.users[userToUpdateId];
					const userRegionId = userToUpdate.regionId;
					for (const userIdInSameRegion in this.server.users.regionMap[userRegionId]) {
						const userInSameRegion = this.server.users.users[this.server.users.regionMap[userRegionId][userIdInSameRegion]];
						if (userInSameRegion.id !== userToUpdateId) { // TODO: update new users in the region
							// update logic
							// maybe just this.enqueueUpdate for all update types for each user in the region? sounds pretty crazy though 
						}
					}
					delete this.server.users.needsUpdate[userIdToUpdate];
				}
				// all needed player updates should have been processed and the array can be reset
				this.server.users.needsUpdate = [];

				// otherwise we will only send updates as needed from the queue
				for (const updateType in this.updateQueue) {
					if (this.updateQueue[updateType].length > 0) {
						const usersToUpdate = this.updateQueue[updateType];
						for (const userIdToUpdate in usersToUpdate) {
							const updateUserId = usersToUpdate[userIdToUpdate];
							const regionUsersMap = this.server.users.regionMap;
							const userToUpdateObj = this.server.users.users[updateUserId];
							this.server.users.users[updateUserId].notify(); // set their last active time
							// We only need to update users in the same region
							for (const regionIdToUpdate in regionUsersMap) {
								const userInSameRegionObj = this.server.users.users[this.server.users.regionMap[regionIdToUpdate]];
								if (userToUpdateObj.id !== userInSameRegionObj.id) {
									this.server.groups.sendPlayerUpdate(userInSameRegionObj.remote, userToUpdateObj.groupId, updateUserId, updateType);
								}
							}
							delete this.updateQueue[updateType][userIdToUpdate];
						}
					}
				}
			}, this.freq);
		} catch (error) {
			console.error(error);
		}
	}

	stopTick() {
		clearInterval(this.tick);
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
			const updateType = message.readUInt8(offset);
			offset++;
			user = this.server.users.users[user.id];
			if (this.updateQueue[updateType][user.id]) {
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
						this.server.users.needsUpdate.push(user.id);
					}
					this.server.users.users[user.id].location = location;
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

				// teams will probably be assigned by the server so we likely won't need this 
				case Packets.PlayerUpdate.TEAM:
					break;
			}
			this.updateQueue[updateType].push(user.id);
		}
	}
}

module.exports = GameTick;
