import ModelManager from "#world/ModelManager";

class World {
	server;
	modelManager;

	constructor(server) {
		this.server = server;
		this.modelManager = new ModelManager(this.server);
	//	const location = new WorldPoint(1234, 2345, 1);
	//	const orientation = 512;
	//	this.objects.addModel(1870, location, orientation);
	}
}

export default World;