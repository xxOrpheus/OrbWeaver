const dgram = require('dgram');
const Config = require('./Config.js');
var Util = require('./Util.js');
const Packets = require('./Packets.js');
const PropHuntUser = require('./PropHuntUser.js');
const jsonwebtoken = require('jsonwebtoken');

class PropHuntUserList {
    userList = {};

    async login(thisValue, message, sizeBuffer, offset, remote) {
        var details = Packets.utf8Serializer(this, message, sizeBuffer, offset, remote);
        if (details.data.length >= sizeBuffer) {
            var jwt = (details.data[0].toLowerCase().trim());
            var username = details.data[1];
            if (Util.isValidName(username)) {
                var password = details.data[2];
                var worldNumber = details.data[3] = message.readUInt16BE(details.offset);
                if (jwt.toLowerCase() === 'false' || !jwt) {
                    let user = new PropHuntUser(username, password, worldNumber);
                    this.userList[user.id] = user;
                    await this.userList[user.id].setPassword(password).then((result) => {
                        this.userList[user.id].jwt = jsonwebtoken.sign({"id": user.id, "username": user.username}, Config.JWT_SECRET_KEY);
                    });
                } else {
                    // already logged in
                }
            }
        }
    }

    getUsers() {
        return this.userList;
    }
}

module.exports = PropHuntUserList;