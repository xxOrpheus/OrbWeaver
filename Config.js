const Config = {
    "SERVER_PORT": 4200,
    "PASSWORD_SALT": "APRM4rgKfR3jL&N6gMVM", // CHANGE THIS
    "JWT_SECRET_KEY": "8nyyWRYw#3SiV8^BeS^6",
    "TICK_LENGTH": 600,
    "DUPLICATE_PACKET_THROTTLE_MS": 600,
    "DUPLICATE_PACKET_THROTTLE_LIMIT": 1,
    "MAX_PACKETS_PER_TICK": 10,
    "VERBOSITY": 2, // > 1 = debug logging,
    "LOGOUT_TIMER": 60 * 1000 * 5 // how long should a user stay logged in (with no activity) before a new session can take over? (ms)
};

module.exports = Config;