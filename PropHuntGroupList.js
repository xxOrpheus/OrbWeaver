var PropHuntGroup = require('./PropHuntGroup.js');
var Util = require('./Util.js');

class PropHuntGroupList {
    constructor() {
        this.groups = {};
    }

    createGroup(creator, world) {
        if (!this.groupExists(creator)) {
            const newGroup = new PropHuntGroup(creator, world);
            console.debug(newGroup);
            if (!newGroup.code) {
                this.groups[newGroup.getGroupID()] = newGroup;
                console.debug(creator + " new group: " + newGroup.getGroupID());
                this.joinGroup(creator, world, newGroup.getGroupID());
                return this.groups[newGroup.getGroupID()];
            } else {
                return newGroup;
            }
        } else {
            return Util.jsonError("group exists", 1);
        }
    }

    joinGroup(username, world, group) {
        var g = this.groups[group];
        console.debug(group);
        console.debug(this.groups);
        if (g) {
            g.addUser(username, world);
            return g;
        } else {
            return Util.jsonError("group does not exist", 16)
        }
    }

    groupExists(creator) {
        for (const g in this.groups) {
            if (this.groups[g].creator == creator) {
                return true;
            }
        }
        return false;
    }

    getGroup(id) {
        var g = this.groups[id];
        if (g) {
            return g;
        }
        return Util.jsonError("group does not exist", 16);
    }

    getGroups() {
        return this.groups;
    }
}

module.exports = PropHuntGroupList;