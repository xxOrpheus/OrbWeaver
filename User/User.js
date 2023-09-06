import Util from "#server/Util";
import { v4 as uuidv4 } from "uuid";
import WorldPoint from "#world/WorldPoint";

//uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class User {
	constructor(username, worldNumber) {
		this.username = username;
		this.active = Util.currentTime();
		this.id = uuidv4();
		this.numericId = -1;
		this.groupId = "";
		this.world = worldNumber;
		this.jwt = false;
		this.status = 0;
		this.team = 0;
		this.modelId = 0;
		this.modelType = 0;
		this.location = new WorldPoint(0, 0, 0);
		this.regionId = 0;
		this.orientation = 0;
		return this;
	}

	async setPassword(password) {
		this.password = await Util.hash(password).then((result) => {
			return result;
		});
	}

	// update their last active time for use in the gametick (log out a user if they're inactive)
	// TODO: we could probably just tie this with the runescape's login/logout events and forget about logging times entirely
	notify() {
		this.active = Util.currentTime();
	}
}

export default User;