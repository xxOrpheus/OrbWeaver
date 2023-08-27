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
const Props = require("./Props.js");
const Errors = require("./Errors.js");
const { group } = require("console");

// BEGIN USER_LOGIN

// END USER_LOGIN
login("booty", "password", 420);

var userId, jwt, groupId;
client.on("message", function (message, remote) {
	let offset = 0;
	const action = message.readUInt8(0);
	console.log('Received packet data:', message.toString('utf8'));
	if (action < 0 || action > Packets.Packet.length) {
		this.serverLog("\x1b[31mUnsupported packet action: " + Packets.Packets[action]);
		return;
	}
	offset++;
	if (action == Packets.Packet.USER_GET_JWT) {
		let size = 1;
		let data = Packets.utf8Serializer(message, size, offset, remote);
		offset = data.offset;
		let userDetails = data.data;

		jwt = userDetails[0];
		//createGroup(jwt);
		//setProp(jwt, Props.Prop.WORLD_OBJECT, 1234);
		joinGroup(jwt, "bac37511-95cc-4de4-b62f-0d01ca99de70");
		console.log("my jwt" + jwt);
		//leaveGroup(jwt);
	} else if (action == Packets.Packet.ERROR_MESSAGE) {
		data = message.readUint16BE(offset);
		if (Errors.Errors[data]) {
			console.log("ERROR RECV: " + Errors.Errors[data]);
		}
	} else if (action == Packets.Packet.PLAYER_UPDATES) {
		let users = [];
		let buffer = message.slice(1, message.length);
		let updateOffset = 0;
		while (updateOffset < buffer.length) {
			let user = {};
			user.propId = buffer.readUInt16BE(updateOffset);
			updateOffset += 2;
			user.propType = buffer.readUInt8(updateOffset);
			updateOffset++;
			user.orientation = buffer.readUInt8(updateOffset);
			updateOffset++;
			user.team = buffer.readUInt8(updateOffset);
			updateOffset++;
			user.status = buffer.readUInt8(updateOffset);
			updateOffset++;
			let nameLength = buffer.readUInt8(updateOffset);
			updateOffset++;
			user.username = buffer.toString("utf-8", updateOffset, updateOffset + nameLength);
			updateOffset += nameLength;
			users.push(user);
		}
	} else if (action == Packets.Packet.GROUP_INFO) {
		groupId = message.readUInt16BE(offset);
		offset += 2;
		console.log("recv group info (id " + groupId + ")");
	} else if (action == Packets.Packet.GROUP_LEAVE) {
		console.log("removed from group");
	} else {
		console.log("Unknown MSG recv: ", JSON.stringify(message), "action " + action);
	}
});

function login(username, password, world) {
	var packet = createPacket(Packets.Packet.USER_LOGIN, "unauthorized");
	username = Buffer.from(username, "utf8");
	password = Buffer.from(password, "utf8");
	let sizeBuffer = Buffer.from([username.length, password.length]);
	let worldBuffer = Buffer.alloc(2);
	worldBuffer.writeUInt16BE(world, 0);
	packet.push(sizeBuffer, username, password, worldBuffer);
	sendPacket(packet);
}

function createGroup(jwt) {
	let packet = createPacket(Packets.Packet.GROUP_NEW, jwt);
	sendPacket(packet);
	console.log("createGroup called");
}

function setProp(jwt, propType, propId) {
	let packet = createPacket(Packets.Packet.PLAYER_PROP, jwt);
	let propTypeBuffer = Buffer.alloc(1);
	propTypeBuffer.writeUInt8(propType);
	let propIdBuffer = Buffer.alloc(2);
	propIdBuffer.writeUInt16BE(propId, 0);
	packet.push(gidSize, groupId, propId);
	sendPacket(packet);
}

function joinGroup(jwt, groupId) {
	let packet = createPacket(Packets.Packet.GROUP_JOIN, jwt);
	groupId = Buffer.from(groupId, "utf8");
	let gidSize = Buffer.from([groupId.length]);
	packet.push(gidSize, groupId);
	sendPacket(packet);
}

function leaveGroup(jwt) {
	let packet = createPacket(Packets.Packet.GROUP_LEAVE, jwt);
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
