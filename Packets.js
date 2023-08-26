const dgram = require("dgram");
const Config = require("./Config.js");
const Packet = {};

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

	"PLAYER_PROP", // TODO: Set the player's prop
	"PLAYER_LOCATION", // TODO: Update the player's location
	"PLAYER_ORIENTATION", // TODO: Update the player's orientation
	"PLAYER_NOTIFY", // TODO: Periodically update the player's last active time

	"ERROR_MESSAGE",
];

Packets.forEach((action, index) => {
	Packet[action] = index;
});

utf8Serializer = function (message, size, offset, remote) {
	// TODO: Can we some how make this update the original offset reference to avoid manually trying to manage offsets? Maybe a bad idea though
	const sizeBuffer = [];
	for (var i = 0; i < size; i++) {
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

utf8Serialize = function (buffer) {
	let packet = [],
		sizeBuffer = [];
	for (const data in buffer) {
		let buf = Buffer.from(data, "utf8");
		packet.push(buf);
		sizeBuffer.push(buf.length);
	}
	sizeBuffer = Buffer.from(sizeBuffer);
	return { data: packet, size: sizeBuffer };
};

module.exports = { Packets, Packet, utf8Serializer, utf8Serialize };
