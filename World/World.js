import Objects from "#world/Objects/Object";

class World {
	constructor(server) {
		this.server = server;
		this.objects = new Objects(this.server);
		const location = new WorldPoint(1234, 2345, 1);
		const orientation = 512;
		this.objects.addObject(1870, location, orientation);
	}
}
