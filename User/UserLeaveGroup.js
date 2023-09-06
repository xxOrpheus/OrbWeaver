import * as Errors from "#config/Errors";
import * as Packets from "#server/Packets";
import Util from "#server/Util";

class UserLeaveGroup {
	static submit(server, message, offset, remote, token) {
		token = server.verifyJWT(token);
		if (token.id && server.users.users[token.id]?.groupId) {
			// check the token for the id, make sure the user is in a group first
			let user = server.users.users[token.id];
			let groupId = user.groupId;
           //s Util.debug(JSON.stringify(server.groups.groups[groupId].includes(user.id)));
			if (server.groups.groups[groupId].users[token.id]) {
				// verify they're in the group before attempting to remov e them
				let username = server.users.users[token.id].username;
				Util.log(`[${token.id}] ${username} left group ${groupId}`);
				server.groups.removeUser(groupId, token.id);
				const packet = server.createPacket(Packets.Packet.GROUP_LEAVE);
				server.sendPacket(packet, remote);
			} else {
				// the user is not in a group
				server.sendError(Errors.Error.INVALID_GROUP, user.remote);
				return Errors.Error.INVALID_GROUP;
			}
		} else {

			// we can still tell their gui to update incase something weird happened
			const packet = server.createPacket(Packets.Packet.GROUP_LEAVE);
			server.sendPacket(packet, remote);
		}
	}
}

export default UserLeaveGroup;
