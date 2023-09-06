import Config from "#config/Config";

const MasterServerConfig = {
    SERVER_PORT: Config.SERVER_PORT + 1,       // the port the master server listens on
    RATE_LIMIT_THRESHOLD: 1, // how many updates 
    RATE_LIMIT_WINDOW: 10 * 1000,  // in how many seconds

    INACTIVE_SERVER_TIME: 30 * 60 * 1000 // 30 minutes without activity and the server is removed from the list
}

export default MasterServerConfig;