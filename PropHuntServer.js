var PropHuntGroupList = require("./PropHuntGroupList.js");

class PropHuntServer {
    constructor() {
        this.groups = new PropHuntGroupList();
        console.log("Prop hunt server started");
    }

    getGroupList() {
        return this.groups;
    }
}

module.exports = PropHuntServer;