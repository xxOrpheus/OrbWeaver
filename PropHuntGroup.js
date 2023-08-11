var Util = require('./Util.js');
var PropHuntUser = require('./PropHuntUser.js');

const {
    v4: uuidv4
} = require('uuid');
uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class PropHuntGroup {
    constructor(creator, world) {
        if (Util.isValidName(creator)) {
            var addedCreator = this.addUser(creator, world);
            if (addedCreator) {
                if (!Util.isValidWorld(world)) {
                    return 14;
                }
                this.creator = creator;
                this.users = {};
                this.world = world;
                this.id = uuidv4();
                this.active = Util.currentTime();
                this.findLowersScore = false; // todo
            }
        } else {
            return 10;
        }
    }

    /*
     * Group functions
     */

    addUser(user, world) {
        if (Util.isValidName(user) && !this.userInSession(user)) {
            if (this.world != world) {
                return 11; // not on the same world 
            }
            var newUser = new PropHuntUser(user);
            this.users[newUser.id] = newUser;
            return newUser;
        } else {
            return 10; // invalid name
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
        for(const user in this.users) {
            if(this.users[user].name == name) {
                return true;
            }
        }
        return false;
    }
    
    startGame() {

    }

    endGame() {

    }

    getGroupID() {
        return this.id;
    }

    groupNotify() {
        this.active = Util.currentTime();
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
}

module.exports = PropHuntGroup;