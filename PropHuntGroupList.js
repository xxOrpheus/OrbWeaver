var PropHuntGroup = require('./PropHuntGroup.js');
var Util = require('./Util.js');

class PropHuntGroupList {
    constructor() {
        this.groups = {};
    }

    async createGroup(creator, world, password) {
        if (!this.groupExists(creator)) {
            const newGroup = new PropHuntGroup(creator, world);
            return await newGroup.setPasscode(password).then(() => {
                if (!newGroup.code) {
                    this.groups[newGroup.getGroupID()] = newGroup;
                    this.joinGroup(creator, world, newGroup.getGroupID());
                    return this.groups[newGroup.getGroupID()];
                } else {
                    return newGroup;
                }
            });
        } else {
            return Util.jsonError("group exists", 18);
        }
    }

    joinGroup(username, world, group) {
        var g = this.groups[group];
        if (g) {
            var added = g.addUser(username, world);
            if (!added.code) {
                return this.groups[group];
            } else {
                return added;
            }
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