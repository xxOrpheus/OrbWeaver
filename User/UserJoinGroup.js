import * as Errors from "#config/Errors";
import * as Packets from "#server/Packets";
import Util from "#server/Util";

class UserJoinGroup {
    static submit(server, message, offset, remote, token) {
        token = server.verifyJWT(token);
		const sizeBuffer = 1; //read groupId
		const groupDetails = Packets.utf8Deserialize(message, sizeBuffer, offset, remote);
		offset = groupDetails.offset;
		if (!(token && groupDetails.data.length >= sizeBuffer)) {
			return Errors.Error.INVALID_GROUP;
		}
		const groupId = groupDetails.data[0];
		let authorized = true; // default true, only subject to change if group.locked == true
		if (token?.id) {
			if (server.getUsers().users[token.id]) {
				const user = server.getUsers().users[token.id];
				if (server.groups.groups[groupId]) {
					// if the group is locked try to verify the password
					if (server.groups.groups[groupId].locked == true) {
						// authorize the user to join the game
						authorized = Util.verifyPasscode(server.groups.groups[groupId].password, passwordInput);
						const passwordSize = message.readUInt16BE(offset);
						offset += 2;
						const passwordInput = Packets.utf8Deserialize(message, passwordSize, offset, remote);
						offset = passwordInput.offset;
					}

					if (authorized) {
						if (server.groups.groups[groupId].users[user.id]) {
							// the user is already in the group
							server.sendError(Errors.Error.ALREADY_IN_GROUP, remote);
							return Errors.Error.ALREADY_IN_GROUP;
						} else {
							Util.log(`${user.username} joined group ${groupId}`);
							server.groups.addUser(groupId, token.id);
						}
					} else {
						server.sendError(Errors.Error.INVALID_PASSWORD, remote);
						return Errors.Error.INVALID_PASSWORD;
					}
				} else {
					Util.log(`${user.username} tried joining invalid group ${Util.sanitize(groupId)}`);
					server.sendError(Errors.Error.INVALID_GROUP, remote);
					return Errors.Error.INVALID_GROUP;
				}
			} else {
				server.sendError(Errors.Error.INVALID_LOGIN, remote);
				return Errors.Error.INVALID_LOGIN;
			}
			// no error codes returned, any final operations can be done here:
		}
    }
}

export default UserJoinGroup;