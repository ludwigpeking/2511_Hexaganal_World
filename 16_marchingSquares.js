/**
 * Marching Squares Algorithm for Contour Rendering
 *
 * This library provides functions for drawing elevation contours
 * within quadrilateral tiles using the marching squares algorithm.
 */

/**
 * Draw contours for a quadrilateral tile
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {Array} verts - Array of 4 vertices with {x, y} coordinates
 * @param {Array} elevs - Array of 4 elevations corresponding to vertices
 * @param {number} minElev - Minimum elevation in the dataset
 * @param {number} maxElev - Maximum elevation in the dataset
 * @param {number} contourInterval - Elevation interval between contour levels
 * @param {number} waterLevel - Water level elevation (optional)
 */
function drawQuadContours(
    ctx,
    verts,
    elevs,
    minElev,
    maxElev,
    contourInterval,
    waterLevel = -Infinity
) {
    // Iterate through contour levels
    for (
        let altitude = minElev;
        altitude < maxElev;
        altitude += contourInterval
    ) {
        // Calculate f values (distance from contour)
        const f0 = elevs[0] - altitude;
        const f1 = elevs[1] - altitude;
        const f2 = elevs[2] - altitude;
        const f3 = elevs[3] - altitude;

        // Calculate interpolation points on edges
        // Edge 0-1 (bottom)
        const a = lerpEdge(verts[0], verts[1], f0, f1);
        // Edge 1-2 (right)
        const b = lerpEdge(verts[1], verts[2], f1, f2);
        // Edge 2-3 (top)
        const c = lerpEdge(verts[2], verts[3], f2, f3);
        // Edge 3-0 (left)
        const d = lerpEdge(verts[3], verts[0], f3, f0);

        // Determine marching squares state
        const state = getMarchingSquaresState(f0, f1, f2, f3);

        // Use dark blue for water levels, elevation colors for land
        if (altitude <= waterLevel) {
            ctx.fillStyle = "#001a33";
            ctx.strokeStyle = "#002244";
        } else {
            // Calculate color based on altitude
            const normalizedAlt = (altitude - minElev) / (maxElev - minElev);
            const hue = 200 - normalizedAlt * 150; // Blue to green to yellow
            const saturation = 50 - normalizedAlt * 20;
            const lightness = 40 + normalizedAlt * 40;

            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.strokeStyle = `hsl(${hue - 20}, ${saturation + 20}%, ${
                lightness - 10
            }%)`;
        }
        ctx.lineWidth = 0.3;

        // Draw based on marching squares state
        drawMarchingSquaresCase(ctx, state, verts, a, b, c, d);
    }
}

/**
 * Linear interpolation on edge between two vertices
 * @param {Object} v1 - First vertex {x, y}
 * @param {Object} v2 - Second vertex {x, y}
 * @param {number} f1 - Elevation difference at v1
 * @param {number} f2 - Elevation difference at v2
 * @returns {Object} Interpolated point {x, y} where contour crosses
 */
function lerpEdge(v1, v2, f1, f2) {
    if (Math.abs(f1 - f2) < 0.001) {
        // Avoid division by zero
        return { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };
    }
    const t = f1 / (f1 - f2);
    return {
        x: v1.x + t * (v2.x - v1.x),
        y: v1.y + t * (v2.y - v1.y),
    };
}

/**
 * Determine marching squares state from corner values
 * @param {number} f0 - Elevation difference at corner 0
 * @param {number} f1 - Elevation difference at corner 1
 * @param {number} f2 - Elevation difference at corner 2
 * @param {number} f3 - Elevation difference at corner 3
 * @returns {number} State value (0-15) representing which corners are above contour
 */
function getMarchingSquaresState(f0, f1, f2, f3) {
    // Binary encoding: each corner contributes a bit
    // Order: f0 (bit 3), f1 (bit 2), f2 (bit 1), f3 (bit 0)
    return (
        (f0 > 0 ? 8 : 0) +
        (f1 > 0 ? 4 : 0) +
        (f2 > 0 ? 2 : 0) +
        (f3 > 0 ? 1 : 0)
    );
}

/**
 * Draw the appropriate shape for a marching squares case
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} state - State value (0-15)
 * @param {Array} verts - Array of 4 corner vertices
 * @param {Object} a - Interpolation point on edge 0-1
 * @param {Object} b - Interpolation point on edge 1-2
 * @param {Object} c - Interpolation point on edge 2-3
 * @param {Object} d - Interpolation point on edge 3-0
 */
function drawMarchingSquaresCase(ctx, state, verts, a, b, c, d) {
    ctx.beginPath();

    switch (state) {
        case 0:
            // All below contour - don't draw
            break;
        case 1: // Only v3 above
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(verts[3].x, verts[3].y);
            ctx.lineTo(d.x, d.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 2: // Only v2 above
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(verts[2].x, verts[2].y);
            ctx.lineTo(c.x, c.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 3: // v2 and v3 above
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(verts[2].x, verts[2].y);
            ctx.lineTo(verts[3].x, verts[3].y);
            ctx.lineTo(d.x, d.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 4: // Only v1 above
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.lineTo(b.x, b.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 5: // v1 and v3 above (saddle case)
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(c.x, c.y);
            ctx.lineTo(verts[3].x, verts[3].y);
            ctx.lineTo(d.x, d.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 6: // v1 and v2 above
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.lineTo(verts[2].x, verts[2].y);
            ctx.lineTo(c.x, c.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 7: // v1, v2, v3 above
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.lineTo(verts[2].x, verts[2].y);
            ctx.lineTo(verts[3].x, verts[3].y);
            ctx.lineTo(d.x, d.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 8: // Only v0 above
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(a.x, a.y);
            ctx.lineTo(d.x, d.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 9: // v0 and v3 above
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(a.x, a.y);
            ctx.lineTo(c.x, c.y);
            ctx.lineTo(verts[3].x, verts[3].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 10: // v0 and v2 above (saddle case)
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(verts[2].x, verts[2].y);
            ctx.lineTo(c.x, c.y);
            ctx.lineTo(d.x, d.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 11: // v0, v2, v3 above
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(verts[2].x, verts[2].y);
            ctx.lineTo(verts[3].x, verts[3].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 12: // v0 and v1 above
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(d.x, d.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 13: // v0, v1, v3 above
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.lineTo(b.x, b.y);
            ctx.lineTo(c.x, c.y);
            ctx.lineTo(verts[3].x, verts[3].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 14: // v0, v1, v2 above
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.lineTo(verts[2].x, verts[2].y);
            ctx.lineTo(c.x, c.y);
            ctx.lineTo(d.x, d.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        case 15:
            // All above - fill entire quad
            ctx.moveTo(verts[0].x, verts[0].y);
            ctx.lineTo(verts[1].x, verts[1].y);
            ctx.lineTo(verts[2].x, verts[2].y);
            ctx.lineTo(verts[3].x, verts[3].y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
    }
}

/**
 * Get elevation-based color
 * @param {number} elevation - Elevation value
 * @param {number} minElev - Minimum elevation
 * @param {number} maxElev - Maximum elevation
 * @returns {string} HSL color string
 */
function getElevationColor(elevation, minElev, maxElev) {
    const t = (elevation - minElev) / (maxElev - minElev);
    const hue = 200 - t * 150; // Blue to green to yellow
    const saturation = 50 - t * 20;
    const lightness = 40 + t * 40;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
