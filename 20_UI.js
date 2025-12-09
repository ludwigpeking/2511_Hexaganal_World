/**
 * UI Module
 * Handles all user interface interactions including:
 * - Mouse-based placement and deletion of game objects
 * - Layer button controls
 * - Round button dual-click functionality
 * - Tooltip management
 */

// Button tooltips/tips configuration
const BUTTON_TIPS = {
    toggleDebug: "Debug Panel",
    autoSim: "Auto Simulation",
    road: "Road Mode",
    castle: "Castle Mode | Add a Castle",
    farmer: "Farmer Mode | Add a Farmer",
    merchant: "Merchant Mode | Add a Merchant",
    delete: "Delete Mode",
};

// Mouse interaction state
let mouseMode = null; // 'road', 'castle', 'farmer', 'merchant', 'delete', or null
let mouseModeButtons = {};
let hoveredVertex = null; // Track currently hovered vertex

/**
 * Initialize mouse interaction UI
 * Call this from setup() after DOM is ready
 */
function initializeMousePlayUI() {
    // Get the caste container to insert buttons before it
    const casteContainer = document.getElementById("caste-group");
    if (!casteContainer) {
        // console.error("Caste group container not found");
        return;
    }

    // Create mouse mode button group container
    const mouseModeContainer = document.createElement("div");
    mouseModeContainer.id = "mouse-mode-group";
    mouseModeContainer.style.marginBottom = "15px";

    // Create title
    const title = document.createElement("div");
    title.innerHTML = "<strong>Mouse Tool:</strong>";
    title.style.marginBottom = "5px";
    mouseModeContainer.appendChild(title);

    // Create button container
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.flexDirection = "column";
    buttonContainer.style.gap = "5px";

    // Define buttons
    const buttons = [
        { id: "road", label: "🛤️ Road", mode: "road" },
        { id: "castle", label: "🏰 Castle", mode: "castle" },
        { id: "farmer", label: "👨‍🌾 Farmer", mode: "farmer" },
        { id: "merchant", label: "🏪 Merchant", mode: "merchant" },
        { id: "delete", label: "🗑️ Delete", mode: "delete" },
    ];

    // Create buttons
    buttons.forEach((btnConfig) => {
        const btn = document.createElement("button");
        btn.id = `mouseMode-${btnConfig.id}`;
        btn.textContent = btnConfig.label;
        btn.style.padding = "8px 12px";
        btn.style.border = "1px solid #000";
        btn.style.backgroundColor = "#fff";
        btn.style.color = "#000";
        btn.style.cursor = "pointer";

        btn.addEventListener("click", () => setMouseMode(btnConfig.mode));

        mouseModeButtons[btnConfig.mode] = btn;
        buttonContainer.appendChild(btn);
    });

    mouseModeContainer.appendChild(buttonContainer);

    // Insert before caste container
    casteContainer.parentNode.insertBefore(mouseModeContainer, casteContainer);

    // console.log("Mouse play UI initialized");
}

/**
 * Set the current mouse mode
 * @param {string} mode - 'road', 'castle', 'farmer', 'merchant', 'delete', or null
 */
function setMouseMode(mode) {
    // Toggle off if clicking the same mode
    if (mouseMode === mode) {
        mouseMode = null;
    } else {
        mouseMode = mode;
    }

    // Update button styles
    Object.keys(mouseModeButtons).forEach((btnMode) => {
        const btn = mouseModeButtons[btnMode];
        if (btnMode === mouseMode) {
            btn.style.backgroundColor = "#aaa";
        } else {
            btn.style.backgroundColor = "#fff";
        }
    });

    // Update status message
    if (mouseMode) {
        const modeLabels = {
            road: "Place Road",
            castle: "Place Castle",
            farmer: "Place Farmer",
            merchant: "Place Merchant",
            delete: "Delete Owner",
        };
        updateProgress(`Mouse Tool: ${modeLabels[mouseMode]} (click vertex)`);
    } else {
        updateProgress("Mouse Tool: None");
    }
}

/**
 * Handle mouse clicks on canvas for placing/deleting objects
 * Call this from mousePressed() in main sketch
 */
/**
 * Update hovered vertex based on mouse position
 * Call this from draw() to continuously update hover state
 */
function updateHoveredVertex() {
    if (!mouseMode || !vertices || vertices.length === 0) {
        hoveredVertex = null;
        return;
    }

    // Find closest vertex to mouse position
    let closestVertex = null;
    let minDistance = Infinity;
    const maxDistance = 30; // Maximum hover distance in pixels

    vertices.forEach((v) => {
        const dx = v.x - mouseX;
        const dy = v.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance && dist < maxDistance) {
            minDistance = dist;
            closestVertex = v;
        }
    });

    hoveredVertex = closestVertex;
}

/**
 * Draw highlight around hovered vertex's polygon
 * Draws a quad connecting the centers of surrounding tiles
 */
function drawHoveredVertexHighlight() {
    if (!hoveredVertex || !hoveredVertex.surroundingTiles) return;
    if (hoveredVertex.surroundingTiles.length === 0) return;

    // Draw quad through tile centers
    push();
    noFill();
    stroke(255, 255, 150, 200); // Light yellow highlight
    strokeWeight(3);
    beginShape();
    hoveredVertex.surroundingTiles.forEach((tile) => {
        vertex(tile.centerX, tile.centerY);
    });
    endShape(CLOSE);
    pop();
}

function handleMousePlayClick() {
    if (!mouseMode || !vertices || vertices.length === 0) {
        return false; // Not handled
    }

    // Find closest vertex to mouse click
    let closestVertex = null;
    let minDistance = Infinity;
    const maxDistance = 30; // Maximum click distance in pixels

    vertices.forEach((v) => {
        const dx = v.x - mouseX;
        const dy = v.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance && dist < maxDistance) {
            minDistance = dist;
            closestVertex = v;
        }
    });

    if (!closestVertex) {
        return false; // No vertex nearby
    }

    // Handle the action based on mode
    switch (mouseMode) {
        case "road":
            placeRoad(closestVertex);
            break;
        case "castle":
            placeCastle(closestVertex);
            break;
        case "farmer":
            placeFarmer(closestVertex);
            break;
        case "merchant":
            placeMerchant(closestVertex);
            break;
        case "delete":
            deleteOwner(closestVertex);
            break;
    }

    // Redraw canvas
    invalidateBuffers("all");
    redraw();

    return true; // Handled
}

/**
 * Place a road on a vertex
 */
function placeRoad(vertex) {
    if (!vertex) return;
    if (vertex.water) return; // Silently ignore water vertices

    // Roads aren't settlements, they're part of routes
    // For now, just mark vertex as occupied by a "road" placeholder
    vertex.occupied = true;
    vertex.occupiedByRoute = true;
    // console.log(`Placed road marker at vertex ${vertex.index}`);

    updateProgress(`Road marker placed at vertex ${vertex.index}`);
}

/**
 * Place a castle on a vertex
 */
function placeCastle(vertex) {
    if (!vertex) return;
    if (vertex.occupied) {
        updateProgress(`Vertex ${vertex.index} is already occupied!`);
        return;
    }
    if (vertex.water) {
        updateProgress(`Cannot place castle on water!`);
        return;
    }

    const lord = new Settlement(vertex, "Lord");
    settlements.push(lord);
    castleVertices.push(vertex);
    lord.createAnnexes();

    // console.log(`Placed castle at vertex ${vertex.index}`);
    updateProgress(`Castle placed at vertex ${vertex.index}`);
}

/**
 * Place a farmer on a vertex
 */
function placeFarmer(vertex) {
    if (!vertex) return;
    if (vertex.occupied) {
        updateProgress(`Vertex ${vertex.index} is already occupied!`);
        return;
    }
    if (vertex.water) {
        updateProgress(`Cannot place farmer on water!`);
        return;
    }

    const farmer = new Settlement(vertex, "Farmer");
    settlements.push(farmer);
    farmer.createGardens(); // Farmers create gardens, not annexes

    // console.log(`Placed farmer at vertex ${vertex.index}`);
    updateProgress(`Farmer placed at vertex ${vertex.index}`);
}

/**
 * Place a merchant on a vertex
 */
function placeMerchant(vertex) {
    if (!vertex) return;
    if (vertex.occupied) {
        updateProgress(`Vertex ${vertex.index} is already occupied!`);
        return;
    }
    if (vertex.water) {
        updateProgress(`Cannot place merchant on water!`);
        return;
    }

    const merchant = new Settlement(vertex, "Merchant");
    settlements.push(merchant);
    // Merchants don't create annexes or gardens

    // console.log(`Placed merchant at vertex ${vertex.index}`);
    updateProgress(`Merchant placed at vertex ${vertex.index}`);
}

/**
 * Delete owner from a vertex
 */
function deleteOwner(vertex) {
    if (!vertex) return;

    // Check if this is a castle annex (clicked on annex itself, not the lord)
    if (vertex.castleAnnex && !vertex.occupiedBy) {
        // Just clear this individual annex
        vertex.occupied = false;
        vertex.castleAnnex = null;
        vertex.habitable = !vertex.water;
        updateProgress(`Deleted castle annex from vertex ${vertex.index}`);
        return;
    }

    // Check if this is a garden (clicked on garden itself, not the farmer)
    if (vertex.garden && !vertex.occupiedBy) {
        // Just clear this individual garden
        vertex.garden = null;
        updateProgress(`Deleted garden from vertex ${vertex.index}`);
        return;
    }

    // Find settlement at this vertex
    const settlementIndex = settlements.findIndex(
        (s) => s.vertex.index === vertex.index
    );

    if (settlementIndex !== -1) {
        const settlement = settlements[settlementIndex];

        // Remove annexes if it's a Lord
        if (settlement.profession === "Lord") {
            // Clear all castle annexes
            if (
                vertex.vincinityNeighbors &&
                vertex.vincinityNeighbors.length > 0
            ) {
                vertex.vincinityNeighbors.forEach((annexVertex) => {
                    annexVertex.occupied = false;
                    annexVertex.castleAnnex = null;
                    annexVertex.habitable = !annexVertex.water;
                });
            }

            // Remove from castleVertices
            const castleIndex = castleVertices.findIndex(
                (v) => v.index === vertex.index
            );
            if (castleIndex !== -1) {
                castleVertices.splice(castleIndex, 1);
            }
        }

        // Remove gardens if it's a Farmer
        if (settlement.profession === "Farmer") {
            if (
                vertex.vincinityNeighbors &&
                vertex.vincinityNeighbors.length > 0
            ) {
                vertex.vincinityNeighbors.forEach((gardenVertex) => {
                    if (gardenVertex.garden === settlement) {
                        gardenVertex.garden = null;
                    }
                });
            }
        }

        // Clear occupation
        vertex.occupied = false;
        vertex.occupiedBy = null;
        vertex.occupiedByRoute = false;

        // Remove settlement
        settlements.splice(settlementIndex, 1);

        // console.log(
        //     `Deleted ${settlement.profession} from vertex ${vertex.index}`
        // );
        updateProgress(
            `Deleted ${settlement.profession} from vertex ${vertex.index}`
        );
    } else if (vertex.occupiedByRoute) {
        // Just clear route marker
        vertex.occupied = false;
        vertex.occupiedByRoute = false;
        // console.log(`Deleted road marker from vertex ${vertex.index}`);
        updateProgress(`Deleted road marker from vertex ${vertex.index}`);
    } else {
        updateProgress(`Vertex ${vertex.index} has no settlement to delete`);
    }
}

/**
 * Get the current mouse mode
 */
function getMouseMode() {
    return mouseMode;
}

/**
 * Check if mouse play mode is active
 */
function isMousePlayActive() {
    return mouseMode !== null;
}

// ============================================
// Layer Button Management
// ============================================

// Layer button state management
let activeExclusiveLayer = null;
let layerStates = {
    vertexInspector: false,
    defense: false,
    security: false,
    farmValue: false,
    farmerValue: false,
    trafficWeight: false,
    merchantValue: false,
    steepness: false,
    slopeDirection: false,
    trafficCount: false,
    habitable: false,
    occupied: false,
    routes: false,
    presentation: true,
    elevation: true,
    water: true,
};

// Demonstration mode state
let demonstrationMode = false;
let demoFrameCounter = 0;
let demoCurrentLayerIndex = 0;
let demoShowingLayer = false; // true = showing layer, false = off interval
const DEMO_INTERVAL = 120; // frames for each on/off cycle

// Exclusive layers array for demonstration mode
const EXCLUSIVE_LAYERS = [
    { id: "layerDefense", key: "defense" },
    { id: "layerSecurity", key: "security" },
    { id: "layerFarmValue", key: "farmValue" },
    { id: "layerFarmerValue", key: "farmerValue" },
    { id: "layerTrafficWeight", key: "trafficWeight" },
    { id: "layerMerchantValue", key: "merchantValue" },
    { id: "layerSteepness", key: "steepness" },
    { id: "layerSlopeDirection", key: "slopeDirection" },
    { id: "layerTrafficCount", key: "trafficCount" },
    { id: "layerHabitable", key: "habitable" },
    { id: "layerOccupied", key: "occupied" },
    { id: "layerRoutes", key: "routes" },
];

function setupLayerButtons() {
    // Vertex Inspector (independent, always on top)
    select("#layerVertexInspector").mousePressed(() => {
        layerStates.vertexInspector = !layerStates.vertexInspector;
        updateLayerButtonState(
            "layerVertexInspector",
            layerStates.vertexInspector
        );
        redraw();
    });

    // Demonstration mode button
    select("#layerDemonstration").mousePressed(() => {
        toggleDemonstrationMode();
    });

    // Mutually exclusive layers
    EXCLUSIVE_LAYERS.forEach((layer) => {
        select(`#${layer.id}`).mousePressed(() => {
            // Disable demonstration mode if user manually clicks a layer
            if (demonstrationMode) {
                toggleDemonstrationMode();
            }
            toggleExclusiveLayer(layer.id, layer.key);
        });
    });

    // Independent layers
    select("#layerPresentation").mousePressed(() => {
        layerStates.presentation = !layerStates.presentation;
        updateLayerButtonState("layerPresentation", layerStates.presentation);
        invalidateBuffers("presentation");
        redraw();
    });

    select("#layerElevation").mousePressed(() => {
        layerStates.elevation = !layerStates.elevation;
        updateLayerButtonState("layerElevation", layerStates.elevation);
        redraw();
    });

    select("#layerWater").mousePressed(() => {
        layerStates.water = !layerStates.water;
        updateLayerButtonState("layerWater", layerStates.water);
        redraw();
    });
}

function toggleExclusiveLayer(buttonId, layerKey) {
    // If clicking the same layer, turn it off
    if (activeExclusiveLayer === layerKey) {
        layerStates[layerKey] = false;
        activeExclusiveLayer = null;
        updateLayerButtonState(buttonId, false);
    } else {
        // Turn off previous layer
        if (activeExclusiveLayer) {
            layerStates[activeExclusiveLayer] = false;
            const prevButtonId = getButtonIdForLayer(activeExclusiveLayer);
            if (prevButtonId) updateLayerButtonState(prevButtonId, false);
        }
        // Turn on new layer
        layerStates[layerKey] = true;
        activeExclusiveLayer = layerKey;
        updateLayerButtonState(buttonId, true);
    }
    redraw();
}

function getButtonIdForLayer(layerKey) {
    const mapping = {
        defense: "layerDefense",
        security: "layerSecurity",
        farmValue: "layerFarmValue",
        farmerValue: "layerFarmerValue",
        trafficWeight: "layerTrafficWeight",
        merchantValue: "layerMerchantValue",
        steepness: "layerSteepness",
        slopeDirection: "layerSlopeDirection",
        trafficCount: "layerTrafficCount",
        habitable: "layerHabitable",
        occupied: "layerOccupied",
        routes: "layerRoutes",
    };
    return mapping[layerKey];
}

function updateLayerButtonState(buttonId, isActive) {
    const btn = select(`#${buttonId}`);
    if (btn) {
        if (isActive) {
            btn.addClass("active");
        } else {
            btn.removeClass("active");
        }
    }
}

/**
 * Toggle demonstration mode on/off
 */
function toggleDemonstrationMode() {
    demonstrationMode = !demonstrationMode;

    const btn = select("#layerDemonstration");
    if (btn) {
        if (demonstrationMode) {
            btn.addClass("active");
            // Reset demo state
            demoFrameCounter = 0;
            demoCurrentLayerIndex = 0;
            demoShowingLayer = true;
            // Turn off any currently active layer
            if (activeExclusiveLayer) {
                layerStates[activeExclusiveLayer] = false;
                const prevButtonId = getButtonIdForLayer(activeExclusiveLayer);
                if (prevButtonId) updateLayerButtonState(prevButtonId, false);
                activeExclusiveLayer = null;
            }
        } else {
            btn.removeClass("active");
            // Turn off current demo layer
            if (
                demoShowingLayer &&
                demoCurrentLayerIndex < EXCLUSIVE_LAYERS.length
            ) {
                const currentLayer = EXCLUSIVE_LAYERS[demoCurrentLayerIndex];
                layerStates[currentLayer.key] = false;
                updateLayerButtonState(currentLayer.id, false);
                activeExclusiveLayer = null;
            }
        }
    }
    redraw();
}

/**
 * Update demonstration mode animation
 * Call this from draw() every frame
 */
function updateDemonstrationMode() {
    if (!demonstrationMode) return;

    demoFrameCounter++;

    if (demoFrameCounter >= DEMO_INTERVAL) {
        demoFrameCounter = 0;

        const currentLayer = EXCLUSIVE_LAYERS[demoCurrentLayerIndex];

        if (demoShowingLayer) {
            // Turn off current layer
            layerStates[currentLayer.key] = false;
            updateLayerButtonState(currentLayer.id, false);
            activeExclusiveLayer = null;
            demoShowingLayer = false;
        } else {
            // Move to next layer and turn it on
            demoCurrentLayerIndex =
                (demoCurrentLayerIndex + 1) % EXCLUSIVE_LAYERS.length;
            const nextLayer = EXCLUSIVE_LAYERS[demoCurrentLayerIndex];

            layerStates[nextLayer.key] = true;
            updateLayerButtonState(nextLayer.id, true);
            activeExclusiveLayer = nextLayer.key;
            demoShowingLayer = true;
        }

        redraw();
    }
}

// ============================================
// Round Button Management
// ============================================

// Dual-click button tracking
let clickTimers = {};
const DOUBLE_CLICK_DELAY = 300; // milliseconds

/**
 * Setup a button with both single-click (toggle mode) and double-click (execute action) handlers
 */
function setupDualClickButton(buttonId, mode, doubleClickAction) {
    const button = select(buttonId);
    if (!button) return;

    button.elt.addEventListener("click", (e) => {
        const buttonKey = buttonId;

        if (clickTimers[buttonKey]) {
            // This is a double-click - clear timer and execute action
            clearTimeout(clickTimers[buttonKey]);
            delete clickTimers[buttonKey];
            doubleClickAction();
        } else {
            // This is a single click - wait to see if double-click follows
            clickTimers[buttonKey] = setTimeout(() => {
                delete clickTimers[buttonKey];
                toggleMouseMode(mode);
            }, DOUBLE_CLICK_DELAY);
        }
    });
}

/**
 * Apply tooltips from BUTTON_TIPS to HTML buttons
 */
function applyButtonTooltips() {
    const tooltipMap = {
        "#toggleDebugBtn": BUTTON_TIPS.toggleDebug,
        "#autoSimBtn": BUTTON_TIPS.autoSim,
        "#mouseModeRoad": BUTTON_TIPS.road,
        "#mouseModeCastle": BUTTON_TIPS.castle,
        "#mouseModeFarmer": BUTTON_TIPS.farmer,
        "#mouseModeMerchant": BUTTON_TIPS.merchant,
        "#mouseModeDelete": BUTTON_TIPS.delete,
    };

    Object.entries(tooltipMap).forEach(([selector, tooltip]) => {
        const btn = select(selector);
        if (btn) {
            btn.attribute("title", tooltip);
        }
    });
}

function toggleMouseMode(mode) {
    // Toggle mouse mode - if same mode clicked, turn off
    if (mouseMode === mode) {
        setMouseMode(null);
        // Remove active class from all mouse mode buttons
        select("#mouseModeRoad").removeClass("active");
        select("#mouseModeCastle").removeClass("active");
        select("#mouseModeFarmer").removeClass("active");
        select("#mouseModeMerchant").removeClass("active");
        select("#mouseModeDelete").removeClass("active");
    } else {
        setMouseMode(mode);
        // Update button visual states
        select("#mouseModeRoad").removeClass("active");
        select("#mouseModeCastle").removeClass("active");
        select("#mouseModeFarmer").removeClass("active");
        select("#mouseModeMerchant").removeClass("active");
        select("#mouseModeDelete").removeClass("active");

        // Add active class to clicked button
        if (mode === "road") select("#mouseModeRoad").addClass("active");
        else if (mode === "castle")
            select("#mouseModeCastle").addClass("active");
        else if (mode === "farmer")
            select("#mouseModeFarmer").addClass("active");
        else if (mode === "merchant")
            select("#mouseModeMerchant").addClass("active");
        else if (mode === "delete")
            select("#mouseModeDelete").addClass("active");
    }
}
