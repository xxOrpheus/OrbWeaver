import * as Packets from "#server/Packets";
import Config from "#config/Config";
import { Errors, Error } from "#config/Errors";
import Util from "#server/Util";
import WorldPoint from "#world/WorldPoint";

class ModelManager {
	server;
	models;
	modelCount;
	regionCache;

	constructor(server) {
		Util.log("ModelManager initialized...");
		this.server = server;
		this.models = new Map();
		this.tileMap = new Map(); // associate indices with locations
		this.regionCache = new Map();
		this.modelCount = 1;
	}

	// TODO: different model types can stack but i don't think there can be, for example, two GameObjects on one tile, we should therefore overwrite the tile entirely instead of appending it to the object list.
	addModel(modelId, location, orientation, animationId) {
		if (location.x === undefined || location.y === undefined || location.plane === undefined) {
			Util.debug("location was not a valid worldpoint:", JSON.stringify(location));
			return Error.INVALID_LOCATION;
		}
		
		const regionId = location.getRegionId();

		// if the region hasn't been entered it won't be part of the map, so we need to create the entry
		if (!this.models.has(regionId)) {
			this.models.set(regionId, new Map());
		}

		const modelStorageId = this.modelCount;
		const newModel = {
			modelStorageId: modelStorageId,
			modelId: modelId,
			animationId: animationId,
			location: location,
			orientation: orientation,
		};

		// we use location as the key to avoid duplicate entries on a tile
		this.models.get(regionId).set(location.toString(), newModel); 
		this.tileMap.set(location.toString, modelStorageId);
		this.modelCount++;
		// we added an model so we need to invalidate the cache
		// here we  could check if the user is already in the region, and if they are do not invalidate the cache for them, just send the new object
		this.invalidateCache(regionId);

		return modelStorageId;
	}

	removeModel(regionId, location) {
		if (this.models.has(regionId)) {
			const modelsInRegion = this.models.get(regionId);
			if(modelsInRegion.has(location.toString())) {
				modelsInRegion.delete(location.toString());
				if(modelsInRegion.size < 1) {
					this.models.delete(regionId);
				}
				this.invalidateCache(regionId);
				return true;
			}
		}

		return false;
	}

	serializeModels(regionId) {
		// TODO: differential updating of objects (if a user is in the region and an object is added, we only need to send the new object, not the entire list)
		// we fragment model lists to avoid oversized packets (see Config.MAX_PACKET_SIZE)
		// i think this will primarily be for objects defined by the server
		// objects created by users should probably have their own mechanism
		if (this.models.has(regionId)) {
			if (this.regionCache.has(regionId)) {
				return this.regionCache.get(regionId);
			}
	
			const modelSizeBytes = 15;
			const modelsInRegion = Array.from(this.models.get(regionId).values()); // Convert Map values to an array
			const packetsToSend = Math.ceil((modelsInRegion.length * modelSizeBytes) / Config.MAX_PACKET_SIZE);
	
			const packets = [];
	
			for (let i = 0; i < packetsToSend; i++) {
				const startIndex = i * (Config.MAX_PACKET_SIZE / modelSizeBytes);
				const endIndex = Math.min((i + 1) * (Config.MAX_PACKET_SIZE / modelSizeBytes), modelsInRegion.length);
				const chunk = modelsInRegion.slice(startIndex, endIndex);
	
				const packet = this.server.createPacket(Packets.Packet.WORLD_MODEL);
				const modelBuffer = Buffer.alloc(modelSizeBytes * chunk.length);
				modelBuffer.writeUInt16BE(chunk.length, 0); // 2 bytes for the number of objects in this chunk
				let offset = 0;
				for (const model of chunk) {
					modelBuffer.writeUInt16BE(model.modelStorageId, offset + 2);
					modelBuffer.writeUInt16BE(model.modelId, offset + 4);
					modelBuffer.writeUInt16BE(model.location.x, offset + 6);
					modelBuffer.writeUInt16BE(model.location.y, offset + 8);
					modelBuffer.writeUInt8(model.location.plane, offset + 10);
					modelBuffer.writeUInt16BE(model.orientation, offset + 11);
					modelBuffer.writeInt16BE(model.animationId, offset + 13);
					offset += 13;
				}
	
				packet.push(modelBuffer);
				packets.push(packet);
			}
	
			// add the packets to the cache
			this.regionCache.set(regionId, packets);
	
			return packets;
		}
	
		return null;
	}
	

	sendModels(user) {
		let regionId = user.regionId;
		let remote = user.remote;
		if (!regionId || !remote) {
			return Error.INVALID_USER;
		}
		const modelBuffer = this.serializeModels(regionId);
		if (modelBuffer) {
			for (const packet of modelBuffer) {
				this.server.sendPacket(packet, remote);
			}
		} else {
			console.log("No models in the specified region.");
		}
	}

	invalidateCache(regionId) {
		this.regionCache.delete(regionId);
	}
}

export default ModelManager;
