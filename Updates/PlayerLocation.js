import WorldPoint from "#world/WorldPoint";
import Util from "#server/Util";

export class PlayerLocation {
	static update(tick, user, message, offset) {
		const x = message.readUInt16BE(offset);
		offset += 2;
		const y = message.readUInt16BE(offset);
		offset += 2;
		const z = message.readUInt8(offset);
		offset++;
		const orientation = message.readUInt16BE(offset);
		offset += 2;
		const location = new WorldPoint(x, y, z);
		const regionId = location.getRegionId();

		// if the region hasn't been entered before we need to instantiate a new array before we can populate it
		if (!tick.server.users.regionMap[regionId]) {
			tick.server.users.regionMap[regionId] = [];
		}
		if (user.regionId != regionId) {
			// we must remove them from their previous region mapping
			const oldRegion = tick.server.users.users[user.id].regionId;
			if (tick.server.users.regionMap[oldRegion]?.[user.id] != null) {
				delete tick.server.users.regionMap[oldRegion][user.id];
			}
			// we can remove the region mapping if there is no one in it
			if (tick.server.users.regionMap[oldRegion]?.length < 1) {
				delete tick.server.users.regionMap[oldRegion];
			}
			// assign the new region id and add them to the region map, add them to the list of users that need a full update
			tick.server.users.users[user.id].regionId = regionId;
			tick.server.users.users[user.id].orientation = orientation;
			tick.server.users.regionMap[regionId].push(user.id);
			// they're in a new region so they need to receive the updated player list
			if (user.groupId) {
				tick.server.groups.sendUserList(user.id, user.groupId);
			}
			tick.server.users.setNeedsUpdate(user.id);
		}
		tick.server.users.users[user.id].location = location;
		//Util.debug(`${user.username} new location: ${x} ${y} ${z} ${orientation}`);
	}
}

export default PlayerLocation;
