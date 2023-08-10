var express = require('express');
var app = express();
var fs = require("fs");
const { v4: uuidv4 } = require('uuid');
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
        	if(!isValidWorld(world)) {
        		throw new Error(4); // invalid world
        	}
            this.creator = creator;
            this.users = [];
            this.world = world;
            this.id = uuidv4();
            this.active = currentTime;
            this.addUser(creator, world);
            this.findLowersScore = false;
        } else {
        	throw new Error(1);
        }
    }

    addUser(user, world) {
        if (isValidName(user)) {
        	if(this.world != world) {
        		throw new Error(3); // not on the same world 
        	}
        	var newUser = new User(user);
            this.users.push(newUser);
            return newUser;
        } else {
            throw new Error(1); // invalid name
        }
    }

    removeUser(user) {
    	for (const user in this.users) {
    		if(user.name == user) {
    			delete this.users[user];
    			return true;
    		}
    	}
    	return false;
    }

    setCreator(user) {
        if (this.users.includes(user)) {
            this.creator = user;
        } else {
            throw new Error(2); // this person did not get added to the list of users some how 
        }
    }

    setTeams() {
    	console.log("what");
    	for(const user in this.users) {
    		console.log(user);
    	console.log("what2`");
    		user.team = 0;
    	}
    	console.log("what1`");
		return true;
    }

    startGame() {

    }

    userFound(found, seeker) {
    	found = this.getUser(found);
    	seeker = this.getUser(seeker);
    	if(found && seeker) {
    		found.setStatus('found');
    		seeker.modScore(1);
    		if(this.findLowersScore == true) {
    			found.modScore(-1);
    		}
    		return true;
    	}
    	return false;
    }

    endGame() {

    }


    getUsers() {
    	return this.users;
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
    }

    setTeam(team) {
    		console.log("set " + this.user.name + " team to " + team);
    	if(team == 0 || team == 1 || team == 2) {
    		this.team = team;
    		console.log("set " + this.user.name + " team to " + team);
    		return true;
    	}
    	console.log(team);
    	return false;
    }

    setStatus(status) {
    	if(status == 'found') status = 0;
    	if(status == 0 || status == 1 || status == 2) {
    		this.status = status;
    	}
    }

    setProp(propId) {
    	propId = Number(propId);
    	if(propId > 0) {
    		this.prop = propId;
    	}
    }

    getProp() {
    	return this.prop;
    }

    getName() {
    	return this.name;
    }

    notify() {
    	this.active = currentTime();
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
        } catch(error) {
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
try {
	const groups = new PropHuntGroupList();
	var newGroup = groups.createGroup("davesnothere", 420);
	newGroup.addUser("dovahnow", 420);
	newGroup.addUser("dovahnowwww", 420);
	newGroup.addUser("dovahnoaaaaw", 420);
	newGroup.addUser("dovahnoggggw", 420);
	//newGroup.setTeams();
	console.log("setup complete");
} catch(error) {
	error.message = Number(error.message);
	switch(error.message) {
	case 1:
		console.log("invalid name");
		break;
	case 2:
		console.log("creator was not in list of users some how");
		break;
	case 3:
		console.log("not on same world");
		break;
	case 4:
		console.log("invalid world");
		break;
	}
}


var server = app.listen(8081, function() {
    var host = server.address().address
    var port = server.address().port
    console.log("Prop hunt server launched on http://%s:%s", host, port)
});