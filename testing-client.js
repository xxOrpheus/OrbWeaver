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

	let sizeBuffer = Buffer.from([
		jwtBuffer.length,
		usernameBuffer.length,
		passwordBuffer.length,
	]);
	let packetBuffer = Buffer.concat([
		actionBuffer,
		sizeBuffer,
		jwtBuffer,
		usernameBuffer,
		passwordBuffer,
		worldBuffer,
	]);

	sendPacket(packetBuffer);
}

login("davesnothere", "fuc", 420);

var userId, jwt;
client.on("message", function (message, remote) {
	var offset = 0;
	const action = message.readUInt8(0);
	if (action < 0 || action > Packets.Packet.length) {
		this.serverLog(
			"\x1b[31mUnsupported packet action: " + Packets.Packets[action]
		);
		return;
	}
	offset++;
    console.log("Action: " + action);
	if (action == Packets.Packet.USER_GET_ID) {
		// received upon login
		var size = 2;
		data = Packets.utf8Serializer(message, size, offset, remote);
		offset = data.offset;
		var userDetails = data.data;
        
		jwt = userDetails[0];
		userId = userDetails[1];
        console.log("log:"+userId);
		createGroup(jwt, userId);
	} else if(action == Packets.Packet.ERROR_MESSAGE) {
        data = message.readUint16BE(1);
        if(Errors.Errors[data]) {
            console.log("ERROR RECV: " + Errors.Errors[data]);
        }
    }
});

function createGroup(jwt, userId) {
	let actionBuffer = Buffer.alloc(1);
	actionBuffer.writeUInt8(Packets.Packet.GROUP_NEW, 0);

	let jwtBuffer = Buffer.from(jwt, "utf8");
	let userIdBuffer = Buffer.from(userId, "utf8");

	let sizeBuffer = Buffer.from([jwtBuffer.length, userIdBuffer.length]);
	let packetBuffer = Buffer.concat([
		actionBuffer,
		sizeBuffer,
		jwtBuffer,
		userIdBuffer,
	]);
    console.log("createGroup" + packetBuffer.toString());
	sendPacket(packetBuffer);
}

function sendPacket(buffer) {
	client.send(buffer, 0, buffer.length, serverPort, serverAddress, (err) => {
		if (err) {
			console.error("Error sending packet:", err);
		} else {
			console.log("Packet sent successfully!");
		}
	});
}
