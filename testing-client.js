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
messageBuffer.writeUInt8(packetAction, 0);

client.send(messageBuffer, 0, messageBuffer.length, serverPort, serverAddress, (err) => {
    if (err) {
        console.error('Error sending packet:', err);
    } else {
        console.log('Packet sent successfully!');
    }
});

/*
const tokenBuffer = Buffer.from(token, 'utf8');

const buffer = Buffer.alloc(3 + tokenBuffer.length + 2); // Action (1 byte) + JWT + UInt16BE (2 bytes)

buffer.writeUInt8(1, 0); // Replace 1 with your desired action

tokenBuffer.copy(buffer, 1); // Start copying at index 1

buffer.writeUInt16BE(numberToSend, 1 + tokenBuffer.length);
*/