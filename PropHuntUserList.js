const dgram = require('dgram');
const Config = require('./Config.js');
var Util = require('./Util.js');
const Packets = require('./Packets.js');
const PropHuntUser = require('./PropHuntUser.js');
const jsonwebtoken = require('jsonwebtoken');

class PropHuntUserList {
    users = {};

    async login(thisValue, message, offset, remote) {
        var sizeBuffer = 3; //read jwt, username, password  (utf8)
        var loginDetails = Packets.utf8Serializer(this, message, sizeBuffer, offset, remote);

        if (loginDetails.data.length >= sizeBuffer) {
            var jwt = (loginDetails.data[0].toLowerCase().trim());
            var username = loginDetails.data[1];
            if (!this.playerOnline(username)) {
                if (Util.isValidName(username)) {
                    var password = loginDetails.data[2];
                    var worldNumber = loginDetails.data[3] = message.readUInt16BE(loginDetails.offset);
                    if (jwt.toLowerCase() === 'false' || !jwt) {
                        let user = new PropHuntUser(username, password, worldNumber);
                        this.users[user.id] = user;
                        await this.users[user.id].setPassword(password).then((result) => {
                            this.users[user.id].jwt = jsonwebtoken.sign({ "id": user.id, "username": user.username }, Config.JWT_SECRET_KEY);
                            thisValue.serverLog(username + " has logged in " + user.id);
                            // send their user id and jwt
                            const actionBuffer = Buffer.alloc(1);
                            actionBuffer.writeUInt8(Packets.Packet.USER_GET_ID, 0);

                            const jwtBuffer = Buffer.from(this.users[user.id].jwt, 'utf8');
                            const uidBuffer = Buffer.from(user.id, 'utf8');

                            const sizeBuffer = Buffer.from([jwtBuffer.length, uidBuffer.length]);

                            const packetBuffer = Buffer.concat([actionBuffer, sizeBuffer, jwtBuffer, uidBuffer]);;

                            thisValue.server.send(packetBuffer, 0, packetBuffer.length, remote.port, remote.address, (err) => {
                                if (err) {
                                    console.error('Error sending response:', err);
                                }
                            });
                        });
                    } else {
                        thisValue.serverLog("jwt has already been set");
                        // this shouldn't happen
                    }
                } else { // invalid name
                    thisValue.serverLog("invalid name");
                }
            } else {
                thisValue.serverLog("already logged in");
                //player is logged in already
            }
        }
    }

    playerOnline(username) {
        username = username.toLowerCase().trim();
        for (const u in this.users) {
            if (this.users[u].username && this.users[u].username.toLowerCase().trim() == username) {
                return true;
            }
        }
        return false;
    }

    getUsers() {
        return this.users;
    }
}

module.exports = PropHuntUserList;