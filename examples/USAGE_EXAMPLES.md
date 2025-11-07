# Example: Using Map Data in Your Application

This example shows how to parse and use the generated quad map data.

## JavaScript Example

```javascript
// Load the map data
async function loadQuadMap(filepath) {
    const response = await fetch(filepath);
    const mapData = await response.json();
    return mapData;
}

// Use the map data
async function useMap() {
    const map = await loadQuadMap("quadmap_seed0_ring10_1234567890.json");

    // Access parameters
    console.log("Map generated with seed:", map.params.randomSeed);
    console.log("Number of tiles:", map.tiles.length);

    // Iterate through all tiles
    map.tiles.forEach((tile) => {
        console.log(`Tile ${tile.id}:`);
        console.log("  Center:", tile.center);
        console.log("  Area:", tile.area);
        console.log("  Neighbors:", tile.neighbors);

        // Access vertices
        tile.vertices.forEach((v, i) => {
            console.log(`  Vertex ${i}: (${v.x}, ${v.y})`);
        });
    });

    // Find a specific tile
    const tile5 = map.tiles[5];

    // Get all neighbors of a tile
    const neighbors = tile5.neighbors.map((id) => map.tiles[id]);

    // Calculate distance between two tile centers
    const tile1 = map.tiles[0];
    const tile2 = map.tiles[1];
    const distance = Math.sqrt(
        Math.pow(tile2.center.x - tile1.center.x, 2) +
            Math.pow(tile2.center.y - tile1.center.y, 2)
    );
}
```

## Python Example

```python
import json
import math

# Load the map data
def load_quad_map(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

# Use the map data
def use_map():
    map_data = load_quad_map('quadmap_seed0_ring10_1234567890.json')

    # Access parameters
    print(f"Map generated with seed: {map_data['params']['randomSeed']}")
    print(f"Number of tiles: {len(map_data['tiles'])}")

    # Iterate through all tiles
    for tile in map_data['tiles']:
        print(f"Tile {tile['id']}:")
        print(f"  Center: {tile['center']}")
        print(f"  Area: {tile['area']}")
        print(f"  Neighbors: {tile['neighbors']}")

        # Access vertices
        for i, v in enumerate(tile['vertices']):
            print(f"  Vertex {i}: ({v['x']}, {v['y']})")

    # Find a specific tile
    tile5 = map_data['tiles'][5]

    # Get all neighbors of a tile
    neighbors = [map_data['tiles'][nid] for nid in tile5['neighbors']]

    # Calculate distance between two tile centers
    tile1 = map_data['tiles'][0]
    tile2 = map_data['tiles'][1]
    distance = math.sqrt(
        (tile2['center']['x'] - tile1['center']['x'])**2 +
        (tile2['center']['y'] - tile1['center']['y'])**2
    )
    print(f"Distance between tile 0 and tile 1: {distance}")

if __name__ == '__main__':
    use_map()
```

## Common Use Cases

### 1. Pathfinding

```javascript
function findPath(mapData, startTileId, endTileId) {
    // Use neighbors list for A* or Dijkstra pathfinding
    const queue = [{ id: startTileId, path: [startTileId] }];
    const visited = new Set();

    while (queue.length > 0) {
        const current = queue.shift();

        if (current.id === endTileId) {
            return current.path;
        }

        if (visited.has(current.id)) continue;
        visited.add(current.id);

        const tile = mapData.tiles[current.id];
        tile.neighbors.forEach((neighborId) => {
            queue.push({
                id: neighborId,
                path: [...current.path, neighborId],
            });
        });
    }

    return null; // No path found
}
```

### 2. Territory Assignment

```javascript
function assignTerritories(mapData, numTerritories) {
    // Assign each tile to a territory
    const territories = new Array(mapData.tiles.length).fill(-1);

    // Select random starting tiles for each territory
    const seeds = [];
    for (let i = 0; i < numTerritories; i++) {
        let randomTile = Math.floor(Math.random() * mapData.tiles.length);
        seeds.push(randomTile);
        territories[randomTile] = i;
    }

    // Flood fill from seeds
    let queue = seeds.map((id, territory) => ({ id, territory }));

    while (queue.length > 0) {
        const { id, territory } = queue.shift();
        const tile = mapData.tiles[id];

        tile.neighbors.forEach((neighborId) => {
            if (territories[neighborId] === -1) {
                territories[neighborId] = territory;
                queue.push({ id: neighborId, territory });
            }
        });
    }

    return territories;
}
```

### 3. Drawing the Map

```javascript
function drawQuadMap(ctx, mapData, colorMap) {
    mapData.tiles.forEach((tile) => {
        ctx.beginPath();
        ctx.moveTo(tile.vertices[0].x, tile.vertices[0].y);

        for (let i = 1; i < tile.vertices.length; i++) {
            ctx.lineTo(tile.vertices[i].x, tile.vertices[i].y);
        }

        ctx.closePath();

        // Fill with custom color
        ctx.fillStyle = colorMap ? colorMap[tile.id] : "#cccccc";
        ctx.fill();

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });
}
```

### 4. Statistical Analysis

```javascript
function analyzeMap(mapData) {
    const areas = mapData.tiles.map((t) => t.area);
    const neighborCounts = mapData.tiles.map((t) => t.neighbors.length);

    return {
        totalTiles: mapData.tiles.length,
        avgArea: areas.reduce((a, b) => a + b) / areas.length,
        minArea: Math.min(...areas),
        maxArea: Math.max(...areas),
        avgNeighbors:
            neighborCounts.reduce((a, b) => a + b) / neighborCounts.length,
        minNeighbors: Math.min(...neighborCounts),
        maxNeighbors: Math.max(...neighborCounts),
    };
}
```

## Data Validation

```javascript
function validateMapData(mapData) {
    // Check structure
    if (!mapData.params || !mapData.tiles) {
        throw new Error("Invalid map structure");
    }

    // Check each tile
    mapData.tiles.forEach((tile, idx) => {
        if (tile.id !== idx) {
            throw new Error(`Tile ID mismatch at index ${idx}`);
        }

        if (tile.vertices.length !== 4) {
            throw new Error(`Tile ${idx} doesn't have 4 vertices`);
        }

        // Check neighbor references are valid
        tile.neighbors.forEach((nid) => {
            if (nid < 0 || nid >= mapData.tiles.length) {
                throw new Error(`Invalid neighbor reference in tile ${idx}`);
            }
        });
    });

    console.log("Map data is valid");
    return true;
}
```
