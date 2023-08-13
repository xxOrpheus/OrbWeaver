const dgram = require('dgram');
const Config = require('./Config.js');
const Packets = require('./Packets.js');

class PropHuntUserList {
    login(thisValue, message, offset, remote) {
        console.log("login " + JSON.stringify(message));

        const data = [];

        
        const sizeBuffer = [];

        const utf8StringLengths = [];
        for (var i = 0; i < 3; i++) {
            utf8StringLengths.push(message.readUInt8(offset));
            offset += 1;
        }
        console.log(offset);
        console.log(utf8StringLengths);
    
        const details = [];
        for (const length of utf8StringLengths) {
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