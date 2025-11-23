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
let modeChangeCost = 50;
let waterTransportFactor = 0.01;
let steepSlopes = []; // Array of {from: vertex, to: vertex} for debug visualization
let selectedVertex = null; // For vertex inspection tool

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

function setup() {
    let canvas = createCanvas(2400, 2400);
    canvas.parent("canvas-container");
    noLoop(); // We'll redraw manually when needed

    // Set up event listeners
    select("#loadFileBtn").mousePressed(() => {
        select("#fileInput").elt.click();
    });

    select("#fileInput").elt.addEventListener("change", loadCustomFile);

    select("#createRouteBtn").mousePressed(createRandomRoute);
    select("#addLordBtn").mousePressed(addLordSettlement);
    select("#addFarmerBtn").mousePressed(addFarmerSettlement);
    select("#addMerchantBtn").mousePressed(addMerchantSettlement);
    select("#clearRoutesBtn").mousePressed(clearRoutes);
    select("#resetSimBtn").mousePressed(resetSimulation);

    select("#autoSimulate").changed(toggleAutoSimulation);
    select("#showElevation").changed(() => redraw());
    select("#showVertices").changed(() => redraw());
    select("#showTraffic").changed(() => redraw());
    select("#showBuildings").changed(() => redraw());
    select("#showRoutes").changed(() => redraw());
    select("#showDefense").changed(() => redraw());
    select("#showSecurity").changed(() => redraw());
    select("#showFarmValue").changed(() => redraw());
    select("#showFarmerValue").changed(() => redraw());
    select("#showMerchantValue").changed(() => redraw());
    select("#showSteepness").changed(() => redraw());
    select("#showHabitable").changed(() => redraw());
    select("#showOccupied").changed(() => redraw());
    select("#showVertexInspector").changed(() => redraw());
    select("#setTerrainParamsBtn").mousePressed(updateTerrainParameters);
    select("#setWaterLevelBtn").mousePressed(updateWaterLevel);

    // Load default map
    loadDefaultMap();
}

function draw() {
    if (!topoData) {
        background(255);
        return;
    }

    // Initialize buffers if needed
    if (!elevationBuffer) {
        elevationBuffer = createGraphics(width, height);
        tilesBuffer = createGraphics(width, height);
        debugLayersBuffer = createGraphics(width, height);
        staticContentBuffer = createGraphics(width, height);
    }

    const scale = topoData.mapping.hexToCanvasScale;
    const showElevation = select("#showElevation").checked();
    const showVertices = select("#showVertices").checked();
    const showTraffic = select("#showTraffic").checked();
    const showBuildings = select("#showBuildings").checked();
    const showRoutes = select("#showRoutes").checked();
    const showDefense = select("#showDefense").checked();
    const showSecurity = select("#showSecurity").checked();
    const showFarmValue = select("#showFarmValue").checked();
    const showFarmerValue = select("#showFarmerValue").checked();
    const showMerchantValue = select("#showMerchantValue").checked();
    const showSteepness = select("#showSteepness").checked();
    const showHabitable = select("#showHabitable").checked();
    const showOccupied = select("#showOccupied").checked();
    const showVertexInspector = select("#showVertexInspector").checked();

    // Check if debug layers state changed
    const debugState = {
        showDefense,
        showSecurity,
        showFarmValue,
        showFarmerValue,
        showMerchantValue,
        showSteepness,
        showHabitable,
        showOccupied,
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
        showRoutes,
        showVertices,
    };
    const staticStateChanged =
        JSON.stringify(staticState) !== JSON.stringify(lastStaticState);
    if (staticStateChanged) {
        needsRedrawStatic = true;
        lastStaticState = staticState;
    }

    background(255);

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
    image(tilesBuffer, 0, 0);

    // Draw debug layers (cached when state doesn't change)
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
        if (showHabitable)
            drawDebugLayerToBuffer(debugLayersBuffer, "habitable");
        if (showOccupied) drawDebugLayerToBuffer(debugLayersBuffer, "occupied");
        needsRedrawDebugLayers = false;
    }
    if (
        showDefense ||
        showSecurity ||
        showFarmValue ||
        showFarmerValue ||
        showMerchantValue ||
        showSteepness ||
        showHabitable ||
        showOccupied
    ) {
        image(debugLayersBuffer, 0, 0);
    }

    // Draw static content (cached when simulation state doesn't change)
    if (needsRedrawStatic) {
        staticContentBuffer.clear();
        if (showTraffic) drawTrafficHeatmapToBuffer(staticContentBuffer, scale);
        if (showRoutes) drawRoutesToBuffer(staticContentBuffer, scale);
        if (showVertices) drawVerticesToBuffer(staticContentBuffer, scale);
        drawRouteEndpointsToBuffer(staticContentBuffer, scale);
        drawSteepSlopesToBuffer(staticContentBuffer);
        drawCentralAreaToBuffer(staticContentBuffer);
        needsRedrawStatic = false;
    }
    image(staticContentBuffer, 0, 0);

    // Draw dynamic content (always redrawn)
    if (showBuildings) {
        drawSettlements();
    }

    // Draw vertex inspector (always on top, always fresh)
    if (showVertexInspector && selectedVertex) {
        drawVertexInspector();
    }
}

function invalidateBuffers(which = "all") {
    if (which === "all" || which === "elevation") needsRedrawElevation = true;
    if (which === "all" || which === "tiles") needsRedrawTiles = true;
    if (which === "all" || which === "debug") needsRedrawDebugLayers = true;
    if (which === "all" || which === "static") needsRedrawStatic = true;
}

function mouseClicked() {
    if (!topoData || !vertices || vertices.length === 0) return;

    const showVertexInspector = select("#showVertexInspector").checked();
    if (!showVertexInspector) return;

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
}

async function loadDefaultMap() {
    updateProgress("Loading default map...");
    try {
        const response = await fetch("results/topo_3.json");
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
}

function processData() {
    updateProgress("Processing topology data...");

    // Clear steep slopes from previous data
    steepSlopes = [];

    const scale = topoData.mapping.hexToCanvasScale;
    const metersPerCanvasPixel = topoData.mapping.metersPerCanvasPixel;

    // Create Vertex instances from raw data
    vertices = topoData.vertices.map(
        (rawVertex) => new Vertex(rawVertex, scale, metersPerCanvasPixel)
    );

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

    // Convert tile centers to canvas pixels
    topoData.tiles.forEach((tile) => {
        if (tile.center) {
            tile.centerX = tile.center.x * scale;
            tile.centerY = tile.center.y * scale;
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
    createHardcodedRoute(3461, 2409);

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

    console.log(`Found ${edgeVertices.length} edge vertices`);
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
            fill(255, 0, 0, map(vtx.traffic, 0, maxTraffic, 0, 200));

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
    strokeWeight(2);
    circle(v.x, v.y, 15);

    // Prepare property text
    const props = [
        `Index: ${v.index}`,
        `Pos: (${v.x.toFixed(0)}, ${v.y.toFixed(0)})`,
        `Hex: (${v.hexX}, ${v.hexY})`,
        `Elevation: ${v.elevation.toFixed(1)}m`,
        `Water: ${v.water}`,
        `Occupied: ${v.occupied}`,
        `Habitable: ${v.habitable}`,
        `Defense: ${v.defense.toFixed(1)}`,
        `Security: ${v.security.toFixed(2)}`,
        `Farm Value: ${v.farmValue.toFixed(2)}`,
        `Farmer Value: ${v.farmerValue.toFixed(2)}`,
        `Merchant Value: ${v.merchantValue.toFixed(2)}`,
        `Traffic: ${v.traffic}`,
        `Steepness: ${v.steepness.toFixed(3)}`,
        `Neighbors: ${v.neighbors.length}`,
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
    fill(255, 255, 255, 240);
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
            .map((n) => `  → ${n.vertexIndex}: ${n.trafficCount.toFixed(1)}`);

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
    updateProgress(`Simulation step ${simulationStep} completed`);

    if (simulationStep % 5 === 0 && routes.length < 10) {
        createRandomRoute();
    }
}

function toggleAutoSimulation() {
    const isEnabled = select("#autoSimulate").checked();

    if (isEnabled) {
        if (!topoData) {
            alert("Please load map data first!");
            select("#autoSimulate").checked(false);
            return;
        }

        const speed = parseInt(select("#simSpeed").value());
        const interval = 1000 / speed;

        autoSimInterval = setInterval(runSimulationStep, interval);
        updateProgress("Auto-simulation enabled");
    } else {
        if (autoSimInterval) {
            clearInterval(autoSimInterval);
            autoSimInterval = null;
        }
        updateProgress("Auto-simulation disabled");
    }
}

function resetSimulation() {
    simulationStep = 0;
    clearRoutes();
    clearSettlements();

    if (autoSimInterval) {
        clearInterval(autoSimInterval);
        autoSimInterval = null;
        select("#autoSimulate").checked(false);
    }

    updateSimStats();
    updateProgress("Simulation reset");
}

function addLordSettlement() {
    if (!vertices || vertices.length === 0) {
        alert("Please load map data first!");
        return;
    }

    // Initialize habitable if not already done
    if (habitable.length === 0) {
        initializeHabitable();
    }

    createLord();
    updateProgress(`Lord created at step ${simulationStep}`);
    invalidateBuffers("debug");
    invalidateBuffers("static");
    redraw();
}

function addFarmerSettlement() {
    if (!vertices || vertices.length === 0) {
        alert("Please load map data first!");
        return;
    }

    // Initialize habitable if not already done
    if (habitable.length === 0) {
        initializeHabitable();
    }

    if (habitable.length === 0) {
        alert("No habitable locations available!");
        return;
    }

    createFarmer();
    updateProgress(`Farmer created at step ${simulationStep}`);
    invalidateBuffers("debug");
    invalidateBuffers("static");
    redraw();
}

function addMerchantSettlement() {
    if (!vertices || vertices.length === 0) {
        alert("Please load map data first!");
        return;
    }

    // Initialize habitable if not already done
    if (habitable.length === 0) {
        initializeHabitable();
    }

    if (habitable.length === 0) {
        alert("No habitable locations available!");
        return;
    }

    createMerchant();
    updateProgress(`Merchant created at step ${simulationStep}`);
    invalidateBuffers("debug");
    invalidateBuffers("static");
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

function drawTileBordersToBuffer(buffer, scale) {
    const vertexMap = new Map();
    topoData.vertices.forEach((v) => vertexMap.set(v.index, v));

    buffer.stroke(204);
    buffer.strokeWeight(0.3);
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
    } else if (layerType === "habitable") {
        drawHabitableLayerToBuffer(buffer);
    } else if (layerType === "occupied") {
        drawOccupiedLayerToBuffer(buffer);
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

    topoData.vertices.forEach((vtx) => {
        if (
            vtx.traffic > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            buffer.fill(255, 0, 0, map(vtx.traffic, 0, maxTraffic, 0, 200));

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
}

function drawRoutesToBuffer(buffer, scale) {
    routes.forEach((route) => {
        buffer.stroke(255, 255, 0, 204);
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
}

function drawSecurityValueToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;
    let maxSecurity = 0;
    vertices.forEach((v) => {
        if (v.security > maxSecurity) maxSecurity = v.security;
    });
    if (maxSecurity === 0) return;
    buffer.colorMode(RGB);
    vertices.forEach((vtx) => {
        if (
            vtx.security > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            buffer.fill(255, 200, 0, map(vtx.security, 0, maxSecurity, 0, 200));
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
}

function drawFarmerValueLayerToBuffer(buffer) {
    if (!vertices || vertices.length === 0) return;
    let maxFarmerValue = 0;
    vertices.forEach((v) => {
        if (v.farmerValue > maxFarmerValue) maxFarmerValue = v.farmerValue;
    });
    if (maxFarmerValue === 0) return;
    buffer.colorMode(HSB);
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
            buffer.fill(hue, 100, 100, 150);
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
}

function drawMerchantValueLayerToBuffer(buffer) {
    console.log("drawMerchantValueLayerToBuffer called");
    if (!vertices || vertices.length === 0) {
        console.log("  No vertices available");
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

    console.log(`  Max merchant value: ${maxMerchantValue}`);
    console.log(`  Vertices with merchantValue > 0: ${verticesWithMerchant}`);
    console.log(`  Vertices with trafficValue > 0: ${verticesWithTraffic}`);
    console.log(`  Vertices with security > 0: ${verticesWithSecurity}`);

    if (maxMerchantValue === 0) {
        console.log("  Returning early: maxMerchantValue is 0");
        return;
    }
    buffer.colorMode(HSB);
    vertices.forEach((vtx) => {
        if (
            vtx.merchantValue > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            let hue = map(vtx.merchantValue, 0, maxMerchantValue, 200, 300);
            buffer.fill(hue % 360, 100, 100, 150);
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
    buffer.colorMode(HSB);
    vertices.forEach((vtx) => {
        if (
            vtx.steepness !== undefined &&
            vtx.steepness >= 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            buffer.noStroke();
            let hue = map(vtx.steepness, 0, maxSteepness, 240, 0);
            buffer.fill(hue, 100, 100, 150);
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
            buffer.fill(0, 255, 0, 100);
            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
        }
    });
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
            buffer.fill(255, 0, 0, 150);
            buffer.beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                buffer.vertex(tile.centerX, tile.centerY);
            });
            buffer.endShape(CLOSE);
        }
    });
}
