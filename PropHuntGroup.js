var Util = require('./Util.js');
var PropHuntUser = require('./PropHuntUser.js');
const argon2 = require('argon2');

const {
    v4: uuidv4
} = require('uuid');
uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class PropHuntGroup {
    #countdown = null;
    constructor(creator, world, password) {
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
            this.started = 0;
            this.findLowersScore = false;
            this.password;
            this.countdown = false;
            this.startTimer = 60;
            this.timer = this.startTimer;
            this.started = false;
            this.location = { "P1": { "x": 0, "y": 0, "z": 0 }, "P2": { "x": 0, "y": 0, "z": 0 } }; // players can choose a square stage to play in

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
                return Util.jsonError("not on same world", 11);
            }
            var newUser = new PropHuntUser(user);
            if (user == this.creator) {
                newUser.creator = 1;
            }
            this.users[newUser.id] = newUser;
            return newUser;
        } else {
            return !validName ? Util.jsonError("invalid username", 10) : Util.jsonError("already in game", 15);
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

    async startGame(password) {
        return await Util.verifyPasscode(this.password, password).then((result) => {
            if (result) {
                console.debug("verify" + result);
                this.setupTeams();
                this.gameLog("Teams selected, let the countdown begin (" + this.startTimer + "s)");
                var groupCountdown = function () {
                    this.startTimer = this.timer;
                    this.timer -= 1;
                    if (this.timer <= 0) {
                        clearInterval(this.countdown);
                        this.timer = this.startTimer;
                        this.countdown = false;
                        this.started = true;
                        this.gameLog("Game started (" + Object.keys(this.users).length + " players)");
                    }
                }
                this.countdown = setInterval(groupCountdown.bind(this),
                    1000);
                return this;
            } else {
                return Util.jsonError("invalid password", 21);
            }
        });
    }

    endGame() {

    }

    getGroupID() {
        return this.id;
    }

    /*
    * Updates the last active time for the group
    */
    groupNotify() {
        this.active = Util.currentTime();
    }

    gameLog(msg) {
        console.log("\x1b[33m[\x1b[34m" + this.id + "\x1b[33m] (\x1b[31m" + this.creator + "\x1b[33m)\x1b[39m: \x1b[37m" + msg);
    }

    /*
     * User functions
     */

    setUserStatus(id, status) {
        if (status == 'found') status = 0;
        if (status == 0 || status == 1 || status == 2) {
            this.users[id].status = status;
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

    userNotify(id) {
        this.users[id].active = Util.currentTime();
    }

    async setPasscode(password) {
        return await Util.hash(password).then((result) => {
            this.password = result;
            return this.password;
        });
    }

    setupTeams() {
        const usersArray = Object.values(this.users);
        Util.shuffleArray(usersArray); // randomly sort the users

        const [group1, group2] = Util.splitArrayEvenly(usersArray);
        const [largerGroup, smallerGroup] = group1.length > group2.length ? [group1, group2] : [group2, group1];
        const [team1, team2] = largerGroup === group1 ? [2, 1] : [1, 2];

        for (const user of largerGroup) { //props are always the larger group 
            this.users[user.id].team = team1;
        }

        for (const user of smallerGroup) {
            this.users[user.id].team = team2;
        }

        return this.users;
    }

}

module.exports = PropHuntGroup;