import * as Packets from "#server/Packets";
import Config from "#config/Config";
import PlayerLocation from "#updates/PlayerLocation";
import PlayerModel from "#updates/PlayerModel";
import Util from "#server/Util";

class GameTick {
	tick = null;
	server = null;
	updateQueue = {};

	constructor(server) {
		this.server = server;
		this.initializeUpdateQueue();
		this.startTick();
		Util.log("GameTick initialized...");
	}

	startTick() {
		try {
			// TODO: we could put this tick to rest when there is nothing happening (no players in games)
			this.tick = setInterval(() => this.cycle(), Config.TICK_LENGTH);

			// TODO: we should check if any memory is being wasted (ghost players, etc)
			this.garbageCollector = setInterval(() => {
				for(const userId in this.server.users.users) {
					let active = this.server.users.users[userId].active;
					let jwt = this.server.users.users[userId].jwt;
					let remote = this.server.users.users[userId].remote;
					let lastActive = Util.currentTime() - active;
					if(!active || lastActive > Config.LOGOUT_TIMER) {
						this.server.users.logout(null, null, remote, jwt);
					}
				}
			}, Config.GARBAGE_COLLECTION_FREQ);
			this.running = true;
		} catch (error) {
			Util.debug(error);
		}
	}

	// TODO : there is repeated logic in this block, let's break it down later
	cycle() {
		try {
			// if a player enters a new region, they need to receive all player's data as they will have no prior knowledge
			for (const userIdToUpdate in this.server.users.needsUpdate) {
				if (!this.server.users.users[userIdToUpdate]?.regionId) {
					delete this.server.users.needsUpdate[userIdToUpdate];
					continue;
				}
				const userToUpdateId = this.server.users.needsUpdate[userIdToUpdate];
				const userToUpdate = this.server.users.users[userToUpdateId];
				const userRegionId = userToUpdate.regionId;
				for (const userIdInSameRegion in this.server.users.regionMap[userRegionId]) {
					let userInSameRegionId = this.server.users.regionMap[userRegionId][userIdInSameRegion];
					// make sure the user still exists, if they don't they should be removed from the regionMap
					if (!this.server.users.users[userInSameRegionId]) {
						delete this.server.users.regionMap[userRegionId][userInSameRegionId];
						continue;
					}

					if (userInSameRegionId !== userToUpdateId) {
						// i guess we actually only need the model and location to be updated, the rest only the server needs to know
						this.updateQueue[Packets.PlayerUpdate.LOCATION].push(userInSameRegionId);
						//this.updateQueue[Packets.PlayerUpdate.MODEL].push(userInSameRegionId);
						
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
						// if the user doesn't exist/isn't in a region (no location data), we go to the next cycle- they don't need to be updated yet
						if (!this.server.users.users[userToUpdateId]?.regionId) {
							continue;
						}
						let userToUpdate = this.server.users.users[userToUpdateId];
						// the region map hasn't been created, we should skip for now.
						if (!this.server.users.regionMap[userToUpdate.regionId]) {
							continue;
						}
						let regionUsersMap = this.server.users.regionMap[userToUpdate.regionId];
						userToUpdate.notify(); // set their last active time
						/// We only need to update users in the same region
						for (const userToReceiveUpdateId of regionUsersMap) {
							if (userToUpdate.groupId.length > 0 && this.server.groups.groups[userToUpdate.groupId]) {
								if (userToReceiveUpdateId !== userToUpdateId && !!this.server.users.users[userToReceiveUpdateId] && userToUpdate.groupId === this.server.users.users[userToReceiveUpdateId].groupId) {
									this.server.groups.sendPlayerUpdate(userToReceiveUpdateId, userToUpdateId, updateType);
								}
							}
						}
					}
					this.updateQueue[updateType] = [];
				}
			}
		} catch (error) {
			Util.debug(error);
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

		// packet structure PLAYER_UPDATE UPDATE_TYPE PLAYER_ID<omitted when receiving an update, only used for sending updates> ...UPDATE_DATA
		let user = this.server.verifyJWT(token);
		if (user?.id && this.server.users.users[user.id]) {
			if (offset < message.length) {
				// offset cant be longer than the length or something is seriously fucked up
				const updateType = message.readUInt8(offset);
				//console.log("update: " + updateType);
				offset++;
				user = this.server.users.users[user.id];
				if (this.updateQueue[updateType]?.[user.id]) {
					delete this.updateQueue[updateType][user.id]; // if there are previous updates queued we can safely remove them. (e.g. location updates would stack very fast but we only need the most recent one)
				}

				// all updates should follow the same structure UpdateType.update(GameTick, User, message, offset)
				switch (updateType) {
					case Packets.PlayerUpdate.LOCATION:
						PlayerLocation.update(this, user, message, offset);
						break;

					case Packets.PlayerUpdate.MODEL:
						PlayerModel.update(this, user, message, offset);
						break;
				}
				this.updateQueue[updateType].push(user.id);
			}
		}
	}
}

export default GameTick;
