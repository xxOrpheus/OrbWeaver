const Util = require("./Util.js");
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
			for(const updateType in this.updateQueue) {
				if(this.updateQueue[updateType].length > 0) {
					const updateUsers = this.updateQueue[updateType];
					for(const updateUser in updateUsers) {
						const serverUsers = this.server.users.users;
						const updateUserId = this.updateQueue[updateType][updateUser].id;
						const updateUserObj = serverUsers[updateUserId];
						for(const receiveUpdateUser in serverUsers) {
							const receiveUpdateUserObj = users[receiveUpdateUser];
							if(updateUserObj.id != receiveUpdateUserObj.id 
								&& updateUserObj.groupId == receiveUpdateUserObj.groupId) {
								this.server.groups.sendPlayerUpdate(receiveUpdateUserObj.remote, updateUserObj.groupId, updateUserId, updateType);
							}
						}
						onsole.log("handled update:", updateUserId, Packets.PlayerUpdates[updateType])
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

	enqueueUpdate(message, offset, remote, token) {
		// packet structure PLAYER_UPDATE UPDATE_TYPE PLAYER_ID<omitted when receiving an update, only used for sending updates> UPDATE_DATA...
		let user = this.server.verifyJWT(token);
		if (user.id && this.server.users.users[user.id]) {
			const updateType = message.readUInt8(offset);
			console.log(updateType);
			offset++;
			user = this.server.users.users[user.id];
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
					console.log(`Location update received for player ${username}: `, x, y, z, orientation);
					this.updateQueue[updateType].push(user.id);
					console.log(JSON.stringify(this.updateQueue));
					break;

				case Packets.PlayerUpdate.PROP:
					break;

				case Packets.PlayerUpdate.TEAM:
					break;
			}
		}
	}
}

module.exports = GameTick;
