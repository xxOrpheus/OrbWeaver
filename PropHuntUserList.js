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
		if(!this.needsUpdate[userId]) { // only need to update once per queue
			if(!this.users[userId]) {
				return Errors.Error.INVALID_USER_ID;
			}
			this.needsUpdate.push(userId);
		}
		return true;
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
								return Errors.Error.INVALID_PASSWORD;
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
									return Errors.Error.INVALID_LOGIN;
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
						return Errors.Error.INVALID_LOGIN;
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
							this.server.log(`[${userId}] ${username} has logged in (World ${worldNumber})`);
							this.sendJWT(this.users[userId].jwt, remote);
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
			}
		} catch (error) {
			this.server.sendError(Errors.Error.INVALID_LOGIN, remote);
			console.debug(error);
			return Errors.Error.INVALID_LOGIN;
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
		if (token.id && this.groupId != null) {
			if (this.server.groups.groups[this.groupId].users[this.id]) {
				this.server.log(`[${this.id}] ${this.username} left group ${this.groupId}`);
				const packet = this.server.createPacket(Packets.Packet.GROUP_LEAVE);
				this.server.sendPacket(packet, remote);
				this.server.groups.removeUser(server, this.groupId, this.id);
			} else {
				// the user is not in a group
				this.server.sendError(Errors.Error.INVALID_GROUP, remote);
			}
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
