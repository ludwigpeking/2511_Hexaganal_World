# Vertex System Documentation

## Overview

The quadrangulated map generator now includes complete vertex topology information. Each vertex in the generated map knows its neighbors and which tiles (faces) it belongs to.

## Vertex Class

Located in `vertexClass.js`, the `GameVertex` class represents enhanced vertices for game mechanics.

### Properties

-   **`x, y`**: Position coordinates in the map
-   **`index`**: Unique identifier for this vertex
-   **`neighbors`**: Array of vertex indices that share an edge with this vertex
-   **`adjacentFaces`**: Array of tile (face) indices that this vertex is part of

### Methods

#### `addNeighbor(vertexIndex)`

Adds a neighbor vertex to this vertex's neighbor list (prevents duplicates).

#### `addAdjacentFace(faceIndex)`

Records that this vertex belongs to a specific tile.

#### `toJSON()`

Converts vertex to JSON-serializable format for saving.

#### `GameVertex.fromJSON(data)`

Static method to reconstruct a GameVertex from saved JSON data.

## How Vertex Neighbors Are Computed

During map generation (`buildMapData()` function):

1. **Create GameVertex objects** for all vertices in the mesh
2. **Track face membership**: For each tile (face), record which vertices belong to it
3. **Compute neighbors**: For each face, all vertices in that face are neighbors to each other
4. **Store in JSON**: All vertex data with neighbor relationships is saved

### Example

If a quad tile has vertices [0, 1, 2, 3]:

-   Vertex 0 neighbors: 1, 2, 3
-   Vertex 1 neighbors: 0, 2, 3
-   Vertex 2 neighbors: 0, 1, 3
-   Vertex 3 neighbors: 0, 1, 2

## Usage in Games

### Pathfinding Between Vertices

```javascript
// Load map
let mapData = /* loaded from JSON */;

// Get a vertex and its neighbors
let vertex = mapData.vertices[42];
console.log(`Vertex ${vertex.index} has ${vertex.neighbors.length} neighbors`);

// Find neighbors
vertex.neighbors.forEach(neighborIndex => {
    let neighbor = mapData.vertices[neighborIndex];
    let distance = Math.hypot(
        neighbor.x - vertex.x,
        neighbor.y - vertex.y
    );
    console.log(`Neighbor ${neighborIndex} is ${distance.toFixed(2)} units away`);
});
```

### Finding All Tiles Touching a Vertex

```javascript
let vertex = mapData.vertices[42];
vertex.adjacentFaces.forEach((faceIndex) => {
    let tile = mapData.tiles[faceIndex];
    console.log(`Vertex touches tile ${tile.id} with area ${tile.area}`);
});
```

### Building a Graph Structure

```javascript
// Create an adjacency graph for AI/pathfinding
class VertexGraph {
    constructor(mapData) {
        this.vertices = mapData.vertices;
        this.adjacency = new Map();

        this.vertices.forEach((v) => {
            this.adjacency.set(v.index, v.neighbors);
        });
    }

    getNeighbors(vertexIndex) {
        return this.adjacency.get(vertexIndex) || [];
    }

    // Implement A*, Dijkstra, etc.
}
```

## Data Structure

### In JSON Export

```json
{
    "vertices": [
        {
            "x": 400.5,
            "y": 300.2,
            "index": 0,
            "neighbors": [1, 2, 3, 4],
            "adjacentFaces": [0, 1]
        },
        {
            "x": 425.3,
            "y": 310.8,
            "index": 1,
            "neighbors": [0, 2, 5, 6],
            "adjacentFaces": [0, 2, 3]
        }
        // ... more vertices
    ]
}
```

## Viewer Integration

The viewer (`viewer.html`) now displays vertex information:

1. **Map Statistics**: Shows total vertex count
2. **Tile Selection**: When clicking a tile, shows each vertex and its neighbor count
3. **Debugging**: Helps visualize vertex connectivity

### Example Output

When you click a tile:

```
Tile 42 Selected
Center: (405.2, 312.8)
Area: 328.45
Neighbors: 38, 43, 46, 39
Vertices:
  Vertex 25: 4 neighbors
  Vertex 26: 5 neighbors
  Vertex 30: 4 neighbors
  Vertex 29: 3 neighbors
```

## Performance Notes

-   **Neighbor Calculation**: O(F × V²) where F = faces, V = vertices per face (typically 4)
-   **Memory**: Each vertex stores neighbor array (~4-6 neighbors typical)
-   **Loading**: Vertex data is lazily loaded from JSON, no reconstruction needed

## Future Enhancements

Possible additions:

-   **Edge weights**: Distance or cost between vertices
-   **Vertex types**: Different terrain or properties
-   **Dynamic updates**: Modify graph during gameplay
-   **Spatial indexing**: Fast nearest-neighbor queries

## Files Modified

-   **`vertexClass.js`**: New file with GameVertex class
-   **`quadrangulizedMapGenerator.js`**: Updated `buildMapData()` to compute vertex neighbors
-   **`quadrangulizedMapGenerator.html`**: Includes vertexClass.js script
-   **`viewer.html`**: Displays vertex information
-   **`README.md`**: Updated with vertex documentation

## Technical Details

### Why Store Vertex Neighbors?

Many game mechanics require vertex-level navigation:

-   **Unit movement**: Along edges of tiles
-   **Road/river building**: Connect vertices
-   **Border detection**: Find boundary vertices
-   **Influence maps**: Spread values through vertex graph
-   **Tactical positioning**: Corner/edge control

### Neighbor Definition

Two vertices are neighbors if they:

1. Share at least one face (tile)
2. Are connected by an edge in the mesh

This creates a planar graph suitable for:

-   A\* pathfinding
-   Network flow algorithms
-   Graph traversal
-   Voronoi/Delaunay operations

---

**Last Updated**: November 8, 2025
