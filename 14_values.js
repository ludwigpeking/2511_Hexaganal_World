// Debug visualization functions for displaying simulation values

function drawDefenseValue() {
    if (!vertices) return;

    let from = color(255, 255, 0, 255); // yellow
    let to = color(255, 0, 0, 255); // solid red
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

    console.log(`Security layer: maxSecurity=${maxSecurity}`);

    if (maxSecurity === 0) return; // Nothing to show

    colorMode(RGB);
    vertices.forEach((vtx) => {
        if (
            vtx.security > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
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

    // Define color range: white (0) to green (max)
    let from = color(255, 255, 255); // lowest = white
    let to = color(120, 255, 100); // highest = green
    colorMode(RGB);

    vertices.forEach((vtx) => {
        if (
            vtx.farmValue > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            let fillColor = lerpColor(from, to, vtx.farmValue / maxFarmValue);
            fill(fillColor);

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
    console.log("drawMerchantValueLayer called");
    if (!vertices || vertices.length === 0) {
        console.log("No vertices available");
        return;
    }

    let maxMerchantValue = 0;
    let verticesWithMerchantValue = 0;
    vertices.forEach((v) => {
        if (v.merchantValue > maxMerchantValue)
            maxMerchantValue = v.merchantValue;
        if (v.merchantValue > 0) verticesWithMerchantValue++;
    });

    console.log(
        `Merchant layer: ${verticesWithMerchantValue} vertices with value > 0, max=${maxMerchantValue}`
    );

    if (maxMerchantValue === 0) {
        console.log("No merchant value to display");
        return; // Nothing to show
    }

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

function drawSteepnessLayer() {
    console.log("drawSteepnessLayer called");
    if (!vertices || vertices.length === 0) {
        console.log("No vertices available");
        return;
    }

    let maxSteepness = 0;
    let minSteepness = Infinity;
    let verticesWithSteepness = 0;

    vertices.forEach((v) => {
        if (v.steepness !== undefined && v.steepness > 0) {
            verticesWithSteepness++;
            if (v.steepness > maxSteepness) maxSteepness = v.steepness;
            if (v.steepness < minSteepness) minSteepness = v.steepness;
        }
    });

    console.log(
        `Steepness layer: ${verticesWithSteepness} vertices, min=${minSteepness}, max=${maxSteepness}`
    );

    if (verticesWithSteepness === 0 || maxSteepness === 0) {
        console.log("No steepness data to display");
        return; // Nothing to show
    }

    colorMode(HSB);
    vertices.forEach((vtx) => {
        if (
            vtx.steepness !== undefined &&
            vtx.steepness >= 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            // Use blue to red gradient (240 to 0 hue)
            let hue = map(vtx.steepness, 0, maxSteepness, 240, 0);
            fill(hue, 100, 100, 150);

            beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);

            if (vtx.steepness > 0) {
                fill(0);
                textAlign(CENTER, CENTER);
                textSize(10);
                text(round(vtx.steepness * 100) / 100, vtx.x, vtx.y);
            }
        }
    });
    colorMode(RGB);
}

function drawHabitableLayer() {
    if (!vertices || vertices.length === 0) return;

    colorMode(RGB);
    vertices.forEach((vtx) => {
        if (
            vtx.habitable &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            fill(0, 255, 0, 100); // Green with transparency

            beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);
        }
    });
}

function drawOccupiedLayer() {
    if (!vertices || vertices.length === 0) return;

    colorMode(RGB);
    vertices.forEach((vtx) => {
        if (
            vtx.occupied &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            fill(255, 0, 0, 150); // Red with transparency

            beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);
        }
    });
}

function drawTrafficCountLayer() {
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

    colorMode(HSB);
    vertices.forEach((vtx) => {
        const trafficCount = vertexTrafficCounts.get(vtx.index);
        if (
            trafficCount > 0 &&
            vtx.surroundingTiles &&
            vtx.surroundingTiles.length > 0
        ) {
            noStroke();
            // Blue to red gradient based on traffic intensity
            let hue = map(trafficCount, 0, maxTrafficCount, 240, 0);
            fill(hue, 100, 100, 150);

            beginShape();
            vtx.surroundingTiles.forEach((tile) => {
                vertex(tile.centerX, tile.centerY);
            });
            endShape(CLOSE);

            fill(0);
            textAlign(CENTER, CENTER);
            textSize(10);
            text(round(trafficCount * 10) / 10, vtx.x, vtx.y);
        }
    });
    colorMode(RGB);
}
