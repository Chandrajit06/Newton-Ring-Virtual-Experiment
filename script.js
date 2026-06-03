/*TAB NAVIGATION
   ============================================================ */
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab;

        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById('tab-' + target).classList.add('active');
    });
});

/* ============================================================
   SIMULATION (Newton's Rings)
   ============================================================ */
const ringCanvas = document.getElementById('ringCanvas');
const rCtx = ringCanvas.getContext('2d');
const setupCanvas = document.getElementById('setupCanvas');
const sCtx = setupCanvas.getContext('2d');


const micIn = document.getElementById('micPos');
const waveIn = document.getElementById('wave');
const radIn = document.getElementById('radius');

/* ----- Laboratory stage workflow for Table 1 ----- */
const stageRingOrder = {
    leftForward: [4, 8, 12, 16, 20],
    leftBackward: [20, 16, 12, 8, 4],
    rightForward: [4, 8, 12, 16, 20],
    rightBackward: [20, 16, 12, 8, 4]
};
const ringToRowIndex = { 4: 0, 8: 1, 12: 2, 16: 3, 20: 4 };
const CENTER_POSITION_CM = 0.0;
const POSITION_EPS = 1e-6;

// Real-time microscope state used for side + direction-based stage detection
let previousMicroscopePosition = CENTER_POSITION_CM;
let currentDirection = "stationary";
let currentSide = "center";

// Independent write pointer for each stage sequence
const stageWriteIndex = {
    leftForward: 0,
    leftBackward: 0,
    rightForward: 0,
    rightBackward: 0
};

function detectCurrentDirection(currentPos) {
    if (currentPos > previousMicroscopePosition + POSITION_EPS) return "movingRight";
    if (currentPos < previousMicroscopePosition - POSITION_EPS) return "movingLeft";
    return "stationary";
}

function detectCurrentSide(currentPos) {
    if (currentPos < CENTER_POSITION_CM - POSITION_EPS) return "left";
    if (currentPos > CENTER_POSITION_CM + POSITION_EPS) return "right";
    return "center";
}

function detectStageFromPositionAndDirection(currentPos) {
    const side = detectCurrentSide(currentPos);
    const direction = detectCurrentDirection(currentPos);

    currentSide = side;
    currentDirection = direction;

    if (side === "left") {
        // Left of center: moving left => away from center, moving right => toward center
        if (direction === "movingLeft") return "leftForward";
        if (direction === "movingRight") return "leftBackward";
    }
    if (side === "right") {
        // Right of center: moving right => away from center, moving left => toward center
        if (direction === "movingRight") return "rightForward";
        if (direction === "movingLeft") return "rightBackward";
    }
    return null;
}

function getCurrentStageRing(stageName) {
    if (!stageName || !stageRingOrder[stageName]) return NaN;
    const seq = stageRingOrder[stageName];
    const idx = stageWriteIndex[stageName];
    if (!Number.isFinite(idx) || idx < 0 || idx >= seq.length) return NaN;
    return seq[idx];
}

function writeReadingToStageCell(ring, stageName, readingCm) {
    const tbody = document.getElementById('table1-body');
    if (!tbody || !tbody.rows.length) return;

    const rowIndex = ringToRowIndex[ring];
    if (!Number.isFinite(rowIndex)) return;

    const row = tbody.rows[rowIndex];
    if (!row) return;

    const selectorMap = {
        leftForward: '.t1-left-forward',
        leftBackward: '.t1-left-backward',
        rightForward: '.t1-right-forward',
        rightBackward: '.t1-right-backward'
    };

    // normal write
    const target = row.querySelector(selectorMap[stageName]);
    if (target) target.value = Math.abs(readingCm).toFixed(4);

    /* ======================================================
       AUTO-FILL 20th RING FOR BOTH FORWARD & BACKWARD
       ====================================================== */

    if (ring === 20) {

        // LEFT SIDE
        if (stageName === "leftForward" || stageName === "leftBackward") {

            const lf = row.querySelector('.t1-left-forward');
            const lb = row.querySelector('.t1-left-backward');

            if (lf) lf.value = Math.abs(readingCm).toFixed(4);
            if (lb) lb.value = Math.abs(readingCm).toFixed(4);

            if (stageName === "leftForward") {
                stageWriteIndex.leftBackward = 1;
            }
        }

        // RIGHT SIDE
        if (stageName === "rightForward" || stageName === "rightBackward") {

            const rf = row.querySelector('.t1-right-forward');
            const rb = row.querySelector('.t1-right-backward');

            if (rf) rf.value = Math.abs(readingCm).toFixed(4);
            if (rb) rb.value = Math.abs(readingCm).toFixed(4);

            if (stageName === "rightForward") {
                stageWriteIndex.rightBackward = 1;
            }
        }
    }
}

function advanceStagePointer(stageName) {
    if (!stageName || !stageRingOrder[stageName]) return;
    const len = stageRingOrder[stageName].length;
    if (stageWriteIndex[stageName] < len) stageWriteIndex[stageName] += 1;
}

/**
 * Step: build valid Table 1 data rows (require both D and Mean D to be finite).
 */
function getValidTable1RowsForTable2() {
    const t1body = document.getElementById('table1-body');
    if (!t1body) return [];

    const valid = [];
    Array.from(t1body.rows).forEach((row, idx) => {
        const ring = labParseFinite(row.querySelector('.lab-input-ring')?.value);
        const d = labParseFinite(row.querySelector('.t1-mean-d')?.value);
        const meanD = labParseFinite(row.querySelector('.t1-mean-d')?.value);

        if (Number.isFinite(d) && Number.isFinite(meanD)) {
            valid.push({
                ring: Number.isFinite(ring) ? ring : idx + 1,
                d,
                meanD
            });
        }
    });

    return valid;
}

/**
 * Step: clear writable/derived Table 2 fields before refilling.
 */
function clearTable2Rows(t2rows) {
    t2rows.forEach(row => {
        const set = (selector, val) => {
            const el = row.querySelector(selector);
            if (el) el.value = val;
        };

        set('.t2-ring-display', '');
        set('.t2-mean-d', '');
        set('.t2-d2', '');
        set('.t2-n-plus-m', '');
        set('.t2-n', '');
        set('.t2-m', '');
        set('.t2-delta-d2', '');
        set('.t2-r', '');
        set('.t2-mean-r', '');
    });
}

function fmt3(val) {
    return Number.isFinite(val) ? val.toFixed(3) : '';
}

function fmt4(val) {
    return Number.isFinite(val) ? val.toFixed(4) : '';
}

// Extended travel helps align outer rings while keeping old logic intact.
micIn.min = "-12";
micIn.max = "12";

function update() {
    const offset = parseFloat(micIn.value);
    const λ = parseFloat(waveIn.value);
    const R = parseFloat(radIn.value);
    const displacement = Math.abs(offset);

    // Display is absolute displacement from centre (0 at centre).
    document.getElementById('digiPos').innerText = displacement.toFixed(3) + " cm";
    document.getElementById('wTxt').innerText = λ + " nm";
    document.getElementById('rTxt').innerText = R + " cm";

    drawRings(offset, λ, R);
    drawSetup(offset);
}

function drawRings(offset, λ, R) {
    // As microscope moves right, rings appear to move left.
    const centerX = ringCanvas.width / 2 - (offset * 85);
    const centerY = ringCanvas.height / 2;
    const λcm = λ * 1e-7;

    rCtx.fillStyle = "black";
    rCtx.fillRect(0, 0, ringCanvas.width, ringCanvas.height);

    // Keep >=25 visible rings while preserving physical dependence on R and λ.
    const maxOrder = 45;
    const minDim = Math.min(ringCanvas.width, ringCanvas.height);
    const pxScale = (minDim / 380) * 2100;
    const hueBase = (750 - λ) * 0.8;

    for (let n = maxOrder; n >= 1; n--) {
        const radius = Math.sqrt(n * R * λcm) * pxScale; // r ∝ sqrt(nRλ)
        const bright = 50 + Math.max(0, 12 - n * 0.25);
        const color = `hsl(${hueBase}, 100%, ${bright}%)`;

        rCtx.beginPath();
        rCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        rCtx.strokeStyle = (n % 2 === 0) ? "#000" : color;
        rCtx.lineWidth = Math.max(1.3, 2.4 - n * 0.03);
        rCtx.stroke();
    }

    // Fixed Microscope Crosshair
    rCtx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    rCtx.lineWidth = 1;
    rCtx.setLineDash([5, 5]);
    rCtx.beginPath();
    rCtx.moveTo(ringCanvas.width / 2, 0);
    rCtx.lineTo(ringCanvas.width / 2, ringCanvas.height);
    rCtx.stroke();
    rCtx.beginPath();
    rCtx.moveTo(0, centerY);
    rCtx.lineTo(ringCanvas.width, centerY);
    rCtx.stroke();
    rCtx.setLineDash([]);
}

/* ============================================================
   EXTENDED MECHANICAL HARDWARE SIMULATION ENGINE
   ============================================================ */
// Initialize access parameters for the dedicated dual-scale vernier array
const vernierCanvas = document.getElementById('vernierCanvas');
const vCtx = vernierCanvas ? vernierCanvas.getContext('2d') : null;

// Variable managing continuous animation cycle states for the ray paths
let rayAnimationTicks = 0;

/**
 * Enhanced Engine: Replaces drawSetup with a realistic physical workbench,
 * cast-iron mounting rails, a sodium housing capsule, and real-time ray tracing.
 */
function drawSetup(offset) {
    if (!sCtx || !setupCanvas) return;

    // Increment phase timing variables for moving photons
    rayAnimationTicks = (rayAnimationTicks + 0.4) % 100;

    sCtx.clearRect(0, 0, setupCanvas.width, setupCanvas.height);

    const W = setupCanvas.width;
    const H = setupCanvas.height;

    // Fixed engineering frame configurations
    const tableTopY = H - 40;
    const bedTopY = tableTopY - 25;
    const opticalAxisY = bedTopY - 65; 

    /* 1. LAYERED WOODEN WORKBENCH SURFACE */
    let woodGrad = sCtx.createLinearGradient(0, tableTopY, 0, H);
    woodGrad.addColorStop(0, '#2d1f10');
    woodGrad.addColorStop(0.1, '#4a3319');
    woodGrad.addColorStop(0.5, '#3d2913');
    woodGrad.addColorStop(1, '#1f1408');
    sCtx.fillStyle = woodGrad;
    sCtx.fillRect(0, tableTopY, W, H - tableTopY);

    sCtx.fillStyle = 'rgba(255,255,255,0.06)';
    sCtx.fillRect(0, tableTopY, W, 2);

    /* 2. CAST-IRON OPTICAL BENCH ASSEMBLY */
    sCtx.fillStyle = '#1c1e24';
    sCtx.fillRect(30, bedTopY, W - 60, tableTopY - bedTopY);
    sCtx.strokeStyle = '#383e4c';
    sCtx.lineWidth = 1.5;
    sCtx.strokeRect(30, bedTopY, W - 60, tableTopY - bedTopY);

    let steelGrad = sCtx.createLinearGradient(0, bedTopY + 4, 0, bedTopY + 20);
    steelGrad.addColorStop(0, '#57606f');
    steelGrad.addColorStop(0.3, '#ffffff');
    steelGrad.addColorStop(0.6, '#747d8c');
    steelGrad.addColorStop(1, '#2f3542');
    sCtx.fillStyle = steelGrad;
    sCtx.fillRect(40, bedTopY + 4, W - 80, 7);
    sCtx.fillRect(40, bedTopY + 14, W - 80, 7);

    /* 3. SODIUM VAPOR ILLUMINATION ENCLOSURE (FIXED LEFT) */
    const lampX = 40;
    const lampW = 55;
    const lampH = 85;
    const lampY = opticalAxisY - lampH / 2;

    let lampGrad = sCtx.createLinearGradient(lampX, lampY, lampX + lampW, lampY);
    lampGrad.addColorStop(0, '#1e2129');
    lampGrad.addColorStop(0.7, '#3d4354');
    lampGrad.addColorStop(1, '#101217');
    sCtx.fillStyle = lampGrad;
    sCtx.beginPath();
    if (typeof sCtx.roundRect === "function") {
        sCtx.roundRect(lampX, lampY, lampW, lampH, [6, 2, 2, 6]);
    } else {
        sCtx.rect(lampX, lampY, lampW, lampH);
    }
    sCtx.fill();
    sCtx.stroke();

    sCtx.fillStyle = '#0a0b0d';
    for (let i = 0; i < 4; i++) {
        sCtx.fillRect(lampX + 12 + (i * 10), lampY + 10, 5, 20);
    }

    sCtx.fillStyle = '#2f3542';
    sCtx.fillRect(lampX + 15, lampY + lampH, lampW - 30, bedTopY - (lampY + lampH));

    let amberGlow = sCtx.createRadialGradient(lampX + lampW, opticalAxisY, 2, lampX + lampW, opticalAxisY, 15);
    amberGlow.addColorStop(0, '#ffffff');
    amberGlow.addColorStop(0.4, '#ffa500');
    amberGlow.addColorStop(1, 'rgba(255,165,0,0)');
    sCtx.fillStyle = amberGlow;
    sCtx.beginPath();
    sCtx.arc(lampX + lampW, opticalAxisY, 15, 0, Math.PI * 2);
    sCtx.fill();

    /* 4. DYNAMIC TRAVELING MICROSCOPE FRAME MECHANICS (WITH ATTENUATED MOVEMENT) */
    const travelRegionWidth = 220; 
    const scaleZeroX = W / 2 + 30; // Aligned with the stationary lens center
    
    // FIX: Multiply the offset by a dampening factor (e.g., 0.15) to make movement very slow
    const slowedOffset = offset * 0.15;
    const micX = scaleZeroX + (slowedOffset * (travelRegionWidth / 24));

    // Heavy stable track base plate
    sCtx.fillStyle = '#262a36';
    sCtx.fillRect(micX - 35, bedTopY - 14, 70, 14);

    // Tall vertical adjustment frame pillar (Moved back slightly to avoid blocking optical path)
    let pillarGrad = sCtx.createLinearGradient(micX - 25, bedTopY - 140, micX - 10, bedTopY - 14);
    pillarGrad.addColorStop(0, '#57606f');
    pillarGrad.addColorStop(0.5, '#f1f2f6');
    pillarGrad.addColorStop(1, '#2f3542');
    sCtx.fillStyle = pillarGrad;
    sCtx.fillRect(micX - 25, bedTopY - 140, 15, 126);

    // Focus gear rack teeth profiling
    sCtx.fillStyle = '#dcdde1';
    for (let y = bedTopY - 130; y < bedTopY - 40; y += 5) {
        sCtx.fillRect(micX - 10, y, 2, 2);
    }

    // Microscope Support Linkage Bracket Arm (Holds the scope barrel directly over alignment axis)
    sCtx.fillStyle = '#3d4354';
    sCtx.fillRect(micX - 15, bedTopY - 130, 30, 14);

    // Ocular drawtube housing mounted vertically over micX
    let scopeX = micX - 10;
    let scopeY = opticalAxisY - 110;
    let scopeW = 20;
    let scopeH = 75;

    let scopeGrad = sCtx.createLinearGradient(scopeX, scopeY, scopeX + scopeW, scopeY);
    scopeGrad.addColorStop(0, '#1c1f26');
    scopeGrad.addColorStop(0.4, '#485460');
    scopeGrad.addColorStop(1, '#0b0c0f');
    sCtx.fillStyle = scopeGrad;
    sCtx.fillRect(scopeX, scopeY, scopeW, scopeH);

    // Polished accents & Eyepiece
    sCtx.fillStyle = '#eccc68';
    sCtx.fillRect(scopeX - 2, scopeY + 10, scopeW + 4, 3);
    sCtx.fillRect(scopeX - 2, scopeY + scopeH - 8, scopeW + 4, 3);
    sCtx.fillStyle = '#1e2530';
    sCtx.fillRect(scopeX - 3, scopeY - 8, scopeW + 6, 8);

    /* 5. STATIONARY NEWTON RINGS OPTICS FRAME (FIXED AT CENTER BLOCK) */
    // FIX: Decoupled from micX so it stays stationary at a fixed location on the rail bench
    const opticsCenterX = W / 2 + 30; 
    const baseWidth = 80;
    
    sCtx.fillStyle = '#1e2530';
    sCtx.fillRect(opticsCenterX - baseWidth / 2, bedTopY - 10, baseWidth, 10);

    // Hardened platform mounting stage holding the lens elements
    sCtx.fillStyle = '#0d1117';
    sCtx.fillRect(opticsCenterX - 40, bedTopY - 16, 80, 6);

    // Glass elements setup
    sCtx.lineWidth = 1.5;
    sCtx.strokeStyle = 'rgba(0, 212, 255, 0.8)';
    sCtx.fillStyle = 'rgba(0, 212, 255, 0.15)';
    
    // Flat glass boundary plate underneath
    sCtx.fillRect(opticsCenterX - 35, bedTopY - 22, 70, 6);
    sCtx.strokeRect(opticsCenterX - 35, bedTopY - 22, 70, 6);

    // Curved crown lens element (Curved face facing down resting on the glass plate)
    sCtx.beginPath();
    sCtx.moveTo(opticsCenterX - 35, bedTopY - 32);
    sCtx.lineTo(opticsCenterX + 35, bedTopY - 32);
    sCtx.arcTo(opticsCenterX, bedTopY - 22, opticsCenterX - 35, bedTopY - 32, 140);
    sCtx.closePath();
    sCtx.fill();
    sCtx.stroke();

    /* 6. SPLITTER MATRIX: 45-DEGREE GLASS PLATE (STATIONARY ABOVE LENS) */
    const glassRefX = opticsCenterX; // Stays fixed directly above the stationary lens
    const glassRefY = opticalAxisY;
    const glassLength = 46;

    sCtx.save();
    sCtx.translate(glassRefX, glassRefY);
    sCtx.rotate(-45 * Math.PI / 180);
    
    let glassGrad = sCtx.createLinearGradient(-glassLength/2, -2, glassLength/2, 2);
    glassGrad.addColorStop(0, 'rgba(255,255,255,0.7)');
    glassGrad.addColorStop(0.5, 'rgba(0,212,255,0.4)');
    glassGrad.addColorStop(1, 'rgba(255,255,255,0.2)');
    
    sCtx.fillStyle = glassGrad;
    sCtx.strokeStyle = 'rgba(255,255,255,0.8)';
    sCtx.lineWidth = 2;
    sCtx.fillRect(-glassLength / 2, -1.5, glassLength, 3);
    sCtx.strokeRect(-glassLength / 2, -1.5, glassLength, 3);
    sCtx.restore();

    // Stiff structural arm mounting the glass plate to the table assembly
    sCtx.strokeStyle = '#4b5563';
    sCtx.lineWidth = 2.5;
    sCtx.beginPath();
    sCtx.moveTo(opticsCenterX - 38, bedTopY - 16);
    sCtx.lineTo(opticsCenterX - 38, glassRefY + 8);
    sCtx.lineTo(glassRefX - 12, glassRefY + 8);
    sCtx.stroke();

    /* 7. NEWTON-RINGS COHERENT RAY-TRACING ENGINE */
    sCtx.save();
    
    // Background glow pipeline 
    sCtx.strokeStyle = `rgba(255, 180, 0, 0.12)`;
    sCtx.lineWidth = 8;
    sCtx.beginPath();
    sCtx.moveTo(lampX + lampW, opticalAxisY);
    sCtx.lineTo(glassRefX, opticalAxisY);
    sCtx.lineTo(glassRefX, bedTopY - 22);
    sCtx.stroke();

    // Primary Incident Ray (Horizontal path out of Sodium source to stationary splitter)
    sCtx.strokeStyle = '#ffb300';
    sCtx.lineWidth = 2;
    sCtx.shadowColor = '#ffa500';
    sCtx.shadowBlur = 6;
    sCtx.beginPath();
    sCtx.moveTo(lampX + lampW, opticalAxisY);
    sCtx.lineTo(glassRefX, opticalAxisY);
    sCtx.stroke();

    // Reflected Downward Ray (Drops down onto the stationary lens)
    sCtx.beginPath();
    sCtx.moveTo(glassRefX, opticalAxisY);
    sCtx.lineTo(glassRefX, bedTopY - 22);
    sCtx.stroke();

    // Returning Interfering Rays (Upward from lens, through glass splitter into moving microscope)
    sCtx.strokeStyle = '#ffea00';
    sCtx.lineWidth = 1.5;
    sCtx.beginPath();
    sCtx.moveTo(glassRefX, bedTopY - 22);
    sCtx.lineTo(glassRefX, opticalAxisY); // Travels straight back up to splitter height
    sCtx.lineTo(micX, opticalAxisY);      // Diverges horizontally to match active microscope placement position
    sCtx.lineTo(micX, scopeY + scopeH);   // Shoots directly up inside the eyepiece base
    sCtx.stroke();

    // Photon Particle Animation Pipeline Update Loops
    sCtx.fillStyle = '#ffffff';
    sCtx.shadowBlur = 10;
    let step = 30;
    
    // 1. Horizontal Photons moving towards splitter plate
    for (let x = lampX + lampW + rayAnimationTicks; x < glassRefX; x += step) {
        sCtx.beginPath();
        sCtx.arc(x, opticalAxisY, 2.5, 0, Math.PI * 2);
        sCtx.fill();
    }
    // 2. Downward Photons heading to the air-film interference space
    let downStart = opticalAxisY + ((rayAnimationTicks) % step);
    for (let y = downStart; y < bedTopY - 22; y += step) {
        sCtx.beginPath();
        sCtx.arc(glassRefX, y, 2.5, 0, Math.PI * 2);
        sCtx.fill();
    }
    // 3. Upward reflected photons tracked directly into moving microscope lens frame
    let upStart = (bedTopY - 22) - ((rayAnimationTicks) % step);
    for (let y = upStart; y > scopeY + scopeH; y -= step) {
        // Quantize ray alignment based on whether photon has entered the eyepiece frame offset boundary
        let currentX = (y > opticalAxisY) ? glassRefX : micX;
        sCtx.beginPath();
        sCtx.arc(currentX, y, 2, 0, Math.PI * 2);
        sCtx.fill();
    }
    sCtx.restore();
    /* 8. EXECUTE VERNIER MECHANICAL READOUT CANVAS SYNCHRONIZATION */
    drawMechanicalVernierScale(offset);
}
/**
 * Draws a real high-magnification mechanical dual caliper interface.
 * Main scale intervals: 0.05 cm. Vernier scale: 50 ticks inside 49 main ticks.
 * Least Count / Vernier Constant = 0.05 / 50 = 0.001 cm.
 */
function drawMechanicalVernierScale(offset) {
    if (!vCtx || !vernierCanvas) return;

    const W = vernierCanvas.width;
    const H = vernierCanvas.height;

    vCtx.clearRect(0, 0, W, H);

    // Establish drawing plane splits
    const mainScaleY = 45;
    const vernierScaleY = 45;

    // Zero alignment coordinate mapping profile
    const midX = W / 2; 
    const pixelsPerCm = 350; // Dynamic zoom constant configuration

    // Physical bounds parameters
    const absoluteReading = Math.abs(offset);

    /* A. COMPUTE LOGICAL SCALE INTERFACES */
    // Main Scale Division (MSD) = 0.05 cm. Vernier Scale Division (VSD) = 0.049 cm.
    const msdValue = 0.05;

    // Compute active operational parameters matching actual physical instruments
    const msr = Math.floor(absoluteReading / msdValue) * msdValue;
    const residual = absoluteReading - msr;
    const vsrTicks = Math.round(residual / 0.001);

    /* B. DRAW STATIC BACKING SLEEVE (MAIN SCALE) */
    let brassGrad = vCtx.createLinearGradient(0, 0, 0, mainScaleY);
    brassGrad.addColorStop(0, '#eef1f6');
    brassGrad.addColorStop(0.7, '#d1d8e0');
    brassGrad.addColorStop(1, '#a5b1c2');
    vCtx.fillStyle = brassGrad;
    vCtx.fillRect(0, 0, W, mainScaleY);

    // Boundary edge separator line
    vCtx.strokeStyle = '#4b6584';
    vCtx.lineWidth = 2;
    vCtx.beginPath();
    vCtx.moveTo(0, mainScaleY);
    vCtx.lineTo(W, mainScaleY);
    vCtx.stroke();

    // Map view limits around active viewport spatial window coordinates
    const startCm = absoluteReading - (midX / pixelsPerCm);
    const endCm = absoluteReading + (midX / pixelsPerCm);

    // Render underlying Main ticks every 0.05 cm increment boundary limits
    vCtx.lineWidth = 1;
    vCtx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
    vCtx.textAlign = 'center';

    let scanValue = Math.ceil(startCm / msdValue) * msdValue;
    while (scanValue <= endCm) {
        // Find screen spatial footprint placement index position
        const tickX = midX + (scanValue - absoluteReading) * pixelsPerCm;

        // Differentiate major integer units from sub-fraction subdivisions
        const isInteger = Math.abs(scanValue - Math.round(scanValue)) < 1e-5;
        const isHalf = Math.abs((scanValue * 10) - Math.round(scanValue * 10)) < 1e-5;

        if (isInteger) {
            vCtx.strokeStyle = '#000000';
            vCtx.lineWidth = 2;
            vCtx.beginPath();
            vCtx.moveTo(tickX, mainScaleY);
            vCtx.lineTo(tickX, mainScaleY - 24);
            vCtx.stroke();

            vCtx.fillStyle = '#1e272e';
            vCtx.fillText(Math.round(scanValue) + ' cm', tickX, mainScaleY - 28);
        } else if (isHalf) {
            vCtx.strokeStyle = '#2f3542';
            vCtx.lineWidth = 1.2;
            vCtx.beginPath();
            vCtx.moveTo(tickX, mainScaleY);
            vCtx.lineTo(tickX, mainScaleY - 18);
            vCtx.stroke();
            
            // Text annotation identifier flags on half cm intervals
            vCtx.fillStyle = '#57606f';
            vCtx.fillText(scanValue.toFixed(1), tickX, mainScaleY - 21);
        } else {
            // Standard 0.05 cm metric sub-divisions
            vCtx.strokeStyle = '#747d8c';
            vCtx.lineWidth = 1;
            vCtx.beginPath();
            vCtx.moveTo(tickX, mainScaleY);
            vCtx.lineTo(tickX, mainScaleY - 12);
            vCtx.stroke();
        }

        scanValue += msdValue;
    }

    /* C. DRAW MOVING SLIDER ASSEMBLY (VERNIER JAW PLATE) */
    // Slider plate face frame box
    let sliderGrad = vCtx.createLinearGradient(0, vernierScaleY, 0, H);
    sliderGrad.addColorStop(0, '#57606f');
    sliderGrad.addColorStop(0.1, '#747d8c');
    sliderGrad.addColorStop(0.5, '#4b5563');
    sliderGrad.addColorStop(1, '#1e232e');
    vCtx.fillStyle = sliderGrad;
    vCtx.fillRect(0, vernierScaleY, W, H - vernierScaleY);

    // Beveled frame separation profiles
    vCtx.strokeStyle = '#2f3542';
    vCtx.lineWidth = 1.5;
    vCtx.beginPath();
    vCtx.moveTo(0, vernierScaleY);
    vCtx.lineTo(W, vernierScaleY);
    vCtx.stroke();

    // Render central reference zero arrow marker (Vernier Index Pointer)
    vCtx.fillStyle = '#ff4757';
    vCtx.beginPath();
    vCtx.moveTo(midX, vernierScaleY);
    vCtx.lineTo(midX - 6, vernierScaleY + 10);
    vCtx.lineTo(midX + 6, vernierScaleY + 10);
    vCtx.fill();

    // Render 50 Vernier scale ticks. 
    // Mechanical formula requirement: 50 VSD = 49 MSD = 49 * 0.05 cm = 2.45 cm.
    // Length of 1 Vernier division = 2.45 / 50 = 0.049 cm.
    const vsdValue = 0.049;

    vCtx.font = '9px monospace';
    vCtx.textAlign = 'center';

    for (let div = 0; div <= 50; div++) {
        // Distance offset from the index center pointer line
        const logicalOffset = div * vsdValue;
        
        // Render right-side scale lines
        const tickRightX = midX + (logicalOffset * pixelsPerCm);
        if (tickRightX >= 0 && tickRightX <= W) {
            const isMajor = (div % 10 === 0);
            const isFive = (div % 5 === 0 && !isMajor);

            vCtx.strokeStyle = isMajor ? '#ffffff' : (isFive ? '#f1f2f6' : '#a4b0be');
            vCtx.lineWidth = isMajor ? 1.5 : 0.8;

            vCtx.beginPath();
            vCtx.moveTo(tickRightX, vernierScaleY);
            vCtx.lineTo(tickRightX, vernierScaleY + (isMajor ? 18 : (isFive ? 13 : 9)));
            vCtx.stroke();

            if (isMajor) {
                vCtx.fillStyle = '#00d4ff';
                vCtx.fillText(String(div), tickRightX, vernierScaleY + 28);
            }
        }
    }

    /* D. GRAPHICAL METROLOGY GLASS LENS EFFECT HUD OVERLAY */
    let glassHud = vCtx.createLinearGradient(0, 0, W, 0);
    glassHud.addColorStop(0, 'rgba(30,34,45,0.4)');
    glassHud.addColorStop(0.15, 'rgba(255,255,255,0.05)');
    glassHud.addColorStop(0.5, 'rgba(255,255,255,0)');
    glassHud.addColorStop(0.85, 'rgba(255,255,255,0.05)');
    glassHud.addColorStop(1, 'rgba(30,34,45,0.4)');
    vCtx.fillStyle = glassHud;
    vCtx.fillRect(0, 0, W, H);

    // Center targeting hair lines
    vCtx.strokeStyle = 'rgba(0, 212, 255, 0.35)';
    vCtx.lineWidth = 1;
    vCtx.setLineDash([4, 4]);
    vCtx.beginPath();
    vCtx.moveTo(midX, 0);
    vCtx.lineTo(midX, H);
    vCtx.stroke();
    vCtx.setLineDash([]);
}

/**
 * Enhanced loop frame updater wrapper intercepting input events safely 
 * to refresh the structural ray traces alongside normal loops.
 */
const baselineUpdateEngine = window.update;
if (typeof baselineUpdateEngine === 'function') {
    window.update = function() {
        // Execute primary core base update actions 
        baselineUpdateEngine();
        
        // Force-refresh our dynamic workbench ray rendering parameters
        const offset = parseFloat(document.getElementById('micPos').value);
        drawSetup(offset);
    };
}

// Continuous background loop keeping light beams pulsing fluidly in real time
function animateOpticsPipeline() {
    const micInElement = document.getElementById('micPos');
    if (micInElement) {
        const offset = parseFloat(micInElement.value);
        drawSetup(offset);
    }
    requestAnimationFrame(animateOpticsPipeline);
}

// Hook core layout triggers safely on runtime loading sequence completion
document.addEventListener("DOMContentLoaded", () => {
    // Fire real-time loop updates for the optics components
    animateOpticsPipeline();
});

function logData() {
    // Step 1: Current microscope position and side (for small observation table only)
    const offset = parseFloat(micIn.value);
    const posNum = offset;
    const pos = Math.abs(posNum).toFixed(3);
    const isLeft = offset < 0;
    const side = isLeft ? "Left" : "Right";

    // Step 2: Small observation table (unchanged)
    const table = document.querySelector("#obsTable tbody");
    const row = table.insertRow(0);
    row.innerHTML = `<td>${table.rows.length}</td><td>${pos} cm</td><td>${side}</td>`;

    // Step 3: Stage detection from actual microscope side + movement direction
    const stageName = detectStageFromPositionAndDirection(posNum);
    const ring = getCurrentStageRing(stageName);
    if (Number.isFinite(ring)) {
        writeReadingToStageCell(ring, stageName, posNum);
        advanceStagePointer(stageName);
    }

    // Step 4: Recalculate Table 1 and then Table 2 from updated data
    updateTable1Calculations();

    // Step 5: Table 2 updates inside updateTable1Calculations()
    previousMicroscopePosition = posNum;
}

function clearTable() {

    /* =========================================
       SMALL OBSERVATION TABLE
       ========================================= */
    document.querySelector("#obsTable tbody").innerHTML = "";

    /* =========================================
       RESET STAGE TRACKING
       ========================================= */
    previousMicroscopePosition = CENTER_POSITION_CM;
    currentDirection = "stationary";
    currentSide = "center";

    stageWriteIndex.leftForward = 0;
    stageWriteIndex.leftBackward = 0;
    stageWriteIndex.rightForward = 0;
    stageWriteIndex.rightBackward = 0;

    /* =========================================
       CLEAR TABLE 1
       ========================================= */
    document.querySelectorAll('#table1-body .lab-input').forEach(input => {

        // keep ring numbers
        if (input.classList.contains('lab-input-ring')) return;

        input.value = '';
    });

    /* =========================================
       CLEAR TABLE 2
       ========================================= */
    document.querySelectorAll('#table2-body .lab-input').forEach(input => {

        // keep fixed row numbering
        if (input.classList.contains('t2-ring-display')) return;

        input.value = '';
    });

    /* =========================================
       RESET FINAL RESULT
       ========================================= */
    const resultEl = document.getElementById('labResultRadiusValue');

    if (resultEl) {
        resultEl.textContent = '___';
    }

    /* =========================================
       FORCE RECALCULATION
       ========================================= */
    updateTable1Calculations();
}

[micIn, waveIn, radIn].forEach(el => el.addEventListener('input', update));
update();


/* ============================================================
   LAB RECORD TABLES (Table 1 & Table 2) — Newton’s Rings
   ============================================================ */
const LAB_LAMBDA_CM = 5.89e-5;

function labParseFinite(value) {
    const n = parseFloat(String(value).trim());
    return Number.isFinite(n) ? n : NaN;
}

function labFmtCm(val) {
    if (!Number.isFinite(val)) return '';
    const a = Math.abs(val);
    const dec = a >= 0.01 ? 5 : (a >= 0.0001 ? 7 : 9);
    return val.toFixed(dec).replace(/\.?0+$/, '');
}

function labFmtSmall(val) {
    if (!Number.isFinite(val)) return '';
    return val.toFixed(6).replace(/\.?0+$/, '');
}

function table1RingDiameterMap() {
    const map = new Map();
    const rows = document.querySelectorAll('#table1-body tr');
    rows.forEach(row => {
        const ringIn = row.querySelector('.lab-input-ring');
        const dIn = row.querySelector('.t1-d');
        if (!ringIn || !dIn) return;
        const key = labNormalizeRingKey(ringIn.value);
        const d = labParseFinite(dIn.value);
        if (key !== null && Number.isFinite(d)) map.set(key, d);
    });
    return map;
}

function labNormalizeRingKey(raw) {
    const s = String(raw).trim();
    if (s === '') return null;
    const n = Number(s);
    if (Number.isFinite(n)) return String(n);
    return s.toLowerCase();
}

function table1MeanDiameterForRing(ringRaw) {
    const key = labNormalizeRingKey(ringRaw);
    if (key === null) return NaN;
    const rows = document.querySelectorAll('#table1-body tr');
    for (let i = 0; i < rows.length; i++) {
        const ringIn = rows[i].querySelector('.lab-input-ring');
        if (!ringIn) continue;
        if (labNormalizeRingKey(ringIn.value) === key) {
            return labParseFinite(rows[i].querySelector('.t1-mean-d')?.value);
        }
    }
    return NaN;
}

function updateTable1Calculations() {
    const tbody = document.getElementById('table1-body');
    if (!tbody) return;

    tbody.querySelectorAll('tr').forEach(row => {
        const leftForward = labParseFinite(row.querySelector('.t1-left-forward')?.value);
        const leftBackward = labParseFinite(row.querySelector('.t1-left-backward')?.value);
        const rightForward = labParseFinite(row.querySelector('.t1-right-forward')?.value);
        const rightBackward = labParseFinite(row.querySelector('.t1-right-backward')?.value);

        const d1El = row.querySelector('.t1-d1');
        const d2El = row.querySelector('.t1-d2');
        const meanDEl = row.querySelector('.t1-mean-d');

        /* =========================================
           D1 = LF - RF
           ========================================= */

        const d1 = (
            Number.isFinite(leftForward) &&
            Number.isFinite(rightForward)
        )
            ? Math.abs(leftForward - rightForward)
            : NaN;

        /* =========================================
           D2 = LB - RB
           ========================================= */

        const d2 = (
            Number.isFinite(leftBackward) &&
            Number.isFinite(rightBackward)
        )
            ? Math.abs(leftBackward - rightBackward)
            : NaN;

        /* =========================================
           Mean D = (D1 + D2)/2
           ========================================= */

        const meanD = (
            Number.isFinite(d1) &&
            Number.isFinite(d2)
        )
            ? (d1 + d2) / 2
            : NaN;

        if (d1El) {
            d1El.value = Number.isFinite(d1)
                ? d1.toFixed(4)
                : '';
        }

        if (d2El) {
            d2El.value = Number.isFinite(d2)
                ? d2.toFixed(4)
                : '';
        }

        if (meanDEl) {
            meanDEl.value = Number.isFinite(meanD)
                ? meanD.toFixed(4)
                : '';
        }
    });

    updateTable2();
}

function updateTable2() {
    const tbody = document.getElementById('table2-body');
    if (!tbody) return;

    const t2rows = Array.from(tbody.rows);
    clearTable2Rows(t2rows);

    // Fixed mapping from Table 1 row index -> ring number.
    const rowRingMap = [4, 8, 12, 16, 20];

    // Build ringData from completed Table 1 rows only.
    const ringData = {};
    const t1rows = Array.from(document.querySelectorAll('#table1-body tr'));
    rowRingMap.forEach((ring, idx) => {
        const row = t1rows[idx];
        if (!row) return;

        const meanD = labParseFinite(row.querySelector('.t1-mean-d')?.value);
        if (!Number.isFinite(meanD)) return;

        ringData[ring] = meanD;
    });

    // Fixed laboratory pairs: (n+m), n, m
    const fixedPairs = [
        { nPlusM: 12, n: 8, m: 4 },
        { nPlusM: 16, n: 12, m: 4 },
        { nPlusM: 16, n: 8, m: 8 },
        { nPlusM: 20, n: 16, m: 4 },
        { nPlusM: 20, n: 12, m: 8 }
    ];

    const rValues = [];
    const fillCount = Math.min(fixedPairs.length, t2rows.length);

    for (let i = 0; i < fillCount; i++) {
        const row = t2rows[i];
        const pair = fixedPairs[i];

        const dNm = ringData[pair.nPlusM];
        const dN = ringData[pair.n];

        const d2Nm = Number.isFinite(dNm) ? dNm * dNm : NaN;
        const d2N = Number.isFinite(dN) ? dN * dN : NaN;
        const diff = (Number.isFinite(d2Nm) && Number.isFinite(d2N)) ? Math.abs(d2Nm - d2N) : NaN;
        const rVal = (Number.isFinite(diff) && pair.m !== 0)
            ? diff / (4 * pair.m * LAB_LAMBDA_CM)
            : NaN;

        const ringEl = row.querySelector('.t2-ring-display');
        const meanDEl = row.querySelector('.t2-mean-d');
        const d2El = row.querySelector('.t2-d2');
        const npmEl = row.querySelector('.t2-n-plus-m');
        const nEl = row.querySelector('.t2-n');
        const mEl = row.querySelector('.t2-m');
        const deltaEl = row.querySelector('.t2-delta-d2');
        const rEl = row.querySelector('.t2-r');

        if (ringEl) ringEl.value = String(rowRingMap[i]);
        if (npmEl) npmEl.value = String(pair.nPlusM);
        if (nEl) nEl.value = String(pair.n);
        if (mEl) mEl.value = String(pair.m);

        // Mean D per row = Table 1 mean D for that row's ring (4,8,12,16,20)
        const rowRings = [4, 8, 12, 16, 20];
        if (meanDEl) meanDEl.value = Number.isFinite(ringData[rowRings[i]]) ? ringData[rowRings[i]].toFixed(4) : '';
        const rowMeanD = ringData[rowRings[i]];
        const rowD2 = Number.isFinite(rowMeanD) ? rowMeanD * rowMeanD : NaN;
        if (d2El) d2El.value = Number.isFinite(rowD2) ? rowD2.toFixed(4) : '';
        if (deltaEl) deltaEl.value = Number.isFinite(diff) ? diff.toFixed(4) : '';
        if (rEl) rEl.value = Number.isFinite(rVal) ? rVal.toFixed(4) : '';

        if (Number.isFinite(rVal)) rValues.push(rVal);
    }

    let meanR = NaN;
    if (rValues.length > 0) meanR = rValues.reduce((a, b) => a + b, 0) / rValues.length;

    const firstMeanR = t2rows[0]?.querySelector('.t2-mean-r');
    if (firstMeanR) firstMeanR.value = Number.isFinite(meanR) ? fmt3(meanR) : '';

    const resultEl = document.getElementById('labResultRadiusValue');
    if (resultEl) {
        resultEl.textContent = Number.isFinite(meanR) ? fmt3(meanR) : '___';
    }
    updateErrorAnalysisTab(ringData, fixedPairs);
}

function initLabRecordTables() {
    const t1 = document.getElementById('table1-body');
    const t2 = document.getElementById('table2-body');
    if (!t1 || !t2) return;

    t1.addEventListener('input', e => {
        if (e.target && e.target.classList && e.target.classList.contains('lab-input')) {
            updateTable1Calculations();
        }
    });

    t2.addEventListener('input', e => {
        if (e.target && e.target.classList && e.target.classList.contains('lab-input')) {
            updateTable2();
        }
    });

    const printBtn = document.getElementById('btnPrintLabTables');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    updateTable1Calculations();
}

initLabRecordTables();

/* --- NEW FUNCTION: Automated Error Analysis --- */
function updateErrorAnalysisTab(ringData, fixedPairs) {

    const errorBody = document.getElementById('error-table-body');
    const meanErrorEl = document.getElementById('mean-error-val');

    const VC = 0.001; // Vernier Constant

    if (!errorBody) return;

    errorBody.innerHTML = '';

    let totalPercError = 0;
    let count = 0;

    // SAME pairs used in Table 2
    fixedPairs.forEach(pair => {

        const dNm = ringData[pair.nPlusM];
        const dN = ringData[pair.n];

        // calculate only if both diameters exist
        if (Number.isFinite(dNm) && Number.isFinite(dN)) {

            const diameterDiff = Math.abs(dNm - dN);

            // % Error formula
            const percError = ((4 * VC) / diameterDiff) * 100;

            const row = document.createElement('tr');

            row.innerHTML = `
                <td>(${pair.nPlusM}, ${pair.n})</td>
                <td>${dNm.toFixed(4)}</td>
                <td>${dN.toFixed(4)}</td>
                <td>${diameterDiff.toFixed(4)}</td>
                <td>${percError.toFixed(2)} %</td>
            `;

            errorBody.appendChild(row);

            totalPercError += percError;
            count++;
        }
    });

    // Mean Error
    if (count > 0) {

        meanErrorEl.textContent =
            (totalPercError / count).toFixed(2);

    } else {

        meanErrorEl.textContent = '___';

        errorBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    Fill Table 1 & 2 to see error analysis
                </td>
            </tr>
        `;
    }
}
