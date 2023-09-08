import Config from "#config/Config";
import {Errors, Error} from "#config/Errors";
import * as Packets from "#server/Packets";
import Util from "#server/Util";
import User from "#user/User";


export class UserLogin {
	static async submit(server, message, offset, remote, token) {
		try {
			// check if the server is full before proceeding.
			if (server.users.users.length + 1 >= Config.MAX_USERS_ONLINE) {
				server.sendError(Error.SERVER_FULL, remote);
				return Error.SERVER_FULL;
			}

			const size = 2; //read username, password  (utf8)
			const loginDetails = Packets.utf8Deserialize(message, size, offset, remote);
			let userId, worldNumber;
			offset = loginDetails.offset;
			if (loginDetails.data.length >= size) {
				const username = loginDetails.data[0].toLowerCase().trim();
				const password = loginDetails.data[1];
				const playerOnline = server.users.playerOnline(username);
				if (playerOnline != false) {
					return await Util.verifyPasscode(playerOnline.password, password).then(
						function (result) {
							if (result == false) {
								server.sendError(Error.INVALID_PASSWORD, remote);
								return Error.INVALID_PASSWORD;
							} else {
								let inactive = Util.currentTime() - playerOnline.active > Config.LOGOUT_TIMER == true;
								// verify them if they still have the JWT token from the previous session, or bypass the token if they have been inactive
								if (server.verifyJWT(token)?.id == playerOnline.id || inactive) {
									if (inactive) {
										users.updateJWT(userId);
									}
									// not sure if this matters but it won't hurt
									server.users.users[playerOnline.id].remote = remote;
									userId = playerOnline.id;
									worldNumber = playerOnline.worldNumber;
									// if they're in a group they should receive the group info again
									if (playerOnline.groupId != null && server.groups.groups[playerOnline.groupId] != null) {
										server.groups.sendUserList(playerOnline.id, playerOnline.groupId);
										server.groups.sendGroupInfo(playerOnline.id, playerOnline.groupId);
									}
								} else {
									server.sendError(Error.INVALID_LOGIN, remote);
									return Error.INVALID_LOGIN;
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
    if (server.verifyJWT(token)) {
    server.sendError(Error.INVALID_LOGIN, remote);
    return Error.INVALID_LOGIN;
    } // make sure it is a valid world too
    else */

					if (Util.isValidWorld(worldNumber)) {
						const user = new User(username, worldNumber);
						userId = user.id;
						// cycle numeric id's for use in packets to save bandwidth vs sending the username
						const numericId = server.users.recycledIDs.length > 0 ? server.users.recycledIDs.shift() : server.users.nextId++;
						user.numericId = numericId;
						// map numeric id's to uuid's so we don't have to do complex looping
						server.users.uuidMap[numericId] = userId;
						server.users.users[userId] = user;
						server.users.users[userId].remote = remote;
						server.users.usersOnline[username] = userId;

						await server.users.users[userId].setPassword(password).then((result) => {
							server.users.updateJWT(userId);
						});
					} else {
						server.sendError(Error.INVALID_WORLD, remote);
						return Error.INVALID_WORLD;
					}
				} else {
					Util.log(`invalid name ${JSON.stringify(username)}`);
					server.sendError(Error.INVALID_NAME, remote);
					return Error.INVALID_NAME;
				}
				// no error code was returned, we can safely do any final operations here:
				server.users.usersOnlineCount++;
				Util.log(`[${userId}] ${username} has logged in (World ${worldNumber})`);
			}
		} catch (error) {
			server.sendError(Error.INVALID_LOGIN, remote);
			console.debug(error);
			return Error.INVALID_LOGIN;
		}
	}
}

export default UserLogin;
