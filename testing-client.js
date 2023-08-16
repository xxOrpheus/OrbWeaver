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
login("daanvaothere", "password", 420);

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
		var size = 1;
		data = Packets.utf8Serializer(message, size, offset, remote);
		offset = data.offset;
		var userDetails = data.data;

		jwt = userDetails[0];
		//createGroup(jwt);
        console.log("my jwt" + jwt);
        //joinGroup(jwt, "4d3e8b0b-82ff-43ee-a110-e8a12f172e7c");
	} else if (action == Packets.Packet.ERROR_MESSAGE) {
		data = message.readUint16BE(1);
		if (Errors.Errors[data]) {
			console.log("ERROR RECV: " + Errors.Errors[data]);
		}
	}
});

function login(username, password, world) {
    var packet = createPacket(Packets.Packet.USER_LOGIN, "unauthorized");
    username = Buffer.from(username, "utf8");
	password = Buffer.from(password, "utf8");
    let loginSize = Buffer.from([username.length, password.length]);
	let worldBuffer = Buffer.alloc(2);
	worldBuffer.writeUInt16BE(world, 0);
    packet.push(loginSize, username, password, worldBuffer);
	sendPacket(packet);
}

function createGroup(jwt) {
   let packet = createPacket(Packets.Packet.GROUP_NEW, jwt);
   sendPacket(packet);
}

function joinGroup(jwt, groupId) {
    let packet = createPacket(Packets.Packet.GROUP_JOIN, jwt);
    groupId = Buffer.from(groupId, "utf8");
    let gidSize = Buffer.from([groupId.length]);
    packet.push(gidSize);
    packet.push(groupId);
	sendPacket(packet);
}

function createPacket(packet, token) {
	let actionBuffer = Buffer.alloc(1);
	actionBuffer.writeUInt8(packet, 0);
	let jwtBuffer = Buffer.from(token, "utf8");
	let tokenSize = Buffer.from([jwtBuffer.length]);
	return [actionBuffer, tokenSize, jwtBuffer];
}

function sendPacket(buffer) {
    buffer = Buffer.concat(buffer);
	client.send(buffer, 0, buffer.length, serverPort, serverAddress, (err) => {
		if (err) {
			console.error("Error sending packet:", err);
		}
	});
}
