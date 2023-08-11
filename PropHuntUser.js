var Util = require('./Util.js');
const {
    v4: uuidv4
} = require('uuid');
uuidv4(); // ⇨ '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

class PropHuntUser {
    constructor(name) {
        this.name = name;
        this.active = Util.currentTime();
        this.status = 0; // prop: 0 = not found, 1 = found, 
        this.team = 0; // 0: prop, 1: seeker
        this.prop = 0; // model id
        this.id = uuidv4();
        this.x = 0;
        this.y = 0;
        this.z = 0;
        return this;
    }
}

module.exports = PropHuntUser;