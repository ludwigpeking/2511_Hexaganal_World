// Pathfinding-related global variables
let routes = [];

class Route {
    constructor(start, end, trafficWeight, path) {
        this.start = start;
        this.end = end;
        this.trafficWeight = trafficWeight;
        this.path = path; // Array of vertex indices
        this.totalDistance = 0;
        this.totalElevationGain = 0;
    }
}

function pathFinding(start, end, trafficWeight) {
    // Reset all vertices
    topoData.vertices.forEach((v) => {
        v.g = Infinity;
        v.h = 0;
        v.f = Infinity;
        v.from = null;
    });

    const downhillFactor = parseFloat(select("#downhillFactor").value());
    const flatTerrainCost = parseFloat(select("#flatTerrainCost").value());

    let openSet = [];
    let closeSet = [];

    start.g = 0;
    start.h = calculateHeuristic(start, end);
    start.f = start.g + start.h;
    openSet.push(start);

    let current = start;

    while (openSet.length > 0 && current.index !== end.index) {
        openSet.sort((a, b) => a.f - b.f);
        current = openSet.shift();
        closeSet.push(current);

        for (let neighborData of current.neighbors) {
            const neighbor = topoData.vertices.find(
                (v) => v.index === neighborData.vertexIndex
            );
            if (!neighbor) continue;
            if (closeSet.includes(neighbor)) continue;

            // Use pre-calculated movement cost
            const moveCost = current.g + neighborData.moveCost;

            if (moveCost < neighbor.g) {
                neighbor.from = current;
                neighbor.g = moveCost;
                neighbor.h = calculateHeuristic(neighbor, end);
                neighbor.f = neighbor.g + neighbor.h;

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    if (current.index === end.index) {
        const path = [];
        let node = end;

        while (node) {
            path.unshift(node.index);
            node.traffic += trafficWeight;
            node.occupied = true; // Mark route vertices as occupied

            // Add traffic to neighboring vertices as well
            node.neighbors.forEach((neighborData) => {
                const neighbor = topoData.vertices.find(
                    (v) => v.index === neighborData.vertexIndex
                );
                if (neighbor) {
                    neighbor.traffic += trafficWeight * 0.5; // Neighbors get half the traffic
                    neighbor.trafficValue = neighbor.traffic; // Update traffic value for merchant calculations
                }
            });

            node = node.from;
        }

        return path;
    }

    return null;
}

function calculateHeuristic(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return sqrt(dx * dx + dy * dy);
}

function calculateRouteStats(route) {
    route.totalDistance = 0;
    route.totalElevationGain = 0;

    for (let i = 0; i < route.path.length - 1; i++) {
        const currentVertex = topoData.vertices.find(
            (v) => v.index === route.path[i]
        );
        const nextVertex = topoData.vertices.find(
            (v) => v.index === route.path[i + 1]
        );
        const neighborData = currentVertex.neighbors.find(
            (n) => n.vertexIndex === nextVertex.index
        );

        if (neighborData) {
            route.totalDistance += neighborData.distance;
            if (neighborData.elevationDiff > 0) {
                route.totalElevationGain += neighborData.elevationDiff;
            }
        }
    }
}

function createRandomRoute() {
    if (!topoData || edgeVertices.length < 2) {
        alert("Please load map data first!");
        return;
    }

    const start = edgeVertices[floor(random(edgeVertices.length))];
    let end;
    let distance;

    do {
        end = edgeVertices[floor(random(edgeVertices.length))];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        distance = sqrt(dx * dx + dy * dy);
    } while (
        distance <
        topoData.mapping.hexWidth * topoData.mapping.hexToCanvasScale * 0.5
    );

    const trafficWeight = parseFloat(select("#trafficWeight").value());

    updateProgress(
        `Finding route from vertex ${start.index} to ${end.index}...`
    );

    const path = pathFinding(start, end, trafficWeight);

    if (path) {
        const route = new Route(start, end, trafficWeight, path);
        calculateRouteStats(route);
        routes.push(route);

        updateProgress(
            `Route created! Length: ${
                path.length
            } vertices, Distance: ${route.totalDistance.toFixed(0)}m`
        );
        updateRouteStats();
        redraw();
    } else {
        updateProgress("Failed to find route!");
    }
}

function createHardcodedRoute(startIndex, endIndex) {
    if (!topoData) return;

    const start = topoData.vertices.find((v) => v.index === startIndex);
    const end = topoData.vertices.find((v) => v.index === endIndex);

    if (!start || !end) {
        console.error(`Could not find vertices ${startIndex} or ${endIndex}`);
        return;
    }

    const trafficWeight = parseFloat(select("#trafficWeight").value());

    updateProgress(
        `Finding hardcoded route from vertex ${startIndex} to ${endIndex}...`
    );

    const path = pathFinding(start, end, trafficWeight);

    if (path) {
        const route = new Route(start, end, trafficWeight, path);
        calculateRouteStats(route);
        routes.push(route);

        updateProgress(
            `Hardcoded route created! Length: ${
                path.length
            } vertices, Distance: ${route.totalDistance.toFixed(0)}m`
        );
        updateRouteStats();
    } else {
        updateProgress(
            `Failed to find hardcoded route from ${startIndex} to ${endIndex}!`
        );
    }
}

function clearRoutes() {
    routes = [];
    topoData.vertices.forEach((v) => {
        v.traffic = 0;
    });
    updateRouteStats();
    redraw();
    updateProgress("All routes cleared");
}

function updateRouteStats() {
    if (routes.length === 0) {
        select("#route-stats").html("No routes created yet");
        return;
    }

    let html = `<p><strong>Total Routes:</strong> ${routes.length}</p>`;

    routes.forEach((route, index) => {
        html += `
            <div class="stat-row">
                <strong>Route ${index + 1}:</strong>
                ${route.path.length} vertices, 
                ${route.totalDistance.toFixed(0)}m distance, 
                ${route.totalElevationGain.toFixed(0)}m elevation gain,
                weight: ${route.trafficWeight}
            </div>
        `;
    });

    select("#route-stats").html(html);
}
