var Util = require("./Util.js");
const { v4: uuidv4 } = require("uuid");
uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class PropHuntUser {
	constructor(username, password, worldNumber) {
		this.username = username;
		this.active = Util.currentTime();
		this.id = -1;
        this.groupId = -1;
		this.world = worldNumber;
		this.jwt = false;
		return this;
	}

	async setPassword(password) {
		this.password = await Util.hash(password).then((result) => {
			return result;
		});
	}
}

module.exports = PropHuntUser;
