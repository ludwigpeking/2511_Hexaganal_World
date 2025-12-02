/**
 * Kinect Depth Topography Visualization Test
 * Loads hexagonal map and visualizes depth data from kinect as colored elevation
 */

// Kinect API Configuration
const KINECT_API_URL = "http://localhost:8080/data";
const POLLING_RATE = 500; // Check for updates every 500ms

// Map data
let mapData = null;
let vertices = [];
let tiles = [];

// Depth data from kinect
let depthData = null;
let depthGridSize = 0;

// Canvas settings
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

// Visualization scale
let vizScale = 1;
let offsetX = 0;
let offsetY = 0;

// Update counter
let updateCount = 0;
let lastDepthHash = "";

// Status tracking
let mapLoaded = false;
let kinectConnected = false;

// Elevation range for coloring
let minElev = 0;
let maxElev = 200; // Max expected depth in mm

function preload() {
    // Load map data
    mapData = loadJSON(
        "results/map_3.json",
        () => {
            console.log("Map loaded successfully");
            document.getElementById("map-info").textContent = "Loaded ✓";
        },
        (err) => {
            console.error("Failed to load map:", err);
            document.getElementById("map-info").textContent = "Failed ✗";
        }
    );

    document.getElementById("atlas-info").textContent = "Not needed ✓";
}

function setup() {
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent("canvas-container");
    colorMode(HSL);

    // Process map data
    if (mapData) {
        processMapData();
        mapLoaded = true;
    }

    // Start kinect polling
    setInterval(fetchDepthData, POLLING_RATE);
    fetchDepthData(); // Initial call

    updateStatus("Initialized. Waiting for kinect data...");
}

function draw() {
    background(30);

    if (!mapLoaded) {
        fill(255);
        textAlign(CENTER, CENTER);
        text("Loading map...", width / 2, height / 2);
        return;
    }

    if (!depthData) {
        fill(255);
        textAlign(CENTER, CENTER);
        text("Waiting for kinect depth data...", width / 2, height / 2);
        return;
    }

    // Draw the topography
    drawTopography();
}

function processMapData() {
    vertices = mapData.vertices;
    tiles = mapData.tiles;

    // Calculate bounds for scaling
    let minX = Infinity,
        maxX = -Infinity;
    let minY = Infinity,
        maxY = -Infinity;

    vertices.forEach((v) => {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
    });

    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;

    // Calculate scale to fit canvas with padding
    const padding = 40;
    const scaleX = (CANVAS_WIDTH - padding * 2) / mapWidth;
    const scaleY = (CANVAS_HEIGHT - padding * 2) / mapHeight;
    vizScale = Math.min(scaleX, scaleY);

    // Calculate offset to center the map
    offsetX = padding - minX * vizScale;
    offsetY = padding - minY * vizScale;

    // Initialize vertex properties
    vertices.forEach((v) => {
        v.elevation = 0; // Will be updated from kinect
    });

    console.log(
        `Map processed: ${vertices.length} vertices, ${tiles.length} tiles`
    );
    console.log(
        `Bounds: (${minX.toFixed(1)}, ${minY.toFixed(1)}) to (${maxX.toFixed(
            1
        )}, ${maxY.toFixed(1)})`
    );
    console.log(
        `Scale: ${vizScale.toFixed(3)}, Offset: (${offsetX.toFixed(
            1
        )}, ${offsetY.toFixed(1)})`
    );
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
            document.getElementById("kinect-info").innerHTML =
                '<span class="status-error">Empty data ✗</span>';
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
            // Data hasn't changed, but still update connection status
            kinectConnected = true;
            return;
        }
        lastDepthHash = currentHash;

        // Update depth data
        depthData = data;
        depthGridSize = size;
        kinectConnected = true;

        // Map depth data to vertices
        mapDepthToVertices();

        // Update UI
        updateCount++;
        document.getElementById("kinect-info").innerHTML =
            '<span class="status-active">Connected ✓</span>';
        document.getElementById("update-count").textContent = updateCount;

        const timestamp = new Date().toLocaleTimeString();
        updateStatus(`Updated at ${timestamp}`);
    } catch (error) {
        kinectConnected = false;
        document.getElementById("kinect-info").innerHTML =
            '<span class="status-error">Disconnected ✗</span>';
        console.error("Kinect fetch error:", error);
    }
}

function mapDepthToVertices() {
    if (!depthData || !vertices.length) return;

    // Map depth grid to vertices
    vertices.forEach((v) => {
        // Normalize vertex position to depth grid coordinates
        // Assuming depth grid covers the same area as the hex map
        const gridX = Math.floor((v.x / 800) * depthGridSize); // 800 is approximate map width
        const gridY = Math.floor((v.y / 700) * depthGridSize); // 700 is approximate map height

        const clampedX = Math.max(0, Math.min(depthGridSize - 1, gridX));
        const clampedY = Math.max(0, Math.min(depthGridSize - 1, gridY));

        const depthIndex = clampedY * depthGridSize + clampedX;
        const depth = Math.abs(depthData[depthIndex] || 0);

        // Store elevation (in mm from kinect)
        v.elevation = depth;
    });
}

function drawTopography() {
    // Get elevation range for coloring
    const elevations = vertices.map((v) => v.elevation);
    minElev = Math.min(...elevations);
    maxElev = Math.max(...elevations);
    const elevRange = maxElev - minElev || 1; // Avoid division by zero

    // Draw each tile with color based on elevation
    tiles.forEach((tile) => {
        // Get the four vertices of this quad
        const v0 = vertices[tile.vertices[0].index];
        const v1 = vertices[tile.vertices[1].index];
        const v2 = vertices[tile.vertices[2].index];
        const v3 = vertices[tile.vertices[3].index];

        if (!v0 || !v1 || !v2 || !v3) return;

        // Transform vertices to screen coordinates
        const screenVerts = [
            { x: v0.x * vizScale + offsetX, y: v0.y * vizScale + offsetY },
            { x: v1.x * vizScale + offsetX, y: v1.y * vizScale + offsetY },
            { x: v2.x * vizScale + offsetX, y: v2.y * vizScale + offsetY },
            { x: v3.x * vizScale + offsetX, y: v3.y * vizScale + offsetY },
        ];

        // Get average elevation for this tile
        const vertexElevs = [
            v0.elevation,
            v1.elevation,
            v2.elevation,
            v3.elevation,
        ];
        const avgElev = vertexElevs.reduce((a, b) => a + b, 0) / 4;

        // Normalize elevation to 0-1 range
        const normalizedElev = (avgElev - minElev) / elevRange;

        // Color mapping: blue (low) to red (high) via green/yellow
        // Using HSL: hue 200 (blue) to 0 (red)
        const hue = 200 - normalizedElev * 200;
        const saturation = 70;
        const lightness = 40 + normalizedElev * 30;

        // Draw quad
        fill(hue, saturation, lightness);
        noStroke();
        beginShape();
        vertex(screenVerts[0].x, screenVerts[0].y);
        vertex(screenVerts[1].x, screenVerts[1].y);
        vertex(screenVerts[2].x, screenVerts[2].y);
        vertex(screenVerts[3].x, screenVerts[3].y);
        endShape(CLOSE);

        // Optional: draw subtle border
        stroke(0, 0, 0, 30);
        strokeWeight(0.5);
        noFill();
        beginShape();
        vertex(screenVerts[0].x, screenVerts[0].y);
        vertex(screenVerts[1].x, screenVerts[1].y);
        vertex(screenVerts[2].x, screenVerts[2].y);
        vertex(screenVerts[3].x, screenVerts[3].y);
        endShape(CLOSE);
    });
}

// ============================================================================
// UI HELPERS
// ============================================================================

function updateStatus(message) {
    document.getElementById("status").textContent = message;
}
