import argon2 from 'argon2';
import Config from '#config/Config';
import Colors from '#config/Colors';

class Util {
	static log(message) {
		if(Config.VERBOSITY > 0) {
			const timestamp = new Date().toISOString();
			console.log(`[${Colors.BLUE}${timestamp}${Colors.RESET}]: ${Colors.GREEN}${message}${Colors.RESET}`);
		}
	}

	static debug(message) {
		if (Config.VERBOSITY > 1) {
			let line = "";
			if (message && message.stack) {
				// get the line the error occured on
				line = message.stack.split("\n")[1].trim() + ": ";
			}
			this.log(`${Colors.CYAN}[DEBUG] ${Colors.BRIGHT_RED}${line}${Colors.YELLOW}${message}`);
		}
	}


	static currentTime() {
		return Math.floor(Date.now() / 1000);
	}

	// should be 12 characters but i think encoding was making it push over that limit sometimes so this will be fine at 16 
	static isValidName(name) {
		const regex = /^[a-zA-Z\d\-_\s]{1,16}$/i;
		return regex.test(name);
	}

	static isValidWorld(world) {
		world = Number(world);
		return world > 300 && world < 581;
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
		return Config.PASSWORD_SALT;
	}

	static async verifyPasscode(checksum, password) {
		const salt = this.salted();
		try {
			return await argon2.verify(checksum, password + salt).then((result) => {
				return result;
			});
		} catch (err) {
			console.debug(err);
		}
	}

	static async hash(password) {
		const salt = this.salted();
		try {
			return await argon2.hash(password + salt).then((result) => {
				return result;
			});
		} catch (err) {
			//...
		}
	}

	static sanitize(data) {
		return JSON.stringify(data);
	}
}

export default Util;
