const Packet = {};

const Packets = [ // order is protocol sensitive but that's ok , just share this list with the client.
    "USER_LOGIN",
    "USER_LOGOUT",

    "GROUP_NEW",
    "GROUP_JOIN",
    "GROUP_START_GAME",
    "GROUP_END_GAME",
    "GROUP_SET_STAGE",
    "GROUP_NOTIFY",

    "PLAYER_PROP",
    "PLAYER_LOCATION",
    "PLAYER_ORIENTATION",
    "PLAYER_NOTIFY"
];

Packets.forEach((action, index) => {
    Packet[action] = index;
});

module.exports = {Packets, Packet};