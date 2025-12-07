/**
 * Presentation Layer for Hexagonal World
 * Maps terrain patterns from atlas to quads based on vertex occupation
 */

// Symbol to quinary digit mapping: "w,r,1,2,c" -> 0,1,2,3,4
const symbolMap = {
    w: 0, // not occupied
    r: 1, // routes
    1: 2, // farmers
    2: 3, // merchants
    c: 4, // lord/castle/annex
};

// Reverse mapping for debugging
const digitToSymbol = { 0: "w", 1: "r", 2: "1", 3: "2", 4: "c" };

// Atlas configuration
const ATLAS_SIZE = 25; // 25x25 grid
const TILE_SIZE = 80; // Each tile is 80x80 pixels
const ATLAS_TOTAL_SIZE = ATLAS_SIZE * TILE_SIZE; // 2000x2000

/**
 * Get the symbol for a vertex based on its occupation state
 * @param {Vertex} vertex - The vertex to check
 * @returns {string} - One of 'w', 'r', '1', '2', 'c'
 */
function getVertexSymbol(vertex) {
    if (!vertex) return "w";

    // Check for settlements (using occupiedBy property)
    if (vertex.occupiedBy) {
        const profession = vertex.occupiedBy.profession;
        if (profession === "Lord") {
            return "c";
        } else if (profession === "Merchant") {
            return "2";
        } else if (profession === "Farmer") {
            return "1";
        }
    }

    // Check for castle annex
    if (vertex.castleAnnex) {
        return "c";
    }

    // Check for routes (using occupiedByRoute or traffic)
    if (vertex.occupiedByRoute) {
        return "r";
    }

    // Not occupied
    return "w";
}

/**
 * Get the 4-character signature for a quad based on its vertices
 * Order: TL(0), TR(1), BR(2), BL(3) - clockwise from top-left
 * @param {Vertex} tl - Top-left vertex
 * @param {Vertex} tr - Top-right vertex
 * @param {Vertex} br - Bottom-right vertex
 * @param {Vertex} bl - Bottom-left vertex
 * @returns {string} - 4-character signature like "1crw"
 */
function getQuadSignature(tl, tr, br, bl) {
    return (
        getVertexSymbol(tl) +
        getVertexSymbol(tr) +
        getVertexSymbol(br) +
        getVertexSymbol(bl)
    );
}

/**
 * Convert a 4-character signature to UV coordinates in the atlas
 * @param {string} signature - 4-character signature like "1crw"
 * @returns {object} - UV coordinates for all four corners: {tl, tr, br, bl}
 *                     Each corner has {u, v} normalized coordinates (0-1)
 */
function getTileUVs(signature) {
    if (signature.length !== 4) {
        // console.error("Invalid signature length:", signature);
        return {
            tl: { u: 0, v: 0 },
            tr: { u: 1 / ATLAS_SIZE, v: 0 },
            br: { u: 1 / ATLAS_SIZE, v: 1 / ATLAS_SIZE },
            bl: { u: 0, v: 1 / ATLAS_SIZE },
        };
    }

    // Convert characters to quinary digits
    const digits = signature.split("").map((char) => {
        const digit = symbolMap[char];
        if (digit === undefined) {
            // console.warn(
            //     `Unknown symbol '${char}' in signature '${signature}'`
            // );
            return 0;
        }
        return digit;
    });

    // Calculate atlas position using quinary system
    // First 2 chars determine x position (0-24)
    const xPos = digits[0] * 5 + digits[1];

    // Last 2 chars determine y position (0-24)
    const yPos = digits[2] * 5 + digits[3];

    // Convert to normalized UV coordinates (0-1)
    const u = xPos / ATLAS_SIZE;
    const v = yPos / ATLAS_SIZE;
    const uWidth = 1 / ATLAS_SIZE;
    const vHeight = 1 / ATLAS_SIZE;

    return {
        u: u,
        v: v,
        uWidth: uWidth,
        vHeight: vHeight,
    };
}

/**
 * Get the pixel coordinates in the atlas for a signature
 * @param {string} signature - 4-character signature
 * @returns {object} - {x, y, width, height} in pixels
 */
function getTilePixelCoords(signature) {
    const uvs = getTileUVs(signature);
    return {
        x: uvs.u * ATLAS_TOTAL_SIZE,
        y: uvs.v * ATLAS_TOTAL_SIZE,
        width: TILE_SIZE,
        height: TILE_SIZE,
    };
}

/**
 * Map a triangle from source image to destination using 2D transform
 * This allows us to texture map irregular quads by splitting them into two triangles
 */
function mapTriangle(
    ctx,
    img,
    sx1,
    sy1,
    sx2,
    sy2,
    sx3,
    sy3,
    dx1,
    dy1,
    dx2,
    dy2,
    dx3,
    dy3
) {
    // Debug: log first call only
    if (!mapTriangle.logged) {
        // console.log("mapTriangle called");
        // console.log("img element:", img);
        // console.log("Source:", sx1, sy1, sx2, sy2, sx3, sy3);
        // console.log("Dest:", dx1, dy1, dx2, dy2, dx3, dy3);
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(dx1, dy1);
    ctx.lineTo(dx2, dy2);
    ctx.lineTo(dx3, dy3);
    ctx.closePath();
    ctx.clip();

    const x0 = sx1,
        y0 = sy1,
        x1 = sx2,
        y1 = sy2,
        x2 = sx3,
        y2 = sy3;
    const u0 = dx1,
        v0 = dy1,
        u1 = dx2,
        v1 = dy2,
        u2 = dx3,
        v2 = dy3;
    const denom = x0 * (y2 - y1) - x1 * y2 + x2 * y1 + (x1 - x2) * y0;

    if (!mapTriangle.logged) {
        // console.log("denom:", denom);
    }

    if (Math.abs(denom) > 0.001) {
        const m11 =
            -(y0 * (u2 - u1) - y1 * u2 + y2 * u1 + (y1 - y2) * u0) / denom;
        const m12 =
            (y1 * u2 + y0 * (u1 - u2) - y2 * u1 + (y2 - y1) * u0) / denom;
        const m21 =
            (x0 * (u2 - u1) - x1 * u2 + x2 * u1 + (x1 - x2) * u0) / denom;
        const m22 =
            -(x1 * u2 + x0 * (u1 - u2) - x2 * u1 + (x2 - x1) * u0) / denom;
        const dx =
            (x0 * (y2 * u1 - y1 * u2) +
                x0 * y1 * u2 -
                x1 * y0 * u2 +
                x2 * y0 * u1 +
                (x1 * y2 - x2 * y1) * u0) /
            denom;
        const dy =
            (x0 * (y2 * v1 - y1 * v2) +
                x0 * y1 * v2 -
                x1 * y0 * v2 +
                x2 * y0 * v1 +
                (x1 * y2 - x2 * y1) * v0) /
            denom;

        if (!mapTriangle.logged) {
            // console.log("Transform matrix:", m11, m12, m21, m22, dx, dy);
            // console.log("About to drawImage...");
            mapTriangle.logged = true;
        }

        ctx.transform(m11, m21, m12, m22, dx, dy);

        // Get the actual canvas/image element from p5.Image
        const imageElement = img.canvas || img.elt || img;
        ctx.drawImage(imageElement, 0, 0);

        if (mapTriangle.logged && !mapTriangle.completedLogged) {
            // console.log("drawImage completed");
            mapTriangle.completedLogged = true;
        }
    } else {
        if (!mapTriangle.logged) {
            // console.log("Skipped: denom too small");
        }
    }
    ctx.restore();
}

/**
 * Draw a textured quad using 2D canvas triangle mapping
 * Splits the quad into two triangles and maps texture coordinates
 * @param {p5.Graphics} buffer - The buffer to draw to
 * @param {p5.Image} atlas - The pattern atlas texture
 * @param {Vertex} tl - Top-left vertex
 * @param {Vertex} tr - Top-right vertex
 * @param {Vertex} br - Bottom-right vertex
 * @param {Vertex} bl - Bottom-left vertex
 * @param {object} uvs - UV coordinates object with {u, v, uWidth, vHeight}
 */
function drawTexturedQuad2D(buffer, atlas, tl, tr, br, bl, uvs, signature) {
    const ctx = buffer.drawingContext;

    // Calculate source coordinates in atlas (pixels)
    const atlasWidth = atlas.width;
    const atlasHeight = atlas.height;
    const sx = uvs.u * atlasWidth;
    const sy = uvs.v * atlasHeight;
    const sw = uvs.uWidth * atlasWidth;
    const sh = uvs.vHeight * atlasHeight;

    // Create a temporary canvas with just the tile we want
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sw;
    tempCanvas.height = sh;
    const tempCtx = tempCanvas.getContext("2d");

    // Copy just the tile from the atlas to the temp canvas
    // Use .canvas property for p5.Image objects loaded with loadImage()
    tempCtx.drawImage(atlas.canvas, sx, sy, sw, sh, 0, 0, sw, sh);

    // Helper function to slightly expand a point away from center
    const expand = (px, py, cx, cy, amount = 0.5) => {
        const dx = px - cx;
        const dy = py - cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) return { x: px, y: py };
        return {
            x: px + (dx / len) * amount,
            y: py + (dy / len) * amount,
        };
    };

    // Calculate quad center for expansion reference
    const cx = (tl.x + tr.x + br.x + bl.x) / 4;
    const cy = (tl.y + tr.y + br.y + bl.y) / 4;

    // Expand vertices slightly to prevent gaps
    const tlExp = expand(tl.x, tl.y, cx, cy);
    const trExp = expand(tr.x, tr.y, cx, cy);
    const brExp = expand(br.x, br.y, cx, cy);
    const blExp = expand(bl.x, bl.y, cx, cy);

    // Now map the temp canvas (which starts at 0,0) to the quad using triangles
    // Triangle 1: TL -> TR -> BR
    mapTriangle(
        ctx,
        tempCanvas,
        0,
        0,
        sw,
        0,
        sw,
        sh, // Source: top-left corner of temp canvas
        tlExp.x,
        tlExp.y,
        trExp.x,
        trExp.y,
        brExp.x,
        brExp.y // Destination triangle (expanded)
    );

    // Triangle 2: TL -> BR -> BL
    mapTriangle(
        ctx,
        tempCanvas,
        0,
        0,
        sw,
        sh,
        0,
        sh, // Source: top-left corner of temp canvas
        tlExp.x,
        tlExp.y,
        brExp.x,
        brExp.y,
        blExp.x,
        blExp.y // Destination triangle (expanded)
    );
}

function mapTriangle(
    ctx,
    img,
    sx1,
    sy1,
    sx2,
    sy2,
    sx3,
    sy3,
    dx1,
    dy1,
    dx2,
    dy2,
    dx3,
    dy3
) {
    ctx.save();

    // Clip to destination triangle
    ctx.beginPath();
    ctx.moveTo(dx1, dy1);
    ctx.lineTo(dx2, dy2);
    ctx.lineTo(dx3, dy3);
    ctx.closePath();
    ctx.clip();

    // Calculate the Affine Transform Matrix using Cramer's rule
    // Denominator for Cramer's rule
    const den = sx1 * (sy3 - sy2) - sx2 * sy3 + sx3 * sy2 + (sx2 - sx3) * sy1;

    if (den === 0) {
        ctx.restore();
        return;
    }

    const m11 =
        -(sy1 * (dx3 - dx2) - sy2 * dx3 + sy3 * dx2 + (sy2 - sy3) * dx1) / den;
    const m12 =
        (sy2 * dy3 + sy1 * (dy2 - dy3) - sy3 * dy2 + (sy3 - sy2) * dy1) / den;
    const m21 =
        (sx1 * (dx3 - dx2) - sx2 * dx3 + sx3 * dx2 + (sx2 - sx3) * dx1) / den;
    const m22 =
        -(sx2 * dy3 + sx1 * (dy2 - dy3) - sx3 * dy2 + (sx3 - sx2) * dy1) / den;
    const dx =
        (sx1 * (sy3 * dx2 - sy2 * dx3) +
            sx2 * sy1 * dx3 -
            sx3 * sy1 * dx2 +
            (sx3 * sy2 - sx2 * sy3) * dx1) /
        den;
    const dy =
        (sx1 * (sy3 * dy2 - sy2 * dy3) +
            sx2 * sy1 * dy3 -
            sx3 * sy1 * dy2 +
            (sx3 * sy2 - sx2 * sy3) * dy1) /
        den;

    // Apply the matrix
    ctx.transform(m11, m12, m21, m22, dx, dy);

    // Draw the image
    ctx.drawImage(img, 0, 0);

    ctx.restore();
}

/**
 * Redraw the quads surrounding a vertex when its occupation changes
 * This allows partial updates to the presentation layer without redrawing everything
 * @param {p5.Graphics} buffer - The presentation buffer
 * @param {p5.Image} atlas - The pattern atlas
 * @param {Vertex} vertex - The vertex whose occupation changed
 * @param {Array} tiles - Array of all tiles
 * @param {Map} vertexMap - Map of vertex index to vertex object
 */
function redrawVertexQuads(buffer, atlas, vertex, tiles, vertexMap) {
    if (!buffer || !atlas || !vertex || !tiles || !vertexMap) return;

    const ctx = buffer.drawingContext;

    // Find all tiles that include this vertex
    const affectedTiles = tiles.filter((tile) =>
        tile.vertexIndices.includes(vertex.index)
    );

    // Redraw each affected quad
    affectedTiles.forEach((tile) => {
        const tileVertices = tile.vertexIndices.map((vIndex) =>
            vertexMap.get(vIndex)
        );
        if (tileVertices.some((v) => !v)) return;

        // Quad vertices in order: TL, TR, BR, BL
        const tl = tileVertices[0];
        const tr = tileVertices[1];
        const br = tileVertices[2];
        const bl = tileVertices[3];

        // Clear the quad area first
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.clip();
        ctx.clearRect(
            Math.min(tl.x, tr.x, br.x, bl.x),
            Math.min(tl.y, tr.y, br.y, bl.y),
            Math.max(tl.x, tr.x, br.x, bl.x) - Math.min(tl.x, tr.x, br.x, bl.x),
            Math.max(tl.y, tr.y, br.y, bl.y) - Math.min(tl.y, tr.y, br.y, bl.y)
        );
        ctx.restore();

        // Get the new signature and redraw
        const signature = getQuadSignature(tl, tr, br, bl);
        const uvs = getTileUVs(signature);
        drawTexturedQuad2D(buffer, atlas, tl, tr, br, bl, uvs, signature);
    });
}

/**
 * Redraw the quads surrounding a vertex when its occupation changes
 * This allows partial updates to the presentation layer without redrawing everything
 * @param {p5.Graphics} buffer - The presentation buffer
 * @param {p5.Image} atlas - The pattern atlas
 * @param {Vertex} vertex - The vertex whose occupation changed
 * @param {Array} tiles - Array of all tiles
 * @param {Map} vertexMap - Map of vertex index to vertex object
 */
function redrawVertexQuads(buffer, atlas, vertex, tiles, vertexMap) {
    if (!buffer || !atlas || !vertex) return;

    const ctx = buffer.drawingContext;

    // Find all tiles that include this vertex
    const affectedTiles = tiles.filter((tile) =>
        tile.vertexIndices.includes(vertex.index)
    );

    // Redraw each affected quad
    affectedTiles.forEach((tile) => {
        const tileVertices = tile.vertexIndices.map((vIndex) =>
            vertexMap.get(vIndex)
        );
        if (tileVertices.some((v) => !v)) return;

        // Quad vertices in order: TL, TR, BR, BL
        const tl = tileVertices[0];
        const tr = tileVertices[1];
        const br = tileVertices[2];
        const bl = tileVertices[3];

        // Clear the quad area first
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.clip();
        ctx.clearRect(
            Math.min(tl.x, tr.x, br.x, bl.x),
            Math.min(tl.y, tr.y, br.y, bl.y),
            Math.max(tl.x, tr.x, br.x, bl.x) - Math.min(tl.x, tr.x, br.x, bl.x),
            Math.max(tl.y, tr.y, br.y, bl.y) - Math.min(tl.y, tr.y, br.y, bl.y)
        );
        ctx.restore();

        // Get the new signature and redraw
        const signature = getQuadSignature(tl, tr, br, bl);
        const uvs = getTileUVs(signature);
        drawTexturedQuad2D(buffer, atlas, tl, tr, br, bl, uvs, signature);
    });
}
