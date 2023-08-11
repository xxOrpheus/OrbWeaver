var PropHuntGroup = require('./PropHuntGroup.js');

class PropHuntGroupList {
    constructor() {
        this.groups = {};
    }

    createGroup(creator, world) {
        const newGroup = new PropHuntGroup(creator, world);
        try {
            this.groups[newGroup.getGroupID()] = newGroup;
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

module.exports = PropHuntGroupList;