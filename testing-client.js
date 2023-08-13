const dgram = require('dgram');
const Config = require('./Config.js');
const client = dgram.createSocket('udp4');

const serverPort = Config.SERVER_PORT;
const clientPort = serverPort + 1;

const serverAddress = '127.0.0.1';

const Packets = require('./Packets.js');

const packet = Packets.Packets;

const packetAction = packet.USER_LOGIN;

const messageBuffer = Buffer.alloc(1);
// Create the JWT
const jwtToken = "false";
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