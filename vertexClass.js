// Enhanced Vertex class for game mechanics
class GameVertex {
    constructor(x, y, index) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.neighbors = []; // Array of neighbor vertex indices
        this.adjacentFaces = []; // Array of face indices this vertex belongs to
    }

    addNeighbor(vertexIndex) {
        if (!this.neighbors.includes(vertexIndex)) {
            this.neighbors.push(vertexIndex);
        }
    }

    addAdjacentFace(faceIndex) {
        if (!this.adjacentFaces.includes(faceIndex)) {
            this.adjacentFaces.push(faceIndex);
        }
    }

    // Serialize to JSON-friendly format
    toJSON() {
        return {
            x: this.x,
            y: this.y,
            index: this.index,
            neighbors: this.neighbors,
            adjacentFaces: this.adjacentFaces,
        };
    }

    // Create from JSON data
    static fromJSON(data) {
        let vertex = new GameVertex(data.x, data.y, data.index);
        vertex.neighbors = data.neighbors || [];
        vertex.adjacentFaces = data.adjacentFaces || [];
        return vertex;
    }
}
