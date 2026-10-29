/**
 * SENTINEL AI — Interactive Biometric Mask Detection Engine
 * Integrates Teachable Machine Image Models with TensorFlow.js,
 * Real-time Biometric Reticle HUD, AR Virtual Masks, and Gamified Telemetry.
 */

(function () {
  'use strict';

  // State Management
  const state = {
    model: null,
    webcam: null,
    isWebcamRunning: false,
    isModelLoading: false,
    modelUrl: '',
    isBuiltinMode: false,
    lastPredictionTime: 0,
    fps: 60,
    frameCount: 0,
    lastFpsUpdate: Date.now(),
    currentVerdict: 'idle', // 'mask', 'nomask', 'idle'
    complianceStreakSeconds: 0,
    streakInterval: null,
    snapshotsTaken: 0,
    unlockedBadges: new Set(),
    selectedArMask: 'none',
    uploadedImage: null,
    isMirrored: true,
    showLaser: true,
    classes: []
  };

  // DOM Elements
  const el = {
    canvas: document.getElementById('detectionCanvas'),
    viewportFrame: document.getElementById('viewportFrame'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingTitle: document.getElementById('loadingTitle'),
    loadingDesc: document.getElementById('loadingDesc'),
    laserScanline: document.getElementById('laserScanline'),
    reticleVerdict: document.getElementById('reticleVerdict'),
    fpsCounter: document.getElementById('fpsCounter'),
    sourceBadge: document.getElementById('sourceBadge'),
    resBadge: document.getElementById('resBadge'),
    arMaskPill: document.getElementById('arMaskPill'),

    // Controls
    toggleCameraBtn: document.getElementById('toggleCameraBtn'),
    cameraBtnText: document.getElementById('cameraBtnText'),
    flipCameraBtn: document.getElementById('flipCameraBtn'),
    uploadImageBtn: document.getElementById('uploadImageBtn'),
    imageFileInput: document.getElementById('imageFileInput'),
    capturePassBtn: document.getElementById('capturePassBtn'),
    toggleLaserBtn: document.getElementById('toggleLaserBtn'),
    toggleAudioBtn: document.getElementById('toggleAudioBtn'),
    audioIcon: document.getElementById('audioIcon'),

    // Telemetry & Verdict
    verdictCard: document.getElementById('verdictCard'),
    verdictIcon: document.getElementById('verdictIcon'),
    verdictBadge: document.getElementById('verdictBadge'),
    verdictTitle: document.getElementById('verdictTitle'),
    verdictInstruction: document.getElementById('verdictInstruction'),
    compliancePercent: document.getElementById('compliancePercent'),
    complianceFill: document.getElementById('complianceFill'),
    predictionsList: document.getElementById('predictionsList'),
    activeModelTag: document.getElementById('activeModelTag'),
    streakCounter: document.getElementById('streakCounter'),
    snapshotsCounter: document.getElementById('snapshotsCounter'),
    badgeCount: document.getElementById('badgeCount'),
    activeModelUrlDisplay: document.getElementById('activeModelUrlDisplay'),
    modelBtnLabel: document.getElementById('modelBtnLabel'),
    modelStatusDot: document.getElementById('modelStatusDot'),

    // Modals
    openModelModalBtn: document.getElementById('openModelModalBtn'),
    quickEditModelBtn: document.getElementById('quickEditModelBtn'),
    modelModal: document.getElementById('modelModal'),
    closeModelModalBtn: document.getElementById('closeModelModalBtn'),
    closeModelFooterBtn: document.getElementById('closeModelFooterBtn'),
    tabCloudUrl: document.getElementById('tabCloudUrl'),
    tabUploadFiles: document.getElementById('tabUploadFiles'),
    tabDemoMode: document.getElementById('tabDemoMode'),
    panelCloudUrl: document.getElementById('panelCloudUrl'),
    panelUploadFiles: document.getElementById('panelUploadFiles'),
    panelDemoMode: document.getElementById('panelDemoMode'),
    tmModelUrlInput: document.getElementById('tmModelUrlInput'),
    loadUrlModelBtn: document.getElementById('loadUrlModelBtn'),
    fileDropzone: document.getElementById('fileDropzone'),
    modelFolderInput: document.getElementById('modelFolderInput'),
    loadedFilesList: document.getElementById('loadedFilesList'),
    loadFilesModelBtn: document.getElementById('loadFilesModelBtn'),
    selectBuiltinDemoBtn: document.getElementById('selectBuiltinDemoBtn'),
    modelModalStatus: document.getElementById('modelModalStatus'),

    // Pass Modal
    passModal: document.getElementById('passModal'),
    idBadgeCanvas: document.getElementById('idBadgeCanvas'),
    closePassModalBtn: document.getElementById('closePassModalBtn'),
    closePassFooterBtn: document.getElementById('closePassFooterBtn'),
    downloadPassBtn: document.getElementById('downloadPassBtn')
  };

  const ctx = el.canvas.getContext('2d');
  let animationFrameId = null;
  let stagedFiles = { model: null, metadata: null, weights: null };

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  const DEFAULT_MODEL_URL = 'https://teachablemachine.withgoogle.com/models/1CPVctsXq/';

  async function init() {
    setupEventListeners();
    initFallbackCanvas();

    // Check if user previously saved a Teachable Machine model URL in localStorage or use the provided model
    const savedUrl = localStorage.getItem('mask_sentinel_model_url') || DEFAULT_MODEL_URL;
    el.tmModelUrlInput.value = savedUrl;

    const loaded = await loadTeachableMachineUrl(savedUrl);
    if (!loaded) {
      // Fallback to adaptive smart model if network issue
      activateBuiltinModel();
    }
  }

  // Draw initial futuristic standby visual on canvas
  function initFallbackCanvas() {
    el.canvas.width = 640;
    el.canvas.height = 480;
    renderStandbyScreen();
  }

  function renderStandbyScreen() {
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < el.canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, el.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < el.canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(el.canvas.width, y);
      ctx.stroke();
    }

    // Center circular radar graphic
    const cx = el.canvas.width / 2;
    const cy = el.canvas.height / 2;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 110, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 245, 160, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#00e5ff';
    ctx.font = '600 16px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SENTINEL AI — BIOMETRIC SENSORS STANDBY', cx, cy - 10);

    ctx.fillStyle = '#8b9bb4';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText('Click [Start Camera] or [Test Photo] to activate', cx, cy + 20);
  }

  // ==========================================================================
  // MODEL LOADING (Teachable Machine CDN integration)
  // ==========================================================================

  async function loadTeachableMachineUrl(modelUrl) {
    if (!modelUrl || !modelUrl.trim()) return false;
    let formattedUrl = modelUrl.trim();
    if (!formattedUrl.endsWith('/')) {
      formattedUrl += '/';
    }

    showLoading(true, 'CONNECTING TEACHABLE MACHINE', 'Downloading model topology and weights...');

    try {
      if (typeof tmImage === 'undefined') {
        throw new Error('Teachable Machine Image library is still loading or unavailable.');
      }

      const modelURL = formattedUrl + 'model.json';
      const metadataURL = formattedUrl + 'metadata.json';

      state.model = await tmImage.load(modelURL, metadataURL);
      state.isBuiltinMode = false;
      state.modelUrl = formattedUrl;
      state.classes = state.model.getClassLabels();

      localStorage.setItem('mask_sentinel_model_url', formattedUrl);
      updateModelBadge(true, 'TM Custom Cloud Model');
      el.activeModelUrlDisplay.textContent = formattedUrl;
      showModalStatus(true, `Successfully loaded ${state.classes.length} classes: ${state.classes.join(', ')}`);
      showLoading(false);
      return true;
    } catch (err) {
      console.warn('Failed to load Teachable Machine URL, falling back:', err);
      showModalStatus(false, 'Could not load model URL: ' + err.message);
      showLoading(false);
      return false;
    }
  }

  async function loadTeachableMachineFromFiles(modelFile, weightsFile, metadataFile) {
    showLoading(true, 'LOADING LOCAL MODEL FILES', 'Parsing neural weights from uploaded files...');
    try {
      if (typeof tmImage === 'undefined') {
        throw new Error('Teachable Machine Image library not loaded.');
      }

      state.model = await tmImage.loadFromFiles(modelFile, weightsFile, metadataFile);
      state.isBuiltinMode = false;
      state.modelUrl = 'Local Uploaded Files';
      state.classes = state.model.getClassLabels();

      updateModelBadge(true, 'Local Exported Model');
      el.activeModelUrlDisplay.textContent = 'Loaded from local file bundle';
      showModalStatus(true, `Successfully loaded local model with ${state.classes.length} classes: ${state.classes.join(', ')}`);
      showLoading(false);
      return true;
    } catch (err) {
      console.error('File load error:', err);
      showModalStatus(false, 'Failed loading files: ' + err.message);
      showLoading(false);
      return false;
    }
  }

  function activateBuiltinModel() {
    state.isBuiltinMode = true;
    state.model = null;
    state.classes = ['Mask', 'No Mask'];
    state.modelUrl = 'Built-in Adaptive Neural Classifier';
    updateModelBadge(true, 'Built-in Smart Classifier');
    el.activeModelUrlDisplay.textContent = 'Built-in Adaptive Neural Classifier';
    showModalStatus(true, 'Built-in real-time classifier active! Ready to test.');
  }

  function updateModelBadge(isConnected, label) {
    el.modelStatusDot.className = 'pulse-indicator ' + (isConnected ? '' : 'warning');
    el.modelBtnLabel.textContent = `Model: ${isConnected ? 'Ready' : 'Setup'}`;
    el.activeModelTag.textContent = label;
  }

  function showLoading(show, title = '', desc = '') {
    if (show) {
      el.loadingTitle.textContent = title;
      el.loadingDesc.textContent = desc;
      el.loadingOverlay.classList.remove('hidden');
    } else {
      el.loadingOverlay.classList.add('hidden');
    }
  }

  // ==========================================================================
  // WEBCAM & VIDEO STREAMING
  // ==========================================================================

  async function startWebcam() {
    window.soundFX.playClick();
    showLoading(true, 'STARTING CAMERA FEED', 'Requesting optical sensor permissions...');

    try {
      const flip = state.isMirrored;
      const width = 640;
      const height = 480;

      // Teachable Machine Webcam wrapper
      state.webcam = new tmImage.Webcam(width, height, flip);
      await state.webcam.setup({ facingMode: 'user' });
      await state.webcam.play();

      state.isWebcamRunning = true;
      state.uploadedImage = null;
      el.sourceBadge.textContent = 'LIVE WEBCAM';
      el.cameraBtnText.textContent = 'Pause Camera';
      el.flipCameraBtn.disabled = false;

      showLoading(false);
      startRenderLoop();
      startStreakMonitor();
    } catch (err) {
      console.error('Webcam access error:', err);
      showLoading(false);
      alert('Unable to access webcam. Please ensure camera permissions are allowed in your browser.');
    }
  }

  function stopWebcam() {
    if (state.webcam) {
      state.webcam.stop();
    }
    state.isWebcamRunning = false;
    el.cameraBtnText.textContent = 'Start Camera';
    el.flipCameraBtn.disabled = true;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    resetStreak();
    setVerdictState('idle', 'CAMERA PAUSED', 'Click [Start Camera] to resume monitoring.');
  }

  function toggleCamera() {
    if (state.isWebcamRunning) {
      stopWebcam();
    } else {
      startWebcam();
    }
  }

  async function flipCamera() {
    if (!state.isWebcamRunning || !state.webcam) return;
    window.soundFX.playClick();
    state.isMirrored = !state.isMirrored;
    stopWebcam();
    await startWebcam();
  }

  // ==========================================================================
  // CONTINUOUS PREDICTION & RENDER LOOP
  // ==========================================================================

  function startRenderLoop() {
    const loop = async () => {
      if (!state.isWebcamRunning) return;

      state.webcam.update(); // Update webcam frame
      calculateFps();

      // Render camera frame on canvas
      renderFrame(state.webcam.canvas);

      // Perform AI prediction
      await predictFrame(state.webcam.canvas);

      animationFrameId = window.requestAnimationFrame(loop);
    };
    loop();
  }

  function renderFrame(sourceElement) {
    // 1. Draw source onto canvas
    ctx.drawImage(sourceElement, 0, 0, el.canvas.width, el.canvas.height);

    // 2. Overlay Biometric HUD Elements
    drawHudOverlays();

    // 3. Render AR Virtual Mask if selected
    if (state.selectedArMask !== 'none') {
      drawArVirtualMask(state.selectedArMask);
    }
  }

  function drawHudOverlays() {
    const w = el.canvas.width;
    const h = el.canvas.height;

    // Corner guides
    ctx.strokeStyle = state.currentVerdict === 'mask' 
      ? 'rgba(0, 245, 160, 0.45)' 
      : (state.currentVerdict === 'nomask' ? 'rgba(255, 42, 95, 0.5)' : 'rgba(0, 229, 255, 0.3)');
    ctx.lineWidth = 2;

    const boxSize = 250;
    const bx = (w - boxSize) / 2;
    const by = (h - boxSize) / 2 - 10;
    const bracketLen = 24;

    // TL
    ctx.beginPath();
    ctx.moveTo(bx, by + bracketLen);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx + bracketLen, by);
    ctx.stroke();

    // TR
    ctx.beginPath();
    ctx.moveTo(bx + boxSize - bracketLen, by);
    ctx.lineTo(bx + boxSize, by);
    ctx.lineTo(bx + boxSize, by + bracketLen);
    ctx.stroke();

    // BL
    ctx.beginPath();
    ctx.moveTo(bx, by + boxSize - bracketLen);
    ctx.lineTo(bx, by + boxSize);
    ctx.lineTo(bx + bracketLen, by + boxSize);
    ctx.stroke();

    // BR
    ctx.beginPath();
    ctx.moveTo(bx + boxSize - bracketLen, by + boxSize);
    ctx.lineTo(bx + boxSize, by + boxSize);
    ctx.lineTo(bx + boxSize, by + boxSize - bracketLen);
    ctx.stroke();
  }

  // ==========================================================================
  // AR VIRTUAL MASK WARDROBE
  // ==========================================================================

  function drawArVirtualMask(maskType) {
    const cx = el.canvas.width / 2;
    const cy = el.canvas.height / 2 + 55; // Lower face position
    const maskW = 160;
    const maskH = 95;

    ctx.save();

    if (maskType === 'cyber') {
      // Cyber Neon Mask
      ctx.fillStyle = 'rgba(7, 15, 30, 0.88)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.moveTo(cx - maskW / 2, cy - 20);
      ctx.lineTo(cx, cy - 40);
      ctx.lineTo(cx + maskW / 2, cy - 20);
      ctx.lineTo(cx + maskW / 2 - 20, cy + maskH / 2);
      ctx.lineTo(cx, cy + maskH / 2 + 15);
      ctx.lineTo(cx - maskW / 2 + 20, cy + maskH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cyber Glowing Grill / Accents
      ctx.strokeStyle = '#00f5a0';
      ctx.lineWidth = 2;
      for (let i = -30; i <= 30; i += 15) {
        ctx.beginPath();
        ctx.moveTo(cx + i, cy - 10);
        ctx.lineTo(cx + i, cy + 20);
        ctx.stroke();
      }
    } else if (maskType === 'medical') {
      // N95 / Clean Surgical Mask
      ctx.fillStyle = 'rgba(235, 245, 255, 0.94)';
      ctx.strokeStyle = '#90caf9';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(cx - maskW / 2, cy - 30, maskW, maskH, [16, 16, 32, 32]);
      ctx.fill();
      ctx.stroke();

      // Surgical pleats
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      [-10, 8, 26].forEach((yOffset) => {
        ctx.beginPath();
        ctx.moveTo(cx - maskW / 2 + 10, cy + yOffset);
        ctx.lineTo(cx + maskW / 2 - 10, cy + yOffset);
        ctx.stroke();
      });
    } else if (maskType === 'ninja') {
      // Stealth Ninja Mask
      ctx.fillStyle = 'rgba(15, 17, 23, 0.96)';
      ctx.strokeStyle = '#ff2a5f';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff2a5f';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(cx - maskW / 2, cy - 35);
      ctx.quadraticCurveTo(cx, cy - 15, cx + maskW / 2, cy - 35);
      ctx.lineTo(cx + maskW / 2 - 15, cy + maskH / 2 + 10);
      ctx.lineTo(cx, cy + maskH / 2 + 25);
      ctx.lineTo(cx - maskW / 2 + 15, cy + maskH / 2 + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ninja kanji / crest
      ctx.fillStyle = '#ff2a5f';
      ctx.font = 'bold 18px "Space Grotesk"';
      ctx.textAlign = 'center';
      ctx.fillText('忍', cx, cy + 18);
    } else if (maskType === 'smiley') {
      // Fun Smiley Mask
      ctx.fillStyle = '#ffb703';
      ctx.strokeStyle = '#060a14';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.roundRect(cx - maskW / 2, cy - 30, maskW, maskH, 24);
      ctx.fill();
      ctx.stroke();

      // Big Smile
      ctx.strokeStyle = '#060a14';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy + 5, 30, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==========================================================================
  // PREDICTION LOGIC & INTERPRETATION
  // ==========================================================================

  async function predictFrame(imageSource) {
    let predictions = [];

    if (state.model) {
      // 1. Run actual Teachable Machine model
      try {
        predictions = await state.model.predict(imageSource);
      } catch (e) {
        console.error('Prediction failed:', e);
        return;
      }
    } else {
      // 2. Built-in Adaptive Classifier (Analyzes real-time pixel data)
      predictions = simulateSmartMaskClassification(imageSource);
    }

    processPredictions(predictions);
  }

  // Built-in intelligent classifier that checks the lower face region for mask coverage
  function simulateSmartMaskClassification(source) {
    let maskProbability = 0.5;

    try {
      // Sample lower face region pixels from canvas
      const cx = Math.floor(el.canvas.width / 2);
      const cy = Math.floor(el.canvas.height / 2 + 40);
      const sampleW = 80;
      const sampleH = 60;
      const imgData = ctx.getImageData(cx - sampleW / 2, cy - sampleH / 2, sampleW, sampleH);
      const data = imgData.data;

      let skinPixels = 0;
      let nonSkinPixels = 0;
      let total = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard skin color heuristic in YCbCr/RGB space
        const isSkin = (r > 95 && g > 40 && b > 20 && (r - g) > 15 && r > b);
        if (isSkin) {
          skinPixels++;
        } else {
          nonSkinPixels++;
        }
      }

      // If AR mask is on, boost mask probability
      if (state.selectedArMask !== 'none') {
        maskProbability = 0.98;
      } else {
        const nonSkinRatio = nonSkinPixels / (total || 1);
        maskProbability = Math.min(0.99, Math.max(0.05, nonSkinRatio * 1.15));
      }
    } catch (e) {
      maskProbability = state.selectedArMask !== 'none' ? 0.96 : 0.45;
    }

    const noMaskProbability = 1 - maskProbability;

    return [
      { className: 'Mask', probability: maskProbability },
      { className: 'No Mask', probability: noMaskProbability }
    ];
  }

  function processPredictions(predictions) {
    if (!predictions || predictions.length === 0) return;

    // Render predictions list in UI
    renderPredictionMeters(predictions);

    // Identify which class represents "Mask" vs "No Mask"
    let maskScore = 0;
    let noMaskScore = 0;

    predictions.forEach((p) => {
      const name = p.className.toLowerCase().trim();
      if (name.includes('no') || name.includes('without') || name.includes('unmask') || name.includes('none')) {
        noMaskScore = Math.max(noMaskScore, p.probability);
      } else if (name.includes('mask') || name.includes('with') || name.includes('protected') || name.includes('safe')) {
        maskScore = Math.max(maskScore, p.probability);
      }
    });

    // If classes don't contain standard keywords, fall back to comparing item 0 and 1
    if (maskScore === 0 && noMaskScore === 0) {
      if (predictions.length >= 2) {
        maskScore = predictions[0].probability;
        noMaskScore = predictions[1].probability;
      } else {
        maskScore = predictions[0].probability;
        noMaskScore = 1 - maskScore;
      }
    }

    const compliancePercentVal = Math.round(maskScore * 100);
    el.compliancePercent.textContent = `${compliancePercentVal}%`;
    el.complianceFill.style.width = `${compliancePercentVal}%`;

    // Decision Threshold
    if (maskScore >= 0.65) {
      handleVerdictChange('mask', compliancePercentVal);
    } else if (noMaskScore >= 0.55) {
      handleVerdictChange('nomask', compliancePercentVal);
    }
  }

  function handleVerdictChange(verdict, scorePercent) {
    if (verdict === 'mask') {
      setVerdictState(
        'mask',
        'ACCESS GRANTED — MASK VERIFIED',
        `Biometric integrity check passed (${scorePercent}% confidence). Bio-safety barrier intact.`
      );
      window.soundFX.playMaskDetected();

      // Trigger achievement 1: Mask Verified
      unlockBadge('badge1');
    } else if (verdict === 'nomask') {
      setVerdictState(
        'nomask',
        'ACCESS RESTRICTED — NO MASK DETECTED',
        `Warning: Bio-safety protection not detected (${scorePercent}% safe). Please wear a mask or equip AR shield.`
      );
      window.soundFX.playNoMaskAlert();
    }
  }

  function setVerdictState(status, title, instruction) {
    state.currentVerdict = status;
    el.verdictCard.setAttribute('data-status', status);
    el.viewportFrame.setAttribute('data-verdict', status);

    if (status === 'mask') {
      el.verdictIcon.textContent = '🛡️';
      el.verdictBadge.textContent = 'BIO-SAFE // ACCESS GRANTED';
      el.reticleVerdict.textContent = 'PROTECTION CONFIRMED';
    } else if (status === 'nomask') {
      el.verdictIcon.textContent = '⚠️';
      el.verdictBadge.textContent = 'SECURITY ALERT // MASK REQUIRED';
      el.reticleVerdict.textContent = 'BIO-HAZARD WARNING';
    } else {
      el.verdictIcon.textContent = '🤖';
      el.verdictBadge.textContent = 'SYSTEM STANDBY';
      el.reticleVerdict.textContent = 'TARGET ACQUIRED';
    }

    el.verdictTitle.textContent = title;
    el.verdictInstruction.textContent = instruction;
  }

  function renderPredictionMeters(predictions) {
    el.predictionsList.innerHTML = '';

    // Sort descending by probability
    const sorted = [...predictions].sort((a, b) => b.probability - a.probability);

    sorted.forEach((p, index) => {
      const pct = (p.probability * 100).toFixed(1);
      const isTop = index === 0;
      const lower = p.className.toLowerCase();
      const isMask = !lower.includes('no') && !lower.includes('without') && lower.includes('mask');
      const isNoMask = lower.includes('no') || lower.includes('without');

      const item = document.createElement('div');
      item.className = `prediction-item ${isTop ? 'dominant' : ''}`;

      let barColorClass = '';
      if (isMask) barColorClass = 'safe-color';
      else if (isNoMask) barColorClass = 'warn-color';

      item.innerHTML = `
        <div class="pred-top">
          <div class="pred-name">
            <span>${escapeHtml(p.className)}</span>
            ${isTop ? '<span class="pred-tag">TOP MATCH</span>' : ''}
          </div>
          <span class="pred-val">${pct}%</span>
        </div>
        <div class="pred-bar-track">
          <div class="pred-bar-fill ${barColorClass}" style="width: ${pct}%;"></div>
        </div>
      `;
      el.predictionsList.appendChild(item);
    });
  }

  // ==========================================================================
  // GAMIFICATION, STREAK & ACHIEVEMENTS
  // ==========================================================================

  function startStreakMonitor() {
    if (state.streakInterval) clearInterval(state.streakInterval);

    state.streakInterval = setInterval(() => {
      if (state.currentVerdict === 'mask') {
        state.complianceStreakSeconds++;
        updateStreakDisplay();

        // 15 seconds streak achievement
        if (state.complianceStreakSeconds >= 15) {
          if (!state.unlockedBadges.has('badge2')) {
            unlockBadge('badge2');
            triggerConfetti();
          }
        }
      } else if (state.currentVerdict === 'nomask') {
        // Reset streak on violation
        state.complianceStreakSeconds = 0;
        updateStreakDisplay();
      }
    }, 1000);
  }

  function resetStreak() {
    state.complianceStreakSeconds = 0;
    if (state.streakInterval) clearInterval(state.streakInterval);
    updateStreakDisplay();
  }

  function updateStreakDisplay() {
    const mins = Math.floor(state.complianceStreakSeconds / 60);
    const secs = state.complianceStreakSeconds % 60;
    el.streakCounter.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}s`;
  }

  function unlockBadge(badgeId) {
    if (state.unlockedBadges.has(badgeId)) return;
    state.unlockedBadges.add(badgeId);

    const badgeElem = document.getElementById(badgeId);
    if (badgeElem) {
      badgeElem.classList.add('unlocked');
    }
    el.badgeCount.textContent = `${state.unlockedBadges.size} / 4`;
    window.soundFX.playScanBlip();
  }

  function triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00f5a0', '#00e5ff', '#ffb703']
      });
    }
  }

  // ==========================================================================
  // IMAGE FILE TESTING (UPLOAD PHOTO MODE)
  // ==========================================================================

  function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG/JPG).');
      return;
    }

    window.soundFX.playClick();
    if (state.isWebcamRunning) {
      stopWebcam();
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        state.uploadedImage = img;
        el.sourceBadge.textContent = 'UPLOADED PHOTO';
        el.resBadge.textContent = `${img.width}x${img.height}`;

        // Render photo onto canvas
        renderFrame(img);

        // Run prediction
        await predictFrame(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ==========================================================================
  // SECURITY CLEARANCE ID PASS GENERATOR
  // ==========================================================================

  function generateSecurityPass() {
    window.soundFX.playShutter();
    state.snapshotsTaken++;
    el.snapshotsCounter.textContent = state.snapshotsTaken;
    unlockBadge('badge4'); // Unlock Snapshot badge

    const badgeCanvas = el.idBadgeCanvas;
    const bctx = badgeCanvas.getContext('2d');
    const bw = badgeCanvas.width;
    const bh = badgeCanvas.height;

    // Background gradient
    const bgGrad = bctx.createLinearGradient(0, 0, bw, bh);
    bgGrad.addColorStop(0, '#0a0f1e');
    bgGrad.addColorStop(1, '#05070d');
    bctx.fillStyle = bgGrad;
    bctx.fillRect(0, 0, bw, bh);

    // Neon frame
    const isMask = state.currentVerdict === 'mask';
    const accentColor = isMask ? '#00f5a0' : '#ff2a5f';
    bctx.strokeStyle = accentColor;
    bctx.lineWidth = 4;
    bctx.strokeRect(16, 16, bw - 32, bh - 32);

    // Header badge
    bctx.fillStyle = accentColor;
    bctx.fillRect(20, 20, bw - 40, 50);

    bctx.fillStyle = '#05070d';
    bctx.font = 'bold 16px "Space Grotesk", sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('SENTINEL AI — BIOMETRIC CLEARANCE PASS', bw / 2, 52);

    // User Portrait snapshot from main canvas
    const portraitW = 280;
    const portraitH = 210;
    const px = (bw - portraitW) / 2;
    const py = 95;

    bctx.drawImage(el.canvas, px, py, portraitW, portraitH);
    bctx.strokeStyle = '#00e5ff';
    bctx.lineWidth = 2;
    bctx.strokeRect(px, py, portraitW, portraitH);

    // Verdict Stamp
    bctx.fillStyle = accentColor;
    bctx.font = 'bold 20px "Space Grotesk", sans-serif';
    bctx.fillText(isMask ? 'STATUS: ACCESS GRANTED [MASK ON]' : 'STATUS: ACCESS RESTRICTED [NO MASK]', bw / 2, py + portraitH + 45);

    // Metadata lines
    bctx.fillStyle = '#8b9bb4';
    bctx.font = '12px "JetBrains Mono", monospace';
    bctx.textAlign = 'left';

    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    const idHash = 'AGENT-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const textX = 40;
    let textY = py + portraitH + 85;
    bctx.fillText(`CLEARANCE ID : ${idHash}`, textX, textY);
    bctx.fillText(`TIMESTAMP    : ${dateStr} ${timeStr}`, textX, textY + 24);
    bctx.fillText(`BIO-SENTINEL : v2.4 HIGH RESOLUTION SENSORS`, textX, textY + 48);

    // Cyber Barcode lines at bottom
    const barY = bh - 70;
    bctx.strokeStyle = '#ffffff';
    bctx.lineWidth = 2;
    for (let x = 40; x < bw - 40; x += (x % 5 === 0 ? 8 : 4)) {
      bctx.beginPath();
      bctx.moveTo(x, barY);
      bctx.lineTo(x, barY + 30);
      bctx.stroke();
    }

    // Open Pass Modal
    el.passModal.classList.add('open');
    el.passModal.setAttribute('aria-hidden', 'false');
  }

  function downloadSecurityPass() {
    window.soundFX.playClick();
    const link = document.createElement('a');
    link.download = `sentinel-clearance-pass-${Date.now()}.png`;
    link.href = el.idBadgeCanvas.toDataURL('image/png');
    link.click();
  }

  // ==========================================================================
  // EVENT LISTENERS & UI WIRING
  // ==========================================================================

  function setupEventListeners() {
    // Camera toggle
    el.toggleCameraBtn.addEventListener('click', toggleCamera);
    el.flipCameraBtn.addEventListener('click', flipCamera);

    // Laser toggle
    el.toggleLaserBtn.addEventListener('click', () => {
      window.soundFX.playClick();
      state.showLaser = !state.showLaser;
      el.laserScanline.classList.toggle('hidden', !state.showLaser);
      el.toggleLaserBtn.classList.toggle('active', state.showLaser);
    });

    // Sound toggle
    el.toggleAudioBtn.addEventListener('click', () => {
      const isSoundOn = window.soundFX.toggleSound();
      el.audioIcon.textContent = isSoundOn ? '🔊' : '🔇';
      el.toggleAudioBtn.title = isSoundOn ? 'Sound FX Enabled' : 'Sound FX Muted';
    });

    // Image Upload trigger
    el.uploadImageBtn.addEventListener('click', () => {
      window.soundFX.playClick();
      el.imageFileInput.click();
    });
    el.imageFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageUpload(e.target.files[0]);
      }
    });

    // Security Pass Generation
    el.capturePassBtn.addEventListener('click', generateSecurityPass);
    el.downloadPassBtn.addEventListener('click', downloadSecurityPass);

    // Pass Modal close
    el.closePassModalBtn.addEventListener('click', () => el.passModal.classList.remove('open'));
    el.closePassFooterBtn.addEventListener('click', () => el.passModal.classList.remove('open'));

    // AR Virtual Mask Selection
    el.arMaskPill.addEventListener('click', (e) => {
      const chip = e.target.closest('.ar-chip');
      if (!chip) return;
      window.soundFX.playClick();

      el.arMaskPill.querySelectorAll('.ar-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      state.selectedArMask = chip.dataset.mask;
      if (state.selectedArMask !== 'none') {
        unlockBadge('badge3'); // Unlock AR Mask badge
      }
    });

    // Model Setup Modal controls
    const openModelModal = () => {
      window.soundFX.playClick();
      el.modelModal.classList.add('open');
      el.modelModal.setAttribute('aria-hidden', 'false');
    };
    el.openModelModalBtn.addEventListener('click', openModelModal);
    el.quickEditModelBtn.addEventListener('click', openModelModal);

    const closeModelModal = () => {
      window.soundFX.playClick();
      el.modelModal.classList.remove('open');
      el.modelModal.setAttribute('aria-hidden', 'true');
    };
    el.closeModelModalBtn.addEventListener('click', closeModelModal);
    el.closeModelFooterBtn.addEventListener('click', closeModelModal);

    // Tabs inside Model Modal
    el.tabCloudUrl.addEventListener('click', () => switchTab('cloud'));
    el.tabUploadFiles.addEventListener('click', () => switchTab('files'));
    el.tabDemoMode.addEventListener('click', () => switchTab('demo'));

    // Connect Teachable Machine URL button
    el.loadUrlModelBtn.addEventListener('click', async () => {
      window.soundFX.playClick();
      const url = el.tmModelUrlInput.value.trim();
      if (!url) {
        showModalStatus(false, 'Please enter a valid Teachable Machine URL.');
        return;
      }
      const success = await loadTeachableMachineUrl(url);
      if (success) {
        setTimeout(closeModelModal, 1200);
      }
    });

    // Local Files Dropzone & Pickers
    el.fileDropzone.addEventListener('click', () => el.modelFolderInput.click());
    el.fileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.fileDropzone.classList.add('dragover');
    });
    el.fileDropzone.addEventListener('dragleave', () => {
      el.fileDropzone.classList.remove('dragover');
    });
    el.fileDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      el.fileDropzone.classList.remove('dragover');
      if (e.dataTransfer.files) {
        handleModelFilesSelect(e.dataTransfer.files);
      }
    });
    el.modelFolderInput.addEventListener('change', (e) => {
      if (e.target.files) {
        handleModelFilesSelect(e.target.files);
      }
    });

    el.loadFilesModelBtn.addEventListener('click', async () => {
      window.soundFX.playClick();
      if (stagedFiles.model && stagedFiles.weights && stagedFiles.metadata) {
        const success = await loadTeachableMachineFromFiles(
          stagedFiles.model,
          stagedFiles.weights,
          stagedFiles.metadata
        );
        if (success) {
          setTimeout(closeModelModal, 1200);
        }
      }
    });

    // Built-in Demo selector
    el.selectBuiltinDemoBtn.addEventListener('click', () => {
      window.soundFX.playClick();
      activateBuiltinModel();
      setTimeout(closeModelModal, 600);
    });
  }

  function switchTab(tabKey) {
    window.soundFX.playClick();
    [el.tabCloudUrl, el.tabUploadFiles, el.tabDemoMode].forEach(t => t.classList.remove('active'));
    [el.panelCloudUrl, el.panelUploadFiles, el.panelDemoMode].forEach(p => p.classList.remove('active'));

    if (tabKey === 'cloud') {
      el.tabCloudUrl.classList.add('active');
      el.panelCloudUrl.classList.add('active');
    } else if (tabKey === 'files') {
      el.tabUploadFiles.classList.add('active');
      el.panelUploadFiles.classList.add('active');
    } else if (tabKey === 'demo') {
      el.tabDemoMode.classList.add('active');
      el.panelDemoMode.classList.add('active');
    }
  }

  function handleModelFilesSelect(fileList) {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name === 'model.json') stagedFiles.model = file;
      if (file.name === 'metadata.json') stagedFiles.metadata = file;
      if (file.name.endsWith('.bin') || file.name === 'weights.bin') stagedFiles.weights = file;
    }

    renderStagedFilesList();
  }

  function renderStagedFilesList() {
    el.loadedFilesList.innerHTML = '';
    const files = [
      { key: 'model', name: 'model.json', file: stagedFiles.model },
      { key: 'metadata', name: 'metadata.json', file: stagedFiles.metadata },
      { key: 'weights', name: 'weights.bin', file: stagedFiles.weights }
    ];

    let allReady = true;
    files.forEach(item => {
      const tag = document.createElement('div');
      tag.className = 'loaded-file-tag';
      if (item.file) {
        tag.innerHTML = `<span>✓ ${item.name}</span><span>${(item.file.size / 1024).toFixed(1)} KB</span>`;
      } else {
        allReady = false;
        tag.style.color = '#8b9bb4';
        tag.style.borderColor = 'rgba(255,255,255,0.08)';
        tag.innerHTML = `<span>⏳ Waiting for ${item.name}</span>`;
      }
      el.loadedFilesList.appendChild(tag);
    });

    el.loadFilesModelBtn.disabled = !allReady;
  }

  function showModalStatus(isSuccess, msg) {
    el.modelModalStatus.className = `modal-status-msg ${isSuccess ? 'success' : 'error'}`;
    el.modelModalStatus.textContent = msg;
  }

  function calculateFps() {
    state.frameCount++;
    const now = Date.now();
    if (now - state.lastFpsUpdate >= 1000) {
      state.fps = state.frameCount;
      state.frameCount = 0;
      state.lastFpsUpdate = now;
      el.fpsCounter.textContent = state.fps;
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  // Start initialization on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
