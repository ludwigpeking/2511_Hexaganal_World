/**
 * Mouse Interaction Module
 * Provides mouse-based placement and deletion of game objects
 */

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

    // Find settlement at this vertex
    const settlementIndex = settlements.findIndex(
        (s) => s.vertex.index === vertex.index
    );

    if (settlementIndex !== -1) {
        const settlement = settlements[settlementIndex];

        // Remove annexes if it's a Lord
        if (settlement.profession === "Lord") {
            // Remove from castleVertices
            const castleIndex = castleVertices.findIndex(
                (v) => v.index === vertex.index
            );
            if (castleIndex !== -1) {
                castleVertices.splice(castleIndex, 1);
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
