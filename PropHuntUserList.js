const dgram = require('dgram');
const Config = require('./Config.js');
var Util = require('./Util.js');
const Packets = require('./Packets.js');

class PropHuntUserList {
    login(thisValue, message, offset, remote) {
        var details = Packets.utf8Serializer(this, message, 3, offset, remote);
        var jwt = details.data[0];
        var username = details.data[1];
        var password = details.data[2];
        var worldNumber = message.readUInt16BE(details.offset);
        console.log(username, password, worldNumber, jwt);
    }
}

module.exports = PropHuntUserList;