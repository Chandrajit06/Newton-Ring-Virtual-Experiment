# 🔬 Newton's Rings Virtual Lab Experiment

An interactive, browser-based virtual experiment that simulates the **Newton's Rings** optical phenomenon. Designed for physics students to study thin-film interference and determine the radius of curvature of a plano-convex lens — all without any physical apparatus.

---

## 📸 Overview

Newton's Rings is a classic optics experiment where alternate dark and bright circular fringes (rings) are formed due to interference between light reflected from the lower surface of a plano-convex lens and the upper surface of a flat glass plate. This virtual lab replicates the full experiment workflow digitally.

---

## ✨ Features

### 📖 Theory Tab
- Objective, apparatus list, and complete theoretical background
- Derivation of key formulas for dark/bright ring conditions
- Formula for calculating the radius of curvature **R**
- Diagram of the experimental setup

### 🧪 Procedure Tab
- Step-by-step instructions mirroring real lab protocol
- Guidance on travelling microscope usage and ring measurement

### 🎛️ Simulation Tab
- **Live Newton's Rings canvas** — renders concentric interference fringes in real time
- **Interactive controls:**
  - Microscope position slider (moves left/right of center)
  - Wavelength selector (sodium light, 589 nm)
  - Radius of curvature adjustment
- **Automatic lab record population** — the simulation detects microscope direction and side, and fills in Table 1 (diameter measurements) automatically as you scan across the rings
- **Table 1** — Records left/right microscope readings for rings of order 4, 8, 12, 16, 20; auto-computes mean diameter D and D²
- **Table 2** — Auto-populates D², ΔD², and calculates R for 5 ring pairs; displays mean R
- **Print-ready lab record** — formatted for clean black-and-white printing

### 📊 Error Analysis Tab
- Calculates maximum proportional error using Vernier constant (V.C. = 0.001 cm)
- Formula: **(ΔR/R)_max = 4 × V.C. / (D_(n+m) − D_n)**
- Auto-generated table of percentage errors for all ring pairs
- Displays mean percentage error

---

## 🗂️ File Structure

```
├── Index.html       # Main HTML structure and all tab panels
├── Script.js        # Simulation logic, canvas rendering, table auto-fill
├── Style.css        # Dark-themed responsive styling
└── Setup.jpeg       # Experimental setup diagram image
```

---

## 🚀 Getting Started

No installation or build step required. This is a pure front-end project.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/newtons-rings-virtual-lab.git
   cd newtons-rings-virtual-lab
   ```

2. **Open in browser:**
   ```
   Open Index.html directly in any modern web browser.
   ```

3. **Make sure `Setup.jpeg` is in the same folder as `Index.html`** for the theory diagram to display.

---

## 🧑‍🔬 How to Use the Simulation

1. Go to the **Simulation** tab.
2. Use the **Microscope Position** slider to move from the right side (positive) across center to the left side (negative).
3. The simulation auto-detects which ring order the crosshair is on and fills **Table 1** with position readings.
4. After scanning both sides, **Table 2** is auto-populated with computed values of R.
5. Switch to the **Error Analysis** tab to view calculated percentage errors.
6. Use the **Print Lab Record** button to get a print-ready version of your data tables.

---

## 🛠️ Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Structure and tab layout |
| CSS3 | Dark theme, responsive grid, print styles |
| Vanilla JavaScript | Canvas rendering, simulation logic, table calculations |
| Canvas API | Newton's rings visualization and setup diagram |

---

## 📐 Key Physics

| Formula | Description |
|---|---|
| `2μt = nλ` | Condition for dark rings |
| `2μt = (n + ½)λ` | Condition for bright rings |
| `Dₙ² = 4nλR` | Diameter of the n-th dark ring |
| `R = (D²_(n+m) − D²_n) / 4mλ` | Radius of curvature of plano-convex lens |

- **Wavelength used:** 589 nm (sodium light)
- **Vernier constant:** 0.001 cm

---

## 📄 License

This project is open source and available for further improvements.

---

## 🙌 Acknowledgements

Developed as a virtual physics lab tool for undergraduate optics experiments.