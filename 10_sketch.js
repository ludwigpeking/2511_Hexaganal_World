//TODOs:
// 1) moveCost reduction by traffic logic
// 2) save/load map
// 3) map scenes: rome, london, beijing, tokyo, new york, seoul, buenos aires, cairo,
// Global variables
let topoData = null;
let vertices = [];
let tiles = [];
let minElevation = 0;
let maxElevation = 0;
let edgeVertices = [];
let tradeDestination1 = null; // First trade destination
let tradeDestination2 = null; // Second trade destination
let simulationStep = 0;
let autoSimInterval = null;
let canvasScale = 1;
let waterLevel = 10;
let UnhabitableLevel = 120; // Elevation above which vertices cannot be settled
let modeChangeCost = 50;
let waterTransportFactor = 0.01;
let steepSlopes = []; // Array of {from: vertex, to: vertex} for debug visualization
let selectedVertex = null; // For vertex inspection tool
let canvasCreated = false; // Track if canvas has been created

// Kinect integration
let kinectEnabled = false;
let kinectPollingInterval = null;
let kinectDepthData = null;
let kinectGridSize = 0;
let kinectUpdateCount = 0;
let lastKinectHash = "";
const KINECT_API_URL = "http://localhost:8080/data";
const KINECT_POLLING_RATE = 500;
let hexMapData = null; // Store original hex map structure

// Presentation layer
let patternAtlas = null; // The texture atlas image
let presentationBuffer = null; // Single buffer for presentation layer

// Sea background
let seaImage = null;
let seaMaskGraphics = null; // Graphics buffer for hexagon mask

// Cloud animation
let cloudImage = null;
let cloudX = 0;
let cloudY = 0;
let cloud2X = 0; // Second cloud instance
let cloud2Y = 0;
let showCloud2 = false; // Whether to show second cloud
const CLOUD_SPEED = 0.1; // pixels per frame (2x faster)
const CLOUD_ANGLE = 50; // degrees from right (up-right direction)
const CLOUD_SCALE = 3; // scale factor for cloud image

// Auto-simulation
let isFirstAutoSpawn = true; // Track if first settlement has been spawned
let autoSimulationActive = false; // Track if auto-simulation is running
let autoSimFrameCounter = 0; // Count frames for spawning
const AUTO_SIM_SPAWN_INTERVAL = 20; // Spawn every 20 frames

// Graphics buffers for performance
let elevationBuffer = null;
let tilesBuffer = null;
let debugLayersBuffer = null;
let staticContentBuffer = null;
let needsRedrawElevation = true;
let needsRedrawTiles = true;
let needsRedrawDebugLayers = true;
let needsRedrawStatic = true;
let lastDebugState = {};
let lastStaticState = {};

async function setup() {
    // Load pattern atlas
    patternAtlas = await loadImage("assets/pattern_atlas.png");
    // console.log(
    //     "Pattern atlas loaded:",
    //     patternAtlas.width,
    //     "x",
    //     patternAtlas.height
    // );

    // Load sea background image (animated GIF)
    seaImage = await loadImage("assets/sky_and_sea/noiseSea3.gif");
    // console.log("Sea image loaded:", seaImage.width, "x", seaImage.height);

    // Load cloud image
    cloudImage = await loadImage("assets/sky_and_sea/cloud.png");
    // console.log(
    //     "Cloud image loaded:",
    //     cloudImage.width,
    //     "x",
    //     cloudImage.height
    // );

    // Initialize cloud position (start from bottom-left, off-canvas)
    cloudX = -cloudImage.width * CLOUD_SCALE - 500;
    cloudY = 1080; // Start below canvas

    // Load JSON first to get canvas dimensions
    await loadDefaultMap();

    // Apply tooltips from BUTTON_TIPS
    applyButtonTooltips();

    // Canvas size is set in processData() after JSON is loaded
    // Keep loop running for cloud animation
    loop();

    // Set up event listeners
    select("#loadFileBtn").mousePressed(() => {
        select("#fileInput").elt.click();
    });

    select("#fileInput").elt.addEventListener("change", loadCustomFile);

    select("#createRouteBtn").mousePressed(createRandomRoute);
    select("#randomTravelBtn").mousePressed(createRandomTravel);
    select("#clearRoutesBtn").mousePressed(clearRoutes);
    select("#resetSimBtn").mousePressed(resetSimulation);

    // Setup left panel layer buttons
    setupLayerButtons();

    select("#autoSimulate").changed(toggleAutoSimulation);
    select("#setTerrainParamsBtn").mousePressed(updateTerrainParameters);
    select("#setWaterLevelBtn").mousePressed(updateWaterLevel);
    select("#setUnhabitableLevelBtn").mousePressed(updateUnhabitableLevel);
    select("#toggleKinectBtn").mousePressed(toggleKinect);

    // Toggle debug panel button
    select("#toggleDebugBtn").mousePressed(() => {
        const panel = select("#right-panel");
        if (panel.hasClass("hidden")) {
            panel.removeClass("hidden");
        } else {
            panel.addClass("hidden");
        }
    });

    // Apply round-btn class to all round buttons
    select("#toggleDebugBtn").addClass("round-btn");
    select("#autoSimBtn").addClass("round-btn");
    select("#mouseModeRoad").addClass("round-btn");
    select("#mouseModeCastle").addClass("round-btn");
    select("#mouseModeFarmer").addClass("round-btn");
    select("#mouseModeMerchant").addClass("round-btn");
    select("#mouseModeDelete").addClass("round-btn");

    // Auto-simulation button
    select("#autoSimBtn").mousePressed(toggleAutoSimulation);

    // Wire up mouse mode buttons (single click for toggle, double click for value-based placement)
    select("#mouseModeRoad").mousePressed(() => toggleMouseMode("road"));

    // Castle button: single click = toggle mode, double click = add by value
    setupDualClickButton("#mouseModeCastle", "castle", addLordSettlement);

    // Farmer button: single click = toggle mode, double click = add by value
    setupDualClickButton("#mouseModeFarmer", "farmer", addFarmerSettlement);

    // Merchant button: single click = toggle mode, double click = add by value
    setupDualClickButton(
        "#mouseModeMerchant",
        "merchant",
        addMerchantSettlement
    );

    select("#mouseModeDelete").mousePressed(() => toggleMouseMode("delete"));

    // Mouse play UI removed - using round buttons instead
    // initializeMousePlayUI();
}

function draw() {
    if (!topoData) {
        background(0);
        return;
    }

    // Initialize buffers if needed
    if (!elevationBuffer) {
        elevationBuffer = createGraphics(width, height);
        tilesBuffer = createGraphics(width, height);
        debugLayersBuffer = createGraphics(width, height);
        staticContentBuffer = createGraphics(width, height);
        presentationBuffer = createGraphics(width, height);
        seaMaskGraphics = createGraphics(width, height);

        // Create hexagon mask
        createHexagonMask();

        // Defer presentation layer drawing to next frame to ensure everything is ready
        setTimeout(() => {
            if (
                width > 0 &&
                height > 0 &&
                patternAtlas &&
                patternAtlas.width > 0 &&
                topoData
            ) {
                drawPresentationLayerToBuffer(
                    presentationBuffer,
                    topoData.mapping.hexToCanvasScale
                );
                redraw();
            }
        }, 0);
    }

    const scale = topoData.mapping.hexToCanvasScale;

    // Use layer states instead of checkboxes
    const showElevation = layerStates.elevation;
    const showPresentation = layerStates.presentation;
    const showWater = layerStates.water;
    const showVertexInspector = layerStates.vertexInspector;
    const showDefense = layerStates.defense;
    const showSecurity = layerStates.security;
    const showFarmValue = layerStates.farmValue;
    const showFarmerValue = layerStates.farmerValue;
    const showTraffic = layerStates.trafficWeight;
    const showMerchantValue = layerStates.merchantValue;
    const showSteepness = layerStates.steepness;
    const showSlopeDirection = layerStates.slopeDirection;
    const showTrafficCount = layerStates.trafficCount;
    const showHabitable = layerStates.habitable;
    const showOccupied = layerStates.occupied;
    const showRoutes = layerStates.routes;

    // These remain for backward compatibility with debug panel
    const showVertices = false; // Removed from UI
    const showBuildings = select("#showBuildings")
        ? select("#showBuildings").checked()
        : false;

    // Check if debug layers state changed
    const debugState = {
        showDefense,
        showSecurity,
        showFarmValue,
        showFarmerValue,
        showMerchantValue,
        showSteepness,
        showSlopeDirection,
        showHabitable,
        showOccupied,
        showTrafficCount,
    };
    const debugStateChanged =
        JSON.stringify(debugState) !== JSON.stringify(lastDebugState);
    if (debugStateChanged) {
        needsRedrawDebugLayers = true;
        lastDebugState = debugState;
    }

    // Check if static layers state changed
    const staticState = {
        showTraffic,
        showVertices,
        showRoutes,
    };
    const staticStateChanged =
        JSON.stringify(staticState) !== JSON.stringify(lastStaticState);
    if (staticStateChanged) {
        needsRedrawStatic = true;
        lastStaticState = staticState;
    }

    background(0);

    // Set up clipping region to hexagon boundary
    if (tiles && vertices) {
        drawingContext.save();
        drawingContext.beginPath();

        const vertexMap = new Map();
        vertices.forEach((v) => vertexMap.set(v.index, v));

        // Create clipping path from all tiles
        tiles.forEach((tile) => {
            const tileVertices = tile.vertexIndices.map((vIndex) =>
                vertexMap.get(vIndex)
            );
            if (tileVertices.some((v) => !v)) return;

            drawingContext.moveTo(tileVertices[0].x, tileVertices[0].y);
            for (let i = 1; i < tileVertices.length; i++) {
                drawingContext.lineTo(tileVertices[i].x, tileVertices[i].y);
            }
            drawingContext.closePath();
        });

        drawingContext.clip();
    }

    // Draw sea background image at 2x size (only if water layer is enabled)
    if (seaImage && showWater) {
        const seaWidth = seaImage.width * 2;
        const seaHeight = seaImage.height * 2;
        image(seaImage, 0, 0, seaWidth, seaHeight);
    }

    // Auto-simulation: spawn settlements every 5 frames
    if (autoSimulationActive) {
        // Stop if reached 600 settlements or no habitable tiles
        if (settlements.length >= 600) {
            autoSimulationActive = false;
            autoSimFrameCounter = 0;
            const btn = select("#autoSimBtn");
            if (btn) {
                btn.removeClass("active");
                btn.html("▶️ Auto Sim");
            }
            updateProgress("Auto-simulation stopped: 600 settlements reached");
        } else {
            autoSimFrameCounter++;
            if (autoSimFrameCounter >= AUTO_SIM_SPAWN_INTERVAL) {
                autoSimFrameCounter = 0;
                // Check if there are habitable tiles before spawning
                populateHabitableArray();
                if (habitable.length > 0) {
                    runSimulationStep();
                } else {
                    // Stop if no habitable tiles
                    autoSimulationActive = false;
                    autoSimFrameCounter = 0;
                    const btn = select("#autoSimBtn");
                    if (btn) {
                        btn.removeClass("active");
                        btn.html("▶️ Auto Sim");
                    }
                    updateProgress(
                        "Auto-simulation stopped: no habitable tiles available"
                    );
                }
            }
        }
    }

    // Update demonstration mode animation
    updateDemonstrationMode();

    // Draw elevation layer (cached)
    if (showElevation) {
        if (needsRedrawElevation) {
            elevationBuffer.clear();
            drawTilesWithElevationToBuffer(elevationBuffer, scale);
            needsRedrawElevation = false;
        }
        image(elevationBuffer, 0, 0);
    }

    // Draw tile borders (cached)
    if (needsRedrawTiles) {
        tilesBuffer.clear();
        drawTileBordersToBuffer(tilesBuffer, scale);
        needsRedrawTiles = false;
    }
    // image(tilesBuffer, 0, 0);

    // Draw presentation layer with textured quads
    if (showPresentation && patternAtlas) {
        image(presentationBuffer, 0, 0);
    }

    // Draw dynamic content (buildings)
    if (showBuildings) {
        drawSettlements();
    }

    // Draw debug layers ON TOP of graphics layers
    if (needsRedrawDebugLayers) {
        debugLayersBuffer.clear();
        if (showDefense) drawDebugLayerToBuffer(debugLayersBuffer, "defense");
        if (showSecurity) drawDebugLayerToBuffer(debugLayersBuffer, "security");
        if (showFarmValue)
            drawDebugLayerToBuffer(debugLayersBuffer, "farmValue");
        if (showFarmerValue)
            drawDebugLayerToBuffer(debugLayersBuffer, "farmerValue");
        if (showMerchantValue)
            drawDebugLayerToBuffer(debugLayersBuffer, "merchantValue");
        if (showSteepness)
            drawDebugLayerToBuffer(debugLayersBuffer, "steepness");
        if (showSlopeDirection)
            drawDebugLayerToBuffer(debugLayersBuffer, "slopeDirection");
        if (showHabitable)
            drawDebugLayerToBuffer(debugLayersBuffer, "habitable");
        if (showOccupied) drawDebugLayerToBuffer(debugLayersBuffer, "occupied");
        if (showTrafficCount)
            drawDebugLayerToBuffer(debugLayersBuffer, "trafficCount");
        needsRedrawDebugLayers = false;
    }
    if (
        showDefense ||
        showSecurity ||
        showFarmValue ||
        showFarmerValue ||
        showMerchantValue ||
        showSteepness ||
        showSlopeDirection ||
        showHabitable ||
        showOccupied ||
        showTrafficCount
    ) {
        image(debugLayersBuffer, 0, 0);
    }

    // Draw static content (cached when simulation state doesn't change)
    if (needsRedrawStatic) {
        staticContentBuffer.clear();
        if (showTraffic) drawTrafficHeatmapToBuffer(staticContentBuffer, scale);
        if (showVertices) drawVerticesToBuffer(staticContentBuffer, scale);
        if (showRoutes) drawRoutesToBuffer(staticContentBuffer, scale);
        drawRouteEndpointsToBuffer(staticContentBuffer, scale);
        drawSteepSlopesToBuffer(staticContentBuffer);
        drawCentralAreaToBuffer(staticContentBuffer);
        needsRedrawStatic = false;
    }
    image(staticContentBuffer, 0, 0);

    // Draw animated cloud layer on top
    if (cloudImage) {
        // Calculate movement deltas based on angle
        // 50 degrees from right = 90 - 50 = 40 degrees from horizontal
        const angleRad = (40 * Math.PI) / 180;
        const dx = CLOUD_SPEED * Math.cos(angleRad);
        const dy = -CLOUD_SPEED * Math.sin(angleRad); // negative because y increases downward

        // Update cloud position
        cloudX += dx;
        cloudY += dy;

        // Calculate scaled dimensions
        const scaledWidth = cloudImage.width * CLOUD_SCALE;
        const scaledHeight = cloudImage.height * CLOUD_SCALE;

        // When first cloud is 2/3 out of frame, start showing second cloud
        if (
            cloudX > 1920 - scaledWidth / 3 ||
            cloudY < (-scaledHeight * 2) / 3
        ) {
            if (!showCloud2) {
                // Initialize second cloud at starting position
                cloud2X = -scaledWidth - 500;
                cloud2Y = 1080;
                showCloud2 = true;
            }
        }

        // When first cloud is completely off screen, reset it and hide second cloud
        if (cloudX > 1920 + scaledWidth || cloudY < -scaledHeight) {
            cloudX = cloud2X;
            cloudY = cloud2Y;
            showCloud2 = false;
        }

        // Draw first cloud at 3x scale
        image(cloudImage, cloudX, cloudY, scaledWidth, scaledHeight);

        // Draw second cloud if active
        if (showCloud2) {
            cloud2X += dx;
            cloud2Y += dy;
            image(cloudImage, cloud2X, cloud2Y, scaledWidth, scaledHeight);
        }
    }

    // Draw vertex inspector (always on top, always fresh)
    if (showVertexInspector && selectedVertex) {
        drawVertexInspector();
    }

    // Update and draw hovered vertex highlight for mouse play mode
    if (mouseMode) {
        updateHoveredVertex();
        drawHoveredVertexHighlight();
    }

    // Restore clipping region
    if (tiles && vertices) {
        drawingContext.restore();
    }
}

function createHexagonMask() {
    if (!seaMaskGraphics || !tiles || !vertices) return;

    seaMaskGraphics.clear();
    seaMaskGraphics.background(0); // Black background (transparent areas)
    seaMaskGraphics.fill(255); // White fill for land
    seaMaskGraphics.noStroke(); // No stroke to avoid gaps

    const vertexMap = new Map();
    vertices.forEach((v) => vertexMap.set(v.index, v));

    // Draw all tiles in one go without individual beginShape/endShape
    tiles.forEach((tile) => {
        const tileVertices = tile.vertexIndices.map((vIndex) =>
            vertexMap.get(vIndex)
        );
        if (tileVertices.some((v) => !v)) return;

        seaMaskGraphics.beginShape();
        tileVertices.forEach((v) => {
            seaMaskGraphics.vertex(v.x, v.y);
        });
        seaMaskGraphics.endShape(CLOSE);
    });
}

function invalidateBuffers(which = "all") {
    if (which === "all" || which === "elevation") needsRedrawElevation = true;
    if (which === "all" || which === "tiles") needsRedrawTiles = true;
    if (which === "all" || which === "debug") needsRedrawDebugLayers = true;
    if (which === "all" || which === "static") needsRedrawStatic = true;
    if (which === "all" || which === "presentation") {
        updatePresentationLayer();
    }
}

function updatePresentationLayer() {
    if (!presentationBuffer || !patternAtlas) return;

    // Check if canvas and atlas have valid dimensions
    if (!topoData || width <= 0 || height <= 0 || patternAtlas.width <= 0) {
        console.warn("Cannot update presentation layer: invalid dimensions");
        return;
    }

    // Clear and redraw presentation layer immediately
    presentationBuffer.clear();
    const scale = topoData.mapping.hexToCanvasScale;
    drawPresentationLayerToBuffer(presentationBuffer, scale);
}

function mouseClicked() {
    if (!topoData || !vertices || vertices.length === 0) return;

    // Check if mouse play is handling the click
    if (handleMousePlayClick()) {
        return; // Mouse play handled it
    }

    if (!layerStates.vertexInspector) return;

    // Use quadtree for optimized search if available
    const searchRadius = 30; // pixels
    let nearestVertex = null;
    let nearestDist = searchRadius;

    if (vertexQuadtree) {
        // Use quadtree for efficient spatial search
        const range = { x: mouseX, y: mouseY, r: searchRadius };
        const nearbyVertices = vertexQuadtree.query(range);

        nearbyVertices.forEach((v) => {
            const dx = v.x - mouseX;
            const dy = v.y - mouseY;
            const dist = sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestVertex = v;
            }
        });
    } else {
        // Fallback: linear search through all vertices
        vertices.forEach((v) => {
            const dx = v.x - mouseX;
            const dy = v.y - mouseY;
            const dist = sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestVertex = v;
            }
        });
    }

    // Select vertex if found, otherwise clear selection
    const previousSelection = selectedVertex;
    selectedVertex = nearestVertex;

    // Only redraw if selection changed
    if (previousSelection !== selectedVertex) {
        redraw();
    }
}

function keyPressed() {
    // Clear vertex selection on ESC key
    if (keyCode === ESCAPE) {
        selectedVertex = null;
        redraw();
        return false; // Prevent default behavior
    }

    // Toggle demonstration mode on D key
    if (key === "d" || key === "D") {
        toggleDemonstrationMode();
        return false; // Prevent default behavior
    }
}

async function loadDefaultMap() {
    updateProgress("Loading default map...");
    try {
        const response = await fetch("results/topo_4_lowRes.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        topoData = JSON.parse(text);
        processData();
    } catch (error) {
        updateProgress("Error loading default map: " + error.message);
        console.error(error);
    }
}

async function loadCustomFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    updateProgress("Loading " + file.name + "...");
    try {
        const text = await file.text();
        topoData = JSON.parse(text);
        processData();
    } catch (error) {
        updateProgress("Error loading file: " + error.message);
        console.error(error);
    }
}

async function toggleKinect() {
    kinectEnabled = !kinectEnabled;
    const btn = select("#toggleKinectBtn");

    if (kinectEnabled) {
        // Load hex map structure if not already loaded
        if (!hexMapData) {
            try {
                const response = await fetch("results/map_4_small.json");
                hexMapData = await response.json();
                console.log("Hex map structure loaded for kinect mapping");
            } catch (error) {
                updateProgress(
                    "Error loading hex map structure: " + error.message
                );
                kinectEnabled = false;
                btn.html("Enable Kinect");
                return;
            }
        }

        btn.html("Disable Kinect");
        updateProgress("Kinect mode enabled - polling started");
        kinectPollingInterval = setInterval(
            fetchKinectDepth,
            KINECT_POLLING_RATE
        );
        fetchKinectDepth(); // Initial fetch
    } else {
        btn.html("Enable Kinect");
        updateProgress("Kinect mode disabled");
        if (kinectPollingInterval) {
            clearInterval(kinectPollingInterval);
            kinectPollingInterval = null;
        }
    }
}

async function fetchKinectDepth() {
    try {
        const response = await fetch(KINECT_API_URL);
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        // Validate data
        if (!Array.isArray(data) || data.length === 0) {
            // console.warn("Empty kinect data received");
            return;
        }

        // Detect grid size
        const size = Math.sqrt(data.length);
        if (size % 1 !== 0) {
            // console.error(`Invalid kinect data length: ${data.length}`);
            return;
        }

        // Check if data changed
        const currentHash = JSON.stringify(data);
        if (currentHash === lastKinectHash) {
            return; // No change
        }
        lastKinectHash = currentHash;

        // Update depth data
        kinectDepthData = data;
        kinectGridSize = size;
        kinectUpdateCount++;

        // Process depth data and rebuild topoData
        await processKinectDepthToTopo();

        updateProgress(
            `Kinect update ${kinectUpdateCount} - ${new Date().toLocaleTimeString()}`
        );
    } catch (error) {
        // console.error("Kinect fetch error:", error);
    }
}

async function processKinectDepthToTopo() {
    if (!hexMapData || !kinectDepthData) return;

    // Calculate hex bounds
    const hexBounds = calculateHexBounds(hexMapData.vertices);

    // Get canvas dimensions (use current or default)
    const canvasWidth = topoData ? topoData.mapping.canvasWidth : 1920;
    const canvasHeight = topoData ? topoData.mapping.canvasHeight : 1080;

    // Calculate mapping parameters (same as in 03_hexToTiffMapper)
    const hexScaleX = canvasWidth / hexBounds.width;
    const hexScaleY = canvasHeight / hexBounds.height;
    const hexToCanvasScale = Math.min(hexScaleX, hexScaleY);

    const actualHexCanvasWidth = hexBounds.width * hexToCanvasScale;
    const actualHexCanvasHeight = hexBounds.height * hexToCanvasScale;

    // Assume kinect depth in mm, convert to meters for metersPerCanvasPixel
    // Using a default scale: 1 canvas pixel = 10 meters (adjust as needed)
    const metersPerCanvasPixel = 10;

    // Create new topoData structure based on hex map
    const newTopoData = {
        params: hexMapData.params,
        mapping: {
            hexBounds: hexBounds,
            hexCenter: {
                x: (hexBounds.minX + hexBounds.maxX) / 2,
                y: (hexBounds.minY + hexBounds.maxY) / 2,
            },
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            hexToCanvasScale: hexToCanvasScale,
            metersPerCanvasPixel: metersPerCanvasPixel,
            actualHexCanvasWidth: actualHexCanvasWidth,
            actualHexCanvasHeight: actualHexCanvasHeight,
            kinectGridSize: kinectGridSize,
        },
        vertices: [],
        tiles: [],
    };

    // Transform tiles structure from hexMapData format to topoData format
    hexMapData.tiles.forEach((tile) => {
        newTopoData.tiles.push({
            id: tile.id,
            vertexIndices: tile.vertices.map((v) => v.index),
            neighbors: tile.neighbors,
            center: tile.center,
            centerX: tile.center ? tile.center.x : null,
            centerY: tile.center ? tile.center.y : null,
            area: tile.area,
        });
    });

    // Build vertex neighbor relationships from tile topology
    const vertexNeighborsMap = new Map();
    hexMapData.vertices.forEach((v) => {
        vertexNeighborsMap.set(v.index, new Set());
    });

    hexMapData.tiles.forEach((tile) => {
        const vertices = tile.vertices;
        // Each vertex in a quad is neighbor to the next/previous vertex in the quad
        for (let i = 0; i < vertices.length; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % vertices.length];
            vertexNeighborsMap.get(v1.index).add(v2.index);
            vertexNeighborsMap.get(v2.index).add(v1.index);
        }
    });

    // Map depth to vertices with neighbor data
    const mappedVertices = [];

    hexMapData.vertices.forEach((vertex) => {
        // Transform hex coords to depth grid coords
        const gridCoords = hexToDepthGrid(
            vertex.x,
            vertex.y,
            newTopoData.mapping.hexBounds
        );

        // Interpolate depth (convert mm to meters by dividing by 1000)
        const depthMm = interpolateKinectDepth(gridCoords.x, gridCoords.y);
        const elevation = depthMm; // Convert to meters

        // Create vertex with depth as elevation
        const newVertex = {
            index: vertex.index,
            hexCoords: { x: vertex.x, y: vertex.y }, // Vertex constructor expects hexCoords object
            elevation: elevation,
            neighbors: [], // Will populate with edge data
            adjacentFaces: vertex.adjacentFaces,
        };

        mappedVertices.push(newVertex);
    });

    // Calculate edge data with proper distances and slopes
    const vizScale = hexToCanvasScale;

    mappedVertices.forEach((v1) => {
        const neighborIndices = vertexNeighborsMap.get(v1.index);

        neighborIndices.forEach((neighborIndex) => {
            const v2 = mappedVertices[neighborIndex];

            // Calculate distance in hex coordinate space
            const dx = v2.hexCoords.x - v1.hexCoords.x;
            const dy = v2.hexCoords.y - v1.hexCoords.y;
            const distanceHexCoords = Math.sqrt(dx * dx + dy * dy);

            // Convert to canvas pixels
            const distanceCanvasPixels = distanceHexCoords * vizScale;

            // Convert to real-world meters
            const horizontalDistanceMeters =
                distanceCanvasPixels * metersPerCanvasPixel;

            // Calculate elevation difference (already in meters)
            const elevationDiff = v2.elevation - v1.elevation;

            // Calculate slope
            const slope =
                horizontalDistanceMeters > 0
                    ? elevationDiff / horizontalDistanceMeters
                    : 0;

            // Store edge data
            v1.neighbors.push({
                vertexIndex: neighborIndex,
                distanceHexCoords: distanceHexCoords,
                distanceCanvasPixels: distanceCanvasPixels,
                horizontalDistanceMeters: horizontalDistanceMeters,
                elevationDiff: elevationDiff,
                slope: slope,
                slopeAngle: Math.atan(slope) * (180 / Math.PI),
                slopePercent: slope * 100,
            });
        });
    });

    newTopoData.vertices = mappedVertices;

    // Replace topoData and restart simulation
    topoData = newTopoData;

    // Clear all simulation state
    settlements = [];
    settlementNr = 0; // Reset settlement counter
    castleVertices = [];
    habitable = [];
    routes = [];
    travelers = [];
    tradeDestination1 = null;
    tradeDestination2 = null;
    simulationStep = 0;
    isFirstAutoSpawn = true; // Reset first spawn flag
    autoSimulationActive = false; // Stop auto-simulation
    autoSimFrameCounter = 0; // Reset frame counter

    // Stop auto simulation if running
    if (autoSimInterval) {
        clearInterval(autoSimInterval);
        autoSimInterval = null;
        select("#autoSimulate").elt.checked = false;
    }

    // Update auto-sim button state
    const autoSimBtn = select("#autoSimBtn");
    if (autoSimBtn) {
        autoSimBtn.removeClass("active");
    }

    // Reprocess data
    processData();
}

function calculateHexBounds(vertices) {
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

    return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

function hexToDepthGrid(hexX, hexY, bounds) {
    if (!kinectGridSize) return { x: 0, y: 0 };

    const relX = hexX - bounds.minX;
    const relY = hexY - bounds.minY;

    const gridX = (relX / bounds.width) * kinectGridSize;
    const gridY = (relY / bounds.height) * kinectGridSize;

    return { x: gridX, y: gridY };
}

function interpolateKinectDepth(gridX, gridY) {
    if (!kinectDepthData || !kinectGridSize) return 0;

    // Clamp to grid bounds
    gridX = Math.max(0, Math.min(kinectGridSize - 1, gridX));
    gridY = Math.max(0, Math.min(kinectGridSize - 1, gridY));

    // Get integer coordinates
    const x0 = Math.floor(gridX);
    const y0 = Math.floor(gridY);
    const x1 = Math.min(x0 + 1, kinectGridSize - 1);
    const y1 = Math.min(y0 + 1, kinectGridSize - 1);

    // Get fractional parts
    const fx = gridX - x0;
    const fy = gridY - y0;

    // Get depth values at corners, handling missing data
    const d00_raw = kinectDepthData[y0 * kinectGridSize + x0];
    const d10_raw = kinectDepthData[y0 * kinectGridSize + x1];
    const d01_raw = kinectDepthData[y1 * kinectGridSize + x0];
    const d11_raw = kinectDepthData[y1 * kinectGridSize + x1];

    // Collect valid (non-zero, non-null) depth values
    const validDepths = [];
    if (d00_raw && d00_raw !== 0) validDepths.push(Math.abs(d00_raw));
    if (d10_raw && d10_raw !== 0) validDepths.push(Math.abs(d10_raw));
    if (d01_raw && d01_raw !== 0) validDepths.push(Math.abs(d01_raw));
    if (d11_raw && d11_raw !== 0) validDepths.push(Math.abs(d11_raw));

    // If no valid data at any corner, search for nearest valid value
    if (validDepths.length === 0) {
        return findNearestValidDepth(gridX, gridY);
    }

    // Use valid depths or average of valid depths as fallback
    const avgValidDepth =
        validDepths.reduce((a, b) => a + b, 0) / validDepths.length;
    const d00 = d00_raw && d00_raw !== 0 ? Math.abs(d00_raw) : avgValidDepth;
    const d10 = d10_raw && d10_raw !== 0 ? Math.abs(d10_raw) : avgValidDepth;
    const d01 = d01_raw && d01_raw !== 0 ? Math.abs(d01_raw) : avgValidDepth;
    const d11 = d11_raw && d11_raw !== 0 ? Math.abs(d11_raw) : avgValidDepth;

    // Bilinear interpolation
    let depth;
    if (fx + fy < 1) {
        const w0 = 1 - fx - fy;
        const w1 = fx;
        const w2 = fy;
        depth = w0 * d00 + w1 * d10 + w2 * d01;
    } else {
        const w0 = fx + fy - 1;
        const w1 = 1 - fy;
        const w2 = 1 - fx;
        depth = w0 * d11 + w1 * d10 + w2 * d01;
    }

    return depth;
}

function findNearestValidDepth(targetX, targetY) {
    if (!kinectDepthData || !kinectGridSize) return 0;

    // Search in expanding radius for nearest valid depth value
    const maxRadius = Math.max(kinectGridSize / 2, 10);

    for (let radius = 1; radius <= maxRadius; radius++) {
        const validDepths = [];

        // Check points around the circle at this radius
        const numPoints = Math.max(8, radius * 4);
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI;
            const checkX = Math.round(targetX + Math.cos(angle) * radius);
            const checkY = Math.round(targetY + Math.sin(angle) * radius);

            if (
                checkX >= 0 &&
                checkX < kinectGridSize &&
                checkY >= 0 &&
                checkY < kinectGridSize
            ) {
                const depthValue =
                    kinectDepthData[checkY * kinectGridSize + checkX];
                if (depthValue && depthValue !== 0) {
                    validDepths.push(Math.abs(depthValue));
                }
            }
        }

        // If we found valid depths at this radius, return average
        if (validDepths.length > 0) {
            return validDepths.reduce((a, b) => a + b, 0) / validDepths.length;
        }
    }

    // If still no valid depth found, return 0
    return 0;
}

function updateTerrainParameters() {
    const uphillFactor = parseFloat(select("#uphillFactor").value());
    const downhillFactor = parseFloat(select("#downhillFactor").value());
    const flatTerrainCost = parseFloat(select("#flatTerrainCost").value());
    updateProgress(
        `Terrain parameters updated: Uphill=${uphillFactor}, Downhill=${downhillFactor}, Flat=${flatTerrainCost}`
    );
}

function updateWaterLevel() {
    waterLevel = parseFloat(select("#waterLevel").value());
    modeChangeCost = parseFloat(select("#modeChangeCost").value());
    waterTransportFactor = parseFloat(select("#waterTransportFactor").value());
    if (topoData && vertices) {
        vertices.forEach((vertex) => {
            vertex.setWaterStatus(waterLevel);
        });
        // Recalculate movement costs since water status changed
        calculateMovementCosts();
        invalidateBuffers("all");
        redraw();
    }
} // a problem, this function does not update the habitable array, farm values and farmer values etc.

function updateUnhabitableLevel() {
    UnhabitableLevel = parseFloat(select("#unhabitableLevel").value());
    if (topoData && vertices) {
        vertices.forEach((vertex) => {
            // Update habitable status based on elevation and water
            // High elevation vertices are not habitable but still allow pathfinding
            if (vertex.elevation > UnhabitableLevel) {
                vertex.habitable = false;
            } else {
                vertex.habitable = !vertex.water;
            }
        });
        updateProgress(`Uninhabitable level set to ${UnhabitableLevel}m`);
        invalidateBuffers("debug");
        redraw();
    }
}

function processData() {
    updateProgress("Processing topology data...");

    // Clear steep slopes from previous data
    steepSlopes = [];

    // Create or resize canvas to fixed 1920x1080 resolution
    const canvasWidth = 1920;
    const canvasHeight = 1080;

    if (!canvasCreated) {
        // First time: create canvas in 2D mode (default)
        let canvas = createCanvas(canvasWidth, canvasHeight);
        canvas.parent("canvas-container");

        canvasCreated = true;
    } else {
        // Subsequent loads: resize existing canvas
        resizeCanvas(canvasWidth, canvasHeight);
    }

    const scale = topoData.mapping.hexToCanvasScale;
    const metersPerCanvasPixel = topoData.mapping.metersPerCanvasPixel;
    const hexCenterX = topoData.mapping.hexCenter.x;
    const hexCenterY = topoData.mapping.hexCenter.y;

    // Calculate offset to center hex map on canvas
    const offsetX = canvasWidth / 2 - hexCenterX * scale;
    const offsetY = canvasHeight / 2 - hexCenterY * scale;

    // Create Vertex instances from raw data
    vertices = topoData.vertices.map(
        (rawVertex) => new Vertex(rawVertex, scale, metersPerCanvasPixel)
    );

    // Apply centering offset to all vertices
    vertices.forEach((vertex) => {
        vertex.x += offsetX;
        vertex.y += offsetY;
    });

    // Update topoData.vertices reference to point to new Vertex instances
    topoData.vertices = vertices;

    tiles = topoData.tiles;

    // Filter out too-steep slopes and store for debug visualization
    vertices.forEach((vertex) => {
        const validNeighbors = [];
        vertex.neighbors.forEach((neighbor) => {
            // Check if slope is too steep (> 18%)
            if (Math.abs(neighbor.slope) > 0.18) {
                // Store for debug visualization
                const neighborVertex = vertices.find(
                    (v) => v.index === neighbor.vertexIndex
                );
                if (neighborVertex) {
                    steepSlopes.push({
                        from: vertex,
                        to: neighborVertex,
                    });
                }
            } else {
                validNeighbors.push(neighbor);
            }
        });
        vertex.neighbors = validNeighbors;
    });

    // Convert tile centers to canvas pixels (with centering offset)
    topoData.tiles.forEach((tile) => {
        if (tile.center) {
            tile.centerX = tile.center.x * scale + offsetX;
            tile.centerY = tile.center.y * scale + offsetY;
        }
    });

    // Find elevation range
    minElevation = Infinity;
    maxElevation = -Infinity;
    topoData.vertices.forEach((vertex) => {
        if (vertex.elevation < minElevation) minElevation = vertex.elevation;
        if (vertex.elevation > maxElevation) maxElevation = vertex.elevation;
    });

    // Find edge vertices
    findEdgeVertices();

    // Set water status for all vertices
    vertices.forEach((vertex) => {
        vertex.setWaterStatus(waterLevel);
    });

    // Mark high elevation vertices as not habitable
    vertices.forEach((vertex) => {
        if (vertex.elevation > UnhabitableLevel) {
            vertex.habitable = false;
        }
    });

    // Store surrounding tile centers for each vertex
    topoData.tiles.forEach((tile) => {
        tile.vertexIndices.forEach((vIndex) => {
            const vertex = topoData.vertices.find((v) => v.index === vIndex);
            if (vertex && tile.centerX && tile.centerY) {
                vertex.surroundingTiles.push({
                    centerX: tile.centerX,
                    centerY: tile.centerY,
                    tile: tile,
                });
            }
        });
    });

    // Sort surrounding tiles by angle around vertex for proper polygon drawing
    topoData.vertices.forEach((vertex) => {
        if (vertex.surroundingTiles.length > 0) {
            vertex.surroundingTiles.sort((a, b) => {
                const angleA = atan2(
                    a.centerY - vertex.y,
                    a.centerX - vertex.x
                );
                const angleB = atan2(
                    b.centerY - vertex.y,
                    b.centerX - vertex.x
                );
                return angleA - angleB;
            });
        }
    });

    // Calculate movement costs for all edges
    calculateMovementCosts();

    // Initialize simulation values for debug visualization
    initializeSimulationValues();

    // Create hardcoded trade route from vertex 3461 to 2409
    // createHardcodedRoute(3461, 2409); //full res version

    createHardcodedRoute(1018, 100); //half res version

    updateProgress("Map loaded successfully!");
    invalidateBuffers("all");
    redraw();
}

function calculateMovementCosts() {
    vertices.forEach((vertex) => {
        vertex.calculateMovementCosts(modeChangeCost, waterTransportFactor);
    });
}

function findEdgeVertices() {
    edgeVertices = [];
    const bounds = topoData.mapping.hexBounds;
    const threshold = 10;

    topoData.vertices.forEach((vertex) => {
        const x = vertex.hexX;
        const y = vertex.hexY;

        if (
            Math.abs(x - bounds.minX) < threshold ||
            Math.abs(x - bounds.maxX) < threshold ||
            Math.abs(y - bounds.minY) < threshold ||
            Math.abs(y - bounds.maxY) < threshold
        ) {
            edgeVertices.push(vertex);
        }
    });

    // console.log(`Found ${edgeVertices.length} edge vertices`);
}

function drawTilesWithElevation(scale) {
    const vertexMap = new Map();
    topoData.vertices.forEach((v) => vertexMap.set(v.index, v));

    topoData.tiles.forEach((tile) => {
        const vertices = tile.vertexIndices.map((vIndex) =>
            vertexMap.get(vIndex)
        );
        if (vertices.some((v) => !v)) return;

        const elevs = vertices.map((v) => v.elevation);
        const screenVerts = vertices.map((v) => ({
            x: v.x,
            y: v.y,
        }));

        const minTileElev = min(elevs);

        // Use marching squares from external library
        const contourInterval = (maxElevation - minElevation) / 20;

        // Draw all contours, passing water level for color determination
        drawQuadContours(
            drawingContext,
            screenVerts,
            elevs,
            minElevation,
            maxElevation,
            contourInterval,
            waterLevel
        );
    });
}

function drawTileBorders(scale) {
    const vertexMap = new Map();
    topoData.vertices.forEach((v) => vertexMap.set(v.index, v));

    stroke(204);
    strokeWeight(0.3);
    noFill();

    topoData.tiles.forEach((tile) => {
        const vertices = tile.vertexIndices.map((vIndex) =>
            vertexMap.get(vIndex)
        );
        if (vertices.some((v) => !v)) return;

        beginShape();
        for (let v of vertices) {
            vertex(v.x, v.y);
        }
        endShape(CLOSE);
    });
}

function drawTrafficHeatmap(scale) {
    if (!topoData.vertices) return;

    let maxTraffic = 0;
    topoData.vertices.forEach((v) => {
        if (v.traffic > maxTraffic) maxTraffic = v.traffic;
    });

    if (maxTraffic === 0) return;

    topoData.vertices.forEach((vtx) => {
        if (
            vtx.traffic > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            fill(255, 0, 0, 128); // 50% opacity

            beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);

            fill(0);
            textAlign(CENTER, CENTER);
            textSize(10);
            text(round(vtx.traffic * 10) / 10, vtx.x, vtx.y);
        }
    });
}

function drawRoutes(scale) {
    routes.forEach((route) => {
        stroke(255, 255, 0, 204);
        strokeWeight(max(2, route.trafficWeight));
        strokeCap(ROUND);
        strokeJoin(ROUND);
        noFill();

        beginShape();
        for (let vertexIndex of route.path) {
            const v = topoData.vertices.find(
                (vertex) => vertex.index === vertexIndex
            );
            vertex(v.x, v.y);
        }
        endShape();
    });
}

function drawRouteEndpoints(scale) {
    routes.forEach((route) => {
        const startVertex = topoData.vertices.find(
            (v) => v.index === route.start.index
        );
        const endVertex = topoData.vertices.find(
            (v) => v.index === route.end.index
        );

        // Start point (green)
        fill(0, 255, 0);
        stroke(255);
        strokeWeight(2);
        circle(startVertex.x, startVertex.y, 16);

        // End point (red)
        fill(255, 0, 0);
        circle(endVertex.x, endVertex.y, 16);
    });
}

function drawVertices(scale) {
    fill(0);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(10);
    topoData.vertices.forEach((vertex) => {
        circle(vertex.x, vertex.y, 3);
        fill(0, 0, 255);
        text(Math.round(vertex.elevation), vertex.x, vertex.y - 8);
        fill(0);
    });
}

function drawSteepSlopes() {
    stroke(255, 0, 0, 128);
    strokeWeight(1);
    steepSlopes.forEach((connection) => {
        line(
            connection.from.x,
            connection.from.y,
            connection.to.x,
            connection.to.y
        );
    });
}

function drawCentralArea() {
    if (!topoData) return;

    // Use actual canvas dimensions
    const canvasWidth = width; // 2400
    const canvasHeight = height; // 2400

    const minX = canvasWidth * 0.25;
    const maxX = canvasWidth * 0.75;
    const minY = canvasHeight * 0.25;
    const maxY = canvasHeight * 0.75;

    // Draw rectangle showing central area
    noFill();
    stroke(0, 255, 0, 128);
    strokeWeight(3);
    rectMode(CORNERS);
    rect(minX, minY, maxX, maxY);
    rectMode(CORNER);

    // Draw vertices in central area
    noStroke();
    fill(0, 255, 0, 50);
    topoData.vertices.forEach((vertex) => {
        if (
            vertex.x >= minX &&
            vertex.x <= maxX &&
            vertex.y >= minY &&
            vertex.y <= maxY
        ) {
            circle(vertex.x, vertex.y, 8);
        }
    });
}

function drawVertexInspector() {
    if (!selectedVertex) return;

    const v = selectedVertex;

    // Highlight flooded neighbors first (underneath)
    if (v.floodedNeighbors && v.floodedNeighbors.length > 0) {
        fill(100, 200, 255, 100); // Light blue transparent
        noStroke();
        v.floodedNeighbors.forEach((floodedV) => {
            if (
                floodedV.surroundingTiles &&
                floodedV.surroundingTiles.length > 0
            ) {
                beginShape();
                floodedV.surroundingTiles.forEach((tile) => {
                    vertex(tile.centerX, tile.centerY);
                });
                endShape(CLOSE);
            }
        });
    }

    // Highlight vicinity neighbors on top (more visible)
    if (v.vincinityNeighbors && v.vincinityNeighbors.length > 0) {
        fill(255, 200, 100, 120); // Orange transparent
        noStroke();
        v.vincinityNeighbors.forEach((vicinityV) => {
            if (
                vicinityV.surroundingTiles &&
                vicinityV.surroundingTiles.length > 0
            ) {
                beginShape();
                vicinityV.surroundingTiles.forEach((tile) => {
                    vertex(tile.centerX, tile.centerY);
                });
                endShape(CLOSE);
            }
        });
    }

    // Highlight the selected vertex
    if (v.surroundingTiles && v.surroundingTiles.length > 0) {
        fill(255, 255, 0, 150);
        noStroke();
        beginShape();
        v.surroundingTiles.forEach((tile) => {
            vertex(tile.centerX, tile.centerY);
        });
        endShape(CLOSE);
    }

    // Draw a circle at vertex center
    fill(255, 255, 0);
    stroke(0);
    strokeWeight(1);
    circle(v.x, v.y, 15);

    // Prepare property text
    const props = [
        `Index: ${v.index}`,
        `Pos: (${v.x.toFixed(0)}, ${v.y.toFixed(0)})`,
        // `Hex: (${v.hexX}, ${v.hexY})`,
        `Elevation: ${v.elevation.toFixed(0)}m`,
        `Water: ${v.water}`,
        `Occupied: ${v.occupied}`,
        `Habitable: ${v.habitable}`,
        `Defense: ${v.defense.toFixed(0)}`,
        `Security: ${v.security.toFixed(0)}`,
        `Farm Value: ${v.farmValue.toFixed(0)}`,
        `Farmer Value: ${v.farmerValue.toFixed(0)}`,
        `Merchant Value: ${v.merchantValue.toFixed(0)}`,
        `Traffic: ${v.traffic}`,
        `Steepness: ${v.steepness.toFixed(0)}`,
        `Neighbors: ${v.neighbors.length}`,
        `Vicinity: ${v.vincinityNeighbors ? v.vincinityNeighbors.length : 0}`,
        `Flooded: ${v.floodedNeighbors ? v.floodedNeighbors.length : 0}`,
    ];

    // Draw property panel
    const panelX = v.x + 20;
    const panelY = v.y - 10;
    const panelWidth = 200;
    const lineHeight = 16;
    const panelHeight = props.length * lineHeight + 10;

    // Adjust panel position if it goes off canvas
    let finalPanelX = panelX;
    let finalPanelY = panelY;
    if (panelX + panelWidth > width) {
        finalPanelX = v.x - panelWidth - 20;
    }
    if (panelY + panelHeight > height) {
        finalPanelY = height - panelHeight - 10;
    }
    if (finalPanelY < 0) {
        finalPanelY = 10;
    }

    // Draw panel background
    fill(255, 255, 255, 153); // 60% opacity (153/255 = 0.6)
    stroke(0);
    strokeWeight(2);
    rect(finalPanelX, finalPanelY, panelWidth, panelHeight, 5);

    // Draw property text
    fill(0);
    noStroke();
    textAlign(LEFT, TOP);
    textSize(12);
    props.forEach((prop, i) => {
        text(prop, finalPanelX + 5, finalPanelY + 5 + i * lineHeight);
    });

    // Draw neighbor traffic info if neighbors exist
    if (v.neighbors.length > 0) {
        const trafficInfo = v.neighbors
            .filter((n) => n.trafficCount > 0)
            .map((n) => `  → ${n.vertexIndex}: ${n.trafficCount.toFixed(0)}`);

        if (trafficInfo.length > 0) {
            const trafficPanelY = finalPanelY + panelHeight + 5;
            const trafficPanelHeight =
                (trafficInfo.length + 1) * lineHeight + 10;

            fill(255, 255, 200, 240);
            stroke(0);
            strokeWeight(2);
            rect(finalPanelX, trafficPanelY, panelWidth, trafficPanelHeight, 5);

            fill(0);
            noStroke();
            text("Edge Traffic:", finalPanelX + 5, trafficPanelY + 5);
            trafficInfo.forEach((info, i) => {
                text(
                    info,
                    finalPanelX + 5,
                    trafficPanelY + 5 + (i + 1) * lineHeight
                );
            });
        }
    }
}

function updateProgress(message) {
    select("#progress").html(message);
}

function updateSimStats() {
    select("#step-count").html(simulationStep.toString());
}

function runSimulationStep() {
    if (!topoData) {
        alert("Please load map data first!");
        return;
    }

    simulationStep++;
    updateSimStats();

    // First spawn is always a lord
    if (isFirstAutoSpawn) {
        addLordSettlement();
        isFirstAutoSpawn = false;
    } else {
        // Subsequent spawns with probability
        const spawnChance = Math.random();
        if (spawnChance < 0.5) {
            // 50% chance to spawn farmer
            addFarmerSettlement();
        } else if (spawnChance < 0.99) {
            // 49% chance to spawn merchant
            addMerchantSettlement();
        } else {
            // 1% chance to spawn lord
            addLordSettlement();
        }
    }

    updateProgress(`Simulation step ${simulationStep} completed`);
}

function toggleAutoSimulation() {
    const btn = select("#autoSimBtn");

    if (autoSimulationActive) {
        autoSimulationActive = false;
        autoSimFrameCounter = 0;
        btn.removeClass("active");
    } else {
        autoSimulationActive = true;
        autoSimFrameCounter = 0;
        btn.addClass("active");
    }
}

function resetSimulation() {
    simulationStep = 0;
    isFirstAutoSpawn = true;
    autoSimulationActive = false;
    autoSimFrameCounter = 0;
    clearRoutes();
    clearSettlements();

    if (autoSimInterval) {
        clearInterval(autoSimInterval);
        autoSimInterval = null;
        select("#autoSimulate").checked(false);
    }

    const btn = select("#autoSimBtn");
    if (btn) {
        btn.removeClass("active");
        btn.html("▶️ Auto Sim");
    }

    updateSimStats();
    updateProgress("Simulation reset");
}

function addLordSettlement() {
    if (!vertices || vertices.length === 0) {
        alert("Please load map data first!");
        return;
    }

    // Always repopulate habitable array to get current occupation state
    populateHabitableArray();

    createLord();
    updateProgress(`Lord created at step ${simulationStep}`);
    invalidateBuffers("debug");
    invalidateBuffers("static");
    invalidateBuffers("presentation");
    redraw();
}

function addFarmerSettlement() {
    if (!vertices || vertices.length === 0) {
        alert("Please load map data first!");
        return;
    }

    // Always repopulate habitable array to get current occupation state
    populateHabitableArray();

    if (habitable.length === 0) {
        alert("No habitable locations available!");
        return;
    }

    createFarmer();
    updateProgress(`Farmer created at step ${simulationStep}`);
    invalidateBuffers("debug");
    invalidateBuffers("static");
    invalidateBuffers("presentation");
    redraw();
}

function addMerchantSettlement() {
    if (!vertices || vertices.length === 0) {
        alert("Please load map data first!");
        return;
    }

    // Always repopulate habitable array to get current occupation state
    populateHabitableArray();

    if (habitable.length === 0) {
        alert("No habitable locations available!");
        return;
    }

    createMerchant();
    updateProgress(`Merchant created at step ${simulationStep}`);
    invalidateBuffers("debug");
    invalidateBuffers("static");
    invalidateBuffers("presentation");
    redraw();
}

// Buffer-based drawing functions for performance
function drawTilesWithElevationToBuffer(buffer, scale) {
    const vertexMap = new Map();
    topoData.vertices.forEach((v) => vertexMap.set(v.index, v));

    topoData.tiles.forEach((tile) => {
        const vertices = tile.vertexIndices.map((vIndex) =>
            vertexMap.get(vIndex)
        );
        if (vertices.some((v) => !v)) return;

        const elevs = vertices.map((v) => v.elevation);
        const screenVerts = vertices.map((v) => ({
            x: v.x,
            y: v.y,
        }));

        const minTileElev = min(elevs);
        const contourInterval = (maxElevation - minElevation) / 20;

        drawQuadContours(
            buffer.drawingContext,
            screenVerts,
            elevs,
            minElevation,
            maxElevation,
            contourInterval,
            waterLevel
        );
    });
}

function drawPresentationLayerToBuffer(buffer, scale) {
    if (!patternAtlas || patternAtlas.width <= 0 || patternAtlas.height <= 0) {
        console.warn("Pattern atlas not ready");
        return;
    }

    if (!vertices || vertices.length === 0) {
        console.warn("Vertices not ready");
        return;
    }

    const vertexMap = new Map();
    vertices.forEach((v) => vertexMap.set(v.index, v));

    topoData.tiles.forEach((tile) => {
        const tileVertices = tile.vertexIndices.map((vIndex) =>
            vertexMap.get(vIndex)
        );
        if (tileVertices.some((v) => !v)) return;

        // Quad vertices in order: TL, TR, BR, BL (clockwise from top-left)
        const tl = tileVertices[0];
        const tr = tileVertices[1];
        const br = tileVertices[2];
        const bl = tileVertices[3];

        // Get the signature for this quad
        const signature = getQuadSignature(tl, tr, br, bl);

        // Get UV coordinates for the atlas tile
        const uvs = getTileUVs(signature);

        // Draw the textured quad using triangle mapping
        drawTexturedQuad2D(
            buffer,
            patternAtlas,
            tl,
            tr,
            br,
            bl,
            uvs,
            signature
        );
    });
}

function drawTileBordersToBuffer(buffer, scale) {
    const vertexMap = new Map();
    topoData.vertices.forEach((v) => vertexMap.set(v.index, v));

    buffer.noStroke();
    buffer.noFill();

    topoData.tiles.forEach((tile) => {
        const vertices = tile.vertexIndices.map((vIndex) =>
            vertexMap.get(vIndex)
        );
        if (vertices.some((v) => !v)) return;

        buffer.beginShape();
        for (let v of vertices) {
            buffer.vertex(v.x, v.y);
        }
        buffer.endShape(CLOSE);
    });
}

function drawDebugLayerToBuffer(buffer, layerType) {
    buffer.push();

    // Set buffer as current drawing context temporarily
    const originalContext = window;

    if (layerType === "defense") {
        drawDefenseValueToBuffer(buffer);
    } else if (layerType === "security") {
        drawSecurityValueToBuffer(buffer);
    } else if (layerType === "farmValue") {
        drawFarmValueLayerToBuffer(buffer);
    } else if (layerType === "farmerValue") {
        drawFarmerValueLayerToBuffer(buffer);
    } else if (layerType === "merchantValue") {
        drawMerchantValueLayerToBuffer(buffer);
    } else if (layerType === "steepness") {
        drawSteepnessLayerToBuffer(buffer);
    } else if (layerType === "slopeDirection") {
        drawSlopeDirectionLayerToBuffer(buffer);
    } else if (layerType === "habitable") {
        drawHabitableLayerToBuffer(buffer);
    } else if (layerType === "occupied") {
        drawOccupiedLayerToBuffer(buffer);
    } else if (layerType === "trafficCount") {
        drawTrafficCountLayerToBuffer(buffer);
    }

    buffer.pop();
}

function drawTrafficHeatmapToBuffer(buffer, scale) {
    if (!topoData.vertices) return;

    let maxTraffic = 0;
    topoData.vertices.forEach((v) => {
        if (v.traffic > maxTraffic) maxTraffic = v.traffic;
    });

    if (maxTraffic === 0) return;

    // Use logarithmic scale for better contrast
    const maxLog = Math.log(maxTraffic + 1);
    const from = color(255, 255, 0); // Yellow for low traffic
    const to = color(255, 0, 0); // Red for high traffic

    topoData.vertices.forEach((vtx) => {
        if (
            vtx.traffic > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();

            // Logarithmic color mapping for better contrast
            const logValue = Math.log(vtx.traffic + 1);
            const t = logValue / maxLog;
            const fillColor = lerpColor(from, to, t);
            fillColor.setAlpha(128); // 50% opacity
            buffer.fill(fillColor);

            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);

            buffer.fill(0);
            buffer.textAlign(CENTER, CENTER);
            buffer.textSize(10);
            buffer.text(round(vtx.traffic * 10) / 10, vtx.x, vtx.y);
        }
    });

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Traffic");
}

function drawRoutesToBuffer(buffer, scale) {
    routes.forEach((route) => {
        // Random travel routes in red, normal routes in yellow
        if (route.isRandomTravel) {
            buffer.stroke(255, 0, 0, 204); // Red for random travel
        } else {
            buffer.stroke(255, 255, 0, 204); // Yellow for normal routes
        }
        buffer.strokeWeight(max(2, route.trafficWeight));
        buffer.strokeCap(ROUND);
        buffer.strokeJoin(ROUND);
        buffer.noFill();

        buffer.beginShape();
        for (let vertexIndex of route.path) {
            const v = topoData.vertices.find(
                (vertex) => vertex.index === vertexIndex
            );
            if (v) buffer.vertex(v.x, v.y);
        }
        buffer.endShape();
    });
}

function drawVerticesToBuffer(buffer, scale) {
    buffer.fill(0);
    buffer.noStroke();
    topoData.vertices.forEach((v) => {
        buffer.circle(v.x, v.y, 3);
    });
}

function drawRouteEndpointsToBuffer(buffer, scale) {
    if (tradeDestination1) {
        buffer.fill(0, 255, 0);
        buffer.stroke(0);
        buffer.strokeWeight(2);
        buffer.circle(tradeDestination1.x, tradeDestination1.y, 20);
        buffer.fill(0);
        buffer.noStroke();
        buffer.textAlign(CENTER, CENTER);
        buffer.text("TD1", tradeDestination1.x, tradeDestination1.y);
    }

    if (tradeDestination2) {
        buffer.fill(255, 0, 255);
        buffer.stroke(0);
        buffer.strokeWeight(2);
        buffer.circle(tradeDestination2.x, tradeDestination2.y, 20);
        buffer.fill(0);
        buffer.noStroke();
        buffer.textAlign(CENTER, CENTER);
        buffer.text("TD2", tradeDestination2.x, tradeDestination2.y);
    }
}

function drawSteepSlopesToBuffer(buffer) {
    // Steep slopes visualization
}

function drawCentralAreaToBuffer(buffer) {
    if (!topoData) return;
    // Central area only shown when defense layer is active - skip in buffer
}

// Helper function to draw layer name on buffer
function drawLayerNameToBuffer(buffer, layerName) {
    buffer.push();
    buffer.textFont("Georgia"); // Serif font with Roman feel
    buffer.fill(255); // White color
    buffer.noStroke();
    buffer.textAlign(CENTER, CENTER);
    buffer.textSize(48);
    buffer.text(layerName, width / 2, height / 2);
    buffer.pop();
}

// Helper functions to draw debug layers to buffer
function drawDefenseValueToBuffer(buffer) {
    if (!vertices) return;
    let from = color(255, 255, 0, 0);
    let to = color(255, 0, 0, 255);
    buffer.colorMode(RGB);
    let maxDefense = 0;
    vertices.forEach((v) => {
        if (v.defense > maxDefense) maxDefense = v.defense;
    });
    vertices.forEach((v) => {
        if (
            v.defense > 0 &&
            v.surroundingTiles &&
            v.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            let fillColor = lerpColor(from, to, v.defense / maxDefense);
            fillColor.setAlpha(128); // 50% opacity
            buffer.fill(fillColor);
            buffer.beginShape();
            v.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
            buffer.fill(0);
            buffer.textAlign(CENTER, CENTER);
            buffer.textSize(10);
            buffer.text(round(v.defense), v.x, v.y);
        }
    });

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Defense");
}

function drawSecurityValueToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;
    let maxSecurity = 0;
    vertices.forEach((v) => {
        if (v.security > maxSecurity) maxSecurity = v.security;
    });
    if (maxSecurity === 0) return;

    // Linear color gradient for security
    const from = color(255, 255, 200); // Light yellow for low security
    const to = color(255, 100, 0); // Orange for high security

    buffer.colorMode(RGB);
    vertices.forEach((vtx) => {
        if (
            vtx.security > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();

            // Linear color lerp
            const t = vtx.security / maxSecurity;
            const fillColor = lerpColor(from, to, t);
            fillColor.setAlpha(128); // 50% opacity
            buffer.fill(fillColor);

            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
            buffer.fill(0);
            buffer.textAlign(CENTER, CENTER);
            buffer.textSize(10);
            buffer.text(round(vtx.security), vtx.x, vtx.y);
        }
    });

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Security");
}

function drawFarmValueLayerToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;
    let maxFarmValue = 0;
    vertices.forEach((v) => {
        if (v.farmValue > maxFarmValue) maxFarmValue = v.farmValue;
    });
    if (maxFarmValue === 0) return;
    let from = color(255, 255, 255);
    let to = color(120, 255, 100);
    buffer.colorMode(RGB);
    vertices.forEach((vtx) => {
        if (
            vtx.farmValue > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            let fillColor = lerpColor(from, to, vtx.farmValue / maxFarmValue);
            fillColor.setAlpha(128); // 50% opacity
            buffer.fill(fillColor);
            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
            buffer.fill(0);
            buffer.textAlign(CENTER, CENTER);
            buffer.textSize(10);
            buffer.text(round(vtx.farmValue * 10) / 10, vtx.x, vtx.y);
        }
    });

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Farm Value");
}

function drawFarmerValueLayerToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;
    let maxFarmerValue = 0;
    vertices.forEach((v) => {
        if (v.farmerValue > maxFarmerValue) maxFarmerValue = v.farmerValue;
    });
    if (maxFarmerValue === 0) return;
    buffer.colorMode(HSB, 360, 100, 100, 1); // HSB with alpha 0-1
    vertices.forEach((vtx) => {
        if (
            vtx.farmerValue > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            let hue = map(
                sqrt(vtx.farmerValue),
                0,
                sqrt(maxFarmerValue),
                0,
                120
            );
            buffer.fill(hue, 100, 100, 0.5); // 50% opacity
            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
            buffer.fill(0);
            buffer.textAlign(CENTER, CENTER);
            buffer.textSize(10);
            buffer.text(round(vtx.farmerValue * 10) / 10, vtx.x, vtx.y);
        }
    });
    buffer.colorMode(RGB);

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Farmer Value");
}

function drawMerchantValueLayerToBuffer(buffer) {
    // console.log("drawMerchantValueLayerToBuffer called");
    if (!vertices || vertices.length === 0) {
        // console.log("  No vertices available");
        return;
    }

    let maxMerchantValue = 0;
    let verticesWithMerchant = 0;
    let verticesWithTraffic = 0;
    let verticesWithSecurity = 0;

    vertices.forEach((v) => {
        if (v.merchantValue > maxMerchantValue)
            maxMerchantValue = v.merchantValue;
        if (v.merchantValue > 0) verticesWithMerchant++;
        if (v.trafficValue > 0) verticesWithTraffic++;
        if (v.security > 0) verticesWithSecurity++;
    });

    // console.log(`  Max merchant value: ${maxMerchantValue}`);
    // console.log(`  Vertices with merchantValue > 0: ${verticesWithMerchant}`);
    // console.log(`  Vertices with trafficValue > 0: ${verticesWithTraffic}`);
    // console.log(`  Vertices with security > 0: ${verticesWithSecurity}`);

    if (maxMerchantValue === 0) {
        // console.log("  Returning early: maxMerchantValue is 0");
        return;
    }

    // Use logarithmic scale for better contrast
    const maxLog = Math.log(maxMerchantValue + 1);

    buffer.colorMode(HSB, 360, 100, 100, 1); // HSB with alpha 0-1
    vertices.forEach((vtx) => {
        if (
            vtx.merchantValue > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();

            // Logarithmic hue mapping (200 to 300 range: cyan to magenta)
            const logValue = Math.log(vtx.merchantValue + 1);
            const t = logValue / maxLog;
            let hue = map(t, 0, 1, 200, 300);
            buffer.fill(hue % 360, 100, 100, 0.5); // 50% opacity

            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
            buffer.fill(0);
            buffer.textAlign(CENTER, CENTER);
            buffer.textSize(10);
            buffer.text(round(vtx.merchantValue * 10) / 10, vtx.x, vtx.y);
        }
    });
    buffer.colorMode(RGB);

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Merchant Value");
}

function drawSteepnessLayerToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;
    let maxSteepness = 0;
    let verticesWithSteepness = 0;
    vertices.forEach((v) => {
        if (v.steepness !== undefined && v.steepness > 0) {
            verticesWithSteepness++;
            if (v.steepness > maxSteepness) maxSteepness = v.steepness;
        }
    });
    if (verticesWithSteepness === 0 || maxSteepness === 0) return;
    buffer.colorMode(HSB, 360, 100, 100, 1); // HSB with alpha 0-1
    vertices.forEach((vtx) => {
        if (
            vtx.steepness !== undefined &&
            vtx.steepness >= 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            let hue = map(vtx.steepness, 0, maxSteepness, 240, 0);
            buffer.fill(hue, 100, 100, 0.5); // 50% opacity
            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
            if (vtx.steepness > 0) {
                buffer.fill(0);
                buffer.textAlign(CENTER, CENTER);
                buffer.textSize(10);
                buffer.text(round(vtx.steepness * 100) / 100, vtx.x, vtx.y);
            }
        }
    });
    buffer.colorMode(RGB);

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Steepness");
}

function drawSlopeDirectionLayerToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;

    buffer.stroke(255, 0, 255); // Magenta arrows
    buffer.strokeWeight(1);
    buffer.fill(255, 0, 255);

    vertices.forEach((vtx) => {
        if (vtx.slopeDirection !== null && vtx.slopeDirectionMagnitude > 0.01) {
            const arrowLength =
                10 * Math.min(vtx.slopeDirectionMagnitude / 0.1, 2);
            const endX = vtx.x + Math.cos(vtx.slopeDirection) * arrowLength;
            const endY = vtx.y + Math.sin(vtx.slopeDirection) * arrowLength;

            // Draw arrow line
            buffer.line(vtx.x, vtx.y, endX, endY);

            // Draw arrowhead
            const arrowHeadSize = 3;
            const angle1 = vtx.slopeDirection + Math.PI * 0.75;
            const angle2 = vtx.slopeDirection - Math.PI * 0.75;
            buffer.line(
                endX,
                endY,
                endX + Math.cos(angle1) * arrowHeadSize,
                endY + Math.sin(angle1) * arrowHeadSize
            );
            buffer.line(
                endX,
                endY,
                endX + Math.cos(angle2) * arrowHeadSize,
                endY + Math.sin(angle2) * arrowHeadSize
            );
        }
    });

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Slope Direction");
}

function drawHabitableLayerToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;
    buffer.colorMode(RGB);
    vertices.forEach((vtx) => {
        if (
            vtx.habitable &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            buffer.fill(0, 255, 0, 128); // 50% opacity
            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
        }
    });

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Habitable");
}

function drawOccupiedLayerToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;
    buffer.colorMode(RGB);
    vertices.forEach((vtx) => {
        if (
            vtx.occupied &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            buffer.fill(255, 0, 0, 128); // 50% opacity
            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
        }
    });

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Occupied");
}

function drawTrafficCountLayerToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;

    // Calculate total traffic count for each vertex (sum of all edge traffic)
    const vertexTrafficCounts = new Map();
    let maxTrafficCount = 0;

    vertices.forEach((vtx) => {
        let totalTrafficCount = 0;
        vtx.neighbors.forEach((neighbor) => {
            if (neighbor.trafficCount) {
                totalTrafficCount += neighbor.trafficCount;
            }
        });
        vertexTrafficCounts.set(vtx.index, totalTrafficCount);
        if (totalTrafficCount > maxTrafficCount) {
            maxTrafficCount = totalTrafficCount;
        }
    });

    if (maxTrafficCount === 0) return; // Nothing to show

    buffer.colorMode(HSB, 360, 100, 100, 1); // HSB with alpha 0-1
    vertices.forEach((vtx) => {
        const trafficCount = vertexTrafficCounts.get(vtx.index);
        if (
            trafficCount > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            // Blue to red gradient based on traffic intensity
            let hue = map(trafficCount, 0, maxTrafficCount, 240, 0);
            buffer.fill(hue, 100, 100, 0.5); // 50% opacity

            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);

            buffer.fill(0);
            buffer.textAlign(CENTER, CENTER);
            buffer.textSize(12);
            buffer.text(round(trafficCount * 10) / 10, vtx.x, vtx.y);
        }
    });
    buffer.colorMode(RGB);

    // Draw layer name
    drawLayerNameToBuffer(buffer, "Traffic Count");
}
