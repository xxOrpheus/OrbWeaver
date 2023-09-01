/*
 *
 * For testing purposes, to be converted to Java for use in the RuneLite plugin later.
 *
 */

const dgram = require("dgram");
const Config = require("./Config.js");
const Util = require("./Util.js");
const client = dgram.createSocket("udp4");
const serverPort = Config.SERVER_PORT;
const serverAddress = "127.0.0.1";
const Packets = require("./Packets.js");
const Errors = require("./Errors.js");

// BEGIN USER_LOGIN

// END USER_LOGIN
login("booty", "password", 420);
//const location = Util.worldPoint(1234,5678,9012);
//const masked = Util.maskLocation(location, 512);
//const unmasked = Util.unmaskLocation(masked);

//console.log(unmasked);
let jwt;
let groupId;
client.on("message", function (message, remote) {
	let offset = 0;
	const action = message.readUInt8(0);
	console.log("Received packet data:", message.toString("utf8"));
	if (action < 0 || action > Packets.Packet.length) {
		this.serverLog(`\x1b[31mUnsupported packet action: ${Packets.Packets[action]}`);
		return;
	}
	offset++;
	if (action == Packets.Packet.USER_GET_JWT) {
		const size = 1;
		const data = Packets.utf8Deserialize(message, size, offset, remote);
		offset = data.offset;
		const userDetails = data.data;

		jwt = userDetails[0];
		//createGroup(jwt);
		//setProp(jwt, Props.Prop.WORLD_OBJECT, 1234);
		//joinGroup(jwt, "bac37511-95cc-4de4-b62f-0d01ca99de70");
		console.log(`my jwt${jwt}`);
		updateLocation(1234, 3456, 1, 512);
		//leaveGroup(jwt);
	} else if (action == Packets.Packet.ERROR_MESSAGE) {
		data = message.readUint16BE(offset);
		if (Errors.Errors[data]) {
			console.log(`ERROR RECV: ${Errors.Errors[data]}`);
		}
	} else if (action == Packets.Packet.PLAYER_UPDATE) {
	} else if (action == Packets.Packet.GROUP_INFO) {
		groupId = message.readUInt16BE(offset);
		offset += 2;
		console.log(`recv group info (id ${groupId})`);
	} else if (action == Packets.Packet.GROUP_LEAVE) {
		console.log("removed from group");
	} else {
		console.log("Unknown MSG recv: ", JSON.stringify(message), `action ${action}`);
	}
});

function login(username, password, world) {
	const packet = createPacket(Packets.Packet.USER_LOGIN, "unauthorized");
	username = Buffer.from(username, "utf8");
	password = Buffer.from(password, "utf8");
	const sizeBuffer = Buffer.from([username.length, password.length]);
	const worldBuffer = Buffer.alloc(2);
	worldBuffer.writeUInt16BE(world, 0);
	packet.push(sizeBuffer, username, password, worldBuffer);
	sendPacket(packet);
}

function createGroup(jwt) {
	const packet = createPacket(Packets.Packet.GROUP_NEW, jwt);
	sendPacket(packet);
	console.log("createGroup called");
}

function setProp(jwt, propType, propId) {
	const packet = createPacket(Packets.Packet.PLAYER_PROP, jwt);
	const propTypeBuffer = Buffer.alloc(1);
	propTypeBuffer.writeUInt8(propType);
	const propIdBuffer = Buffer.alloc(2);
	propIdBuffer.writeUInt16BE(propId, 0);
	packet.push(gidSize, groupId, propId);
	sendPacket(packet);
}

function joinGroup(jwt, groupId) {
	const packet = createPacket(Packets.Packet.GROUP_JOIN, jwt);
	groupId = Buffer.from(groupId, "utf8");
	const gidSize = Buffer.from([groupId.length]);
	packet.push(gidSize, groupId);
	sendPacket(packet);
}

function leaveGroup(jwt) {
	const packet = createPacket(Packets.Packet.GROUP_LEAVE, jwt);
	sendPacket(packet);
}

function updateLocation(x, y, z, orientation) {
	const packet = createPacket(Packets.Packet.PLAYER_UPDATE, jwt);
	let updateBuffer = Buffer.alloc(1 + 2 + 2 + 1 + 2); // 2 x 2 y 1 z 2 orientation

	updateBuffer.writeUInt8(Packets.PlayerUpdate.LOCATION);
	updateBuffer.writeUInt16BE(x, 1);
	updateBuffer.writeUInt16BE(y, 3);
	updateBuffer.writeUInt8(z, 5);
	updateBuffer.writeUInt16BE(orientation, 6);

	packet.push(updateBuffer);

	console.log("location");
	console.log(x, y, z, orientation);

	sendPacket(packet);
}

function createPacket(packet, token) {
	const actionBuffer = Buffer.alloc(1);
	actionBuffer.writeUInt8(packet, 0);
	const jwtBuffer = Buffer.from(token, "utf8");
	const tokenSize = Buffer.from([jwtBuffer.length]);
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
