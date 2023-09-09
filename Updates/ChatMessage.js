import Util from "#server/Util";
import * as Packets from "#server/Packets";

class ChatMessage {
	static update(tick, user, message, offset) {
		if (user.groupId && tick.server.groups.groups[user.groupId]) {
			const username = user.username;
			const messageData = Packets.utf8Deserialize(message, 1, offset, user.remote);
			offset += messageData.offset;
			const chatMessage = messageData.data[0];
			Util.log(`[${JSON.stringify(username)}] ${JSON.stringify(chatMessage)}`);
            const groupUsers = tick.server.groups.groups[user.groupId];
            const packet = tick.server.createPacket(Packets.Packet.PLAYER_UPDATE);
            const chatPacket = Buffer.alloc(1 + message.length);
            chatPacket.writeUInt8(Packets.PlayerUpdates.CHAT_MESSAGE, 0);
            chatPacket.write(message, 1, chatMessage.length, "utf8");
            for(const groupUser of groupUsers) {
                if(groupUser.remote) {
                    tick.server.sendPacket(chatPacket, groupUser.remote);
                }
            }
		}
	}
}

export default ChatMessage;
