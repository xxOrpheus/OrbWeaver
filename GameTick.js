const Util = require("./Util.js");

class GameTick {
	tick = null;
	freq = 600;
	server = null;
	updateQueue = [];

	constructor(server) {
		this.server = server;
		this.startTick();
	}

	startTick() {
		this.tick = setInterval(() => {
			for (const update in this.updateQueue) {

			}
		}, this.freq);
	}

	stopTick() {
		clearInterval(this.tick);
	}

	enqueueUpdate(userId, updateType) {
		this.updateQueue[userId].push(updateType);
	}
}
