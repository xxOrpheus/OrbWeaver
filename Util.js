class Util {
    static currentTime() {
        return Math.floor(Date.now() / 1000);
    }
    
    static isValidName(name) {
        const regex = /^[a-zA-Z\d\-_\s]{1,16}$/i;
        var valid = regex.test(name);
        return valid;
    }
    
    static isValidWorld(world) {
        world = Number(world);
        return (world > 300 && world < 581);
    }

    static jsonError(msg, code) {
        return { "error": msg, "code": Number(code) }
    }
}

module.exports = Util;