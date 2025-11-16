// UI State
let currentScreen = "menu"; // 'menu', 'generating', 'result'
let generatedMap = null;

// Generation parameters
let params = {
    hexGridDiameter: 40,
    hexRingCount: 10,
    randomSeed: 0,
    relaxationIterations: 500,
    relaxationStrength: 0.08,
};

// UI elements
let inputFields = {};
let buttons = {};

// Map data
let hexGridDiameter = 40;
let hexRingCount = 10;
let vertices = [];
let edges = [];
let faces = [];
let mergedFaces = [];
let subdivVertices = [];
let edgeMidpointMap = new Map();
let faceCenterVertices = [];
let averageEdgeLength = 0;
let averageFaceArea = 0;

function setup() {
    createCanvas(800, 800);
    setupUI();
    showMenu();
}

function setupUI() {
    // Generate button
    buttons.generate = createButton("Generate Map");
    buttons.generate.position(300, 250);
    buttons.generate.mousePressed(startGeneration);

    // Load button
    buttons.load = createButton("Load Map");
    buttons.load.position(300, 290);
    buttons.load.mousePressed(loadMap);

    // Save button
    buttons.save = createButton("Save Map");
    buttons.save.position(300, 500);
    buttons.save.mousePressed(saveMap);
    buttons.save.hide();

    // Export Image button
    buttons.exportImg = createButton("Export Image");
    buttons.exportImg.position(450, 500);
    buttons.exportImg.mousePressed(exportImage);
    buttons.exportImg.hide();

    // Back to Menu button
    buttons.backMenu = createButton("Back to Menu");
    buttons.backMenu.position(600, 500);
    buttons.backMenu.mousePressed(showMenu);
    buttons.backMenu.hide();

    // Input fields
    inputFields.hexGridDiameter = createInput(
        params.hexGridDiameter.toString()
    );
    inputFields.hexGridDiameter.position(400, 350);
    inputFields.hexGridDiameter.size(100);

    inputFields.hexRingCount = createInput(params.hexRingCount.toString());
    inputFields.hexRingCount.position(400, 385);
    inputFields.hexRingCount.size(100);

    inputFields.randomSeed = createInput(params.randomSeed.toString());
    inputFields.randomSeed.position(400, 420);
    inputFields.randomSeed.size(100);

    inputFields.relaxationIterations = createInput(
        params.relaxationIterations.toString()
    );
    inputFields.relaxationIterations.position(400, 455);
    inputFields.relaxationIterations.size(100);

    inputFields.relaxationStrength = createInput(
        params.relaxationStrength.toString()
    );
    inputFields.relaxationStrength.position(400, 490);
    inputFields.relaxationStrength.size(100);
}
function draw() {
    if (currentScreen === "menu") {
        drawMenu();
    } else if (currentScreen === "generating") {
        // Generation happens automatically, no draw loop needed
    } else if (currentScreen === "result") {
        drawResult();
    }
}

function drawMenu() {
    background(220);
    textSize(32);
    textAlign(CENTER);
    fill(0);
    text("Quadrangulized Map Generator", width / 2, 100);

    textSize(16);
    textAlign(LEFT);
    text("Hex Grid Diameter:", 250, 368);
    text("Hex Ring Count:", 250, 403);
    text("Random Seed:", 250, 438);
    text("Relaxation Iterations:", 250, 473);
    text("Relaxation Strength:", 250, 508);

    textSize(14);
    textAlign(CENTER);
    fill(100);
    text(
        "Generate a new quadrangulated mesh or load an existing one",
        width / 2,
        180
    );
}

function drawResult() {
    background(220);

    // Draw the generated map
    faces.forEach((face) => {
        face.draw();
    });

    // Show statistics
    fill(0);
    noStroke();
    textSize(14);
    textAlign(LEFT);

    // Calculate area statistics
    let areas = faces.map((f) => f.area);
    let minArea = Math.min(...areas);
    let maxArea = Math.max(...areas);
    let areaStdDev = calculateStdDev(areas);
    let areaVariation = ((areaStdDev / averageFaceArea) * 100).toFixed(1);

    text(`Total Quads: ${faces.length}`, 10, 20);
    text(`Total Vertices: ${vertices.length}`, 10, 40);
    text(`Average Area: ${averageFaceArea.toFixed(2)}`, 10, 60);
    text(`Min/Max Area: ${minArea.toFixed(2)} / ${maxArea.toFixed(2)}`, 10, 80);
    text(`Area Variation: ${areaVariation}%`, 10, 100);
}

function calculateStdDev(values) {
    let avg = values.reduce((a, b) => a + b, 0) / values.length;
    let squareDiffs = values.map((value) => Math.pow(value - avg, 2));
    let avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
}

function showMenu() {
    currentScreen = "menu";
    buttons.generate.show();
    buttons.load.show();
    buttons.save.hide();
    buttons.exportImg.hide();
    buttons.backMenu.hide();

    Object.values(inputFields).forEach((field) => field.show());
}

function showResult() {
    currentScreen = "result";
    buttons.generate.hide();
    buttons.load.hide();
    buttons.save.show();
    buttons.exportImg.show();
    buttons.backMenu.show();

    Object.values(inputFields).forEach((field) => field.hide());
}

function startGeneration() {
    // Read parameters from input fields
    params.hexGridDiameter = parseFloat(inputFields.hexGridDiameter.value());
    params.hexRingCount = parseInt(inputFields.hexRingCount.value());
    params.randomSeed = parseInt(inputFields.randomSeed.value());
    params.relaxationIterations = parseInt(
        inputFields.relaxationIterations.value()
    );
    params.relaxationStrength = parseFloat(
        inputFields.relaxationStrength.value()
    );

    // Set global variables
    hexGridDiameter = params.hexGridDiameter;
    hexRingCount = params.hexRingCount;

    currentScreen = "generating";
    background(220);
    fill(0);
    textSize(24);
    textAlign(CENTER);
    text("Generating map...", width / 2, height / 2);

    // Generate map after a short delay to show message
    setTimeout(() => {
        generateMap();
        showResult();
    }, 100);
}

function generateMap() {
    // Reset data structures
    vertices = [];
    faces = [];
    mergedFaces = [];
    subdivVertices = [];
    faceCenterVertices = [];
    edgeMidpointMap = new Map();

    randomSeed(params.randomSeed);

    // Create initial hexagonal grid
    const centralPoint = new Vertex(0, 0, 0);
    vertices.push(centralPoint);

    for (let i = 1; i <= hexRingCount; i++) {
        for (let j = 0; j < 6; j++) {
            for (let k = 0; k < i; k++) {
                const p = new Vertex(i, j, k);
                vertices.push(p);
            }
        }
    }

    createFaces();
    mergeTrianglesToQuadsRandomly();
    subdivideMesh();
    vertices = vertices.concat(subdivVertices);
    precalculateAdjacentFaces();
    averageFaceArea = calculateAverageArea(faces);

    // Perform relaxation iterations
    for (let iter = 0; iter < params.relaxationIterations; iter++) {
        // Recalculate face areas every iteration (critical for area-weighted relaxation!)
        faces.forEach((face) => {
            calculateFaceArea(face);
        });

        shuffleArray(vertices);

        // Apply relaxation using area-weighted centroids
        vertices.forEach((vertex) => {
            relaxVertexPosition(vertex, params.relaxationStrength);
        });
    } // Build the final map data structure
    generatedMap = buildMapData();
}

function buildMapData() {
    let mapData = {
        params: params,
        tiles: [],
        vertices: [], // New: store all vertices with neighbor information
    };

    // Create a map of vertex to index
    let vertexIndexMap = new Map();
    let allVertices = vertices;
    allVertices.forEach((v, idx) => {
        vertexIndexMap.set(v, idx);
    });

    // Create GameVertex objects for all vertices
    let gameVertices = [];
    allVertices.forEach((v, idx) => {
        let gameVertex = new GameVertex(v.x, v.y, idx);
        gameVertices.push(gameVertex);
    });

    // Build tile data and track which vertices belong to which faces
    faces.forEach((face, faceIdx) => {
        let tile = {
            id: faceIdx,
            vertices: face.vertices.map((v) => ({
                x: v.x,
                y: v.y,
                index: vertexIndexMap.get(v),
            })),
            center: getFaceCentroid(face),
            neighbors: [],
            area: calculateFaceArea(face),
        };

        // Record that these vertices belong to this face
        face.vertices.forEach((v) => {
            let vIdx = vertexIndexMap.get(v);
            gameVertices[vIdx].addAdjacentFace(faceIdx);
        });

        mapData.tiles.push(tile);
    });

    // Compute vertex neighbors by finding vertices that share an edge
    faces.forEach((face) => {
        let faceVertexIndices = face.vertices.map((v) => vertexIndexMap.get(v));

        // Each vertex is only a neighbor to the adjacent vertices in the face (forming edges)
        // Not diagonally opposite vertices
        for (let i = 0; i < faceVertexIndices.length; i++) {
            // Connect to previous vertex (wrapping around)
            let prevIdx =
                (i - 1 + faceVertexIndices.length) % faceVertexIndices.length;
            gameVertices[faceVertexIndices[i]].addNeighbor(
                faceVertexIndices[prevIdx]
            );

            // Connect to next vertex (wrapping around)
            let nextIdx = (i + 1) % faceVertexIndices.length;
            gameVertices[faceVertexIndices[i]].addNeighbor(
                faceVertexIndices[nextIdx]
            );
        }
    });

    // Add vertices to map data
    mapData.vertices = gameVertices.map((v) => v.toJSON());

    // Find tile neighbors (faces that share edges)
    for (let i = 0; i < faces.length; i++) {
        for (let j = i + 1; j < faces.length; j++) {
            let sharedVertices = faces[i].vertices.filter((v) =>
                faces[j].vertices.includes(v)
            );
            if (sharedVertices.length >= 2) {
                mapData.tiles[i].neighbors.push(j);
                mapData.tiles[j].neighbors.push(i);
            }
        }
    }

    return mapData;
}

function saveMap() {
    if (!generatedMap) return;

    let filename = `quadmap_seed${params.randomSeed}_ring${
        params.hexRingCount
    }_${Date.now()}.json`;
    saveJSON(generatedMap, filename);

    // Show notification
    alert(
        `Map saved to Downloads folder as:\n${filename}\n\nTo save to project:\nMove the file to the 'results' folder in your project directory.`
    );
    console.log("Map saved to Downloads:", filename);
}

function loadMap() {
    // Create file input element
    let input = createFileInput(handleFile);
    input.position(0, -100); // Hide it off-screen
    input.elt.click(); // Trigger file dialog

    function handleFile(file) {
        if (file.type === "application" && file.subtype === "json") {
            loadJSON(file.data, (data) => {
                generatedMap = data;
                reconstructMapFromData(data);
                showResult();
            });
        } else {
            console.error("Please load a JSON file");
        }
        input.remove();
    }
}

function reconstructMapFromData(mapData) {
    // Reset structures
    vertices = [];
    faces = [];
    subdivVertices = [];

    // Restore parameters
    params = mapData.params;
    hexGridDiameter = params.hexGridDiameter;
    hexRingCount = params.hexRingCount;

    // Rebuild vertices from tile data
    let vertexMap = new Map();

    mapData.tiles.forEach((tile) => {
        tile.vertices.forEach((vertexData) => {
            if (!vertexMap.has(vertexData.index)) {
                let v = new SubdivVertex(vertexData.x, vertexData.y);
                vertexMap.set(vertexData.index, v);
                vertices.push(v);
            }
        });
    });

    // Rebuild faces
    mapData.tiles.forEach((tile) => {
        let faceVertices = tile.vertices.map((vData) =>
            vertexMap.get(vData.index)
        );
        let face = new Face(faceVertices);
        faces.push(face);
    });

    precalculateAdjacentFaces();
    averageFaceArea = calculateAverageArea(faces);
}

function exportImage() {
    let filename = `quadmap_seed${params.randomSeed}_ring${params.hexRingCount}`;
    saveCanvas(filename, "png");
    alert(
        `Image saved to Downloads folder as:\n${filename}.png\n\nTo save to project:\nMove the file to the 'results' folder in your project directory.`
    );
    console.log("Image exported:", filename + ".png");
}

function createFaces() {
    //central ring
    const p0 = vertices[0];
    for (let j = 0; j < 6; j++) {
        const p1 = vertices[j + 1];
        const p2 = vertices[((j + 1) % 6) + 1];
        faces.push(new Face([p0, p1, p2]));
        const p3 = vertices[6 + 2 + 2 * j];
        faces.push(new Face([p1, p2, p3]));
    }
    //outer rings
    for (let i = 2; i < hexRingCount + 1; i++) {
        for (let j = 0; j < 6; j++) {
            for (let k = 0; k < i; k++) {
                const p0 =
                    vertices[
                        getVertexIndex(
                            i - 1,
                            (j + floor(k / (i - 1))) % 6,
                            k % (i - 1)
                        )
                    ];
                const p1 = vertices[getVertexIndex(i, j, k)];
                const p2 =
                    vertices[
                        getVertexIndex(
                            i,
                            (j + floor(k / (i - 1))) % 6,
                            (k + 1) % i
                        )
                    ];

                faces.push(new Face([p0, p1, p2]));
                if (i < hexRingCount) {
                    const p3 =
                        vertices[
                            getVertexIndex(
                                i + 1,
                                j + (floor(k / i) % 6),
                                (k + 1) % (i + 1)
                            )
                        ];
                    faces.push(new Face([p1, p2, p3]));
                }
            }
        }
    }
}

function mergeTrianglesToQuadsRandomly() {
    let toRemove = new Set();
    let mergedFacesTemp = [];

    // Create a list of all possible pairs
    let pairs = [];
    for (let i = 0; i < faces.length; i++) {
        for (let j = i + 1; j < faces.length; j++) {
            pairs.push([i, j]);
        }
    }

    // Shuffle the pairs to randomize the order of processing
    shuffleArray(pairs);

    // Attempt to merge pairs in the randomized order
    for (let [i, j] of pairs) {
        if (toRemove.has(i) || toRemove.has(j)) continue;

        let sharedVertices = faces[i].vertices.filter((v) =>
            faces[j].vertices.includes(v)
        );
        if (sharedVertices.length === 2) {
            let nonSharedVertices = faces[i].vertices
                .concat(faces[j].vertices)
                .filter((v) => !sharedVertices.includes(v));
            let orderedVertices = [
                sharedVertices[0],
                nonSharedVertices[0],
                sharedVertices[1],
                nonSharedVertices[1],
            ];

            mergedFacesTemp.push(new Face(orderedVertices));
            toRemove.add(i).add(j);
        }
    }

    // Update the faces array
    faces = faces.filter((_, index) => !toRemove.has(index));
    faces = mergedFaces.concat(mergedFacesTemp, faces);
}

function relaxVertices(iterations) {
    // Combine original and subdivided vertices for processing
    let allVertices = vertices.concat(subdivVertices);

    for (let it = 0; it < iterations; it++) {
        let vertexAdjustments = new Map();

        allVertices.forEach((vertex) => {
            if (vertex.edgy) return; // Skip vertices marked as 'edgy'

            let adjacentCentroids = [];
            faces.forEach((face) => {
                if (face.vertices.includes(vertex)) {
                    let centroid = getFaceCentroid(face);
                    adjacentCentroids.push(centroid);
                }
            });

            // If a vertex is not part of any face, don't adjust it
            if (adjacentCentroids.length === 0) return;

            // Calculate the average centroid for the current vertex
            let avgCentroid = {
                x:
                    adjacentCentroids.reduce((sum, c) => sum + c.x, 0) /
                    adjacentCentroids.length,
                y:
                    adjacentCentroids.reduce((sum, c) => sum + c.y, 0) /
                    adjacentCentroids.length,
            };

            vertexAdjustments.set(vertex, avgCentroid);
        });

        // Apply adjustments to vertices based on the calculated average centroids
        vertexAdjustments.forEach((centroid, vertex) => {
            vertex.x = centroid.x;
            vertex.y = centroid.y;
        });
    }
}

function getFaceCentroid(face) {
    let x = 0,
        y = 0;
    face.vertices.forEach((v) => {
        x += v.x;
        y += v.y;
    });
    return { x: x / face.vertices.length, y: y / face.vertices.length };
}

function drawMesh() {
    // Draw faces
    faces.forEach((face) => {
        beginShape();
        stroke(0);
        fill(200, 10); // Set face color
        face.vertices.forEach((v) => vertex(v.x, v.y));
        endShape(CLOSE);
        noStroke();
        fill(0, 50, 50);
    });

    // Draw vertices
    let allVertices = vertices.concat(subdivVertices);
    allVertices.forEach((v) => {
        stroke(0);
        fill(v.edgy ? "red" : "blue"); // Color-code based on the 'edgy' property
        ellipse(v.x, v.y, 5, 5);
    });
}

function relaxVerticesForArea(iterations, averageArea, vertices, faces) {
    for (let it = 0; it < iterations; it++) {
        faces.forEach((face) => {
            let faceArea = calculateFaceArea(face);
            const areaFactor =
                faceArea < averageArea * 0.8
                    ? -1
                    : faceArea > averageArea * 1.25
                    ? 1
                    : 0;
            if (areaFactor !== 0) {
                // Activate only if adjustment is needed
                let centroid = calculateFaceCentroid(face);
                face.vertices.forEach((vertex) => {
                    if (!vertex.edgy) {
                        // Calculate direction from vertex to centroid
                        let direction = {
                            x: centroid.x - vertex.x,
                            y: centroid.y - vertex.y,
                        };
                        let magnitude = Math.sqrt(
                            direction.x ** 2 + direction.y ** 2
                        );
                        direction.x /= magnitude; // Normalize
                        direction.y /= magnitude;

                        // Move vertex away from centroid to adjust area
                        vertex.x += direction.x * areaFactor; // The factor controls how much to adjust
                        vertex.y += direction.y * areaFactor;
                    }
                });
            }
        });
    }
}

function precalculateAdjacentFaces() {
    vertices.forEach((vertex) => {
        vertex.adjacentFaces = []; // Initialize the array to hold adjacent faces
    });

    faces.forEach((face) => {
        face.vertices.forEach((vertex) => {
            if (vertex.adjacentFaces) {
                vertex.adjacentFaces.push(face); // Add this face to the vertex's list of adjacent faces
            }
        });
    });
}

function relaxVertexPosition(vertex, strength = 0.1) {
    if (
        vertex.edgy ||
        !vertex.adjacentFaces ||
        vertex.adjacentFaces.length === 0
    )
        return;

    let weightedSumX = 0;
    let weightedSumY = 0;
    let totalWeight = 0;

    // Calculate the weighted centroid based on the area of adjacent faces
    vertex.adjacentFaces.forEach((face) => {
        let centroid = getFaceCentroid(face);
        let weight = face.area;

        weightedSumX += centroid.x * weight;
        weightedSumY += centroid.y * weight;
        totalWeight += weight;
    });

    if (totalWeight > 0) {
        // Calculate the average position based on the weighted centroid
        let avgX = weightedSumX / totalWeight;
        let avgY = weightedSumY / totalWeight;

        // Apply the adjustment with specified strength
        vertex.x += (avgX - vertex.x) * strength;
        vertex.y += (avgY - vertex.y) * strength;
    }
}

function calculateAverageEdgeLength() {
    let totalLength = 0;
    let edgeCount = 0;

    faces.forEach((face) => {
        for (let i = 0; i < face.vertices.length; i++) {
            let startVertex = face.vertices[i];
            let endVertex = face.vertices[(i + 1) % face.vertices.length];
            let edgeLength = dist(
                startVertex.x,
                startVertex.y,
                endVertex.x,
                endVertex.y
            );

            totalLength += edgeLength;
            edgeCount++;
        }
    });

    return totalLength / edgeCount;
}

function getAdjacentQuads(vertex) {
    let adjacentFaces = [];
    for (let face of faces) {
        if (face.vertices.includes(vertex)) {
            adjacentFaces.push(face);
        }
    }
    return adjacentFaces;
}

function calculateWeightedCentroid(vertex, faces) {
    let weightedSumX = 0;
    let weightedSumY = 0;
    let totalWeight = 0;

    const adjacentFaces = getAdjacentQuads(vertex);

    adjacentFaces.forEach((face) => {
        const area = calculateFaceArea(face);
        const centroid = calculateFaceCentroid(face);

        weightedSumX += centroid.x * area;
        weightedSumY += centroid.y * area;
        totalWeight += area;
    });

    if (totalWeight === 0) {
        // Avoid division by zero
        return { x: vertex.x, y: vertex.y };
    }

    return {
        x: weightedSumX / totalWeight,
        y: weightedSumY / totalWeight,
    };
}

function relaxVerticesUsingWeightedCentroids(vertices, faces, strength = 0.01) {
    // Note the reduced strength for finer control
    vertices.forEach((vertex) => {
        if (vertex.edgy) return; // Skip 'edgy' vertices

        const weightedCentroid = calculateWeightedCentroid(vertex, faces);
        let dx = weightedCentroid.x - vertex.x;
        let dy = weightedCentroid.y - vertex.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize the direction vector
        if (distance > 0) {
            dx /= distance;
            dy /= distance;
        }

        // Apply the adjustment with reduced strength, ensuring it's towards the weighted centroid
        vertex.x += dx * strength * distance;
        vertex.y += dy * strength * distance;
    });
}
