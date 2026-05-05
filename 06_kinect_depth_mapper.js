/**
 * Kinect Depth to Hex Map Mapper
 * Combines kinect depth fetching with hexToTiffMapper's data structure and visualization
 */

// Kinect API Configuration
const KINECT_API_URL = "http://localhost:8080/data";
const POLLING_RATE = 500; // Check for updates every 500ms

let hexMapData = null;
let depthData = null;
let depthGridSize = 0;
let mappedVertices = [];
let canvas = null;
let ctx = null;

// Coordinate mapping parameters
let mapping = {
    hexCenter: { x: 0, y: 0 },
    hexBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    hexWidth: 0,
    hexHeight: 0,
    depthGridSize: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
};

// Status tracking
let updateCount = 0;
let lastDepthHash = "";
let kinectConnected = false;

async function loadAndMap() {
    updateProgress("Loading hexagonal map...");

    try {
        // Load hexagonal map JSON
        const hexResponse = await fetch("results/grids/map_4_small.json");
        hexMapData = await hexResponse.json();

        updateProgress("Calculating coordinate mapping...");

        // Calculate hex bounds and center
        calculateHexBounds();

        // Calculate mapping parameters
        calculateMapping();

        updateProgress("Starting kinect depth polling...");

        // Start kinect polling
        setInterval(fetchDepthData, POLLING_RATE);
        fetchDepthData(); // Initial call

        updateProgress("Waiting for kinect data...");
    } catch (error) {
        updateProgress("Error: " + error.message);
        console.error(error);
    }
}

function calculateHexBounds() {
    // Find bounding box of all vertices
    let minX = Infinity,
        maxX = -Infinity;
    let minY = Infinity,
        maxY = -Infinity;

    hexMapData.vertices.forEach((v) => {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
    });

    mapping.hexBounds = { minX, maxX, minY, maxY };
    mapping.hexWidth = maxX - minX;
    mapping.hexHeight = maxY - minY;
    mapping.hexCenter = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
    };
}

function calculateMapping() {
    // Canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate scale to fit canvas
    const hexScaleX = canvasWidth / mapping.hexWidth;
    const hexScaleY = canvasHeight / mapping.hexHeight;
    const hexToCanvasScale = Math.min(hexScaleX, hexScaleY);

    const actualHexCanvasWidth = mapping.hexWidth * hexToCanvasScale;
    const actualHexCanvasHeight = mapping.hexHeight * hexToCanvasScale;

    // Store useful values
    mapping.canvasWidth = canvasWidth;
    mapping.canvasHeight = canvasHeight;
    mapping.hexToCanvasScale = hexToCanvasScale;
    mapping.actualHexCanvasWidth = actualHexCanvasWidth;
    mapping.actualHexCanvasHeight = actualHexCanvasHeight;
    mapping.emptyCanvasHeight = canvasHeight - actualHexCanvasHeight;
}

function hexToDepthGrid(hexX, hexY) {
    // Transform hex coordinates to depth grid coordinates
    if (!depthGridSize) return { x: 0, y: 0 };

    const relX = hexX - mapping.hexBounds.minX;
    const relY = hexY - mapping.hexBounds.minY;

    const gridX = (relX / mapping.hexWidth) * depthGridSize;
    const gridY = (relY / mapping.hexHeight) * depthGridSize;

    return { x: gridX, y: gridY };
}

function interpolateDepth(gridX, gridY) {
    if (!depthData || !depthGridSize) return 0;

    // Clamp to grid bounds
    gridX = Math.max(0, Math.min(depthGridSize - 1, gridX));
    gridY = Math.max(0, Math.min(depthGridSize - 1, gridY));

    // Get integer pixel coordinates
    const x0 = Math.floor(gridX);
    const y0 = Math.floor(gridY);
    const x1 = Math.min(x0 + 1, depthGridSize - 1);
    const y1 = Math.min(y0 + 1, depthGridSize - 1);

    // Get fractional parts
    const fx = gridX - x0;
    const fy = gridY - y0;

    // Get depth values at the four corners
    const d00 = getDepthValue(x0, y0);
    const d10 = getDepthValue(x1, y0);
    const d01 = getDepthValue(x0, y1);
    const d11 = getDepthValue(x1, y1);

    // Bilinear interpolation
    let depth;
    if (fx + fy < 1) {
        // Lower-left triangle
        const w0 = 1 - fx - fy;
        const w1 = fx;
        const w2 = fy;
        depth = w0 * d00 + w1 * d10 + w2 * d01;
    } else {
        // Upper-right triangle
        const w0 = fx + fy - 1;
        const w1 = 1 - fy;
        const w2 = 1 - fx;
        depth = w0 * d11 + w1 * d10 + w2 * d01;
    }

    return depth;
}

function getDepthValue(x, y) {
    // Get depth value from kinect data
    const index = y * depthGridSize + x;
    return Math.abs(depthData[index] || 0);
}

async function fetchDepthData() {
    try {
        const response = await fetch(KINECT_API_URL);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        // Validate data
        if (!Array.isArray(data) || data.length === 0) {
            kinectConnected = false;
            updateProgress("Kinect: Empty data ✗");
            return;
        }

        // Detect grid size
        const size = Math.sqrt(data.length);
        if (size % 1 !== 0) {
            console.error(`Invalid data length: ${data.length}`);
            return;
        }

        // Check if data actually changed
        const currentHash = JSON.stringify(data);
        if (currentHash === lastDepthHash) {
            kinectConnected = true;
            return;
        }
        lastDepthHash = currentHash;

        // Update depth data
        depthData = data;
        depthGridSize = size;
        mapping.depthGridSize = size;
        kinectConnected = true;

        // Map depth data to vertices
        mapVertices();

        // Update UI
        updateCount++;
        const timestamp = new Date().toLocaleTimeString();
        updateProgress(
            `Kinect connected ✓ - Update ${updateCount} at ${timestamp}`
        );

        // Display stats and visualize
        displayStats();
        visualizeMapping();
    } catch (error) {
        kinectConnected = false;
        updateProgress("Kinect disconnected ✗");
        console.error("Kinect fetch error:", error);
    }
}

function mapVertices() {
    mappedVertices = [];

    hexMapData.vertices.forEach((vertex, idx) => {
        // Transform to depth grid coordinates
        const gridCoords = hexToDepthGrid(vertex.x, vertex.y);

        // Interpolate depth
        const depth = interpolateDepth(gridCoords.x, gridCoords.y);

        mappedVertices.push({
            index: vertex.index,
            hexCoords: { x: vertex.x, y: vertex.y },
            gridCoords: gridCoords,
            elevation: depth, // Using depth as elevation
            neighbors: [],
            adjacentFaces: vertex.adjacentFaces,
        });
    });

    // Calculate edge data
    calculateEdgeData();
}

function calculateEdgeData() {
    const vizScale = mapping.hexToCanvasScale;

    hexMapData.vertices.forEach((vertex) => {
        const v1 = mappedVertices[vertex.index];

        vertex.neighbors.forEach((neighborIndex) => {
            const v2 = mappedVertices[neighborIndex];

            // Calculate distance in hex coordinate space
            const dx = v2.hexCoords.x - v1.hexCoords.x;
            const dy = v2.hexCoords.y - v1.hexCoords.y;
            const distanceHexCoords = Math.sqrt(dx * dx + dy * dy);

            // Convert to canvas pixels
            const distanceCanvasPixels = distanceHexCoords * vizScale;

            // Calculate elevation difference (depth in mm)
            const elevationDiff = v2.elevation - v1.elevation;

            // Calculate slope
            const slope =
                distanceCanvasPixels > 0
                    ? elevationDiff / distanceCanvasPixels
                    : 0;

            // Store edge data
            v1.neighbors.push({
                vertexIndex: neighborIndex,
                distanceHexCoords: distanceHexCoords,
                distanceCanvasPixels: distanceCanvasPixels,
                elevationDiff: elevationDiff,
                slope: slope,
                slopeAngle: Math.atan(slope) * (180 / Math.PI),
                slopePercent: slope * 100,
            });
        });
    });
}

function displayStats() {
    if (!mappedVertices.length) return;

    const elevations = mappedVertices.map((v) => v.elevation);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const avgElev = elevations.reduce((a, b) => a + b, 0) / elevations.length;

    // Find extreme points
    const minVertex = mappedVertices.find((v) => v.elevation === minElev);
    const maxVertex = mappedVertices.find((v) => v.elevation === maxElev);

    const stats = `
        <div class="stat-row">
            <span class="stat-label">Hex Map Vertices:</span>
            <span>${hexMapData.vertices.length}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Hex Map Tiles:</span>
            <span>${hexMapData.tiles.length}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Canvas Size:</span>
            <span>${mapping.canvasWidth} × ${mapping.canvasHeight} pixels</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Hexagon on Canvas:</span>
            <span>${mapping.actualHexCanvasWidth.toFixed(
                0
            )} × ${mapping.actualHexCanvasHeight.toFixed(0)} pixels</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Kinect Depth Grid:</span>
            <span>${depthGridSize} × ${depthGridSize} pixels</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Kinect Status:</span>
            <span>${kinectConnected ? "Connected ✓" : "Disconnected ✗"}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Updates Received:</span>
            <span>${updateCount}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Min Depth:</span>
            <span>${minElev.toFixed(2)} mm (Vertex ${minVertex.index})</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Max Depth:</span>
            <span>${maxElev.toFixed(2)} mm (Vertex ${maxVertex.index})</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Avg Depth:</span>
            <span>${avgElev.toFixed(2)} mm</span>
        </div>
    `;

    document.getElementById("stats").innerHTML = stats;

    // Create depth legend gradient
    const gradientStops = [];
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const hue = 200 - t * 150;
        const saturation = 50 - t * 20;
        const lightness = 40 + t * 40;
        gradientStops.push(
            `hsl(${hue}, ${saturation}%, ${lightness}%) ${i * 10}%`
        );
    }
    document.getElementById(
        "legend-gradient"
    ).style.background = `linear-gradient(to right, ${gradientStops.join(
        ", "
    )})`;

    document.getElementById("legend-min").textContent = `${minElev.toFixed(
        2
    )} mm`;
    document.getElementById("legend-max").textContent = `${maxElev.toFixed(
        2
    )} mm`;
}

function updateProgress(message) {
    document.getElementById("progress").innerHTML = message;
}

function exportResults() {
    if (!mappedVertices.length) {
        alert("Please wait for kinect data first!");
        return;
    }

    const result = {
        hexMapParams: hexMapData.params,
        mapping: mapping,
        kinectInfo: {
            gridSize: depthGridSize,
            updateCount: updateCount,
            connected: kinectConnected,
        },
        vertices: mappedVertices,
        tiles: hexMapData.tiles.map((tile) => ({
            id: tile.id,
            vertexIndices: tile.vertices.map((v) => v.index),
            neighbors: tile.neighbors,
            center: tile.center,
            area: tile.area,
        })),
    };

    const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kinect_depth_mapping_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    alert("Mapping exported successfully!");
}

function visualizeMapping() {
    if (!mappedVertices.length) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = "#e0e8f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scale to fit visualization
    const vizScale = Math.min(
        canvas.width / mapping.hexWidth,
        canvas.height / mapping.hexHeight
    );

    // Get elevation range for coloring
    const elevations = mappedVertices.map((v) => v.elevation);
    const minElev = Math.min(...elevations);
    const maxElev = Math.max(...elevations);
    const elevRange = maxElev - minElev || 1;

    // Draw tiles
    hexMapData.tiles.forEach((tile) => {
        // Get vertex elevations
        const vertexElevs = tile.vertices.map((v) => {
            const mapped = mappedVertices.find((mv) => mv.index === v.index);
            return mapped ? mapped.elevation : 0;
        });

        // Get screen coordinates for vertices
        const screenVerts = tile.vertices.map((v) => ({
            x: (v.x - mapping.hexBounds.minX) * vizScale,
            y: (v.y - mapping.hexBounds.minY) * vizScale,
        }));

        // Draw base color for this tile
        const minTileElev = Math.min(...vertexElevs);
        const normalizedElev = (minTileElev - minElev) / elevRange;
        const hue = 200 - normalizedElev * 150;
        const saturation = 50 - normalizedElev * 20;
        const lightness = 40 + normalizedElev * 40;

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.beginPath();
        ctx.moveTo(screenVerts[0].x, screenVerts[0].y);
        ctx.lineTo(screenVerts[1].x, screenVerts[1].y);
        ctx.lineTo(screenVerts[2].x, screenVerts[2].y);
        ctx.lineTo(screenVerts[3].x, screenVerts[3].y);
        ctx.closePath();
        ctx.fill();

        // Draw contours if available
        if (typeof drawQuadContours === "function") {
            drawQuadContours(
                ctx,
                screenVerts,
                vertexElevs,
                minElev,
                maxElev,
                elevRange / 20
            );
        }
    });

    // Mark extreme elevation points
    const minVertex = mappedVertices.find((v) => v.elevation === minElev);
    const maxVertex = mappedVertices.find((v) => v.elevation === maxElev);

    if (minVertex) {
        const minX =
            (minVertex.hexCoords.x - mapping.hexBounds.minX) * vizScale;
        const minY =
            (minVertex.hexCoords.y - mapping.hexBounds.minY) * vizScale;

        ctx.fillStyle = "blue";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(minX, minY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("MIN", minX, minY + 4);
    }

    if (maxVertex) {
        const maxX =
            (maxVertex.hexCoords.x - mapping.hexBounds.minX) * vizScale;
        const maxY =
            (maxVertex.hexCoords.y - mapping.hexBounds.minY) * vizScale;

        ctx.fillStyle = "red";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(maxX, maxY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.fillText("MAX", maxX, maxY + 4);
    }
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("mapCanvas");
    ctx = canvas.getContext("2d");
    loadAndMap();
});
