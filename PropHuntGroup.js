var Util = require("./Util.js");
const Errors = require("./Errors.js");

const { v4: uuidv4 } = require("uuid");
uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class PropHuntGroup {
	#countdown = null;
	constructor(userId, world) {
		if (!Util.isValidWorld(world)) {
			return Errors.Errors.INVALID_WORLD;
		}
		this.creator = userId;
		this.users = [];
		this.world = world;
		this.id = userId;
		//this.shortId = -1; // that was a bad idea we will leave this to remember how bad of an idea it was 
		this.active = Util.currentTime();
		this.started = 0;
		this.findLowersScore = false;
		this.password;
		this.locked = false;
		this.countdown = false;
		this.startTimer = 60;
		this.timer = this.startTimer;
		this.started = false;
		this.location = {
			P1: { x: 0, y: 0, z: 0 },
			P2: { x: 0, y: 0, z: 0 },
		}; // players can choose a square stage to play in

		return this;
	}

	/*
	 * Group functions
	 */
	getUsers() {
		return this.users;
	}

	userInSession(id) {
        return this.users[id] != null;
	}

	startGame(password) {
		this.setupTeams();
		this.gameLog(`Teams selected, let the countdown begin (${this.startTimer}s)`);
		const groupCountdown = function () {
			this.startTimer = this.timer;
			this.timer--;
			if (this.timer <= 0) {
				clearInterval(this.countdown);
				this.timer = this.startTimer;
				this.countdown = false;
				this.started = true;
				this.gameLog(`Game started (${Object.keys(this.users).length} players)`);
			}
		};
		this.countdown = setInterval(groupCountdown.bind(this), 1000);
		return this;
	}

	endGame() {

    }

	getGroupID() {
		return this.id;
	}

	groupNotify() {
		this.active = Util.currentTime();
	}

	gameLog(msg) {
		console.log(`\x1b[33m[\x1b[34m${this.id}\x1b[33m] (\x1b[31m${this.creator}\x1b[33m)\x1b[39m: \x1b[37m${msg}`);
	}

	setupTeams() {
		const usersArray = Object.values(this.users);
		Util.shuffleArray(usersArray); // randomly sort the users

		const [group1, group2] = Util.splitArrayEvenly(usersArray);
		const [largerGroup, smallerGroup] = group1.length > group2.length ? [group1, group2] : [group2, group1];
		const [team1, team2] = largerGroup === group1 ? [2, 1] : [1, 2];

		for (const user of largerGroup) {
			//props are always the larger group
			this.users[user.id].team = team1;
		}

		for (const user of smallerGroup) {
			this.users[user.id].team = team2;
		}

		return this.users;
	}

	async setPassword(password) {
		this.password = await Util.hash(password).then((result) => {
			return result;
		});
	}
}

module.exports = PropHuntGroup;
