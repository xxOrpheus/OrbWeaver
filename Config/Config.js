const Config = {
	// Server Settings
	SERVER_PORT: 4200, // Port on which the local server runs
	LOCALE: "en-US", // Default locale
	MAX_USERS_ONLINE: 64, // haven't profiled extensively but 64 should be okay for most servers
	SERVER_NAME: "OrbWeaver Prop Hunt server",

	// Security Settings
	PASSWORD_SALT: "APRM4rgKfR3jL&N6gMVM", // Change this for security
	JWT_SECRET_KEY: "8nyyWRYw#3SiV8^BeS^6", // Change this for security

	// Server Behavior Settings
	TICK_LENGTH: 600, // Length of a tick in ms (adjust as needed)
	// TODO: throttle/rate limit packets & prevent packet replaying
	MAX_PACKETS_PER_TICK: 10, // Maximum packets processed per tick
	DUPLICATE_PACKET_THROTTLE_MS: 600, // Throttle duplicate packets (in ms)
	DUPLICATE_PACKET_THROTTLE_LIMIT: 1, // Maximum allowed duplicate packets per tick

	// Logging
	VERBOSITY: 2, // Logging verbosity (1 = minimal, > 1 = debug)

	// Session Settings
	LOGOUT_TIMER: 60 * 1000 * 5, // Session timeout in milliseconds

	// Optional Feature
	MASTER_SERVER: "127.0.0.1", // Master server address
	MASTER_SERVER_PORT: 4201,
	POLL_MASTER_SERVER: true, // Enable polling the master server
};

export default Config;
