

export const Packet = {};
export const PlayerUpdate = {};

//TODO: RSA Encryption for all packets

export const Packets = [
	// order is protocol sensitive but that's ok , just share this list with the client.
	"USER_LOGIN",
	"USER_GET_JWT",
	"USER_LOGOUT",
	"LOGGED_OUT",

	"GROUP_NEW",
	"GROUP_JOIN",
	"GROUP_LEAVE",
	"GROUP_INFO",

	"GROUP_START_GAME", // TODO: Start the game
	"GROUP_END_GAME", // TODO: End the game
	"GROUP_SET_STAGE", // TODO: Set the play area

	"PLAYER_LIST",
	"PLAYER_UPDATE", // PLAYER_UPDATE opcode is followed by PlayerUpdate type found below

	"ERROR_MESSAGE",

	"MASTER_SERVER_POLL", 
	"MASTER_SERVER_LIST",
	"SERVER_INFO"
];

Packets.forEach((action, index) => {
	Packet[action] = index;
});

export const PlayerUpdates = ["MODEL", "LOCATION"];

PlayerUpdates.forEach((action, index) => {
	PlayerUpdate[action] = index;
});

export const utf8Deserialize = (message, size, offset, remote) => {
	const sizeBuffer = [];
	for (let i = 0; i < size; i++) {
		sizeBuffer.push(message.readUInt8(offset));
		offset += 1;
	}
	const data = [];
	for (const length of sizeBuffer) {
		const utf8String = message.toString("utf-8", offset, offset + length);
		data.push(utf8String);
		offset += length;
	}
	return { data, offset };
};

export const utf8Serialize = (buffer) => {
	const packet = [];
	let sizeBuffer = [];
	for (const data in buffer) {
		const buf = Buffer.from(data, "utf8");
		packet.push(buf);
		sizeBuffer.push(buf.length);
	}
	sizeBuffer = Buffer.from(sizeBuffer);
	return { data: packet, size: sizeBuffer };
};

export class PackMan {
	static createPacket(packet) {
		const opCodeBuffer = Buffer.alloc(1); // first byte is always the opcode 
		opCodeBuffer.writeUInt8(packet, 0);
		return [opCodeBuffer];
	}

	static sendPacket(server, packet, remote) {
		if(!remote.address || !remote.port) {
			return false;
		}

		packet = Buffer.concat(packet);
		server.send(packet, 0, packet.length, remote.port, remote.address, (err) => {
			if (err) {
				console.error("Error sending packet:", err);
			}
		});
	}
}

export default Packets;
