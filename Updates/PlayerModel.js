import {Errors, Error} from "#config/Errors";

class PlayerModel {
    static update(tick, user, message, offset) {
        const modelId = message.readUInt16BE(offset);
        offset += 2;
        const modelType = message.readUInt8(offset);
        offset++;
        if (modelId < 0 || modelId > 65535) {
            tick.server.sendError(Error.INVALID_MODEL, remote);
        } else {
            tick.server.users.users[user.id].modelId = modelId;
            tick.server.users.users[user.id].modelType = modelType == 0 ? 0 : 1;
        }
    }
}

export default PlayerModel;