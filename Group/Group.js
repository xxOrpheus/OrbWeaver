import Util from '#server/Util';
import * as Errors from '#config/Errors';
import Colors from '#config/Colors';
import { v4 as uuidv4 } from 'uuid';

uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class Group {
	#countdown = null;
	constructor(userId, world) {
		if (!Util.isValidWorld(world)) {
			return Errors.Errors.INVALID_WORLD;
		}
		this.creator = userId;
		this.users = [];
		this.world = world;
		this.id = userId;
		this.active = Util.currentTime(); // TODO: use last active time to decide when to remove a group
		this.started = 0; // 0 = waiting 1 = started , we could probably change this safely to a boolean later
		this.findLowersScore = false; // if a player is found, does their score go down? this will only work if we add rounds 
		this.password;
		this.locked = false; // if this.locked = true, require this.password to join the game 
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
		console.log(`${Colors.YELLOW}[${Colors.BLUE}${this.id}${Colors.YELLOW}] (${Colors.RED}${this.creator}${Colors.YELLOW}): ${Colors.WHITE}${msg}${Colors.RESET}`);
	}


	// splits the users evenly into two teams, seekers and hiders, hiders are always the larger group
	// TODO: could this sorting algorithm be refined? 
	setupTeams() {
		const usersArray = Object.values(this.users);
		Util.shuffleArray(usersArray); // randomly sort the users

		const [group1, group2] = Util.splitArrayEvenly(usersArray);
		const [largerGroup, smallerGroup] = group1.length > group2.length ? [group1, group2] : [group2, group1];
		const [team1, team2] = largerGroup === group1 ? [2, 1] : [1, 2];

		for (const user of largerGroup) {
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

export default Group;
