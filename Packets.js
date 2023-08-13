const dgram = require('dgram');
const Config = require('./Config.js');
var Util = require('./Util.js');
const Packet = {};

const Packets = [ // order is protocol sensitive but that's ok , just share this list with the client.
    "USER_LOGIN",
    "USER_GET_ID",
    "USER_LOGOUT",
    "ALREADY_LOGGED_IN",

    "GROUP_NEW",
    "GROUP_JOIN",
    "GROUP_START_GAME",
    "GROUP_END_GAME",
    "GROUP_SET_STAGE",
    "GROUP_NOTIFY",

    "PLAYER_PROP",
    "PLAYER_LOCATION",
    "PLAYER_ORIENTATION",
    "PLAYER_NOTIFY"
];

Packets.forEach((action, index) => {
    Packet[action] = index;
});

utf8Serializer = function(thisValue, message, size, offset, remote) {
    const sizeBuffer = [];
    for (var i = 0; i < size; i++) {
        sizeBuffer.push(message.readUInt8(offset));
        offset += 1;
    }
    const data = [];
    for (const length of sizeBuffer) {
        const utf8String = message.toString('utf-8', offset, offset + length);
        data.push(utf8String);
        offset += length;
    }
    return {data, offset};

}

module.exports = {Packets, Packet, utf8Serializer};