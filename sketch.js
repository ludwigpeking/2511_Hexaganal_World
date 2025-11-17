// Global variables
let topoData = null;
let vertices = [];
let tiles = [];
let minElevation = 0;
let maxElevation = 0;
let edgeVertices = [];
let simulationStep = 0;
let autoSimInterval = null;
let canvasScale = 1;
let waterLevel = 10;
let modeChangeCost = 50;
let waterTransportFactor = 0.01;
let steepSlopes = []; // Array of {from: vertex, to: vertex} for debug visualization

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
    select("#populateBtn").mousePressed(() => autoPopulate(10));
    select("#runStepBtn").mousePressed(runSimulationStep);
    select("#clearRoutesBtn").mousePressed(clearRoutes);
    select("#resetSimBtn").mousePressed(resetSimulation);

    select("#autoSimulate").changed(toggleAutoSimulation);
    select("#showElevation").changed(() => redraw());
    select("#showVertices").changed(() => redraw());
    select("#showTraffic").changed(() => redraw());
    select("#showDefense").changed(() => redraw());
    select("#showSecurity").changed(() => redraw());
    select("#showFarmValue").changed(() => redraw());
    select("#showFarmerValue").changed(() => redraw());
    select("#showMerchantValue").changed(() => redraw());
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

    background(255);

    const scale = topoData.mapping.hexToCanvasScale;
    const showElevation = select("#showElevation").checked();
    const showVertices = select("#showVertices").checked();
    const showTraffic = select("#showTraffic").checked();
    const showDefense = select("#showDefense").checked();
    const showSecurity = select("#showSecurity").checked();
    const showFarmValue = select("#showFarmValue").checked();
    const showFarmerValue = select("#showFarmerValue").checked();
    const showMerchantValue = select("#showMerchantValue").checked();

    // Draw tiles with elevation
    if (showElevation) {
        drawTilesWithElevation(scale);
    }

    // Draw tile borders
    drawTileBorders(scale);

    // Draw debug layers
    if (showDefense) drawDefenseValue();
    if (showSecurity) drawSecurityValue();
    if (showFarmValue) drawFarmValueLayer();
    if (showFarmerValue) drawFarmerValueLayer();
    if (showMerchantValue) drawMerchantValueLayer();

    // Draw traffic heatmap
    if (showTraffic) {
        drawTrafficHeatmap(scale);
    }

    // Draw settlements
    drawSettlements();

    // Draw routes
    drawRoutes(scale);

    // Draw vertices
    if (showVertices) {
        drawVertices(scale);
    }

    // Draw start/end markers
    drawRouteEndpoints(scale);

    // Draw steep slopes debug visualization
    drawSteepSlopes();

    // Draw central area debug visualization
    drawCentralArea();
}

function mouseClicked() {
    // Could implement manual start/end point selection here
    if (!topoData) return;
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
    if (topoData) {
        topoData.vertices.forEach((vertex) => {
            vertex.water = vertex.elevation <= waterLevel;
        });
        // Recalculate movement costs since water status changed
        calculateMovementCosts();
        redraw();
    }
}

function processData() {
    updateProgress("Processing topology data...");

    // Clear steep slopes from previous data
    steepSlopes = [];

    const scale = topoData.mapping.hexToCanvasScale;

    // Make vertices and tiles globally accessible
    vertices = topoData.vertices;
    tiles = topoData.tiles;

    // Convert all vertex coordinates to canvas pixels
    topoData.vertices.forEach((vertex) => {
        // Store original hex coordinates
        vertex.hexX = vertex.hexCoords.x;
        vertex.hexY = vertex.hexCoords.y;

        // Convert to canvas pixels
        vertex.x = vertex.hexCoords.x * scale;
        vertex.y = vertex.hexCoords.y * scale;

        // Convert neighbor distances to pixels and filter out too-steep slopes
        const validNeighbors = [];
        vertex.neighbors.forEach((neighbor) => {
            neighbor.distance =
                neighbor.horizontalDistanceMeters /
                topoData.mapping.metersPerCanvasPixel;

            // Check if slope is too steep (> 18%)
            if (Math.abs(neighbor.slope) > 0.18) {
                // Store for debug visualization
                const neighborVertex = topoData.vertices.find(
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

    // Initialize vertex traffic and water values
    topoData.vertices.forEach((vertex) => {
        vertex.traffic = 0;
        vertex.water = vertex.elevation <= waterLevel;
        vertex.g = Infinity;
        vertex.h = 0;
        vertex.f = Infinity;
        vertex.from = null;
        vertex.surroundingTiles = []; // Store tiles that contain this vertex
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
    redraw();
}

function calculateMovementCosts() {
    topoData.vertices.forEach((vertex) => {
        vertex.neighbors.forEach((neighbor) => {
            const neighborVertex = topoData.vertices.find(
                (v) => v.index === neighbor.vertexIndex
            );
            if (!neighborVertex) return;

            const fromWater = vertex.water;
            const toWater = neighborVertex.water;
            const distance = neighbor.distance;
            const slope = neighbor.slope;

            let moveCost;

            if (!fromWater && !toWater) {
                // Land to land

                moveCost = distance * Math.pow(1 + abs(slope), 8);
            } else if (fromWater !== toWater) {
                // Land to water or water to land
                moveCost = distance * (1 + modeChangeCost);
            } else {
                // Water to water
                moveCost = distance * waterTransportFactor;
            }

            neighbor.moveCost = moveCost;
        });
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
    noStroke();
    topoData.vertices.forEach((vertex) => {
        if (vertex.traffic > 0) {
            const radius = sqrt(vertex.traffic) * 8;
            fill(255, 0, 0, min(153, vertex.traffic * 25.5));
            circle(vertex.x, vertex.y, radius * 2);
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
