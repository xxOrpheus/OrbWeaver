import * as Errors from "#config/Errors";
import Util from "#server/Util";

class UserLogout {
	static submit(server, message, offset, remote, token) {
		const verify = server.verifyJWT(token);
		if (verify?.id) {
			const userId = verify.id;
			if (!server.users.users[userId]) {
				Util.debug("a user tried logging out but was never logged in!");
				return Errors.Error.INVALID_LOGIN;
			}
			if (server.users.users[userId].numericId > -1) {
				const numericId = server.users.users[userId].numericId;
				// delete the numeric id so it can be reused in the recycler
				delete server.users.uuidMap[numericId];
				server.users.recycledIDs.push(numericId);
			}
			if (server.users.users[userId].regionId) {
				const regionId = server.users.users[userId].regionId;
				// remove them from the regionMap so no further updates are attempted
				if (server.users.regionMap[regionId]?.[userId]) {
					delete server.users.regionMap[regionId][userId];
				}
			}
			let username = server.users.users[userId].username;
			delete server.users.usersOnline[username];
			delete server.users.users[userId];
            Util.log(username + " has logged out");
		}
	}
}

export default UserLogout;