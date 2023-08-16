/*
 *
 * For testing purposes, to be converted to Java for use in the RuneLite plugin later.
 *
 */

const dgram = require("dgram");
const Config = require("./Config.js");
const client = dgram.createSocket("udp4");

const serverPort = Config.SERVER_PORT;
const clientPort = serverPort + 1;

const serverAddress = "127.0.0.1";

const Packets = require("./Packets.js");
const Errors = require("./Errors.js");
const { group } = require("console");

// BEGIN USER_LOGIN

// END USER_LOGIN

function login(username, password, world) {
	let jwtToken = "false"; // false = not logged in

	let actionBuffer = Buffer.alloc(1);
	actionBuffer.writeUInt8(Packets.Packet.USER_LOGIN, 0);

	let jwtBuffer = Buffer.from(jwtToken, "utf8");
	let usernameBuffer = Buffer.from(username, "utf8");
	let passwordBuffer = Buffer.from(password, "utf8");

	let worldBuffer = Buffer.alloc(2);
	worldBuffer.writeUInt16BE(world, 0);

	let sizeBuffer = Buffer.from([jwtBuffer.length, usernameBuffer.length, passwordBuffer.length]);
	let packetBuffer = Buffer.concat([actionBuffer, sizeBuffer, jwtBuffer, usernameBuffer, passwordBuffer, worldBuffer]);

	sendPacket(packetBuffer);
}

login("davesnaothere", "fuc", 420);

var userId, jwt;
client.on("message", function (message, remote) {
	var offset = 0;
	const action = message.readUInt8(0);
	if (action < 0 || action > Packets.Packet.length) {
		this.serverLog("\x1b[31mUnsupported packet action: " + Packets.Packets[action]);
		return;
	}
	offset++;
	if (action == Packets.Packet.USER_GET_ID) {
		// received upon login
		var size = 1;
		data = Packets.utf8Serializer(message, size, offset, remote);
		offset = data.offset;
		var userDetails = data.data;

		jwt = userDetails[0];
	//	createGroup(jwt);
        joinGroup(jwt, "c2249ada-ae21-4437-97e4-508d33697bfe");
	} else if (action == Packets.Packet.ERROR_MESSAGE) {
		data = message.readUint16BE(1);
		if (Errors.Errors[data]) {
			console.log("ERROR RECV: " + Errors.Errors[data]);
		}
	}
});

function createGroup(jwt) {
   let packet = createPacket(Packets.Packet.GROUP_NEW, jwt);
   sendPacket(Buffer.concat(packet));
}

function joinGroup(jwt, groupId) {
	let actionBuffer = Buffer.alloc(1);
	actionBuffer.writeUInt8(Packets.Packet.GROUP_JOIN, 0);
	let jwtBuffer = Buffer.from(jwt, "utf8");
	let groupBuffer = Buffer.from(groupId, "utf8");
	let sizeBuffer = Buffer.from([jwtBuffer.length, groupBuffer.length]);

	let packetBuffer = Buffer.concat([actionBuffer, sizeBuffer, jwtBuffer, groupBuffer]);

	sendPacket(packetBuffer);
}


// TODO: make a packet "packer" 
function createPacket(packet, token) {
	let actionBuffer = Buffer.alloc(1);
	actionBuffer.writeUInt8(packet, 0);
	let jwtBuffer = Buffer.from(token, "utf8");
	let tokenSize = Buffer.from([jwtBuffer.length]);
	return [actionBuffer, tokenSize, jwtBuffer];
}

function sendPacket(buffer) {
	client.send(buffer, 0, buffer.length, serverPort, serverAddress, (err) => {
		if (err) {
			console.error("Error sending packet:", err);
		}
	});
}
