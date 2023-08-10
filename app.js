var express = require('express');
var app = express();
var fs = require("fs");
const {
    v4: uuidv4
} = require('uuid');
uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

app.get('/new-group', function(req, res) {
    var groupID = uuidv4();

});

function currentTime() {
    return Math.floor(Date.now() / 1000);
}

function isValidName(name) {
    const regex = /^[a-zA-Z\d\-_\s]{1,12}$/i;
    valid = regex.test(name);
    console.log("valid name '" + name + "': " + valid);
    return valid;
}

function isValidWorld(world) {
    world = Number(world);
    return (world > 300 && world < 581);
}


class PropHuntGroup {
    constructor(creator, world) {
        if (isValidName(creator)) {
            if (!isValidWorld(world)) {
                throw new Error(4); // invalid world
            }
            this.creator = creator;
            this.users = {};
            this.world = world;
            this.id = uuidv4();
            this.active = currentTime;
            this.addUser(creator, world);
            this.findLowersScore = false; // todo
        } else {
            throw new Error(1);
        }
    }

	 setStatus(status) {
	    if (status == 'found') status = 0;
	    if (status == 0 || status == 1 || status == 2) {
	        this.users[user].status = status;
	    }
	}

	setTeam(user, team) {
	    if (team == 0 || team == 1 || team == 2) {
	        this.users[user].team = team;
	        console.log("set " + user + " team to " + team);
	        return true;
	    }
	    return false;
	}

	setProp(propId) {
	    propId = Number(propId);
	    if (propId > 0) {
	        this.users[user].prop = propId;
	    }
	}

	getProp() {
	    return this.users[user].prop;
	}

	getName() {
	    return this.users[user].name;
	}

	 notify() {
	    this.users[user].active = currentTime();
	}

    addUser(user, world) {
        if (isValidName(user)) {
            if (this.world != world) {
                throw new Error(3); // not on the same world 
            }
            var newUser = new User(user);
            this.users[user] = newUser;
            return newUser;
        } else {
            throw new Error(1); // invalid name
        }
    }

    removeUser(user) {
        for (const user in this.users) {
            if (user.name == user) {
                delete this.users[user];
                return true;
            }
        }
        return false;
    }

    startGame() {

    }

    endGame() {

    }


    getUsers() {
        return this.users;
    }

    getUser(user) {
        return this.users[user];
    }

    getID() {
        return this.id;
    }

    notify() {
        this.active = currentTime();
    }
}

class User {
    constructor(name) {
        this.name = name;
        this.active = currentTime();
        this.status = 0; // prop: 0 = not found, 1 = found, 
        this.team = 0; // 0: prop, 1: seeker
        this.prop = 0; // model id
        this.id = uuidv4();
        return this;
    }
}

class PropHuntGroupList {
    constructor() {
        this.groups = {};
    }

    createGroup(creator, world) {
        const newGroup = new PropHuntGroup(creator, world);
        try {
            this.groups[newGroup.getID()] = newGroup;
            return newGroup;
        } catch (error) {
            return false;
        }
    }

    getGroup(id) {
        return this.groups[id];
    }

    getGroups() {
        return this.groups;
    }
}

// error handler -- probably delete this

const groups = new PropHuntGroupList();
var newGroup = groups.createGroup("davesnothere", 420);
newGroup.addUser("dovahnow", 420);
newGroup.addUser("dovahnowwww", 420);
newGroup.addUser("dovahnoaaaaw", 420);
var u = newGroup.addUser("dovahnoggggw", 420);
newGroup.setTeam("davesnothere", 1);
console.log(newGroup.getUsers());


var server = app.listen(8081, function() {
    var host = server.address().address
    var port = server.address().port
    console.log("Prop hunt server launched on http://%s:%s", host, port)
});