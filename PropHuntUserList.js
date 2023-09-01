const Config = require("./Config.js");
const Util = require("./Util.js");
const Packets = require("./Packets.js");
const Errors = require("./Errors.js");
const PropHuntUser = require("./PropHuntUser.js");

class PropHuntUserList {
	users = [];
	uuidMap = {}; // a list of uuids to usernames
	regionMap = {}; // a list of regions with users inside them
	needsUpdate = []; // a list of users by uuid that need to be updated for a new region
	usersOnline = []; // list of usernames that are online
	server = null;

	constructor(server) {
		this.server = server;
		this.nextId = 0;
		this.uuidMap = {};
		this.recycledIDs = [];
		this.usersOnline = [];
		this.users = [];
	}

	async login(message, offset, remote, token) {
		try {
			// TODO: I don't feel like this really belongs here but it's ok for now
			const size = 2; //read username, password  (utf8)
			const loginDetails = Packets.utf8Deserialize(message, size, offset, remote);
			offset = loginDetails.offset;
			if (loginDetails.data.length >= size) {
				const username = loginDetails.data[0].toLowerCase().trim();
				const password = loginDetails.data[1];
				// do not try to make a new login if they're already logged in, revalidate previous session.
				// TODO: previous sessions must hold priority if they are still active, they can't be overidden by the new one.
				const playerOnline = this.playerOnline(username);
				if (playerOnline != false) {
					await Util.verifyPasscode(playerOnline.password, password).then(
						function (result) {
							if (result == false) {
								this.server.sendError(Errors.Error.INVALID_PASSWORD, remote);
							} else {
								if (this.server.verifyJWT(token)?.id == playerOnline.id) {
									// not sure if this matters but it won't hurt
									this.users[playerOnline.id].remote = remote;
									// if they're in a group they should receive the group info again
									if (playerOnline.groupId != null) {
										this.server.groups.sendUserList(remote, playerOnline.groupId);
										this.server.groups.sendGroupInfo(remote, playerOnline.groupId);
									}
								} else {
									this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
								}
							}
						}.bind(this)
					);
				} // make sure it is a valid name first
				else if (Util.isValidName(username)) {
					const worldNumber = message.readUInt16BE(offset);
					// we don't want a valid token as this is supposed to be a new login
					if (this.server.verifyJWT(token)) {
						this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
					} // make sure it is a valid world too
					else if (Util.isValidWorld(worldNumber)) {
						const user = new PropHuntUser(username, password, worldNumber);
						const userId = user.id;
						// cycle numeric id's for use in packets to save bandwidth vs sending the username
						const numericId = this.recycledIDs.length > 0 ? this.recycledIDs.shift() : this.nextId++;
						user.numericId = numericId;
						// map numeric id's to uuid's so we don't have to do complex looping
						this.uuidMap[numericId] = userId;
						this.users[userId] = user;
						this.users[userId].remote = remote;
						this.usersOnline[username] = userId;

						await this.users[userId].setPassword(password).then((result) => {
							this.users[userId].jwt = this.server.getJWT().sign({ id: userId }, Config.JWT_SECRET_KEY);
							this.server.serverLog(`[${userId}] ${username} has logged in (World ${worldNumber})`);
							this.sendJWT(this.users[userId].jwt, remote);
						});
					} else {
						this.server.sendError(Errors.Error.INVALID_WORLD, remote);
					}
				} else {
					this.server.serverLog(`invalid name ${JSON.stringify(username)}`);
					this.server.sendError(Errors.Error.INVALID_NAME, remote);
				}
			}
		} catch (error) {
			this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
			console.debug(error);
		}
	}

	logout(message, offset, remote, token) {
		const verify = Util.verifyJWT(token);
		if (verify?.id) {
			const userId = verify.id;
			if (this.users[userId]?.numericId > -1) {
				const numericId = this.users[userId].numericId;
				// delete the numeric id so it can be reused in the recycler
				delete this.uuidMap[numericId];
				this.recycledIDs.push(numericId);
			}
			const regionId = this.users[userId].regionId;
			delete this.regionMap[regionId][userId];
			delete this.usersOnline[username];
			delete this.users[userId];
		}
	}

	playerOnline(username) {
		username = username.toLowerCase().trim();
		if (!!this.usersOnline[username] && this.users[this.usersOnline[username]]) {
			return this.users[this.usersOnline[username]];
		} else {
			return false;
		}
	}

	sendJWT(jwt, remote) {
		const actionBuffer = Buffer.alloc(1);
		actionBuffer.writeUInt8(Packets.Packet.USER_GET_JWT, 0);
		const jwtBuffer = Buffer.from(jwt, "utf8");
		const sizeBuffer = Buffer.from([jwtBuffer.length]);
		const packetBuffer = Buffer.concat([actionBuffer, sizeBuffer, jwtBuffer]);

		this.server.server.send(packetBuffer, 0, packetBuffer.length, remote.port, remote.address, (err) => {
			if (err) {
				console.error("Error sending response:", err);
			}
		});
	}

	getUsers() {
		return this.users;
	}
}

module.exports = PropHuntUserList;
