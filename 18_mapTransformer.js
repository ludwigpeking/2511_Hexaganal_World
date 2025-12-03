/**
 * Map Transformer Utility
 * Converts map_3.json structure + elevation data to topo_4_1080.json structure
 * Extracted from 03_hexToTiffMapper.html for reusability
 */

class MapTransformer {
    constructor(mapData, canvasWidth, canvasHeight) {
        this.mapData = mapData;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.mapping = {};
        this.mappedVertices = [];
    }

    /**
     * Calculate hexagonal map bounds
     */
    calculateHexBounds() {
        let minX = Infinity,
            maxX = -Infinity;
        let minY = Infinity,
            maxY = -Infinity;

        this.mapData.vertices.forEach((v) => {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
        });

        this.mapping.hexBounds = { minX, maxX, minY, maxY };
        this.mapping.hexWidth = maxX - minX;
        this.mapping.hexHeight = maxY - minY;
        this.mapping.hexCenter = {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
        };
    }

    /**
     * Calculate mapping parameters for canvas
     */
    calculateMapping(metersPerPixel = 30) {
        this.mapping.canvasWidth = this.canvasWidth;
        this.mapping.canvasHeight = this.canvasHeight;

        const hexScaleX = this.canvasWidth / this.mapping.hexWidth;
        const hexScaleY = this.canvasHeight / this.mapping.hexHeight;
        const hexToCanvasScale = Math.min(hexScaleX, hexScaleY);

        const actualHexCanvasWidth = this.mapping.hexWidth * hexToCanvasScale;
        const actualHexCanvasHeight = this.mapping.hexHeight * hexToCanvasScale;

        // Calculate real-world dimensions
        const tiffWidthMeters =
            (actualHexCanvasWidth * metersPerPixel) / hexToCanvasScale;
        const tiffHeightMeters =
            (actualHexCanvasHeight * metersPerPixel) / hexToCanvasScale;

        this.mapping.hexToCanvasScale = hexToCanvasScale;
        this.mapping.actualHexCanvasWidth = actualHexCanvasWidth;
        this.mapping.actualHexCanvasHeight = actualHexCanvasHeight;
        this.mapping.emptyCanvasHeight =
            this.canvasHeight - actualHexCanvasHeight;
        this.mapping.metersPerCanvasPixel =
            tiffWidthMeters / actualHexCanvasWidth;
        this.mapping.tiffWidthMeters = tiffWidthMeters;
        this.mapping.tiffHeightMeters = tiffHeightMeters;
        this.mapping.metersPerTiffPixel = metersPerPixel;
    }

    /**
     * Transform map_3.json to topo_4_1080.json structure
     * @param {Function} elevationGetter - Function(x, y) that returns elevation for vertex
     * @returns {Object} Complete topo structure
     */
    transform(elevationGetter) {
        console.log("Starting map transformation...");

        this.calculateHexBounds();
        this.calculateMapping();

        // Map all vertices with elevations
        this.mappedVertices = this.mapData.vertices.map((vertex) => {
            const elevation = elevationGetter(vertex.x, vertex.y);
            return {
                index: vertex.index,
                hexCoords: { x: vertex.x, y: vertex.y },
                elevation: elevation,
                neighbors: [], // Will be populated with edge data
            };
        });

        console.log(`Mapped ${this.mappedVertices.length} vertices`);

        // Calculate edge data (distances, slopes) using neighbors from map_3.json
        this.calculateEdgeData();
        console.log("Calculated edge data");

        // Build final topo structure
        return this.buildTopoStructure();
    }

    /**
     * Calculate edge data: distances, slopes between neighbors
     * Uses the neighbors array from map_3.json vertices
     */
    calculateEdgeData() {
        const vizScale = this.mapping.hexToCanvasScale;

        // Iterate through original map data vertices to get their neighbors
        this.mapData.vertices.forEach((vertex) => {
            const v1 = this.mappedVertices.find(
                (v) => v.index === vertex.index
            );
            if (!v1 || !vertex.neighbors) return;

            vertex.neighbors.forEach((neighborIndex) => {
                const v2 = this.mappedVertices.find(
                    (v) => v.index === neighborIndex
                );
                if (!v2) return;

                // Calculate distance in hex coordinates
                const dx = v2.hexCoords.x - v1.hexCoords.x;
                const dy = v2.hexCoords.y - v1.hexCoords.y;
                const distanceHexCoords = Math.sqrt(dx * dx + dy * dy);

                // Convert to canvas pixels
                const distanceCanvasPixels = distanceHexCoords * vizScale;

                // Convert to real-world meters
                const horizontalDistanceMeters =
                    distanceCanvasPixels * this.mapping.metersPerCanvasPixel;

                // Elevation difference
                const elevationDiff = v2.elevation - v1.elevation;

                // 3D distance
                const distance3DMeters = Math.sqrt(
                    horizontalDistanceMeters * horizontalDistanceMeters +
                        elevationDiff * elevationDiff
                );

                // Slope (rise/run)
                const slope =
                    horizontalDistanceMeters > 0
                        ? elevationDiff / horizontalDistanceMeters
                        : 0;

                // Store edge data
                v1.neighbors.push({
                    vertexIndex: neighborIndex,
                    horizontalDistanceMeters: horizontalDistanceMeters,
                    distance3DMeters: distance3DMeters,
                    elevationDiff: elevationDiff,
                    slope: slope,
                });
            });
        });
    }

    /**
     * Build complete topo structure (same format as topo_4_1080.json)
     */
    buildTopoStructure() {
        return {
            hexMapParams: this.mapData.params || {},
            mapping: this.mapping,
            vertices: this.mappedVertices,
            tiles: this.mapData.tiles.map((tile) => ({
                id: tile.id,
                vertexIndices: tile.vertices.map((v) => v.index),
                neighbors: tile.neighbors,
                center: tile.center,
                area: tile.area,
            })),
        };
    }
}

/**
 * Create elevation getter for kinect depth data
 * @param {Array} depthData - 1D array of depth values
 * @param {number} gridSize - Size of square depth grid
 * @param {Object} mapBounds - {minX, maxX, minY, maxY, width, height}
 * @returns {Function} Elevation getter function
 */
function createKinectElevationGetter(depthData, gridSize, mapBounds) {
    // Log the kinect resolution being used (adaptive to any grid size)
    console.log(
        `[createKinectElevationGetter] Kinect resolution: ${gridSize}x${gridSize} (${depthData.length} points)`
    );
    console.log(`[createKinectElevationGetter] Map bounds:`, mapBounds);

    return (hexX, hexY) => {
        // Normalize hex coordinates to depth grid [0, 1]
        // This is adaptive - works with any kinect resolution
        const normalizedX = (hexX - mapBounds.minX) / mapBounds.width;
        const normalizedY = (hexY - mapBounds.minY) / mapBounds.height;

        // Map to grid indices (adaptive to gridSize)
        const gridX = normalizedX * (gridSize - 1);
        const gridY = normalizedY * (gridSize - 1);

        // Clamp to grid bounds
        const clampedX = Math.max(0, Math.min(gridSize - 1, gridX));
        const clampedY = Math.max(0, Math.min(gridSize - 1, gridY));

        // Bilinear interpolation for smooth elevation mapping
        const x0 = Math.floor(clampedX);
        const y0 = Math.floor(clampedY);
        const x1 = Math.min(x0 + 1, gridSize - 1);
        const y1 = Math.min(y0 + 1, gridSize - 1);

        const fx = clampedX - x0;
        const fy = clampedY - y0;

        const d00 = Math.abs(depthData[y0 * gridSize + x0] || 0);
        const d10 = Math.abs(depthData[y0 * gridSize + x1] || 0);
        const d01 = Math.abs(depthData[y1 * gridSize + x0] || 0);
        const d11 = Math.abs(depthData[y1 * gridSize + x1] || 0);

        const d0 = d00 * (1 - fx) + d10 * fx;
        const d1 = d01 * (1 - fx) + d11 * fx;
        const depth = d0 * (1 - fy) + d1 * fy;

        return depth;
    };
}

/**
 * Helper: Calculate map bounds quickly
 */
function calculateMapBounds(mapData) {
    let minX = Infinity,
        maxX = -Infinity;
    let minY = Infinity,
        maxY = -Infinity;

    mapData.vertices.forEach((v) => {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
    });

    return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
}
