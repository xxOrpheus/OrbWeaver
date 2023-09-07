class ObjectList {
    server;
    objects;
    objectCount;
    regionCache; 

    constructor(server) {
        this.server = server;
        this.objects = new Map();
        this.regionCache = new Map(); 
        this.objectCount = 1;
    }

    addObject(modelId, location, orientation) {
        if (typeof location !== "WorldPoint") {
            return Error.INVALID_LOCATION;
        }

        const regionId = location.getRegionId();

		// if the region hasn't been entered it won't be part of the map, so we need to create the entry
        if (!this.objects.has(regionId)) {
            this.objects.set(regionId, []);
        }

        const objectStorageId = this.objectCount;
        const newObject = {
            objectStorageId,
            modelId,
            location,
            orientation,
            isActive: true,
        };

        this.objects.get(regionId).push(newObject);
        this.objectCount++;
		// we added an object so we need to invalidate the ache
        this.invalidateCache(regionId);

        return objectStorageId;
    }

    removeObject(regionId, objectStorageId) {
        if (this.objects.has(regionId)) {
            const objectsInRegion = this.objects.get(regionId);
			
            const indexToRemove = objectsInRegion.findIndex(
                (object) => object.objectStorageId === objectStorageId
            );

            if (indexToRemove !== -1) {
                objectsInRegion.splice(indexToRemove, 1);

                if (objectsInRegion.length === 0) {
                    this.objects.delete(regionId);
                }
				// we removed an object so we need to invalidate the ache
                this.invalidateCache(regionId);

                return true;
            }
        }

        return false;
    }

    serializeObjects(regionId) {
        if (this.objects.has(regionId)) {
            if (this.regionCache.has(regionId)) { // check if there is a cached list of objects 
                return this.regionCache.get(regionId);
            }

            const objectsInRegion = this.objects.get(regionId);

            const objectBuffer = Buffer.alloc(objectsInRegion.length * 11);
            let offset = 0;
            objectsInRegion.forEach((object) => {
                objectBuffer.writeUInt16BE(object.objectStorageId, offset);
                objectBuffer.writeUInt16BE(object.modelId, offset + 2);
                objectBuffer.writeUInt16BE(object.location.x, offset + 4);
                objectBuffer.writeUInt16BE(object.location.y, offset + 6);
                objectBuffer.writeUInt8(object.location.z, offset + 8);
                objectBuffer.writeUInt16BE(object.orientation, offset + 9);
                offset += 11;
            });

			// if there wasn't a cache we should make one 
            this.regionCache.set(regionId, objectBuffer);

            return objectBuffer;
        }

        return null; 
    }

    invalidateCache(regionId) {
        this.regionCache.delete(regionId);
    }
}