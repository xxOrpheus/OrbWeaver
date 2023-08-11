var Util = require('./Util.js');
var PropHuntUser = require('./PropHuntUser.js');
const argon2 = require('argon2');

const {
    v4: uuidv4
} = require('uuid');
uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class PropHuntGroup {
    constructor(creator, world) {
        if (Util.isValidName(creator)) {
            creator = creator.trim();
            if (!Util.isValidWorld(world)) {
                return Util.jsonError("invalid world", 14);
            }
            this.creator = creator;
            this.users = {};
            this.world = world;
            this.id = uuidv4();
            this.active = Util.currentTime();
            this.findLowersScore = false; // todo
            this.passcode = "";
            return this;
        } else {
            return Util.jsonError("invalid username", 10);
        }
    }

    /*
     * Group functions
     */

    addUser(user, world) {
        var validName = Util.isValidName(user);
        if (validName && !this.userInSession(user)) {
            if (this.world != world) {
                return Util.jsonError("not on same world", 11); // not on the same world 
            }
            var newUser = new PropHuntUser(user);
            if (user == this.creator) {
                newUser.creator = 1;
            }
            this.users[newUser.id] = newUser;
            return newUser;
        } else {
            return !validName ? Util.jsonError("invalid username", 10) : Util.jsonError("already in game", 15); // invalid name or already in game 
        }
    }

    removeUser(id) {
        delete this.users[id];
        return false;
    }


    getUsers() {
        return this.users;
    }

    getUser(id) {
        return this.users[id];
    }

    userInSession(name) {
        for (const user in this.users) {
            if (this.users[user].name == name) {
                return true;
            }
        }
        return false;
    }

    startGame(passcode) {
        var verified = this.verifyPasscode(passcode);
        if(verified) {

        } else if(verified.code) {
            return verified
        }
        return false;
    }

    endGame() {

    }

    getGroupID() {
        return this.id;
    }

    groupNotify() {
        this.active = Util.currentTime();
    }

    async setPasscode(passcode) {
        try {
            const hash = await argon2.hash(passcode + Util.salted());
            this.passcode = hash;
        } catch (err) {
            console.debug(err);
            return Util.jsonError({"error": "error while verifying", code:19});
        }
    }

    async verifyPasscode(passcode) {
        try {
            const hash = await argon2.hash(passcode + Util.salted());
            if(hash == this.passcode) {
                return true;
            }
            return false;
        } catch (err) {
            console.debug(err);
            return Util.jsonError({"error": "error while verifying", code:19});
        }
        return false;
    }

    /*
     * User functions
     */

    setUserStatus(status) {
        if (status == 'found') status = 0;
        if (status == 0 || status == 1 || status == 2) {
            this.users[user].status = status;
        }
    }

    setUserTeam(id, team) {
        if (team == 0 || team == 1 || team == 2) {
            this.users[id].team = team;
            return true;
        }
        return false;
    }

    setUserProp(propId, id) {
        propId = Number(propId);
        if (propId > 0) {
            this.users[id].prop = propId;
        }
    }

    setUserProp(id) {
        return this.users[id].prop;
    }

    getUsername(id) {
        return this.users[id].name;
    }

    userNotify() {
        this.users[user].active = Util.currentTime();
    }

    setupTeams() {
        const usersArray = Object.values(this.users);
        Util.shuffleArray(usersArray);

        const [group1, group2] = Util.splitArrayEvenly(usersArray);

        for (const user in group1) {
            this.users[group1[user].id].team = 1;
        }

        for (const user in group2) {
            this.users[group2[user].id].team = 2
        }
        return this.users;
    }

}

module.exports = PropHuntGroup;