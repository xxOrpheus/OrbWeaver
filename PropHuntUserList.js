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

	setNeedsUpdate(userId) {
		if (!this.needsUpdate[userId]) {
			// only need to update once per queue
			if (!this.users[userId]) {
				return Errors.Error.INVALID_USER_ID;
			}
			this.needsUpdate.push(userId);
		}
		return true;
	}

	async login(message, offset, remote, token) {
		try {
			const size = 2; //read username, password  (utf8)
			const loginDetails = Packets.utf8Deserialize(message, size, offset, remote);
			let userId, worldNumber;
			offset = loginDetails.offset;
			if (loginDetails.data.length >= size) {
				const username = loginDetails.data[0].toLowerCase().trim();
				const password = loginDetails.data[1];
				const playerOnline = this.playerOnline(username);
				if (playerOnline != false) {
					return await Util.verifyPasscode(playerOnline.password, password).then(
						function (result) {
							if (result == false) {
								this.server.sendError(Errors.Error.INVALID_PASSWORD, remote);
								return Errors.Error.INVALID_PASSWORD;
							} else {
								let inactive = Util.currentTime() - playerOnline.lastActive > Config.LOGOUT_TIMER == true;
								// verify them if they still have the JWT token from the previous session, or bypass the token if they have been inactive
								if (this.server.verifyJWT(token)?.id == playerOnline.id || inactive) {
									if (inactive) {
										this.updateJWT(userId);
									}
									// not sure if this matters but it won't hurt
									this.users[playerOnline.id].remote = remote;
									userId = playerOnline.id;
									worldNumber = playerOnline.worldNumber;
									// if they're in a group they should receive the group info again
									if (playerOnline.groupId != null && this.server.groups.groups[playerOnline.groupId] != null) {
										this.server.groups.sendUserList(playerOnline.id, playerOnline.groupId);
										this.server.groups.sendGroupInfo(playerOnline.id, playerOnline.groupId);
									}
								} else {
									this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
									return Errors.Error.INVALID_LOGIN;
								}
							}
						}.bind(this)
					);
				} // make sure it is a valid name first
				else if (Util.isValidName(username)) {
					worldNumber = message.readUInt16BE(offset);
					// the following block of code might be unnecessary and actually introduce more problems than it solves, and also increases server load.
					// let's test with out it for now
					
					/*// we don't want a valid token as this is supposed to be a new login
					if (this.server.verifyJWT(token)) {
						this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
						return Errors.Error.INVALID_LOGIN;
					} // make sure it is a valid world too
					else */

					if (Util.isValidWorld(worldNumber)) {
						const user = new PropHuntUser(username, worldNumber);
						userId = user.id;
						// cycle numeric id's for use in packets to save bandwidth vs sending the username
						const numericId = this.recycledIDs.length > 0 ? this.recycledIDs.shift() : this.nextId++;
						user.numericId = numericId;
						// map numeric id's to uuid's so we don't have to do complex looping
						this.uuidMap[numericId] = userId;
						this.users[userId] = user;
						this.users[userId].remote = remote;
						this.usersOnline[username] = userId;

						await this.users[userId].setPassword(password).then((result) => {
							this.updateJWT(userId);
						});
					} else {
						this.server.sendError(Errors.Error.INVALID_WORLD, remote);
						return Errors.Error.INVALID_WORLD;
					}
				} else {
					this.server.log(`invalid name ${JSON.stringify(username)}`);
					this.server.sendError(Errors.Error.INVALID_NAME, remote);
					return Errors.Error.INVALID_NAME;
				}
				// no error code was returned, we can safely do any final operations here:

				this.server.log(`[${userId}] ${username} has logged in (World ${worldNumber})`);
			}
		} catch (error) {
			this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
			console.debug(error);
			return Errors.Error.INVALID_LOGIN;
		}
	}

	logout(message, offset, remote, token) {
		const verify = this.server.verifyJWT(token);
		if (verify?.id) {
			const userId = verify.id;
			if (!this.users[userId]) {
				this.server.debug("a user tried logging out but was never logged in!");
				return Errors.Error.INVALID_LOGIN;
			}
			if (this.users[userId].numericId > -1) {
				const numericId = this.users[userId].numericId;
				// delete the numeric id so it can be reused in the recycler
				delete this.uuidMap[numericId];
				this.recycledIDs.push(numericId);
			}
			if (this.users[userId].regionId) {
				const regionId = this.users[userId].regionId;
				// remove them from the regionMap so no further updates are attempted 
				if (this.regionMap[regionId]?.[userId]) {
					delete this.regionMap[regionId][userId];
				}
			}
			let username = this.users[userId].username;
			delete this.usersOnline[username];
			delete this.users[userId];
		}
	}

	addToGroup(message, offset, remote, token) {
		token = this.server.verifyJWT(token);
		const sizeBuffer = 1; //read groupId
		const groupDetails = Packets.utf8Deserialize(message, sizeBuffer, offset, remote);
		offset = groupDetails.offset;
		if (!(token && groupDetails.data.length >= sizeBuffer)) {
			return Errors.Error.INVALID_GROUP;
		}
		const groupId = groupDetails.data[0];
		let authorized = true; // default true, only subject to change if group.locked == true
		if (token?.id) {
			if (this.server.getUsers().users[token.id]) {
				const user = this.server.getUsers().users[token.id];
				if (this.server.groups.groups[groupId]) {
					// if the group is locked try to verify the password
					if (this.server.groups.groups[groupId].locked == true) {
						// authorize the user to join the game
						authorized = Util.verifyPasscode(this.server.groups.groups[groupId].password, passwordInput);
						const passwordSize = message.readUInt16BE(offset);
						offset += 2;
						const passwordInput = Packets.utf8Deserialize(message, passwordSize, offset, remote);
						offset = passwordInput.offset;
					}

					if (authorized) {
						if (this.server.groups.groups[groupId].users[user.id]) {
							// the user is already in the group
							this.server.sendError(Errors.Error.ALREADY_IN_GROUP, remote);
							return Errors.Error.ALREADY_IN_GROUP;
						} else {
							this.server.log(`${user.username} joined group ${groupId}`);
							this.server.groups.addUser(groupId, token.id);
						}
					} else {
						this.server.sendError(Errors.Error.INVALID_PASSWORD, remote);
						return Errors.Error.INVALID_PASSWORD;
					}
				} else {
					this.server.log(`${user.username} tried joining invalid group ${Util.sanitize(groupId)}`);
					this.server.sendError(Errors.Error.INVALID_GROUP, remote);
					return Errors.Error.INVALID_GROUP;
				}
			} else {
				this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
				return Errors.Error.INVALID_LOGIN;
			}
			// no error codes returned, any final operations can be done here:
		}
	}

	removeFromGroup(message, offset, remote, token) {
		this.server.debug(token.id);
		if (token.id && this.users[token.id]?.groupId) {
			let user = this.users[token.id];
			let groupId = user.groupId;
			if (this.server.groups.groups[groupId].users[token.id]) {
				this.server.log(`[${id}] ${username} left group ${groupId}`);
				this.server.groups.removeUser(server, groupId, token.id);
				const packet = this.server.createPacket(Packets.Packet.GROUP_LEAVE);
				this.server.sendPacket(packet, remote);
			} else {
				// the user is not in a group
				this.server.sendError(Errors.Error.INVALID_GROUP, user.remote);
				return Errors.Error.INVALID_GROUP;
			}
		} else {
			// we can still tell their gui to update incase something weird happened
			const packet = this.server.createPacket(Packets.Packet.GROUP_LEAVE);
			this.server.sendPacket(packet, remote);
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

	updateJWT(userId) {
		if (this.users[userId]?.remote) {
			const remote = this.users[userId].remote;
			let jwt = this.users[userId].jwt = this.server.getJWT().sign({ id: userId }, Config.JWT_SECRET_KEY);
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
	}

	getUsers() {
		return this.users;
	}
}

module.exports = PropHuntUserList;
