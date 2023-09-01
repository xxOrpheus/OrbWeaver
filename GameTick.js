const Util = require("./Util.js");
const Location = require("./Location.js");
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
			for (const updateType in this.updateQueue) {
				if (this.updateQueue[updateType].length > 0) {
					const updateUsers = this.updateQueue[updateType];
					for (const updateUser in updateUsers) {
						const updateUserId = this.updateQueue[updateType][updateUser].id;
						const regionUsers = this.server.users.regionMap;
						const updateUserObj = this.server.users.users[updateUserId];
						for (const receiveUpdateUser in regionUsers) {
							// we only need to update users in groups
							const receiveUpdateUserObj = this.server.users.users[receiveUpdateUser];
							const receiveUpdateLocation = receiveUpdateUserObj.location;
							const updateUserLocation = updateUserObj.location;
							if (updateUserObj.id != receiveUpdateUserObj.id) {
								// TODO: if a new player enters the region, we will need to request updates for all players.. hmm...
								this.server.groups.sendPlayerUpdate(receiveUpdateUserObj.remote, updateUserObj.groupId, updateUserId, updateType);
							}
						}
						console.log("handled update:", updateUserId, Packets.PlayerUpdates[updateType]);
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

	enqueueUpdate(message, offset, remote, token) { // handles back end logic for the actual player updating, and subsequently enqueues the data to be pushed to other players

		// packet structure PLAYER_UPDATE UPDATE_TYPE PLAYER_ID<omitted when receiving an update, only used for sending updates> UPDATE_DATA...
		let user = this.server.verifyJWT(token);
		if (user.id && this.server.users.users[user.id]) {
			const updateType = message.readUInt8(offset);
			offset++;
			user = this.server.users.users[user.id];
			if(this.updateQueue[updateType][user.id]) {
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
					const location = new Location(x, y, z);
					const regionId = location.getPaletteId();
					if(this.server.users.users[user.id].regionId != regionId) { // we must remove them from their previous region mapping
						delete this.server.users.regionMap[this.server.users.users[user.id].regionId];
					}
					this.server.users.users[user.id].regionId = regionId; // assign the new region id and add them to the region map
					this.server.users.regionMap[regionId] = user.id;
					console.log(`Location update received for player ${username}: `, x, y, z, orientation, regionId);
					console.log(JSON.stringify(this.updateQueue));
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
