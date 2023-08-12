var PropHuntGroup = require('./PropHuntGroup.js');
var Util = require('./Util.js');

class PropHuntGroupList {
    constructor() {
        this.groups = {};
    }

    async createGroup(data, client, server) {
        
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