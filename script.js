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

function drawSetup(offset) {
    sCtx.clearRect(0, 0, setupCanvas.width, setupCanvas.height);
    const margin = 40;
    const rulerStart = margin;
    const rulerEnd = setupCanvas.width - margin;
    const rulerWidth = rulerEnd - rulerStart;
    const pxPerCm = rulerWidth / 24; // -12 cm to +12 cm
    const centerX = rulerStart + rulerWidth / 2;

    // Draw Ruler
    sCtx.strokeStyle = "#888";
    sCtx.beginPath();
    sCtx.moveTo(rulerStart, 100);
    sCtx.lineTo(rulerEnd, 100);
    sCtx.stroke();

    for (let i = 0; i <= 24; i++) {
        let x = rulerStart + (i * pxPerCm);
        const cm = i - 12;
        sCtx.beginPath();
        sCtx.moveTo(x, 100);
        sCtx.lineTo(x, cm % 2 === 0 ? 117 : 112);
        sCtx.stroke();
        sCtx.fillStyle = "#666";
        sCtx.fillText(cm.toString(), x - 6, 130);
    }

    // Lens Assembly at the optical centre (0 cm).
    const targetX = centerX;
    sCtx.fillStyle = "#00d4ff22";
    sCtx.beginPath();
    sCtx.arc(targetX, 80, 25, 0, Math.PI * 2);
    sCtx.fill();
    sCtx.strokeStyle = "#00d4ff";
    sCtx.stroke();

    // Traveling Microscope Carriage follows signed offset from centre.
    const clampedOffset = Math.max(-12, Math.min(12, offset));
    const micX = centerX + (clampedOffset * pxPerCm);
    sCtx.fillStyle = "#444";
    sCtx.fillRect(micX - 25, 85, 50, 15);   // Base
    sCtx.fillStyle = "#777";
    sCtx.fillRect(micX - 8, 40, 16, 45);    // Body

    // Indicator Arrow (Vernier Zero)
    sCtx.fillStyle = "red";
    sCtx.beginPath();
    sCtx.moveTo(micX, 100);
    sCtx.lineTo(micX - 5, 112);
    sCtx.lineTo(micX + 5, 112);
    sCtx.fill();
}

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
