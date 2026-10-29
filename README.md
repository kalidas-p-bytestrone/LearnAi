# 🛡️ Sentinel AI — Interactive Mask Detection System

A futuristic, high-performance web application built with **pure HTML5, CSS3, and JavaScript** that detects whether a person is wearing a mask or not using Google's **Teachable Machine** and **TensorFlow.js**.

---

## ✨ Features

- **Teachable Machine Integration**: 
  - **Pre-configured Model**: Comes pre-connected to your model at `https://teachablemachine.withgoogle.com/models/1CPVctsXq/` (Labels: `Masks` and `No Masks`).
  - Connect via any public Teachable Machine shareable link.
  - Or upload exported model files (`model.json`, `metadata.json`, `weights.bin`) directly.
  - Automatically identifies arbitrary class labels (`Mask`, `No Mask`, `With Mask`, `Without Mask`, etc.).
  - Saves your model connection in `localStorage` for instant access across reloads.
- **Futuristic Biometric HUD**:
  - Sci-fi targeting reticle with corner brackets and dynamic lock-on state.
  - Animated laser scanline with on/off toggle.
  - Real-time 60 FPS counter and resolution badge.
- **Audio Synthesizer (Web Audio API)**:
  - Synthetic sci-fi audio feedback (success chime on mask detection, alert siren on no mask, scanner beeps, camera shutter) with zero external audio assets required.
- **Interactive AR Virtual Mask Wardrobe**:
  - Live AR overlay directly on the canvas allowing users to try on virtual masks (*Cyber Neon*, *N95 Pro*, *Stealth Ninja*, *Fun Smiley*).
- **Gamified Compliance Tracker & Badges**:
  - Compliance Streak timer that rewards continuous mask wearing.
  - Interactive unlockable achievements: *Mask Verified*, *Iron Shield (15s streak)*, *Cyber Modder*, and *Agent ID*.
  - Confetti celebration bursts upon milestone achievements.
- **Security Clearance ID Pass Generator**:
  - Instant photobooth snapshot generator that creates a cybersecurity access pass with live photo, verdict stamp, timestamp, and downloadable PNG badge.
- **Multi-Source Support**:
  - Live webcam stream with mirror/flip support.
  - Static photo upload / drop testing mode for testing without a webcam.

---

## 🚀 How to Run

Because webcam access and Teachable Machine models use web workers and CORS requests, it is best served via any simple local HTTP server:

### Option 1: Python Built-in Server (Recommended)
```bash
cd /Users/kalidas.p/Documents/mask-detector
python3 -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: Node.js `npx serve`
```bash
cd /Users/kalidas.p/Documents/mask-detector
npx serve .
```

### Option 3: Double-click `index.html`
You can also open [index.html](file:///Users/kalidas.p/Documents/mask-detector/index.html) directly in modern browsers (Chrome, Edge, Brave, Safari).

---

## 🧠 Connecting your Teachable Machine Model

1. Go to your [Teachable Machine](https://teachablemachine.withgoogle.com/) project.
2. Click **"Export Model"**.
3. Under the **Tensorflow.js** tab, select **"Upload (shareable link)"** and click **"Upload my model"**.
4. Copy your shareable link (e.g., `https://teachablemachine.withgoogle.com/models/xxxxxx/`).
5. In the Sentinel AI application, click **"SETUP"** / **"Model: Ready"** at the top right, paste your link, and click **"Connect Model"**!
