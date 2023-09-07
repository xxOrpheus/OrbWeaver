import dgram from "dgram";
import * as Packets from "#server/Packets";
import Util from "#server/Util";
import Colors from '#config/Colors';
import MasterServerConfig from "#masterserver/MasterServerConfig";
import crypto from "crypto";

class MasterServer {
	servers;

	constructor() {
		this.server = dgram.createSocket("udp4");

		this.server.on("error", (error) => {
			this.handleError(error);
		});

		this.server.on("message", (message, remote) => {
			this.handleMessage(message, remote);
		});
		
		this.server.on("listening", () => {
			Util.log("OrbWeaver master server listening on port " + MasterServerConfig.SERVER_PORT);
		});

		this.server.bind(MasterServerConfig.SERVER_PORT);
		this.servers = new Map();
		this.packetCount = new Map();

		this.serverCleanup = setInterval(() => this.removeInactiveServers(), MasterServerConfig.INACTIVE_SERVER_TIME);
	}
	
	removeInactiveServers() {
		let currentTime = Util.currentTime();
		this.servers.forEach((lastPollTime, serverHash) => {
			if (currentTime - lastPollTime > MasterServerConfig.INACTIVE_SERVER_TIME) {
				this.servers.delete(serverHash);
			}
		});
	}

	sanitizeServerName(serverName) {
		const allowedCharsPattern = /[^a-zA-Z0-9!'-_ ]/g;
		return serverName.replace(allowedCharsPattern, "");
	}

	generateServerHash(ipAddress) {
		const hash = crypto.createHash("sha256");
		hash.update(ipAddress);
		return hash.digest("hex");
	}

	handleMessage(message, remote) {
		if (this.isRateLimited(remote.address)) {
			return;
		}
		let offset = 0;
		const opCode = message.readUInt8(offset);
		offset++;
		switch (opCode) {
			case Packets.Packet.MASTER_SERVER_POLL: // sent by a server who wishes to register on the master server
				let serverAddress = remote.address + ":" + remote.port;
				if (this.servers.get(serverAddress) == null) {
					Util.log(`${Colors.YELLOW}Orb@${JSON.stringify(serverAddress)} has been registered`);
				}
				let serverHash = this.generateServerHash(serverAddress);
				this.servers.set(serverHash, Util.currentTime());
				break;

			case Packets.Packet.MASTER_SERVER_LIST: // received by players browsing for servers
				let totalSize = 0;
				let servers = [];
				let packet = PackMan.createPacket(Packets.Packet.MASTER_SERVER_LIST);
				for (const server of this.servers) {
					let size = server.length;
					totalSize += size;
					let serverBuffer = Buffer.alloc(1 + size);
					serverBuffer.writeUInt8(size, 0);
					serverBuffer.write(server, 1);
					servers.push(serverBuffer);
				}
				packet.push(Buffer.concat(servers));
				PackMan.sendPacket(this.server, packet, remote);
				break;
		}
	}

	isRateLimited(address) {
		const currentTime = Date.now();
		if (!this.packetCount.has(address)) {
			this.packetCount.set(address, []);
		}

		const messages = this.packetCount.get(address);
		messages.push(currentTime);

		while (messages.length > 0 && currentTime - messages[0] > MasterServerConfig.RATE_LIMIT_WINDOW) {
			messages.shift();
		}

		if (messages.length > MasterServerConfig.RATE_LIMIT_THRESHOLD) {
			return true;
		}

		return false;
	}

	handleError(error) {
		Util.debug(error);
	}

}

export default MasterServer;