import GroupList from '#group/GroupList';
import UserList from '#user/UserList';
import GameTick from '#world/GameTick';

import dgram from 'dgram';
import Config from '#config/Config';
import * as Packets from '#server/Packets';
//import * as Errors from '#config/Errors';

import JWT from 'jsonwebtoken';


class Server {
	// TODO: Implement AES encryption or some other standard
	packetTimes = new Map();

	server;
	users;
	groups;

	constructor() {
		this.server = dgram.createSocket("udp4");

		this.server.on("error", (error) => {
			this.#handleError(error);
		});

		this.server.on("message", (message, remote) => {
			this.handleMessage(message, remote);
		});

		this.server.on("listening", () => {
			this.log("OrbWeaver server started");
		});

		this.server.bind(Config.SERVER_PORT);

		this.groups = new GroupList(this);
		this.users = new UserList(this);
		this.gametick = new GameTick(this);
	}

	async handleMessage(message, remote) {
		try {
			if (message.length < 3) {
				this.debug("\x1b[31mMalformed packet: Insufficient data length");
				return;
			}
			// TODO: throttle/rate limit packets
			let offset = 0;
			
			const opCode = message.readUInt8(0); // first byte is op code, it could probably be trimmed from the packet but we will leave it anyways 
			if (opCode < 0 || opCode > Packets.Packet.length) {
				this.log(`\x1b[31mUnsupported packet action: ${opCode}`);
				return;
			}

			offset++;
			let token = Packets.utf8Deserialize(message, 1, offset, remote); // the next part is the (token size+)JWT token, might not be signed so we handle that in the following calls 
			if (token.data.length > 0) {
				offset = token.offset;
				token = token.data[0];
				if (Packets.Packets[opCode] != null) {
					switch (opCode) {
						case Packets.Packet.USER_LOGIN:
							await this.users.login(message, offset, remote, token).then((res) => {
								//console.log(res);
							});
							break;

						case Packets.Packet.USER_LOGOUT:
							this.users.logout(message, offset, remote, token);
							break;

						case Packets.Packet.GROUP_NEW:
							this.groups.createGroup(message, offset, remote, token);
							break;

						case Packets.Packet.GROUP_JOIN:
							this.users.addToGroup(message, offset, remote, token);
							break;

						case Packets.Packet.GROUP_LEAVE:
							this.users.removeFromGroup(message, offset, remote, token);
							break;

						case Packets.Packet.PLAYER_UPDATE:
							this.gametick.enqueueUpdate(message, offset, remote, token);
							break;
					}
				}
			}
		} catch (error) {
			this.debug(error);
			console.error(error);
			// this.handleError ?
		}
	}

	createPacket(packet) {
		const opCodeBuffer = Buffer.alloc(1); // first byte is always the opcode 
		opCodeBuffer.writeUInt8(packet, 0);
		return [opCodeBuffer];
	}

	sendPacket(packet, remote) {
		packet = Buffer.concat(packet);
		this.server.send(packet, 0, packet.length, remote.port, remote.address, (err) => {
			if (err) {
				console.error("Error sending packet:", err);
			}
		});
	}

	sendError(error, remote) {
		if (remote?.address && remote.port) {
			const action = Buffer.alloc(1);
			action.writeUInt8(Packets.Packet.ERROR_MESSAGE); 
			const msg = Buffer.alloc(2);
			msg.writeUInt16BE(error); // the error code is translated by the list of constants/enums in Errors.js/java
			const buffer = [action, msg];
			this.sendPacket(buffer, remote);
		} else {
			return false;
		}
	}

	#handleError(error) {
		// i can fix her
		this.debug(error);
	}

	log(message) {
		const timestamp = new Date().toISOString();
		console.log(`[\x1b[34m${timestamp}\x1b[39m]: \x1b[32m${message}\x1b[39m`);
	}

	debug(message) {
		if(Config.VERBOSITY > 1) {
			let line = "";
			if(message.stack) { // get the line the error occured on 
				line = message.stack.split('\n')[1].trim() + ": ";
			}
			this.log(`\x1b[34m[DEBUG]\x1b[31m ${line}\x1b[33m${message}`);
		}
	}

	getGroups() {
		return this.groups;
	}

	getUsers() {
		return this.users;
	}

	getJWT() {
		return JWT;
	}

	verifyJWT(jwt) {
		try {
			return this.getJWT().verify(jwt, Config.JWT_SECRET_KEY);
		} catch (error) { // TODO: should probably handle errors better for JWTs (expired? malformed? etc...)
			if (error.message === "jwt malformed") {
				return false;
			}
			console.error(error);
			return false;
		}
	}
}

export default Server;
