const Packet = {};
const PlayerUpdate = {};

//TODO: RSA Encryption for all packets

const Packets = [
	// order is protocol sensitive but that's ok , just share this list with the client.
	"USER_LOGIN",
	"USER_GET_JWT",
	"USER_LOGOUT", // TODO: Logout

	"GROUP_NEW",
	"GROUP_JOIN",
	"GROUP_LEAVE",
	"GROUP_USERS",
	"GROUP_INFO",
	"GROUP_START_GAME", // TODO: Start the game
	"GROUP_END_GAME", // TODO: End the game
	"GROUP_SET_STAGE", // TODO: Set the play area
	"GROUP_NOTIFY", // TODO: Periodically update the group's last active time (likely based off of setting updates or a player update)
	"PLAYER_LIST",
	"PLAYER_UPDATE", // all update_ packets are sent with player_update packet
	"PLAYER_NOTIFY", // TODO: Periodically update the player's last active time

	"ERROR_MESSAGE",
];

Packets.forEach((action, index) => {
	Packet[action] = index;
});

const PlayerUpdates = ["PROP", "LOCATION", "TEAM", "STATUS"];

PlayerUpdates.forEach((action, index) => {
	PlayerUpdate[action] = index;
});

utf8Deserialize = (message, size, offset, remote) => {
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

utf8Serialize = (buffer) => {
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

module.exports = { Packets, Packet, PlayerUpdates, PlayerUpdate, utf8Deserialize, utf8Serialize };
