class WorldPoint {
	// this will help in managing player updates mostly, so we can know what region a user is in and when to send updates and to what players. (ref. getRegionId)
	// by doing such we can also avoid potentially costly math computations in the player update protocol (i.e. euclidean distance checking)
	x;
	y;
	plane;
	constructor(x, y, plane) {
		this.x = x;
		this.y = y;
		this.plane = plane;
	}

	getRegionId() {
		return ((this.x >> 6) << 8) | (this.y >> 6);
	}
}

export default WorldPoint;
