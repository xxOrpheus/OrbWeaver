import GroupList from "#group/GroupList";
import UserList from "#user/UserList";
import GameTick from "#world/GameTick";

import dgram from "dgram";
import Config from "#config/Config";
import Colors from '#config/Colors';

import Util from '#server/Util';
import * as Packets from "#server/Packets";
//import * as Errors from '#config/Errors';

import JWT from "jsonwebtoken";

class Server {
	// TODO: Implement AES encryption or some other standard
	packetTimes = new Map();

	server;
	users;
	groups;
	masterServerPoller = null;

	constructor() {
		this.server = dgram.createSocket("udp4");

		this.server.on("error", (error) => {
			this.#handleError(error);
		});

		this.server.on("message", (message, remote) => {
			this.handleMessage(message, remote);
		});

		this.server.on("listening", () => {
			Util.log("OrbWeaver server started");
			this.pollMasterServer();
		});

		this.server.bind(Config.SERVER_PORT);

		this.groups = new GroupList(this);
		this.users = new UserList(this);
		this.gametick = new GameTick(this);
	}
	
	pollMasterServer() {
		if (Config.POLL_MASTER_SERVER == true) {
			let remote = { address: Config.MASTER_SERVER, port: Config.MASTER_SERVER_PORT };
			Util.log(`${Colors.MAGENTA}Contacting master server... (${Colors.WHITE}${Config.MASTER_SERVER}:${Config.MASTER_SERVER_PORT}${Colors.MAGENTA})`);
			let packet = this.createPacket(Packets.Packet.MASTER_SERVER_POLL);
			this.sendPacket(packet, remote);
			this.sendServerInfo(remote);
			if(!this.masterServerPoller) {
				this.masterServerPoller = setInterval(() => this.pollMasterServer(), 30 * 60 * 1000);
			}
		}
	}

	sendServerInfo(remote) { // send basic information about this server: players online, player limit, and server name.
		let packet = this.createPacket(Packets.Packet.MASTER_SERVER_INFO);
		let serverName = Config.SERVER_NAME;
		if (serverName.length > 32) {
			serverName = serverName.substring(0, 32);
		}
		const bufferSize = 1 + 1 + 1 + Buffer.from(serverName).length; // 1 byte players online, 1 byte player limit, 1 byte server name length + server name
		const serverInfo = Buffer.alloc(bufferSize);
		let offset = 0;
		serverInfo.writeUInt8(this.users.length, offset);
		offset += 1;

		serverInfo.writeUInt8(Config.MAX_USERS_ONLINE, offset);
		offset += 1;

		serverInfo.writeUInt8(serverName.length, offset);
		offset += 1;

		serverInfo.write(serverName, offset, serverName.length, "utf8");

		packet.push(serverInfo);
		this.sendPacket(packet, remote);
	}

	// TODO: verify player integrity. an idea: create a hash of all players in the region and cross reference with that (i.e. compare it to other users hashes)?
	async handleMessage(message, remote) {
		try {
			if (message.length < 3) {
				this.debug(`${Colors.RED}Malformed packet: Insufficient data length`);
				return;
			}
			// TODO: throttle/rate limit packets
			let offset = 0;

			const opCode = message.readUInt8(0); // first byte is op code, it could probably be trimmed from the packet but we will leave it anyways
			if (opCode < 0 || opCode > Packets.Packet.length) {
				Util.log(`${Colors.RED}Unsupported packet action: ${opCode}`);
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
		} catch (error) {
			// TODO: should probably handle errors better for JWTs (expired? malformed? etc...)
			if (error.message === "jwt malformed") {
				return false;
			}
			console.error(error);
			return false;
		}
	}
}

export default Server;
