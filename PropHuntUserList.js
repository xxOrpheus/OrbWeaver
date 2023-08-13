const dgram = require('dgram');
const Config = require('./Config.js');
const Packets = require('./Packets.js');

class PropHuntUserList {
    login(thisValue, message, offset, remote) {
        const data = [];

        const sizeBuffer = [];
        for (var i = 0; i < 3; i++) {
            sizeBuffer.push(message.readUInt8(offset));
            offset += 1;
        }
    
        const details = [];
        for (const length of sizeBuffer) {
            const utf8String = message.toString('utf-8', offset, offset + length);
            details.push(utf8String);
            offset += length;
        }
    
        const worldNumber = message.readUInt16BE(offset);
        details[3] = worldNumber;

    
        if(details.length > 3) {
            let jwtToken = details[0];
            let username = details[1];
            let password = details[2];
            let worldNumber = details[3];

            // woo
        }

    }
}

module.exports = PropHuntUserList;