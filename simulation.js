// Simulation-related global variables
let settlements = [];
let settlementNr = 0;
let castleVertices = [];
let habitable = [];
let minBuffer = 5;
let professions = ["Lord", "Farmer", "Merchant"];
let farmerRange = 50; // in canvas pixels
let waterAccessDist = 30; // in canvas pixels

// Value system
// Lord: defense (from terrain); considers traffic
// Farmer: security, farm value
// Merchant: security, traffic

class Settlement {
    constructor(vertex, profession) {
        this.vertex = vertex;
        this.profession = profession;
        this.nr = settlementNr++;
        this.trafficWeight =
            profession === "Merchant" || profession === "Lord" ? 3 : 1;
        this.buffer =
            profession === "Lord" ? 2 : profession === "Farmer" ? 1 : 0;
        this.color = this.getProfessionColor();

        vertex.occupied = true;
        vertex.occupiedBy = this;
        vertex.attrition = 500;

        // Remove from habitable
        habitable = habitable.filter((v) => v.index !== vertex.index);

        // Mark neighbors as occupied
        vertex.neighbors.forEach((neighbor) => {
            const neighborVertex = vertices.find(
                (v) => v.index === neighbor.vertexIndex
            );
            if (neighborVertex) {
                neighborVertex.occupied = true;
            }
        });
    }

    getProfessionColor() {
        switch (this.profession) {
            case "Lord":
                return { r: 255, g: 255, b: 255 };
            case "Farmer":
                return {
                    r: 120 + random(50),
                    g: 120 + random(50),
                    b: 50 + random(50),
                };
            case "Merchant":
                return {
                    r: 220 + random(35),
                    g: 130 + random(70),
                    b: 50 + random(50),
                };
            default:
                return { r: 200, g: 200, b: 200 };
        }
    }

    makeBuffer() {
        // Mark vertices within buffer distance as occupied and not habitable
        vertices.forEach((v) => {
            const dx = v.x - this.vertex.x;
            const dy = v.y - this.vertex.y;
            const distance = sqrt(dx * dx + dy * dy);

            if (distance <= this.buffer * 20) {
                // buffer * approximate vertex spacing
                v.buffer = true;
                v.occupied = true; // Buffer zones are also occupied
                v.habitable = false;
                habitable = habitable.filter((hab) => hab.index !== v.index);
            }
        });
    }

    show() {
        const v = this.vertex;

        if (!v.surroundingTiles || v.surroundingTiles.length === 0) {
            console.warn(
                "Settlement",
                this.nr,
                this.profession,
                "has no surrounding tiles"
            );
            // Still draw symbol even without polygon
            this.drawSymbol();
            return;
        }

        colorMode(RGB);
        noStroke();
        fill(this.color.r, this.color.g, this.color.b, 150);

        // Draw polygon using surrounding tile centers
        beginShape();
        v.surroundingTiles.forEach((tile) => {
            vertex(tile.centerX, tile.centerY);
        });
        endShape(CLOSE);

        // Draw symbol on top
        this.drawSymbol();
    }

    drawSymbol() {
        const v = this.vertex;
        strokeWeight(2);
        stroke(0);
        fill(this.color.r, this.color.g, this.color.b);

        switch (this.profession) {
            case "Lord":
                // Castle symbol
                rectMode(CENTER);
                rect(v.x, v.y, 20, 20);
                circle(v.x - 10, v.y - 10, 8);
                circle(v.x + 10, v.y - 10, 8);
                circle(v.x - 10, v.y + 10, 8);
                circle(v.x + 10, v.y + 10, 8);
                circle(v.x, v.y, 12);
                rectMode(CORNER);
                break;
            case "Farmer":
                // House symbol
                rectMode(CENTER);
                rect(v.x, v.y, 12, 12);
                rectMode(CORNER);
                break;
            case "Merchant":
                // Shop symbol
                rectMode(CENTER);
                rect(v.x, v.y, 10, 14);
                rectMode(CORNER);
                break;
        }
    }
}

function initializeSimulationValues() {
    if (!vertices || vertices.length === 0) return;

    console.log("Initializing simulation values for debug visualization");

    // Initialize all vertex values
    vertices.forEach((vertex) => {
        vertex.defense = 0;
        vertex.farmValue = 0;
        vertex.merchantValue = 0;
        vertex.security = 0;
        vertex.trafficValue = vertex.traffic || 0;
        vertex.farmerValue = 0;

        if (vertex.occupied === undefined) {
            vertex.occupied = false;
        }

        vertex.buffer = false;
        vertex.habitable = !vertex.water;
    });

    // Build temporary habitable list for defense calculation
    const tempHabitable = vertices.filter((v) => v.habitable && !v.occupied);

    // Calculate defense values based on terrain
    vertices.forEach((vertex) => {
        if (!vertex.habitable) return;

        // Defense increases with elevation and roughness
        let defenseValue = vertex.elevation * 2;

        // Check neighbors for elevation difference (roughness)
        let totalElevDiff = 0;
        let neighborCount = 0;
        vertex.neighbors.forEach((neighbor) => {
            const neighborVertex = vertices.find(
                (v) => v.index === neighbor.vertexIndex
            );
            if (neighborVertex) {
                totalElevDiff += Math.abs(neighbor.elevationDiff || 0);
                neighborCount++;
            }
        });

        if (neighborCount > 0) {
            const avgRoughness = totalElevDiff / neighborCount;
            defenseValue += avgRoughness * 10;
        }

        vertex.defense = defenseValue;
    });

    // Calculate initial farm values based on terrain
    calculateInitialFarmValues();

    console.log("Simulation values initialized");
}

function calculateInitialFarmValues() {
    // Calculate farm value based on elevation and water access only
    // (no settlements exist yet)
    vertices.forEach((vertex) => {
        if (vertex.water || vertex.elevation > 100) {
            vertex.farmValue = 0;
            return;
        }

        let farmVal = 1;

        // Bonus for moderate elevation (flat-ish land)
        if (vertex.elevation < 50) {
            farmVal *= 1.5;
        }

        // Check for water access
        let hasWaterAccess = false;
        vertices.forEach((v) => {
            if (v.water) {
                const dx = v.x - vertex.x;
                const dy = v.y - vertex.y;
                const dist = sqrt(dx * dx + dy * dy);
                if (dist <= waterAccessDist) {
                    hasWaterAccess = true;
                }
            }
        });

        if (hasWaterAccess) farmVal *= 2;

        vertex.farmValue = farmVal;
        vertex.farmerNr = 0;
    });
}

function initializeHabitable() {
    habitable = [];
    vertices.forEach((vertex) => {
        vertex.defense = 0;
        vertex.farmValue = 0;
        vertex.merchantValue = 0;
        vertex.security = 0;
        vertex.trafficValue = vertex.traffic || 0;
        vertex.farmerValue = 0;

        // Don't reset occupied if already set (e.g., by routes)
        if (vertex.occupied === undefined) {
            vertex.occupied = false;
        }

        vertex.buffer = false;
        vertex.habitable = !vertex.water; // Water vertices are not habitable

        // Only add to habitable if both habitable AND not occupied
        if (vertex.habitable && !vertex.occupied) {
            habitable.push(vertex);
        }
    });

    // Calculate defense values based on terrain
    calculateDefenseValues();
}

function calculateDefenseValues() {
    vertices.forEach((vertex) => {
        if (!vertex.habitable) return;

        // Defense increases with elevation and roughness
        let defenseValue = vertex.elevation * 2;

        // Check neighbors for elevation difference (roughness)
        let totalElevDiff = 0;
        let neighborCount = 0;
        vertex.neighbors.forEach((neighbor) => {
            const neighborVertex = vertices.find(
                (v) => v.index === neighbor.vertexIndex
            );
            if (neighborVertex) {
                totalElevDiff += Math.abs(neighbor.elevationDiff || 0);
                neighborCount++;
            }
        });

        if (neighborCount > 0) {
            const avgRoughness = totalElevDiff / neighborCount;
            defenseValue += avgRoughness * 10;
        }

        vertex.defense = defenseValue;
    });
}

function autoPopulate(steps) {
    if (!vertices || vertices.length === 0) {
        console.error("No vertices data available");
        alert("Please load map data first!");
        return;
    }

    console.log("Starting autoPopulate with", steps, "steps");
    console.log("Vertices available:", vertices.length);

    initializeHabitable();

    console.log("Habitable vertices:", habitable.length);

    // First create a Lord
    createLord();
    console.log("Lord created, settlements:", settlements.length);

    // Then create other settlements
    for (let i = 0; i < steps; i++) {
        let dice = random(1);
        if (dice < 0.4) {
            createMerchant();
            console.log("Merchant created, total:", settlements.length);
        } else {
            createFarmer();
            console.log("Farmer created, total:", settlements.length);
        }
    }

    console.log("Final settlement count:", settlements.length);
    updateProgress(`Created ${settlements.length} settlements`);
    redraw();
}
function createLord() {
    if (habitable.length === 0) {
        console.error("No habitable vertices for Lord");
        return;
    }

    console.log("Creating Lord from", habitable.length, "habitable vertices");

    // Use p5.js built-in width and height variables
    const canvasWidth = width;
    const canvasHeight = height;

    // Define central area bounds (middle 50% of map)
    const minX = canvasWidth * 0.25;
    const maxX = canvasWidth * 0.75;
    const minY = canvasHeight * 0.25;
    const maxY = canvasHeight * 0.75;

    // Filter habitable vertices to only central area
    const centralHabitable = habitable.filter(
        (v) => v.x >= minX && v.x <= maxX && v.y >= minY && v.y <= maxY
    );

    if (centralHabitable.length === 0) {
        console.warn(
            "No habitable vertices in central area, using all habitable"
        );
        centralHabitable.push(...habitable);
    }

    console.log("Central habitable vertices:", centralHabitable.length);

    // Find vertex with highest defense value in central area
    centralHabitable.sort((a, b) => b.defense - a.defense);
    const castleVertex = centralHabitable[0];

    console.log(
        "Castle vertex selected:",
        castleVertex.index,
        "defense:",
        castleVertex.defense,
        "position:",
        castleVertex.x.toFixed(0),
        castleVertex.y.toFixed(0)
    );

    const lord = new Settlement(castleVertex, "Lord");
    settlements.push(lord);
    castleVertices.push(castleVertex);

    console.log("Lord settlement created");

    // Create routes to edge vertices if they exist
    if (edgeVertices.length >= 2) {
        const start = edgeVertices[0];
        const end = edgeVertices[edgeVertices.length - 1];
        pathFinding(castleVertex, start, lord.trafficWeight);
        pathFinding(castleVertex, end, lord.trafficWeight);
        console.log("Lord routes created to edge vertices");
    }

    lord.makeBuffer();

    // Cast security to the realm
    habitable.forEach((v) => {
        const dx = v.x - castleVertex.x;
        const dy = v.y - castleVertex.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > 0) {
            v.security += 100 / distSq;
        }
    });

    calculateFarmValue();
}

function createFarmer() {
    if (habitable.length === 0) return;

    calculateFarmValue();

    // Find vertex with highest farmer value
    habitable.sort((a, b) => b.farmerValue - a.farmerValue);
    const farmerVertex = habitable[0];

    const farmer = new Settlement(farmerVertex, "Farmer");
    settlements.push(farmer);

    // Create route to castle if exists
    if (castleVertices.length > 0) {
        pathFinding(farmerVertex, castleVertices[0], farmer.trafficWeight * 2);
    }

    farmer.makeBuffer();

    // Increase security in surrounding area
    vertices.forEach((v) => {
        const dx = v.x - farmerVertex.x;
        const dy = v.y - farmerVertex.y;
        const dist = sqrt(dx * dx + dy * dy);
        if (dist <= farmerRange && dist > 0) {
            v.security += 5 / (dist * dist);
        }
    });

    calculateFarmValue();
}

function createMerchant() {
    if (habitable.length === 0) return;

    calculateMerchantValue();

    // Find vertex with highest merchant value
    habitable.sort((a, b) => b.merchantValue - a.merchantValue);
    const merchantVertex = habitable[0];

    const merchant = new Settlement(merchantVertex, "Merchant");
    settlements.push(merchant);

    // Create routes to important locations
    if (edgeVertices.length >= 2) {
        const start = edgeVertices[0];
        const end = edgeVertices[edgeVertices.length - 1];
        pathFinding(merchantVertex, start, merchant.trafficWeight);
        pathFinding(merchantVertex, end, merchant.trafficWeight);
    }
    if (castleVertices.length > 0) {
        pathFinding(
            merchantVertex,
            castleVertices[0],
            merchant.trafficWeight * 2
        );
    }

    merchant.makeBuffer();

    // Increase security in surrounding area
    vertices.forEach((v) => {
        const dx = v.x - merchantVertex.x;
        const dy = v.y - merchantVertex.y;
        const dist = sqrt(dx * dx + dy * dy);
        if (dist <= farmerRange && dist > 0) {
            v.security += 5 / (dist * dist);
        }
    });
}

function calculateFarmValue() {
    // Reset farm values
    vertices.forEach((v) => {
        v.farmValue = 0;
        v.farmerNr = 0;
    });

    // Calculate farm value based on elevation, water, and existing farmers
    vertices.forEach((vertex) => {
        if (vertex.water || vertex.elevation > 100) return; // Too high or underwater

        let farmVal = 1;

        // Check for water access
        let hasWaterAccess = false;
        vertices.forEach((v) => {
            if (v.water) {
                const dx = v.x - vertex.x;
                const dy = v.y - vertex.y;
                const dist = sqrt(dx * dx + dy * dy);
                if (dist <= waterAccessDist) {
                    hasWaterAccess = true;
                }
            }
        });

        if (hasWaterAccess) farmVal *= 2;

        // Check for existing farmers nearby
        let nearbyFarmers = 0;
        settlements.forEach((s) => {
            if (s.profession === "Farmer") {
                const dx = s.vertex.x - vertex.x;
                const dy = s.vertex.y - vertex.y;
                const dist = sqrt(dx * dx + dy * dy);
                if (dist <= farmerRange) {
                    nearbyFarmers++;
                }
            }
        });

        vertex.farmerNr = nearbyFarmers;
        farmVal = farmVal / (1 + nearbyFarmers);

        vertex.farmValue = farmVal;
    });

    // Calculate farmer preference value
    habitable.forEach((v) => {
        v.farmerValue = v.farmValue * sqrt(v.security);
    });
}

function calculateMerchantValue() {
    habitable.forEach((v) => {
        v.merchantValue = v.security * v.trafficValue;
    });
}

// Debug visualization functions
function drawDefenseValue() {
    if (!vertices) return;

    let from = color(255, 255, 0, 0);
    let to = color(255, 0, 0, 255);
    colorMode(RGB);

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
            noStroke();
            let fillColor = lerpColor(from, to, v.defense / maxDefense);
            fill(fillColor);

            beginShape();
            v.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);

            fill(0);
            textAlign(CENTER, CENTER);
            textSize(10);
            text(round(v.defense), v.x, v.y);
        }
    });
}

function drawSecurityValue() {
    if (!vertices || vertices.length === 0) return;

    let maxSecurity = 0;
    vertices.forEach((v) => {
        if (v.security > maxSecurity) maxSecurity = v.security;
    });

    if (maxSecurity === 0) return; // Nothing to show

    vertices.forEach((vtx) => {
        if (
            vtx.security > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            colorMode(RGB);
            fill(255, 200, 0, map(vtx.security, 0, maxSecurity, 0, 200));

            beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);

            fill(0);
            textAlign(CENTER, CENTER);
            textSize(10);
            text(round(vtx.security), vtx.x, vtx.y);
        }
    });
}

function drawFarmValueLayer() {
    if (!vertices || vertices.length === 0) return;

    let maxFarmValue = 0;
    vertices.forEach((v) => {
        if (v.farmValue > maxFarmValue) maxFarmValue = v.farmValue;
    });

    if (maxFarmValue === 0) return; // Nothing to show

    colorMode(HSB);
    vertices.forEach((vtx) => {
        if (
            vtx.farmValue > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            fill(
                120 - map(vtx.farmValue, 0, maxFarmValue, 0, 120),
                100,
                100,
                150
            );

            beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);

            fill(0);
            textAlign(CENTER, CENTER);
            textSize(10);
            text(round(vtx.farmValue * 10) / 10, vtx.x, vtx.y);
        }
    });
    colorMode(RGB);
}

function drawFarmerValueLayer() {
    if (!vertices || vertices.length === 0) return;

    let maxFarmerValue = 0;
    vertices.forEach((v) => {
        if (v.farmerValue > maxFarmerValue) maxFarmerValue = v.farmerValue;
    });

    if (maxFarmerValue === 0) return; // Nothing to show

    colorMode(HSB);
    vertices.forEach((vtx) => {
        if (
            vtx.farmerValue > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            let hue = map(
                sqrt(vtx.farmerValue),
                0,
                sqrt(maxFarmerValue),
                0,
                120
            );
            fill(hue, 100, 100, 150);

            beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);

            fill(0);
            textAlign(CENTER, CENTER);
            textSize(10);
            text(round(vtx.farmerValue * 10) / 10, vtx.x, vtx.y);
        }
    });
    colorMode(RGB);
}

function drawMerchantValueLayer() {
    if (!vertices || vertices.length === 0) return;

    let maxMerchantValue = 0;
    vertices.forEach((v) => {
        if (v.merchantValue > maxMerchantValue)
            maxMerchantValue = v.merchantValue;
    });

    if (maxMerchantValue === 0) return; // Nothing to show

    colorMode(HSB);
    vertices.forEach((vtx) => {
        if (
            vtx.merchantValue > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            let hue = map(vtx.merchantValue, 0, maxMerchantValue, 200, 300);
            fill(hue % 360, 100, 100, 150);

            beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);

            fill(0);
            textAlign(CENTER, CENTER);
            textSize(10);
            text(round(vtx.merchantValue * 10) / 10, vtx.x, vtx.y);
        }
    });
    colorMode(RGB);
}

function drawSettlements() {
    if (!settlements || settlements.length === 0) {
        return;
    }

    console.log("Drawing", settlements.length, "settlements");

    settlements.forEach((settlement, index) => {
        try {
            settlement.show();
        } catch (error) {
            console.error("Error drawing settlement", index, ":", error);
        }
    });
}

function clearSettlements() {
    settlements = [];
    settlementNr = 0;
    castleVertices = [];
    habitable = [];

    if (vertices) {
        vertices.forEach((v) => {
            v.occupied = false;
            v.buffer = false;
            v.habitable = !v.water;
            v.defense = 0;
            v.farmValue = 0;
            v.merchantValue = 0;
            v.security = 0;
            v.farmerValue = 0;
        });
    }
}
