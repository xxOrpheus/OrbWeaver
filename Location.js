class Location {
	// https://rune-server.org/runescape-development/rs-503-client-and-server/help/241174-region-ids-post2088808.html#post2088808 - Maxi
	// this will help in managing player updates mostly, so we can know what region a user is in and when to send updates and to what players. (ref. getPaletteId)
	// by doing such we can also avoid potentially costly math computations in the player update protocol (i.e. euclidean distance checking)
	constructor(x, y, z) {
		this.absX = x;
		this.absY = y;
		this.z = z;
		this.isNewInRegion = true;
	}

	setAbsX(absX) {
		this.absX = absX;
	}

	getAbsX() {
		return this.absX;
	}

	setAbsY(absY) {
		this.absY = absY;
	}

	getAbsY() {
		return this.absY;
	}

	setZ(z) {
		this.z = z;
	}

	getZ() {
		return this.z;
	}

	getRegionLocalX() {
		return this.getAbsX() - 8 * (this.getPaletteX() - 6);
	}

	getRegionLocalY() {
		return this.getAbsY() - 8 * (this.getPaletteY() - 6);
	}

	getPaletteX() {
		return this.getAbsX() >> 3;
	}

	getPaletteY() {
		return this.getAbsY() >> 3;
	}

	getPaletteBaseX() {
		return this.getPaletteX() << 3;
	}

	getPaletteBaseY() {
		return this.getPaletteY() << 3;
	}

	getPaletteLocalX() {
		return this.getAbsX() - this.getPaletteBaseX();
	}

	getPaletteLocalY() {
		return this.getAbsY() - this.getPaletteBaseY();
	}

	getRegionX() {
		return this.getPaletteX() / 8;
	}

	getRegionY() {
		return this.getPaletteY() / 8;
	}

	getRegionBaseX() {
		return (this.getRegionX() << 3) * 8;
	}

	getRegionBaseY() {
		return (this.getRegionY() << 3) * 8;
	}

	getPaletteId(x, y) {
		return ((this.getRegionY() + y) * 8 - 6) / 8 + (((this.getRegionX() + x - 6) / 8) << 8);
	}

	setNewInRegion(isNewInRegion) {
		this.isNewInRegion = isNewInRegion;
	}

	isNewInRegion() {
		return this.isNewInRegion;
	}

	equals(other) {
		if (!(other instanceof Location)) {
			return false;
		}
		const loc = other;
		return loc.absX === this.absX && loc.absY === this.absY && loc.z === this.z;
	}

	toString() {
		return "[" + this.absX + "," + this.absY + "," + this.z + "]";
	}
}

module.exports = Location;
