/* ============================================================
   THEME SYSTEM
   Priority: localStorage saved pref → OS prefers-color-scheme → dark (default)
   ============================================================ */
(function () {
    const STORAGE_KEY = 'newton-rings-theme';
    const html = document.documentElement;
    const DARK = 'dark';
    const LIGHT = 'light';

    /** Return 'light' | 'dark' from OS media query */
    function getSystemTheme() {
        return LIGHT;
    }

    /** Load saved preference, or fall back to system default */
    function getInitialTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === LIGHT || saved === DARK) return saved;
        } catch (_) { /* private browsing may deny storage access */ }
        return getSystemTheme();
    }

    /** Apply theme and update toggle button state */
    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        const btn = document.getElementById('themeToggleBtn');
        if (!btn) return;
        const isDark = theme === DARK;
        btn.setAttribute('aria-label',   isDark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('aria-pressed', isDark ? 'false' : 'true');
    }

    /** Persist preference and apply */
    function setTheme(theme) {
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
        applyTheme(theme);
    }

    /** Toggle between dark and light */
    function toggleTheme() {
        const current = html.getAttribute('data-theme') === LIGHT ? LIGHT : DARK;
        setTheme(current === DARK ? LIGHT : DARK);
    }

    // ── Bootstrap on DOMContentLoaded so the button element exists ──
    document.addEventListener('DOMContentLoaded', function () {
        // Apply saved/system theme
        applyTheme(getInitialTheme());

        // Wire toggle button
        const btn = document.getElementById('themeToggleBtn');
        if (btn) {
            btn.addEventListener('click', toggleTheme);
        }

        // React to OS-level preference changes (user toggles OS dark mode)
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function (e) {
            // Only follow OS change if user hasn't manually set a preference
            try {
                if (!localStorage.getItem('newton-rings-theme')) {
                    applyTheme(e.matches ? LIGHT : DARK);
                }
            } catch (_) {
                applyTheme(e.matches ? LIGHT : DARK);
            }
        });
    });
})();

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
   
   /**
    * Convert a wavelength in nm to an sRGB colour string that matches the
    * visible spectrum.  Returns a CSS rgb(…) string.
    * Based on the well-known Bruton / Schekman approximation, extended so
    * that the full 380–700 nm range maps smoothly.
    */
   function wavelengthToRgb(wl) {
       let r = 0, g = 0, b = 0;

       if      (wl >= 380 && wl < 440) { r = -(wl - 440) / (440 - 380); g = 0; b = 1; }
       else if (wl >= 440 && wl < 490) { r = 0; g = (wl - 440) / (490 - 440); b = 1; }
       else if (wl >= 490 && wl < 510) { r = 0; g = 1; b = -(wl - 510) / (510 - 490); }
       else if (wl >= 510 && wl < 580) { r = (wl - 510) / (580 - 510); g = 1; b = 0; }
       else if (wl >= 580 && wl < 645) { r = 1; g = -(wl - 645) / (645 - 580); b = 0; }
       else if (wl >= 645 && wl <= 700) { r = 1; g = 0; b = 0; }

       // Intensity fall-off near UV and IR edges
       let factor;
       if      (wl >= 380 && wl < 420) factor = 0.3 + 0.7 * (wl - 380) / (420 - 380);
       else if (wl >= 645 && wl <= 700) factor = 0.3 + 0.7 * (700 - wl) / (700 - 645);
       else                              factor = 1.0;

       const gamma = 0.80;
       const toInt = c => Math.round(255 * Math.pow(c * factor, gamma));
       return `rgb(${toInt(r)}, ${toInt(g)}, ${toInt(b)})`;
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

       // Physically accurate colour from wavelength (yellow at 589 nm, etc.)
       const ringRgb = wavelengthToRgb(λ);
   
       for (let n = maxOrder; n >= 1; n--) {
           const radius = Math.sqrt(n * R * λcm) * pxScale; // r ∝ sqrt(nRλ)

           rCtx.beginPath();
           rCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
           rCtx.strokeStyle = (n % 2 === 0) ? "#000" : ringRgb;
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
    * Draws a Travelling Microscope style scale:
    *   LEFT ~68% — horizontal Main Scale (graduated bar with numerical labels)
    *   RIGHT ~32% — Circular Scale as a cylindrical drum viewed from the side
    *                (100 divisions per revolution, like a real travelling microscope thimble)
    * Least Count = 0.05 / 50 = 0.001 cm  (reading logic unchanged)
    */
   function drawMechanicalVernierScale(offset) {
       if (!vCtx || !vernierCanvas) return;
   
       const W = vernierCanvas.width;
       const H = vernierCanvas.height;
   
       vCtx.clearRect(0, 0, W, H);
   
       // ── Reading calculations (identical logic to original implementation) ──────
       const absoluteReading = Math.abs(offset);
       const msdValue  = 0.05;
       const msr       = Math.floor(absoluteReading / msdValue) * msdValue;
       const residual  = absoluteReading - msr;
       const csrTicks  = Math.round(residual / 0.001);  // 0–49, same as before
   
       // ── Layout ────────────────────────────────────────────────────────────────
       const dividerX = Math.round(W * 0.68);
       const pad      = 4;
   
       // ═══════════════════════════════════════════════════════════════════════
       // A.  MAIN SCALE  (left panel)
       //     Horizontal graduated bar — ticks grow downward from the top edge.
       //     A fixed red horizontal index line sits at bar mid-height.
       //     Numbers appear ABOVE the bar at every 0.5 cm and integer cm.
       // ═══════════════════════════════════════════════════════════════════════
       const msW = dividerX;
   
       // Reserve bottom strip for readout text
       const readoutH  = 32;
       const barTop    = 6;
       const barBot    = H - readoutH - 2;
       const barH      = barBot - barTop;
       const barMid    = barTop + barH / 2;
   
       // — A1. Metallic bar body —
       let metalGrad = vCtx.createLinearGradient(0, barTop, 0, barBot);
       metalGrad.addColorStop(0,    '#b8bec8');
       metalGrad.addColorStop(0.12, '#dde2ea');
       metalGrad.addColorStop(0.38, '#f2f4f7');
       metalGrad.addColorStop(0.62, '#e8ecf0');
       metalGrad.addColorStop(0.88, '#c8cfd8');
       metalGrad.addColorStop(1,    '#9aa2ae');
       vCtx.fillStyle = metalGrad;
       vCtx.fillRect(pad, barTop, msW - pad * 2, barH);
   
       // Highlight bead at top
       vCtx.fillStyle = 'rgba(255,255,255,0.6)';
       vCtx.fillRect(pad, barTop, msW - pad * 2, 2);
       // Shadow at bottom
       vCtx.fillStyle = 'rgba(0,0,0,0.22)';
       vCtx.fillRect(pad, barBot - 2, msW - pad * 2, 2);
   
       // — A2. Index reference line (horizontal red line at bar mid) —
       // — A3. Tick marks & numbers —
       // Ticks hang DOWN from the top edge of the bar.
       // The scale scrolls: the main-scale reading position is fixed at indexY.
       // pixelsPerCm controls zoom level.
       const pixelsPerCm = 280;
       // indexX is where absoluteReading maps on screen (left ≈ 40% of bar)
       const indexX      = msW * 0.42;
       const startCm     = absoluteReading - (indexX        / pixelsPerCm);
       const endCm       = absoluteReading + ((msW - indexX) / pixelsPerCm);
   
       vCtx.save();
       // Clip ticks inside the bar
       vCtx.beginPath();
       vCtx.rect(pad, barTop, msW - pad * 2, barH);
       vCtx.clip();
   
       let sv = Math.ceil(startCm / msdValue) * msdValue;
       while (sv <= endCm + msdValue * 0.01) {
           const tx      = indexX + (sv - absoluteReading) * pixelsPerCm;
           const isInt   = Math.abs(sv - Math.round(sv))             < 1e-5;
           const isHalf  = !isInt && Math.abs((sv * 10) - Math.round(sv * 10)) < 1e-5;
   
           if (isInt) {
               // Full-height tick spanning the bar
               vCtx.strokeStyle = '#0a0c10';
               vCtx.lineWidth   = 2.5;
               vCtx.beginPath();
               vCtx.moveTo(tx, barTop + 2);
               vCtx.lineTo(tx, barBot - 2);
               vCtx.stroke();
               // Large label centred on bar mid with white shadow for high contrast
               vCtx.save();
               vCtx.shadowColor  = 'rgba(255,255,255,0.95)';
               vCtx.shadowBlur   = 4;
               vCtx.fillStyle    = '#0a0c12';
               vCtx.font         = 'bold 14px ui-monospace, monospace';
               vCtx.textAlign    = 'center';
               vCtx.textBaseline = 'middle';
               vCtx.fillText(Math.round(sv).toString(), tx, barMid);
               vCtx.restore();
           } else if (isHalf) {
               // Mid-height tick
               vCtx.strokeStyle = '#1c2030';
               vCtx.lineWidth   = 1.8;
               const halfH = barH * 0.65;
               vCtx.beginPath();
               vCtx.moveTo(tx, barMid - halfH / 2);
               vCtx.lineTo(tx, barMid + halfH / 2);
               vCtx.stroke();
               // Half-cm label with shadow
               vCtx.save();
               vCtx.shadowColor  = 'rgba(255,255,255,0.85)';
               vCtx.shadowBlur   = 3;
               vCtx.fillStyle    = '#12161e';
               vCtx.font         = 'bold 11px ui-monospace, monospace';
               vCtx.textAlign    = 'center';
               vCtx.textBaseline = 'middle';
               vCtx.fillText(sv.toFixed(1), tx, barMid);
               vCtx.restore();
           } else {
               // Short tick for 0.05 cm sub-divisions
               vCtx.strokeStyle = '#3a4555';
               vCtx.lineWidth   = 1.2;
               const shortH = barH * 0.38;
               vCtx.beginPath();
               vCtx.moveTo(tx, barMid - shortH / 2);
               vCtx.lineTo(tx, barMid + shortH / 2);
               vCtx.stroke();
           }
           sv = Math.round((sv + msdValue) * 1e6) / 1e6;
       }
       vCtx.restore();
   
       // — A3b. Vertical red arrow above bar pointing down at the reading position —
       const arrowX   = indexX;
       const arrowTip = barTop;        // tip just touches the bar top edge
       vCtx.strokeStyle = '#e8192c';
       vCtx.lineWidth   = 2;
       vCtx.beginPath();
       vCtx.moveTo(arrowX, 0);
       vCtx.lineTo(arrowX, arrowTip - 5);
       vCtx.stroke();
       vCtx.fillStyle = '#e8192c';
       vCtx.beginPath();
       vCtx.moveTo(arrowX,     arrowTip);
       vCtx.lineTo(arrowX - 6, arrowTip - 10);
       vCtx.lineTo(arrowX + 6, arrowTip - 10);
       vCtx.closePath();
       vCtx.fill();
   
       // — A4. Readout strip below bar —
       const ryTop = barBot + 3;
       vCtx.fillStyle    = 'rgba(12,14,20,0.82)';
       vCtx.fillRect(pad, ryTop, msW - pad * 2, readoutH - 2);
   
       vCtx.font         = '11px ui-monospace, monospace';
       vCtx.textBaseline = 'middle';
       const ryMid = ryTop + (readoutH - 2) / 2;
   
       vCtx.fillStyle = '#a8c4e0';
       vCtx.textAlign = 'left';
       vCtx.fillText('MSR = ' + msr.toFixed(3) + ' cm', pad + 6, ryMid - 7);
   
       vCtx.fillStyle = '#00d4ff';
       vCtx.font      = 'bold 12px ui-monospace, monospace';
       vCtx.fillText('Total = ' + absoluteReading.toFixed(3) + ' cm', pad + 6, ryMid + 7);
   
       // ── Panel divider ─────────────────────────────────────────────────────────
       vCtx.fillStyle = '#1e2330';
       vCtx.fillRect(dividerX - 1, 0, 3, H);
       vCtx.strokeStyle = '#4a5568';
       vCtx.lineWidth   = 0.8;
       vCtx.beginPath();
       vCtx.moveTo(dividerX + 1, 0);
       vCtx.lineTo(dividerX + 1, H);
       vCtx.stroke();
   
       // ═══════════════════════════════════════════════════════════════════════
       // B.  CIRCULAR (DRUM) SCALE — right panel
       //     Rendered as a CYLINDER viewed from the side, matching the reference
       //     image: a vertical barrel with horizontal graduation lines.
       //     100 divisions per revolution; the drum scrolls so that csrTicks
       //     aligns with the horizontal red index line at drum centre.
       // ═══════════════════════════════════════════════════════════════════════
       const drumPanelLeft = dividerX + 3;
       const drumPanelW    = W - drumPanelLeft;
   
       // Drum visual geometry
       const dLeft   = drumPanelLeft + 4;
       const dRight  = W - 4;
       const dWidth  = dRight - dLeft;
       const dTop    = 2;
       const dBot    = H - 2;
       const dH      = dBot - dTop;
       const dMidY   = dTop + dH / 2;   // where the index line sits
   
       // — B0. Dark background behind drum —
       vCtx.fillStyle = '#0e1018';
       vCtx.fillRect(drumPanelLeft, 0, drumPanelW, H);
   
       // — B1. Cylinder body with brushed-steel radial gradient —
       let cylGrad = vCtx.createLinearGradient(dLeft, 0, dRight, 0);
       cylGrad.addColorStop(0,    '#2a2e38');
       cylGrad.addColorStop(0.08, '#4e5668');
       cylGrad.addColorStop(0.22, '#7a828d');
       cylGrad.addColorStop(0.40, '#9098a3');
       cylGrad.addColorStop(0.58, '#7f8792');
       cylGrad.addColorStop(0.75, '#7e8792');
       cylGrad.addColorStop(0.90, '#5a6070');
       cylGrad.addColorStop(1,    '#1e2028');
       vCtx.fillStyle = cylGrad;
       vCtx.fillRect(dLeft, dTop, dWidth, dH);
   
       // Top elliptical cap (shows depth)
       let topCapGrad = vCtx.createLinearGradient(dLeft, dTop - 5, dRight, dTop - 5);
       topCapGrad.addColorStop(0,   '#2a2e38');
       topCapGrad.addColorStop(0.5, '#b0b8c4');
       topCapGrad.addColorStop(1,   '#1e2028');
       vCtx.fillStyle = topCapGrad;
       vCtx.beginPath();
       vCtx.ellipse(dLeft + dWidth / 2, dTop, dWidth / 2, 5, 0, 0, Math.PI * 2);
       vCtx.fill();
       vCtx.strokeStyle = '#3a4050';
       vCtx.lineWidth   = 0.8;
       vCtx.stroke();
   
       // Bottom elliptical cap
       let botCapGrad = vCtx.createLinearGradient(dLeft, dBot, dRight, dBot);
       botCapGrad.addColorStop(0,   '#1a1e28');
       botCapGrad.addColorStop(0.5, '#6a7080');
       botCapGrad.addColorStop(1,   '#0e1018');
       vCtx.fillStyle = botCapGrad;
       vCtx.beginPath();
       vCtx.ellipse(dLeft + dWidth / 2, dBot, dWidth / 2, 5, 0, 0, Math.PI * 2);
       vCtx.fill();
       vCtx.strokeStyle = '#2a2e3a';
       vCtx.lineWidth   = 0.8;
       vCtx.stroke();
   
       // — B2. Clip all tick rendering to the cylinder face —
       vCtx.save();
       vCtx.beginPath();
       vCtx.rect(dLeft, dTop, dWidth, dH);
       vCtx.clip();
   
       // — B3. Draw 50-division tick marks scrolling vertically —
       //     pxPerDiv: pixels per one division on the drum face
       //     The drum circumference maps to dH * multiplier so we see ~25–30 divs.
       const totalDivs = 50;
       const pxPerDiv  = dH / 25;   // show ~25 divisions in the visible window
   
       // Which division sits at centre (index line)?  → csrTicks
       // Offset so csrTicks is at dMidY
       const divOffset = csrTicks * pxPerDiv;
   
       // We need to tile: draw enough divisions above and below centre
       const visHalf = dH / 2 + pxPerDiv * 2;
       const startDiv = Math.floor((csrTicks - visHalf / pxPerDiv));
       const endDiv   = Math.ceil( (csrTicks + visHalf / pxPerDiv));
   
       for (let d = startDiv; d <= endDiv; d++) {
           // Wrap division number 0-99
           const divNum = ((d % totalDivs) + totalDivs) % totalDivs;
           const ty     = dMidY + (d - csrTicks) * pxPerDiv;
   
           if (ty < dTop - 2 || ty > dBot + 2) continue;
   
           const isMajor = (divNum % 10 === 0);
           const isFive  = (divNum % 5  === 0 && !isMajor);
   
           // Tick length — emanate from left edge inward
           const tickLen = isMajor ? dWidth * 0.52
                         : isFive  ? dWidth * 0.36
                                   : dWidth * 0.22;
   
           // Fade ticks near top/bottom caps for realism
           const distFromMid = Math.abs(ty - dMidY);
           const fadeAlpha   = Math.max(0.15, 1 - (distFromMid / (dH * 0.46)));
   
           vCtx.globalAlpha = fadeAlpha;
           vCtx.strokeStyle = isMajor ? '#d8e0ec' : (isFive ? '#a0acbc' : '#60687a');
           vCtx.lineWidth   = isMajor ? 1.6 : (isFive ? 1.0 : 0.7);
           vCtx.beginPath();
           vCtx.moveTo(dLeft,            ty);
           vCtx.lineTo(dLeft + tickLen,  ty);
           vCtx.stroke();
   
           // Mirror tick from right edge
           vCtx.beginPath();
           vCtx.moveTo(dRight,           ty);
           vCtx.lineTo(dRight - tickLen, ty);
           vCtx.stroke();
   
           // Number labels — centred in drum, larger and brighter for readability
           if (isMajor) {
               vCtx.globalAlpha = Math.min(1, fadeAlpha * 1.1);
               vCtx.save();
               vCtx.shadowColor  = 'rgba(0,0,0,0.9)';
               vCtx.shadowBlur   = 4;
               vCtx.fillStyle    = '#000000';
               vCtx.font         = 'bold 20px ui-monospace, monospace';
               vCtx.textAlign    = 'center';
               vCtx.textBaseline = 'middle';
               vCtx.fillText(String(divNum), dLeft + dWidth / 2, ty);
               vCtx.restore();
           } else if (isFive) {
               vCtx.globalAlpha = fadeAlpha * 0.9;
               vCtx.save();
               vCtx.shadowColor  = 'rgba(0,0,0,0.8)';
               vCtx.shadowBlur   = 3;
               vCtx.fillStyle    = '#000000';
               vCtx.font         = 'bold 15px ui-monospace, monospace';
               vCtx.textAlign    = 'center';
               vCtx.textBaseline = 'middle';
               vCtx.fillText(String(divNum), dLeft + dWidth / 2, ty);
               vCtx.restore();
           }
       }
       vCtx.globalAlpha = 1;
       vCtx.restore();   // restore clip
   
       // — B4. Red horizontal index line (fixed, centred on drum) —
       vCtx.strokeStyle = '#e8192c';
       vCtx.lineWidth   = 1.8;
       vCtx.beginPath();
       vCtx.moveTo(dLeft  - 2, dMidY);
       vCtx.lineTo(dRight + 2, dMidY);
       vCtx.stroke();
   
       // Left arrowhead on the index line (same motif as main scale)
       vCtx.fillStyle = '#e8192c';
       vCtx.beginPath();
       vCtx.moveTo(dLeft + 10, dMidY);
       vCtx.lineTo(dLeft,      dMidY - 5);
       vCtx.lineTo(dLeft,      dMidY + 5);
       vCtx.closePath();
       vCtx.fill();
   
       // Subtle glow behind the index line
       vCtx.save();
       vCtx.globalAlpha = 0.18;
       vCtx.strokeStyle = '#ff4050';
       vCtx.lineWidth   = 6;
       vCtx.beginPath();
       vCtx.moveTo(dLeft, dMidY);
       vCtx.lineTo(dRight, dMidY);
       vCtx.stroke();
       vCtx.globalAlpha = 1;
       vCtx.restore();
   
       // — B5. "CIRCULAR SCALE" chip + CSR readout —
       vCtx.fillStyle    = 'rgba(10,12,20,0.85)';
       vCtx.fillRect(drumPanelLeft + 1, 0, drumPanelW - 1, 18);
       vCtx.fillStyle    = '#00d4ff';
       vCtx.font         = 'bold 10px ui-monospace, monospace';
       vCtx.textAlign    = 'left';
       vCtx.textBaseline = 'middle';
       vCtx.fillText('CIRC. SCALE  50 div/rev', drumPanelLeft + 4, 9);
   
       vCtx.fillStyle    = 'rgba(10,12,20,0.85)';
       vCtx.fillRect(drumPanelLeft + 1, H - 18, drumPanelW - 1, 18);
       vCtx.fillStyle    = '#e0eaf8';
       vCtx.font         = 'bold 11px ui-monospace, monospace';
       vCtx.textAlign    = 'left';
       vCtx.textBaseline = 'middle';
       vCtx.fillText('CSR = ' + csrTicks + ' div', drumPanelLeft + 4, H - 9);
   
       // ── Global vignette overlay ───────────────────────────────────────────────
       let glassHud = vCtx.createLinearGradient(0, 0, W, 0);
       glassHud.addColorStop(0,    'rgba(16,18,28,0.35)');
       glassHud.addColorStop(0.10, 'rgba(255,255,255,0.03)');
       glassHud.addColorStop(0.5,  'rgba(255,255,255,0)');
       glassHud.addColorStop(0.90, 'rgba(255,255,255,0.03)');
       glassHud.addColorStop(1,    'rgba(16,18,28,0.35)');
       vCtx.fillStyle = glassHud;
       vCtx.fillRect(0, 0, W, H);
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