const dgram = require('dgram');
const Config = require('./Config.js');
const client = dgram.createSocket('udp4');

const serverPort = Config.SERVER_PORT;
const clientPort = serverPort + 1;

const serverAddress = '127.0.0.1';

const Packets = require('./Packets.js');

const packet = Packets.Packets;

const packetAction = packet.USER_LOGIN;

// Create the JWT
const jwtToken = "false";

function generateRandomString(length) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_ ';
    let randomString = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        randomString += characters.charAt(randomIndex);
    }

    // Ensure the string doesn't start with a space
    if (randomString.charAt(0) === ' ') {
        randomString = randomString.substring(1);
    }

    // Ensure the string doesn't end with a space
    if (randomString.charAt(randomString.length - 1) === ' ') {
        randomString = randomString.substring(0, randomString.length - 1);
    }

    return randomString;
}

const randomStringLength = Math.floor(Math.random() * 12) + 4; // Minimum length of 4, maximum of 15 after removing leading or trailing space
//const username = generateRandomString(randomStringLength);
const username = "davesnothere";
const password = "fuck";
const world = 420;

// Construct the packet
const actionBuffer = Buffer.alloc(1);
actionBuffer.writeUInt8(packetAction, 0);

const jwtBuffer = Buffer.from(jwtToken, 'utf8');
const usernameBuffer = Buffer.from(username, 'utf8');
const passwordBuffer = Buffer.from(password, 'utf8');

const worldBuffer = Buffer.alloc(2);
worldBuffer.writeUInt16BE(world, 0);

const sizeBuffer = Buffer.from([jwtBuffer.length, usernameBuffer.length, passwordBuffer.length]);

const packetBuffer = Buffer.concat([actionBuffer, sizeBuffer, jwtBuffer, usernameBuffer, passwordBuffer, worldBuffer]);


client.send(packetBuffer, 0, packetBuffer.length, serverPort, serverAddress, (err) => {
    if (err) {
        console.error('Error sending packet:', err);
    } else {
        console.log('Packet sent successfully!');
    }
});

client.on("message", function (message, remote) {
    //console.log("recv msg" + message.toString());
    var offset = 0;
    const action = message.readUInt8(0);
    if (action < 0 || action > Packets.Packet.length) {
        this.serverLog("\x1b[31mUnsupported packet action: " + Packets.Packets[action]);
        return;
    }
    offset++;
    if (action == Packets.Packet.USER_GET_ID) {
        var size = 2;
        data = Packets.utf8Serializer(this, message, size, offset, remote);
        offset = data.offset;
        var userDetails = data.data;
    }
});