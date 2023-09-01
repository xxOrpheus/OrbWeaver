const Packets = require("./Packets.js");

class GameTick {
	tick = null;
	freq = 600;
	server = null;
	updateQueue = {};

	constructor(server) {
		this.server = server;
		this.startTick();
		this.initializeUpdateQueue();
	}

	startTick() {
		this.tick = setInterval(() => {
			// if a player enters a new region, they need to receive all player's data as they will have no prior knowledge
			// TODO: these variable names are confusing me i am half cut let's fix it later
			for (const userIdToUpdate in this.server.users.needsUpdate) {
				const userToUpdateId = this.server.users.needsUpdate[userIdToUpdate];
				const userToUpdate = this.server.users.users[userToUpdateId];
				const userRegionId = userToUpdate.regionId;
				for (const userIdInSameRegion in this.server.users.regionMap[userRegionId]) {
					const userInSameRegion = this.server.users.users[this.server.users.regionMap[userRegionId][userIdInSameRegion]];
					if (userInSameRegion.id !== userToUpdateId) {
						// update logic
					}
				}
				delete this.server.users.needsUpdate[userIdToUpdate];
			}
			// all queued updates should have been processed and the object can be reset 
			this.server.users.needsUpdate = [];

			// otherwise we will only send updates as needed from the queue
			for (const updateType in this.updateQueue) {
				if (this.updateQueue[updateType].length > 0) {
					const updateUsers = this.updateQueue[updateType];
					for (const updateUser in updateUsers) {
						const updateUserId = this.updateQueue[updateType][updateUser];
						const regionUsers = this.server.users.regionMap;
						const updateUserObj = this.server.users.users[updateUserId];
						// we only need to update users in the same region
						for (const receiveUpdateUser in regionUsers) {
							const receiveUpdateUserObj = this.server.users.users[this.server.users.regionMap[receiveUpdateUser]];
							if (updateUserObj.id != receiveUpdateUserObj.id) {
								this.server.groups.sendPlayerUpdate(receiveUpdateUserObj.remote, updateUserObj.groupId, updateUserId, updateType);
							}
						}
						delete this.updateQueue[updateType][updateUser];
					}
				}
			}
		}, this.freq);
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
					let username = user.username;
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
						let oldRegion = this.server.users.users[user.id].regionId;
						if (this.server.users.regionMap[oldRegion]?.[user.id] != null) {
							delete this.server.users.regionMap[oldRegion][user.id];
						}
						// we can remove the region mapping if there is no one in it
						if (this.server.users.regionMap[oldRegion]?.length < 1) {
							delete this.server.users.regionMap[oldRegion];
						}
						// assign the new region id and add them to the region map, add them to the list of users that need a full update
						this.server.users.users[user.id].regionId = regionId;
						this.server.users.regionMap[regionId].push(user.id);
						this.server.users.needsUpdate.push(user.id);
					}
					this.server.users.users[user.id].location = location;
					break;

				case Packets.PlayerUpdate.PROP:
					break;

				case Packets.PlayerUpdate.TEAM:
					break;
			}
			this.updateQueue[updateType].push(user.id);
		}
	}
}

module.exports = GameTick;
