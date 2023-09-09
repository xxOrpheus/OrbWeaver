import Config from "#config/Config";
import Util from "#server/Util";
import * as Packets from "#server/Packets";
import {Errors, Error} from "#config/Errors";

import UserLogin from "#user/UserLogin";
import UserLogout from "#user/UserLogout";
import UserJoinGroup from "#user/UserJoinGroup";
import UserLeaveGroup from "#user/UserLeaveGroup";

class UserList {
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
		this.usersOnlineCount = 0; // use a separate variable to keep track so we don't have to do costly array calculations
		this.users = [];
	}

	setNeedsUpdate(userId) {
		if (!this.needsUpdate[userId]) {
			// only need to update once per queue
			if (!this.users[userId]) {
				return Error.INVALID_USER_ID;
			}
			this.needsUpdate.push(userId);
		}
		return true;
	}

	async login(message, offset, remote, token) {
		await UserLogin.submit(this.server, message, offset, remote, token).then((result) =>{
			return result;
		});
	}

	logout(message, offset, remote, token) {
		return UserLogout.submit(this.server, message, offset, remote, token);
	}

	joinGroup(message, offset, remote, token) {
		return UserJoinGroup.submit(this.server, message, offset, remote, token);
	}

	leaveGroup(message, offset, remote, token) {
		return UserLeaveGroup.submit(this.server, message, offset, remote, token);
	}

	playerOnline(username) {
		username = username.toLowerCase().trim();
		if (this.usersOnline[username] && this.users[this.usersOnline[username]]) {
			return this.users[this.usersOnline[username]];
		} else {
			return false;
		}
	}

	updateJWT(userId) {
		if (this.users[userId]?.remote) {
			const remote = this.users[userId].remote;
			let jwt = (this.users[userId].jwt = this.server.getJWT().sign({ id: userId }, Config.JWT_SECRET_KEY));
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

export default UserList;
