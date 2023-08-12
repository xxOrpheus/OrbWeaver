const argon2 = require('argon2');

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

    static shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    static splitArrayEvenly(array) {
        const middle = Math.floor(array.length / 2);
        const firstHalf = array.slice(0, middle);
        const secondHalf = array.slice(middle);
        return [firstHalf, secondHalf];
    }

    static salted() {
        return "APRM4rgKfR3jL&N6gMVM";
    }

    static async verifyPasscode(checksum, passCode) {
        const salt = this.salted();
        try {
            return await argon2.verify(checksum, passCode + salt).then((result) => {
                return result;
            });
        } catch (err) {
            console.debug(err);
        }
    }

    static async hash(passCode) {
        const salt = this.salted();
        try {
            return await argon2.hash(passCode + salt).then((result) => {
                return result;
            });
        } catch (err) {
            //...
        }
    }

    static safeResponse(data) {
        const hidden = ["passcode", "countdown", "startTimer"];

        return JSON.stringify(data, (key, value) => {
          if (hidden.includes(key)) {
            return undefined;
          }
          return value;
        });
    }
}

module.exports = Util;