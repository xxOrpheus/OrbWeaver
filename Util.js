class Util {
    static currentTime() {
        return Math.floor(Date.now() / 1000);
    }
    
    static isValidName(name) {
        const regex = /^[a-zA-Z\d\-_\s]{1,12}$/i;
        var valid = regex.test(name);
        console.log(valid);
        console.log(name);
        return valid;
    }
    
    static isValidWorld(world) {
        world = Number(world);
        return (world > 300 && world < 581);
    }
}

module.exports = Util;