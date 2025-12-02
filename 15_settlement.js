// Simulation-related global variables
let settlements = [];
let settlementNr = 0;
let castleVertices = [];
let habitable = [];
let minBuffer = 5;
let professions = ["Lord", "Farmer", "Merchant"];
let farmerRange = 50; // in canvas pixels
let waterAccessDist = 200; // in canvas pixels
let FARM_ELEVATION_THRESHOLD = 150; // Elevation above which farming is not viable
let farmerValueRadius = 200; // Radius for farmer value calculation
let FARMER_MOVE_COST_RANGE = 100; // Movement cost budget for farmer value calculation
let VINCINITY_MOVE_COST_RANGE = 40; // Movement cost budget for vicinity calculation
let vertexQuadtree = null; // Quadtree for spatial queries
// Note: tradeDestination1 and tradeDestination2 are defined in sketch.js

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
            profession === "Lord" ? 6 : profession === "Merchant" ? 2 : 1;
        this.color = this.getProfessionColor();

        vertex.occupied = true;
        vertex.occupiedBy = this;
        vertex.occupiedByRoute = false; // Settlement vertices can have routes start/end here
        vertex.attrition = 500;

        // Update presentation layer if enabled
        if (
            typeof showPresentation !== "undefined" &&
            showPresentation &&
            typeof redrawVertexQuads !== "undefined" &&
            presentationBuffer &&
            patternAtlas
        ) {
            const vertexMap = new Map();
            topoData.vertices.forEach((v) => vertexMap.set(v.index, v));
            redrawVertexQuads(
                presentationBuffer,
                patternAtlas,
                vertex,
                topoData.tiles,
                vertexMap
            );
        }

        // Remove from habitable
        habitable = habitable.filter((v) => v.index !== vertex.index);
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

    createAnnexes() {
        // Lord: Mark vicinity neighbors as castle annexes (occupied, blocked from pathfinding)
        if (
            this.vertex.vincinityNeighbors &&
            this.vertex.vincinityNeighbors.length > 0
        ) {
            this.vertex.vincinityNeighbors.forEach((v) => {
                v.occupied = true;
                v.castleAnnex = this; // Reference to the lord that owns this annex
                v.habitable = false;
                habitable = habitable.filter((hab) => hab.index !== v.index);
            });
        }
    }

    createGardens() {
        // Farmer: Mark vicinity neighbors as gardens (not occupied, open to pathfinding)
        // Only create gardens on unoccupied vertices
        if (
            this.vertex.vincinityNeighbors &&
            this.vertex.vincinityNeighbors.length > 0
        ) {
            this.vertex.vincinityNeighbors.forEach((v) => {
                if (!v.occupied) {
                    console.log(v);
                    v.garden = this; // Reference to the farmer that owns this garden
                    // Do NOT mark as occupied - gardens are open to pathfinding and settlement
                }
            });
        }
    }

    show() {
        const v = this.vertex;
        colorMode(RGB);

        // Draw castle annexes for Lord (solid white)
        if (
            this.profession === "Lord" &&
            v.vincinityNeighbors &&
            v.vincinityNeighbors.length > 0
        ) {
            noStroke();
            fill(255, 255, 255); // Solid white for annexes
            v.vincinityNeighbors.forEach((annexVertex) => {
                if (
                    annexVertex.surroundingTiles &&
                    annexVertex.surroundingTiles.length > 0
                ) {
                    beginShape();
                    annexVertex.surroundingTiles.forEach((tile) => {
                        vertex(tile.centerX, tile.centerY);
                    });
                    endShape(CLOSE);
                }
            });
        }

        // Draw gardens for Farmer (green)
        if (
            this.profession === "Farmer" &&
            v.vincinityNeighbors &&
            v.vincinityNeighbors.length > 0
        ) {
            noStroke();
            fill(50, 255, 120); // Green for gardens
            v.vincinityNeighbors.forEach((gardenVertex) => {
                if (
                    gardenVertex.garden === this &&
                    gardenVertex.surroundingTiles &&
                    gardenVertex.surroundingTiles.length > 0
                ) {
                    beginShape();
                    gardenVertex.surroundingTiles.forEach((tile) => {
                        vertex(tile.centerX, tile.centerY);
                    });
                    endShape(CLOSE);
                }
            });
        }

        // Draw main settlement polygon
        if (this.profession === "Lord") {
            // Lord: solid white with black stroke
            stroke(0);
            strokeWeight(2);
            fill(255, 255, 255);
        } else {
            // Farmer and Merchant: colored polygon
            noStroke();
            fill(this.color.r, this.color.g, this.color.b);
        }

        beginShape();
        v.surroundingTiles.forEach((tile) => {
            vertex(tile.centerX, tile.centerY);
        });
        endShape(CLOSE);
    }

    drawSymbol() {
        // No longer drawing symbols - settlements are shown as polygons
    }
}

function initializeSimulationValues() {
    if (!vertices || vertices.length === 0) return;

    console.log("Initializing simulation values for debug visualization");

    // Initialize all vertex values
    vertices.forEach((vertex) => {
        vertex.security = 1; // Base security value of 1 to allow farmers/merchants before Lord
        vertex.trafficValue = vertex.traffic || 0;

        if (vertex.occupied === undefined) {
            vertex.occupied = false;
        }

        vertex.buffer = false;
        vertex.habitable = !vertex.water;
    });

    // Calculate steepness for each vertex
    let steepnessCount = 0;
    vertices.forEach((vertex) => {
        vertex.calculateSteepness();
        if (vertex.steepness > 0) steepnessCount++;
    });

    console.log(`Calculated steepness for ${steepnessCount} vertices`);

    // Calculate defense values using vertex method
    calculateDefenseValues();

    // Calculate initial farm values based on terrain
    calculateInitialFarmValues();

    // Build quadtree for spatial queries
    console.log("Building quadtree for spatial optimization...");
    const boundary = { x: 0, y: 0, width: 2400, height: 2400 };
    vertexQuadtree = new Quadtree(boundary, 4);
    vertices.forEach((v) => {
        // Insert all vertices into quadtree for inspector tool
        vertexQuadtree.insert(v);
    });
    console.log("Quadtree built");

    // Calculate initial farmer values (merchant values auto-update via setters)
    calculateFarmerValues();

    console.log("Simulation values initialized");
}

function calculateInitialFarmValues() {
    // Calculate farm value based on elevation and water access only
    vertices.forEach((vertex) => {
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

        vertex.calculateFarmValue(hasWaterAccess, FARM_ELEVATION_THRESHOLD);
        vertex.farmerNr = 0;
    });
}

function initializeHabitable() {
    habitable = [];
    vertices.forEach((vertex) => {
        vertex.defense = 0;
        vertex.farmValue = 0;
        vertex.merchantValue = 0;
        vertex.security = 1; // Base security value of 1
        vertex.trafficValue = vertex.traffic || 0;
        vertex.farmerValue = 0;

        // Don't reset occupied if already set (e.g., by routes)
        if (vertex.occupied === undefined) {
            vertex.occupied = false;
        }

        vertex.buffer = false;
        vertex.habitable = !vertex.water; // Water vertices are not habitable

        // Only add to habitable if both habitable AND not occupied
        // occupiedByRoute flag is only set for vertices ON routes with traffic >= 12
        if (vertex.habitable && !vertex.occupied && !vertex.occupiedByRoute) {
            habitable.push(vertex);
        }
    });

    // Calculate defense values based on terrain
    calculateDefenseValues();

    // Calculate farm and farmer values so they're ready for settlement placement
    calculateInitialFarmValues();
    calculateFarmerValues();
}

// Populate habitable array without recalculating values (when values are already initialized)
function populateHabitableArray() {
    habitable = [];
    vertices.forEach((vertex) => {
        // Only add to habitable if habitable AND not occupied by anything (settlements or routes)
        // occupiedByRoute flag is only set for vertices ON routes with traffic >= 12
        if (vertex.habitable && !vertex.occupied && !vertex.occupiedByRoute) {
            habitable.push(vertex);
        }
    });
}

function calculateDefenseValues() {
    vertices.forEach((vertex) => {
        vertex.calculateDefense();
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

    // Farm and farmer values should already be calculated from initializeSimulationValues()
    // No need to recalculate them here

    // Find vertex with highest combined value (defense + 0.25 * farmerValue)
    centralHabitable.sort((a, b) => {
        const scoreA = a.defense + 0.5 * a.farmerValue;
        const scoreB = b.defense + 0.5 * b.farmerValue;
        return scoreB - scoreA;
    });
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

    lord.createAnnexes();

    // Create routes to trade destinations if they exist
    if (tradeDestination1) {
        const path1 = pathFinding(
            castleVertex,
            tradeDestination1,
            lord.trafficWeight
        );
        if (path1) {
            const route1 = new Route(
                castleVertex,
                tradeDestination1,
                lord.trafficWeight,
                path1
            );
            routes.push(route1);
        }
    }
    if (tradeDestination2) {
        const path2 = pathFinding(
            castleVertex,
            tradeDestination2,
            lord.trafficWeight
        );
        if (path2) {
            const route2 = new Route(
                castleVertex,
                tradeDestination2,
                lord.trafficWeight,
                path2
            );
            routes.push(route2);
        }
    }

    // Cast security to the realm - propagate to flooded neighbors only
    if (
        castleVertex.floodedNeighbors &&
        castleVertex.floodedNeighbors.length > 0
    ) {
        castleVertex.floodedNeighbors.forEach((v) => {
            v.security += 15;
        });

        // Recalculate merchant values for affected vertices
        castleVertex.floodedNeighbors.forEach((v) => {
            v.updateMerchantValue();
        });

        // Recalculate farmer values for affected vertices
        castleVertex.floodedNeighbors.forEach((affectedVertex) => {
            const nearbyVertices = affectedVertex.floodedNeighbors || [];

            // Sum farm values in range
            let totalFarmValue = 0;
            nearbyVertices.forEach((v) => {
                if (v.farmValue > 0) {
                    totalFarmValue += v.farmValue;
                }
            });

            // Count farmers in flooded neighbors
            let farmerCount = 0;
            if (
                affectedVertex.floodedNeighbors &&
                affectedVertex.floodedNeighbors.length > 0
            ) {
                settlements.forEach((s) => {
                    if (s.profession === "Farmer") {
                        // Check if farmer is in the flooded neighbors
                        const isInFloodedNeighbors =
                            affectedVertex.floodedNeighbors.some(
                                (v) => v.index === s.vertex.index
                            );
                        if (isInFloodedNeighbors) {
                            farmerCount++;
                        }
                    }
                });
            }

            // Use vertex method to calculate
            affectedVertex.calculateFarmerValue(totalFarmValue, farmerCount);
        });
    }
}

function createFarmer() {
    if (habitable.length === 0) return;

    // No need to call calculateFarmValue() - farm values are already calculated
    // and don't change when we're just selecting a location

    // Find vertex with highest farmer value
    habitable.sort((a, b) => b.farmerValue - a.farmerValue);
    const farmerVertex = habitable[0];

    const farmer = new Settlement(farmerVertex, "Farmer");
    settlements.push(farmer);

    // Create route to castle if exists
    if (castleVertices.length > 0) {
        const path = pathFinding(
            farmerVertex,
            castleVertices[0],
            farmer.trafficWeight * 2
        );
        if (path) {
            const route = new Route(
                farmerVertex,
                castleVertices[0],
                farmer.trafficWeight * 2,
                path
            );
            routes.push(route);
        }
    }

    farmer.createGardens();

    // Increase security in vicinity neighbors only
    if (
        farmerVertex.vincinityNeighbors &&
        farmerVertex.vincinityNeighbors.length > 0
    ) {
        farmerVertex.vincinityNeighbors.forEach((v) => {
            v.security += 2;
        });

        // Recalculate merchant values for affected vertices
        farmerVertex.vincinityNeighbors.forEach((v) => {
            v.updateMerchantValue();
        });

        // Recalculate farmer values for affected vertices
        farmerVertex.vincinityNeighbors.forEach((affectedVertex) => {
            const nearbyVertices = affectedVertex.floodedNeighbors || [];

            // Sum farm values in range
            let totalFarmValue = 0;
            nearbyVertices.forEach((v) => {
                if (v.farmValue > 0) {
                    totalFarmValue += v.farmValue;
                }
            });

            // Count farmers in flooded neighbors
            let farmerCount = 0;
            if (
                affectedVertex.floodedNeighbors &&
                affectedVertex.floodedNeighbors.length > 0
            ) {
                settlements.forEach((s) => {
                    if (s.profession === "Farmer") {
                        // Check if farmer is in the flooded neighbors
                        const isInFloodedNeighbors =
                            affectedVertex.floodedNeighbors.some(
                                (v) => v.index === s.vertex.index
                            );
                        if (isInFloodedNeighbors) {
                            farmerCount++;
                        }
                    }
                });
            }

            // Use vertex method to calculate
            affectedVertex.calculateFarmerValue(totalFarmValue, farmerCount);
        });
    }
}

function createMerchant() {
    if (habitable.length === 0) return;

    calculateMerchantValue();

    // Find vertex with highest merchant value
    habitable.sort((a, b) => b.merchantValue - a.merchantValue);
    const merchantVertex = habitable[0];

    const merchant = new Settlement(merchantVertex, "Merchant");
    settlements.push(merchant);

    // Create routes to trade destinations and castle
    if (tradeDestination1) {
        const path1 = pathFinding(
            merchantVertex,
            tradeDestination1,
            merchant.trafficWeight
        );
        if (path1) {
            const route1 = new Route(
                merchantVertex,
                tradeDestination1,
                merchant.trafficWeight,
                path1
            );
            routes.push(route1);
        }
    }
    if (tradeDestination2) {
        const path2 = pathFinding(
            merchantVertex,
            tradeDestination2,
            merchant.trafficWeight
        );
        if (path2) {
            const route2 = new Route(
                merchantVertex,
                tradeDestination2,
                merchant.trafficWeight,
                path2
            );
            routes.push(route2);
        }
    }
    if (castleVertices.length > 0) {
        const path3 = pathFinding(
            merchantVertex,
            castleVertices[0],
            merchant.trafficWeight * 2
        );
        if (path3) {
            const route3 = new Route(
                merchantVertex,
                castleVertices[0],
                merchant.trafficWeight * 2,
                path3
            );
            routes.push(route3);
        }
    }

    // Merchants don't create buffers - they are part of trade networks

    // Increase security in vicinity neighbors only
    if (
        merchantVertex.vincinityNeighbors &&
        merchantVertex.vincinityNeighbors.length > 0
    ) {
        merchantVertex.vincinityNeighbors.forEach((v) => {
            v.security += 1;
        });

        // Recalculate merchant values for affected vertices
        merchantVertex.vincinityNeighbors.forEach((v) => {
            v.updateMerchantValue();
        });

        // Recalculate farmer values for affected vertices
        merchantVertex.vincinityNeighbors.forEach((affectedVertex) => {
            const nearbyVertices = affectedVertex.floodedNeighbors || [];

            // Sum farm values in range
            let totalFarmValue = 0;
            nearbyVertices.forEach((v) => {
                if (v.farmValue > 0) {
                    totalFarmValue += v.farmValue;
                }
            });

            // Count farmers in flooded neighbors
            let farmerCount = 0;
            if (
                affectedVertex.floodedNeighbors &&
                affectedVertex.floodedNeighbors.length > 0
            ) {
                settlements.forEach((s) => {
                    if (s.profession === "Farmer") {
                        // Check if farmer is in the flooded neighbors
                        const isInFloodedNeighbors =
                            affectedVertex.floodedNeighbors.some(
                                (v) => v.index === s.vertex.index
                            );
                        if (isInFloodedNeighbors) {
                            farmerCount++;
                        }
                    }
                });
            }

            // Use vertex method to calculate
            affectedVertex.calculateFarmerValue(totalFarmValue, farmerCount);
        });
    }
}

function calculateFarmValue() {
    // Calculate farm value based on elevation, water, and existing farmers
    vertices.forEach((vertex) => {
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

        vertex.calculateFarmValue(hasWaterAccess, FARM_ELEVATION_THRESHOLD);

        // Apply farmer density penalty
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
        vertex.farmValue = vertex.farmValue / (1 + nearbyFarmers);
    });

    // Calculate farmer preference value
    calculateFarmerValues();
}

function calculateMerchantValue() {
    // This function is now just for traversing - actual calculation happens in vertex
    console.log("calculateMerchantValue called (traversing vertices)");
    let count = 0;
    vertices.forEach((v) => {
        v.updateMerchantValue();
        if (v.merchantValue > 0) count++;
    });
    console.log(`Updated merchant values: ${count} vertices with value > 0`);
}

function calculateFarmerValues() {
    if (!vertexQuadtree) {
        console.warn("Quadtree not initialized, using fallback calculation");
        vertices.forEach((vertex) => {
            vertex.calculateFarmerValue(vertex.farmValue, 0);
        });
        return;
    }

    vertices.forEach((vertex) => {
        // Calculate vicinity neighbors (smaller range)
        const vincinityVertices = findVerticesWithinMoveCost(
            vertex,
            VINCINITY_MOVE_COST_RANGE
        );
        vertex.vincinityNeighbors = vincinityVertices;

        // Use movement-cost based flood fill to find nearby vertices
        const nearbyVertices = findVerticesWithinMoveCost(
            vertex,
            FARMER_MOVE_COST_RANGE
        );

        // Store flooded neighbors for visualization
        vertex.floodedNeighbors = nearbyVertices;

        // Sum farm values in range
        let totalFarmValue = 0;
        nearbyVertices.forEach((v) => {
            if (v.farmValue > 0) {
                totalFarmValue += v.farmValue;
            }
        });

        // Count farmers in flooded neighbors
        let farmerCount = 0;
        if (nearbyVertices.length > 0) {
            settlements.forEach((s) => {
                if (s.profession === "Farmer") {
                    // Check if farmer is in the flooded neighbors
                    const isInFloodedNeighbors = nearbyVertices.some(
                        (v) => v.index === s.vertex.index
                    );
                    if (isInFloodedNeighbors) {
                        farmerCount++;
                    }
                }
            });
        }

        // Use vertex method to calculate
        vertex.calculateFarmerValue(totalFarmValue, farmerCount);
    });
}

// Find all vertices reachable within a movement cost budget using flood fill
function findVerticesWithinMoveCost(startVertex, maxMoveCost) {
    const reachable = [];
    const visited = new Set();
    const queue = [{ vertex: startVertex, costSoFar: 0 }];

    visited.add(startVertex.index);
    reachable.push(startVertex);

    while (queue.length > 0) {
        const { vertex: current, costSoFar } = queue.shift();

        // Explore neighbors
        current.neighbors.forEach((neighbor) => {
            const neighborVertex = vertices.find(
                (v) => v.index === neighbor.vertexIndex
            );
            if (!neighborVertex) return;

            // Skip if already visited (pruning to avoid back-and-forth)
            if (visited.has(neighborVertex.index)) return;

            // Calculate cumulative cost to this neighbor
            const newCost = costSoFar + (neighbor.moveCost || Infinity);

            // Only continue if within budget
            if (newCost <= maxMoveCost) {
                visited.add(neighborVertex.index);
                reachable.push(neighborVertex);
                queue.push({ vertex: neighborVertex, costSoFar: newCost });
            }
        });
    }

    return reachable;
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
            v.castleAnnex = null;
            v.garden = null;
            v.habitable = !v.water;
            v.defense = 0;
            v.farmValue = 0;
            v.merchantValue = 0;
            v.security = 0;
            v.farmerValue = 0;
        });
    }
}
