/*
 * File: app.js
 * Fungsi: Logika lengkap frontend Asix Belajar Piano (Web Audio sintesis, Falling Notes canvas, Keyboard C4-B5, Supabase REST, AI song generation, PWA, MIDI)
 * Fitur: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
 * 
 * ATURAN KEAMANAN & PRIVASI:
 * - Tidak menggunakan localStorage, sessionStorage, IndexedDB, atau cookie. Semua state disimpan murni di memori.
 * - Seluruh data dari Supabase/AI ditampilkan lewat textContent untuk mencegah XSS.
 * 
 * PERLU VERIFIKASI:
 * 1. Dukungan Web MIDI API (navigator.requestMIDIAccess) pada browser mobile (seperti Chrome Android / Safari iOS belum mendukung Web MIDI secara default tanpa flag/adapter).
 * 2. Perilaku PWA display_override pada berbagai versi iOS Safari.
 */

(function () {
  'use strict';

  // ============================================================================
  // 1. KONSTANTA & DEFINISI NADA (C4 - B5) (Fitur: 1, 8)
  // ============================================================================
  const HIT_WINDOW_SEC = 0.3; // Toleransi waktu tekan not benar (+- 0.3 detik)

  // Daftar 14 Tuts Putih C4 sampai B5
  const WHITE_KEYS = [
    { note: 'C4', midi: 60, key: 'z' },
    { note: 'D4', midi: 62, key: 'x' },
    { note: 'E4', midi: 64, key: 'c' },
    { note: 'F4', midi: 65, key: 'v' },
    { note: 'G4', midi: 67, key: 'b' },
    { note: 'A4', midi: 69, key: 'n' },
    { note: 'B4', midi: 71, key: 'm' },
    { note: 'C5', midi: 72, key: 'q' },
    { note: 'D5', midi: 74, key: 'w' },
    { note: 'E5', midi: 76, key: 'e' },
    { note: 'F5', midi: 77, key: 'r' },
    { note: 'G5', midi: 79, key: 't' },
    { note: 'A5', midi: 81, key: 'y' },
    { note: 'B5', midi: 83, key: 'u' }
  ];

  // Daftar 10 Tuts Hitam C4 sampai B5 (posisi indeks tuts putih sebelumnya)
  const BLACK_KEYS = [
    { note: 'C#4', midi: 61, key: 's', afterWhiteIndex: 0 },
    { note: 'D#4', midi: 63, key: 'd', afterWhiteIndex: 1 },
    { note: 'F#4', midi: 66, key: 'g', afterWhiteIndex: 3 },
    { note: 'G#4', midi: 68, key: 'h', afterWhiteIndex: 4 },
    { note: 'A#4', midi: 70, key: 'j', afterWhiteIndex: 5 },
    { note: 'C#5', midi: 73, key: '2', afterWhiteIndex: 7 },
    { note: 'D#5', midi: 75, key: '3', afterWhiteIndex: 8 },
    { note: 'F#5', midi: 78, key: '5', afterWhiteIndex: 10 },
    { note: 'G#5', midi: 80, key: '6', afterWhiteIndex: 11 },
    { note: 'A#5', midi: 82, key: '7', afterWhiteIndex: 12 }
  ];

  // Gabungan semua 24 nada terurut
  const ALL_KEYS = [...WHITE_KEYS, ...BLACK_KEYS].sort((a, b) => a.midi - b.midi);
  const KEY_MAP_BY_NOTE = new Map();
  const KEY_MAP_BY_MIDI = new Map();
  const KEY_MAP_BY_KEYBOARD = new Map();

  ALL_KEYS.forEach(k => {
    KEY_MAP_BY_NOTE.set(k.note, k);
    KEY_MAP_BY_MIDI.set(k.midi, k);
    KEY_MAP_BY_KEYBOARD.set(k.key.toLowerCase(), k);
  });

  // Frekuensi nada dari nomor MIDI
  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ============================================================================
  // 2. STATE APLIKASI (MURNI DALAM MEMORI)
  // ============================================================================
  const state = {
    // Navigasi & Layar
    currentScreen: 'list', // 'list' | 'practice'
    landscapeBannerDismissed: false,
    pwaCardDismissed: false,
    deferredPrompt: null,

    // Pencarian & Daftar Lagu
    searchQuery: '',
    selectedCategory: null,
    songsList: [],
    pageOffset: 0,
    hasMoreSongs: true,
    isLoadingSongs: false,
    isGeneratingAI: false,

    // Lagu yang sedang dimainkan
    currentSong: null,
    songNotes: [], // [{ n, t, d, timeSec, durationSec, hit, missed }]
    songDurationSec: 0,

    // Audio & Sintesis
    audioCtx: null,
    soundType: 'piano', // 'piano' | 'epiano' | 'organ'
    isSustain: false,
    activeVoices: new Map(), // key: note -> voice object

    // Playback Engine
    isPlaying: false,
    playbackSpeed: 1.0, // 0.5 - 1.2
    songTime: 0, // detik
    lastAudioTime: 0,
    mode: 'auto', // 'auto' | 'step'

    // Step-by-Step
    waitingForStepKey: null, // note string yang harus ditekan sebelum lanjut
    stepWrongPressedSinceLast: false,

    // Loop A-B
    loopEnabled: false,
    loopPointA: null,
    loopPointB: null,

    // Metronom
    metronomeEnabled: false,
    lastMetronomeBeat: -1,

    // Skor & Akurasi
    scoreCorrect: 0,
    scoreWrong: 0,
    scoreMissed: 0,

    // Posisi Lane Canvas
    keyPositions: new Map() // note -> { x, width, isBlack }
  };

  // ============================================================================
  // 3. ELEMEN DOM UTAMA
  // ============================================================================
  const dom = {
    // Layar
    songListScreen: document.getElementById('song-list-screen'),
    practiceScreen: document.getElementById('practice-screen'),

    // Logo
    appLogoImg: document.getElementById('app-logo-img'),
    appLogoFallback: document.getElementById('app-logo-fallback'),
    practiceLogoImg: document.getElementById('practice-logo-img'),
    practiceLogoFallback: document.getElementById('practice-logo-fallback'),

    // PWA & Banner
    pwaInstallCard: document.getElementById('pwa-install-card'),
    btnInstallPwa: document.getElementById('btn-install-pwa'),
    btnDismissPwa: document.getElementById('btn-dismiss-pwa'),
    rotateLandscapeBanner: document.getElementById('rotate-landscape-banner'),
    btnDismissLandscapeBanner: document.getElementById('btn-dismiss-landscape-banner'),
    iosInstallModal: document.getElementById('ios-install-modal'),
    btnCloseIosModal: document.getElementById('btn-close-ios-modal'),

    // Pencarian Lagu
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    btnResetFilters: document.getElementById('btn-reset-filters'),
    searchAlert: document.getElementById('search-alert'),
    songListContainer: document.getElementById('song-list-container'),
    emptyStateCard: document.getElementById('empty-state-card'),
    emptyStateTitle: document.getElementById('empty-state-title'),
    emptyStateDesc: document.getElementById('empty-state-desc'),
    btnGenerateAi: document.getElementById('btn-generate-ai'),
    aiLoadingCard: document.getElementById('ai-loading-card'),
    infiniteScrollTrigger: document.getElementById('infinite-scroll-trigger'),
    btnLoadMore: document.getElementById('btn-load-more'),

    // Layar Latihan
    btnBackToList: document.getElementById('btn-back-to-list'),
    practiceSongTitle: document.getElementById('practice-song-title'),
    practiceSongArtist: document.getElementById('practice-song-artist'),
    practiceSongTempo: document.getElementById('practice-song-tempo'),
    practiceAiBadge: document.getElementById('practice-ai-badge'),

    // Kontrol Playback
    btnPlayPause: document.getElementById('btn-play-pause'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    labelPlayPause: document.getElementById('label-play-pause'),
    btnRestart: document.getElementById('btn-restart'),
    btnModeToggle: document.getElementById('btn-mode-toggle'),
    labelCurrentMode: document.getElementById('label-current-mode'),
    speedSlider: document.getElementById('speed-slider'),
    speedLabel: document.getElementById('speed-label'),
    currentTimeLabel: document.getElementById('current-time-label'),
    totalTimeLabel: document.getElementById('total-time-label'),

    // Fitur Tambahan
    btnLoopA: document.getElementById('btn-loop-a'),
    btnLoopB: document.getElementById('btn-loop-b'),
    btnLoopToggle: document.getElementById('btn-loop-toggle'),
    btnMetronome: document.getElementById('btn-metronome'),
    btnSustain: document.getElementById('btn-sustain'),
    soundSelect: document.getElementById('sound-select'),
    btnMidi: document.getElementById('btn-midi'),

    // Canvas & Piano
    waterfallContainer: document.getElementById('waterfall-container'),
    waterfallCanvas: document.getElementById('waterfall-canvas'),
    pianoKeyboard: document.getElementById('piano-keyboard'),

    // Modal Hasil
    resultModal: document.getElementById('result-modal'),
    scoreAccuracy: document.getElementById('score-accuracy'),
    scoreCorrect: document.getElementById('score-correct'),
    scoreWrong: document.getElementById('score-wrong'),
    scoreMissed: document.getElementById('score-missed'),
    btnReplaySong: document.getElementById('btn-replay-song'),
    btnChooseOtherSong: document.getElementById('btn-choose-other-song')
  };

  // ============================================================================
  // 4. SISTEM LOGO & FALLBACK (Fitur: 1)
  // ============================================================================
  function initLogos() {
    const config = window.APP_CONFIG || {};
    const logoUrl = config.LOGO_URL || './asix_studio_circle_web_320_v2.webp';

    const setupLogo = (imgEl, fallbackEl) => {
      if (!imgEl || !fallbackEl) return;
      imgEl.src = logoUrl;
      imgEl.onerror = () => {
        imgEl.classList.add('hidden');
        fallbackEl.classList.remove('hidden');
      };
      imgEl.onload = () => {
        imgEl.classList.remove('hidden');
        fallbackEl.classList.add('hidden');
      };
    };

    setupLogo(dom.appLogoImg, dom.appLogoFallback);
    setupLogo(dom.practiceLogoImg, dom.practiceLogoFallback);
  }

  // ============================================================================
  // 5. WEB AUDIO SYNTHESIS ENGINE (Fitur: 3, 10, 11)
  // Polifoni maks 24 suara, tanpa audio sample eksternal
  // ============================================================================
  function getAudioContext() {
    if (!state.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        state.audioCtx = new AudioCtxClass();
      }
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    return state.audioCtx;
  }

  function playNoteSynthesis(noteName) {
    const keyInfo = KEY_MAP_BY_NOTE.get(noteName);
    if (!keyInfo) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    // Hentikan suara not yang sama bila masih aktif
    if (state.activeVoices.has(noteName)) {
      stopNoteSynthesis(noteName, true);
    }

    // Batasi polifoni maksimal 24 suara
    if (state.activeVoices.size >= 24) {
      const oldestKey = state.activeVoices.keys().next().value;
      stopNoteSynthesis(oldestKey, true);
    }

    const freq = midiToFreq(keyInfo.midi);
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    if (state.soundType === 'organ') {
      // Organ: Kaya harmonik, sustain konstan
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
    } else if (state.soundType === 'epiano') {
      // Electric Piano: Nada lonceng lembut dengan sedikit detune
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 3, now); // FM overtone

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.06, now + 0.4);
    } else {
      // Akustik Piano (Default): Attack cepat, peluruhan natural
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq + 0.5, now); // Subtle acoustic chorus

      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.35, now + 0.006);
      gainNode.gain.exponentialRampToValueAtTime(0.08, now + 0.6);
    }

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    state.activeVoices.set(noteName, {
      osc1,
      osc2,
      gainNode,
      startTime: now
    });
  }

  function stopNoteSynthesis(noteName, forceImmediate = false) {
    const voice = state.activeVoices.get(noteName);
    if (!voice) return;

    // Jika pedal sustain aktif dan tidak dipaksa berhenti, biarkan berbunyi
    if (state.isSustain && !forceImmediate) {
      return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const releaseTime = forceImmediate ? 0.02 : (state.soundType === 'organ' ? 0.05 : 0.4);

    try {
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
      voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

      voice.osc1.stop(now + releaseTime);
      voice.osc2.stop(now + releaseTime);
    } catch (e) {
      // Abaikan jika oscillator sudah terhenti
    }

    state.activeVoices.delete(noteName);
  }

  function playMetronomeClick(isHighBeat) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHighBeat ? 1200 : 800, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.045);
  }

  // ============================================================================
  // 6. TUTS PIANO RESPONSIF (Fitur: 1, 8)
  // Rendering 14 Tuts Putih + 10 Tuts Hitam C4-B5, multi-touch, pointer events
  // ============================================================================
  function renderPianoKeyboard() {
    dom.pianoKeyboard.textContent = ''; // Kosongkan DOM

    const whiteKeyElements = [];

    // Render 14 Tuts Putih
    WHITE_KEYS.forEach((keyData, idx) => {
      const keyEl = document.createElement('div');
      keyEl.className = 'white-key';
      keyEl.dataset.note = keyData.note;

      const noteLabel = document.createElement('span');
      noteLabel.className = 'key-label-note';
      noteLabel.textContent = keyData.note;

      const hintLabel = document.createElement('span');
      hintLabel.className = 'key-label-hint';
      hintLabel.textContent = keyData.key.toUpperCase();

      keyEl.appendChild(noteLabel);
      keyEl.appendChild(hintLabel);
      dom.pianoKeyboard.appendChild(keyEl);
      whiteKeyElements.push(keyEl);
    });

    // Render 10 Tuts Hitam
    BLACK_KEYS.forEach((keyData) => {
      const keyEl = document.createElement('div');
      keyEl.className = 'black-key';
      keyEl.dataset.note = keyData.note;

      const noteLabel = document.createElement('span');
      noteLabel.className = 'key-label-note';
      noteLabel.textContent = keyData.note;

      const hintLabel = document.createElement('span');
      hintLabel.className = 'key-label-hint';
      hintLabel.textContent = keyData.key.toUpperCase();

      keyEl.appendChild(noteLabel);
      keyEl.appendChild(hintLabel);
      dom.pianoKeyboard.appendChild(keyEl);
    });

    // Posisikan tuts hitam dan hitung lane canvas
    updateKeyAndLanePositions();
  }

  function updateKeyAndLanePositions() {
    const keyboardRect = dom.pianoKeyboard.getBoundingClientRect();
    if (keyboardRect.width <= 0) return;

    const totalWhiteKeys = WHITE_KEYS.length; // 14
    const whiteKeyWidth = keyboardRect.width / totalWhiteKeys;
    const blackKeyWidth = whiteKeyWidth * 0.62;

    state.keyPositions.clear();

    // Petakan posisi tuts putih
    WHITE_KEYS.forEach((k, idx) => {
      const x = idx * whiteKeyWidth;
      state.keyPositions.set(k.note, {
        x: x,
        width: whiteKeyWidth,
        center: x + (whiteKeyWidth / 2),
        isBlack: false
      });
    });

    // Posisikan tuts hitam di DOM dan petakan koordinatnya
    BLACK_KEYS.forEach((k) => {
      const leftPos = ((k.afterWhiteIndex + 1) * whiteKeyWidth) - (blackKeyWidth / 2);
      const el = dom.pianoKeyboard.querySelector(`.black-key[data-note="${k.note}"]`);
      if (el) {
        el.style.left = `${leftPos}px`;
        el.style.width = `${blackKeyWidth}px`;
      }
      state.keyPositions.set(k.note, {
        x: leftPos,
        width: blackKeyWidth,
        center: leftPos + (blackKeyWidth / 2),
        isBlack: true
      });
    });

    // Resize canvas resolusi tinggi
    resizeWaterfallCanvas();
  }

  // Interaksi Penekanan Tuts Piano
  function handleKeyPress(noteName) {
    const keyInfo = KEY_MAP_BY_NOTE.get(noteName);
    if (!keyInfo) return;

    // Visual feedback tuts
    const el = dom.pianoKeyboard.querySelector(`[data-note="${noteName}"]`);
    if (el) el.classList.add('is-pressed');

    // Mainkan suara
    playNoteSynthesis(noteName);

    // Evaluasi Skor & Permainan
    evaluateKeyInput(noteName);
  }

  function handleKeyRelease(noteName) {
    const el = dom.pianoKeyboard.querySelector(`[data-note="${noteName}"]`);
    if (el) el.classList.remove('is-pressed');

    stopNoteSynthesis(noteName, false);
  }

  function bindPianoPointerEvents() {
    const activePointers = new Map(); // pointerId -> noteName

    dom.pianoKeyboard.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const targetKey = e.target.closest('[data-note]');
      if (!targetKey) return;

      const note = targetKey.dataset.note;
      activePointers.set(e.pointerId, note);
      handleKeyPress(note);
    });

    const endPointer = (e) => {
      if (activePointers.has(e.pointerId)) {
        const note = activePointers.get(e.pointerId);
        handleKeyRelease(note);
        activePointers.delete(e.pointerId);
      }
    };

    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);

    // Keyboard komputer (Laptop)
    const activeKeyboardKeys = new Set();

    window.addEventListener('keydown', (e) => {
      // Abaikan bila sedang mengetik di input pencarian
      if (e.target === dom.searchInput) return;

      // Fitur 10: Spasi untuk Pedal Sustain
      if (e.code === 'Space') {
        e.preventDefault();
        setSustain(!state.isSustain);
        return;
      }

      const keyChar = e.key.toLowerCase();
      if (KEY_MAP_BY_KEYBOARD.has(keyChar) && !activeKeyboardKeys.has(keyChar)) {
        activeKeyboardKeys.add(keyChar);
        const keyInfo = KEY_MAP_BY_KEYBOARD.get(keyChar);
        handleKeyPress(keyInfo.note);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.target === dom.searchInput) return;

      const keyChar = e.key.toLowerCase();
      if (activeKeyboardKeys.has(keyChar)) {
        activeKeyboardKeys.delete(keyChar);
        const keyInfo = KEY_MAP_BY_KEYBOARD.get(keyChar);
        handleKeyRelease(keyInfo.note);
      }
    });
  }

  function setSustain(val) {
    state.isSustain = val;
    if (dom.btnSustain) {
      if (state.isSustain) {
        dom.btnSustain.classList.add('bg-[#FF6B00]', 'text-black', 'border-[#FF6B00]');
        dom.btnSustain.classList.remove('bg-white/5', 'text-zinc-400');
      } else {
        dom.btnSustain.classList.remove('bg-[#FF6B00]', 'text-black', 'border-[#FF6B00]');
        dom.btnSustain.classList.add('bg-white/5', 'text-zinc-400');
        // Hentikan suara yang tertahan sustain
        for (const note of state.activeVoices.keys()) {
          stopNoteSynthesis(note, false);
        }
      }
    }
  }

  // ============================================================================
  // 7. WATERFALL CANVAS & FALLING NOTES (Fitur: 2, 8)
  // Not jatuh ke garis target di atas tuts yang tepat
  // ============================================================================
  function resizeWaterfallCanvas() {
    const rect = dom.waterfallContainer.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    dom.waterfallCanvas.width = rect.width * dpr;
    dom.waterfallCanvas.height = rect.height * dpr;

    const ctx = dom.waterfallCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }

  function renderFallingNotes() {
    if (state.currentScreen !== 'practice') return;

    const canvas = dom.waterfallCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.clearRect(0, 0, width, height);

    // 1. Gambar Garis Vertikal Tiap Lane
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    WHITE_KEYS.forEach((k) => {
      const pos = state.keyPositions.get(k.note);
      if (pos) {
        ctx.beginPath();
        ctx.moveTo(pos.x, 0);
        ctx.lineTo(pos.x, height);
        ctx.stroke();
      }
    });

    // 2. Garis Target Tepat di Atas Tuts (Tinggi target line = height - 10)
    const targetY = height - 8;
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // 3. Hitung Waktu & Parameter Not Jatuh
    const lookaheadSec = 2.5; // Not mulai muncul 2.5 detik sebelum jatuh
    const speedPxPerSec = targetY / lookaheadSec;

    // Bersihkan highlight target pada tuts
    dom.pianoKeyboard.querySelectorAll('.is-target').forEach(el => el.classList.remove('is-target'));

    let currentTargetNotes = [];

    // Gambar Balok Not Melayang
    state.songNotes.forEach((noteItem) => {
      const timeDiff = noteItem.timeSec - state.songTime; // detik menuju target
      const noteDurationSec = noteItem.durationSec;

      // Cek apakah not berada di dalam viewport canvas
      const noteBottomY = targetY - (timeDiff * speedPxPerSec);
      const noteHeight = Math.max(12, noteDurationSec * speedPxPerSec);
      const noteTopY = noteBottomY - noteHeight;

      const pos = state.keyPositions.get(noteItem.n);
      if (!pos) return;

      // Apakah not sedang berada di garis target?
      const isAtTarget = timeDiff <= 0.05 && (timeDiff + noteDurationSec) >= -0.05;

      if (isAtTarget) {
        currentTargetNotes.push(noteItem.n);
        const keyEl = dom.pianoKeyboard.querySelector(`[data-note="${noteItem.n}"]`);
        if (keyEl) keyEl.classList.add('is-target');
      }

      // Render not hanya jika terlihat di canvas
      if (noteBottomY >= 0 && noteTopY <= height) {
        const isSharp = noteItem.n.includes('#');

        ctx.save();
        ctx.shadowColor = isSharp ? 'rgba(168, 85, 247, 0.8)' : 'rgba(255, 107, 0, 0.8)';
        ctx.shadowBlur = isAtTarget ? 18 : 8;

        // Warna balok not
        if (isSharp) {
          // Aksen Ungu untuk not # (Fitur: 2)
          const grad = ctx.createLinearGradient(pos.x, noteTopY, pos.x, noteBottomY);
          grad.addColorStop(0, '#C084FC');
          grad.addColorStop(1, '#9333EA');
          ctx.fillStyle = grad;
        } else {
          // Aksen Orange / Amber untuk not natural
          const grad = ctx.createLinearGradient(pos.x, noteTopY, pos.x, noteBottomY);
          grad.addColorStop(0, '#FFA24D');
          grad.addColorStop(1, '#FF6B00');
          ctx.fillStyle = grad;
        }

        // Gambar rounded rect
        const radius = 5;
        const padX = 2;
        const rx = pos.x + padX;
        const rw = pos.width - (padX * 2);
        const ry = noteTopY;
        const rh = Math.max(10, noteHeight);

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(rx, ry, rw, rh, radius) : ctx.rect(rx, ry, rw, rh);
        ctx.fill();

        // Label Nama Not di dalam Not Melayang (Fitur: 8)
        if (rh >= 18) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 10px "Space Grotesk", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(noteItem.n, rx + (rw / 2), ry + (rh / 2));
        }

        ctx.restore();
      }
    });
  }

  // ============================================================================
  // 8. GAME LOOP & PLAYBACK ENGINE (Fitur: 5, 6, 7, 9, 10)
  // Auto-pause tab, Step-by-Step, Metronom, Loop A-B, Skor
  // ============================================================================
  let animationFrameId = null;

  function startPlaybackLoop() {
    let lastTimestamp = performance.now();

    function loop(currentTimestamp) {
      const deltaSec = (currentTimestamp - lastTimestamp) / 1000;
      lastTimestamp = currentTimestamp;

      if (state.isPlaying && state.currentSong) {
        // Cek Mode Step-by-Step (Fitur: 6)
        if (state.mode === 'step') {
          checkStepByStepPause();
        }

        // Jalankan waktu hanya bila tidak sedang menunggu tuts di mode step
        if (!state.waitingForStepKey) {
          state.songTime += deltaSec * state.playbackSpeed;

          // Cek Metronom (Fitur: 10)
          if (state.metronomeEnabled && state.currentSong) {
            const beatDuration = 60 / state.currentSong.tempo_bpm;
            const currentBeat = Math.floor(state.songTime / beatDuration);
            if (currentBeat > state.lastMetronomeBeat && currentBeat >= 0) {
              state.lastMetronomeBeat = currentBeat;
              playMetronomeClick(currentBeat % 4 === 0);
            }
          }

          // Cek Loop Titik A-B (Fitur: 9)
          if (state.loopEnabled && state.loopPointB !== null && state.songTime >= state.loopPointB) {
            state.songTime = state.loopPointA !== null ? state.loopPointA : 0;
            resetNoteHitStates();
          }

          // Cek Lagu Selesai
          if (state.songTime >= state.songDurationSec + 1.0) {
            finishSongPractice();
          }

          // Cek Not Terlewat (Auto Mode) (Fitur: 7)
          checkMissedNotes();
        }

        updatePlaybackTimeUI();
      }

      renderFallingNotes();
      animationFrameId = requestAnimationFrame(loop);
    }

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(loop);
  }

  function checkStepByStepPause() {
    // Cari not berikutnya yang belum ditekan dan sudah tiba di garis target
    for (let i = 0; i < state.songNotes.length; i++) {
      const note = state.songNotes[i];
      if (!note.hit && !note.missed) {
        if (state.songTime >= note.timeSec) {
          // Tiba di garis target: kunci playback sampai ditekan benar
          state.waitingForStepKey = note.n;
          state.stepWrongPressedSinceLast = false;
          break;
        }
      }
    }
  }

  function checkMissedNotes() {
    if (state.mode !== 'auto') return;

    state.songNotes.forEach((note) => {
      if (!note.hit && !note.missed) {
        if (state.songTime > note.timeSec + HIT_WINDOW_SEC) {
          note.missed = true;
          state.scoreMissed++;
        }
      }
    });
  }

  function evaluateKeyInput(pressedNote) {
    if (!state.isPlaying || !state.currentSong) return;

    if (state.mode === 'step') {
      // Evaluasi Mode Step-by-Step
      if (state.waitingForStepKey) {
        if (pressedNote === state.waitingForStepKey) {
          // Benar! Bila tidak ada salah tekan sejak not sebelumnya
          if (!state.stepWrongPressedSinceLast) {
            state.scoreCorrect++;
          }
          // Tandai not hit
          const activeNote = state.songNotes.find(n => !n.hit && n.n === pressedNote);
          if (activeNote) activeNote.hit = true;

          state.waitingForStepKey = null; // Lanjutkan permainan
        } else {
          // Salah tekan
          state.stepWrongPressedSinceLast = true;
          state.scoreWrong++;
        }
      }
    } else {
      // Evaluasi Mode Auto
      // Cari not target dalam jendela HIT_WINDOW_SEC
      const matchingNote = state.songNotes.find((n) => {
        return !n.hit && !n.missed && Math.abs(state.songTime - n.timeSec) <= HIT_WINDOW_SEC;
      });

      if (matchingNote) {
        if (matchingNote.n === pressedNote) {
          matchingNote.hit = true;
          state.scoreCorrect++;
        } else {
          state.scoreWrong++;
        }
      } else {
        // Menekan nada di saat tidak ada not target
        state.scoreWrong++;
      }
    }
  }

  function resetNoteHitStates() {
    state.songNotes.forEach(n => {
      n.hit = false;
      n.missed = false;
    });
  }

  function updatePlaybackTimeUI() {
    const formatTime = (sec) => {
      const s = Math.max(0, Math.floor(sec));
      const m = Math.floor(s / 60);
      const rem = s % 60;
      return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    };

    dom.currentTimeLabel.textContent = formatTime(state.songTime);
    dom.totalTimeLabel.textContent = formatTime(state.songDurationSec);
  }

  function togglePlayPause() {
    getAudioContext(); // Pastikan AudioContext aktif
    state.isPlaying = !state.isPlaying;

    if (state.isPlaying) {
      dom.iconPlay.classList.add('hidden');
      dom.iconPause.classList.remove('hidden');
      dom.labelPlayPause.textContent = 'Jeda';
    } else {
      dom.iconPlay.classList.remove('hidden');
      dom.iconPause.classList.add('hidden');
      dom.labelPlayPause.textContent = 'Mulai';
    }
  }

  function restartPlayback() {
    state.songTime = 0;
    state.waitingForStepKey = null;
    state.stepWrongPressedSinceLast = false;
    state.lastMetronomeBeat = -1;
    resetNoteHitStates();

    state.scoreCorrect = 0;
    state.scoreWrong = 0;
    state.scoreMissed = 0;

    updatePlaybackTimeUI();
  }

  function finishSongPractice() {
    state.isPlaying = false;
    dom.iconPlay.classList.remove('hidden');
    dom.iconPause.classList.add('hidden');
    dom.labelPlayPause.textContent = 'Mulai';

    // Hitung Akurasi (Fitur: 7)
    const totalNotes = state.songNotes.length || 1;
    const accuracy = Math.round((state.scoreCorrect / totalNotes) * 100);

    dom.scoreAccuracy.textContent = `${accuracy}%`;
    dom.scoreCorrect.textContent = String(state.scoreCorrect);
    dom.scoreWrong.textContent = String(state.scoreWrong);
    dom.scoreMissed.textContent = String(state.scoreMissed);

    dom.resultModal.classList.remove('hidden');
  }

  // Auto-pause saat tab disembunyikan (Fitur: 2)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.isPlaying) {
      togglePlayPause();
    }
  });

  // ============================================================================
  // 9. SUPABASE REST INTEGRASI & PENCARIAN LAGU (Fitur: 4)
  // postgREST fetch murni, tanpa library
  // ============================================================================
  async function fetchSongsFromSupabase(isLoadMore = false) {
    const config = window.APP_CONFIG || {};
    const supabaseUrl = (config.SUPABASE_URL || '').replace(/\/+$/, '');
    const anonKey = config.SUPABASE_PUBLISHABLE_KEY || '';
    const pageSize = config.PAGE_SIZE || 10;

    if (!supabaseUrl || !anonKey || supabaseUrl === 'ISI_PROJECT_URL') {
      showSearchAlert('Harap isi URL & Kunci Publik Supabase di config.js.', 'warning');
      return;
    }

    if (state.isLoadingSongs) return;
    state.isLoadingSongs = true;

    if (!isLoadMore) {
      state.pageOffset = 0;
      state.songsList = [];
      dom.songListContainer.textContent = '';
      dom.emptyStateCard.classList.add('hidden');
    }

    // Bangun URL Query PostgREST
    // Catatan optimasi: Kolom notes baru diambil saat lagu dibuka (Fitur: 4)
    let queryUrl = `${supabaseUrl}/rest/v1/songs?select=id,slug,title,artist,category,tempo_bpm,time_signature,is_ai,created_at&order=created_at.desc&limit=${pageSize}&offset=${state.pageOffset}`;

    // Filter kategori bila dipilih
    if (state.selectedCategory) {
      queryUrl += `&category=eq.${encodeURIComponent(state.selectedCategory)}`;
    }

    // Filter kata kunci pencarian (ilike)
    if (state.searchQuery) {
      // Escape karakter khusus PostgREST
      const safeQuery = state.searchQuery.replace(/[%*.,()]/g, '');
      queryUrl += `&title=ilike.*${encodeURIComponent(safeQuery)}*`;
    }

    try {
      const headers = {
        apikey: anonKey,
        'Content-Type': 'application/json'
      };
      if (anonKey.startsWith('eyJ')) {
        headers['Authorization'] = `Bearer ${anonKey}`;
      }

      const res = await fetch(queryUrl, {
        method: 'GET',
        headers: headers
      });

      if (!res.ok) {
        showSearchAlert('Gagal memuat daftar lagu dari database.', 'error');
        return;
      }

      const data = await res.json();
      state.isLoadingSongs = false;

      if (Array.isArray(data)) {
        if (!isLoadMore) state.songsList = data;
        else state.songsList = state.songsList.concat(data);

        state.pageOffset += data.length;
        state.hasMoreSongs = data.length >= pageSize;

        renderSongCards(data, isLoadMore);

        // Tangani hasil kosong
        if (state.songsList.length === 0) {
          handleEmptySearchResult();
        } else {
          dom.emptyStateCard.classList.add('hidden');
        }

        // Tampilkan / sembunyikan tombol muat lebih banyak
        if (state.hasMoreSongs) {
          dom.btnLoadMore.classList.remove('hidden');
        } else {
          dom.btnLoadMore.classList.add('hidden');
        }
      }
    } catch (netErr) {
      state.isLoadingSongs = false;
      showSearchAlert('Tidak ada koneksi internet. Periksa koneksi Anda.', 'error');
    }
  }

  function handleEmptySearchResult() {
    dom.emptyStateCard.classList.remove('hidden');
    dom.emptyStateCard.classList.add('flex');

    if (state.selectedCategory && !state.searchQuery) {
      // Kategori kosong
      dom.emptyStateTitle.textContent = 'Kategori Kosong';
      dom.emptyStateDesc.textContent = 'Belum ada lagu di kategori ini. Ketik judul di kotak cari.';
      dom.btnGenerateAi.classList.add('hidden');
    } else {
      // Hasil pencarian kosong
      dom.emptyStateTitle.textContent = 'Lagu Belum Ada';
      dom.emptyStateDesc.textContent = 'Lagu belum ada. Buat dengan AI?';
      dom.btnGenerateAi.classList.remove('hidden');
    }
  }

  function renderSongCards(songs, isAppend = false) {
    if (!isAppend) dom.songListContainer.textContent = '';

    songs.forEach((song) => {
      const card = document.createElement('div');
      card.className = 'group bg-[#121216] hover:bg-[#181820] border border-[#2A2A33] hover:border-[#FF6B00]/50 rounded-2xl p-4 transition cursor-pointer flex flex-col justify-between gap-3 shadow-md';

      // Header Kartu
      const topRow = document.createElement('div');
      topRow.className = 'flex items-start justify-between gap-2';

      const titleEl = document.createElement('h3');
      titleEl.className = 'font-bold font-display text-white text-sm group-hover:text-[#FF6B00] transition line-clamp-1';
      titleEl.textContent = song.title; // Aman dari XSS

      topRow.appendChild(titleEl);

      if (song.is_ai) {
        const aiBadge = document.createElement('span');
        aiBadge.className = 'px-1.5 py-0.5 bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF9500] text-[10px] font-semibold rounded shrink-0';
        aiBadge.textContent = 'AI';
        aiBadge.title = 'Dibuat AI, bisa kurang akurat';
        topRow.appendChild(aiBadge);
      }

      // Metadata Lagu
      const metaRow = document.createElement('div');
      metaRow.className = 'flex items-center gap-2 text-xs text-zinc-400';

      const artistEl = document.createElement('span');
      artistEl.textContent = song.artist || 'Anonim'; // Aman

      const dotEl = document.createElement('span');
      dotEl.textContent = '•';

      const categoryEl = document.createElement('span');
      categoryEl.className = 'capitalize';
      categoryEl.textContent = song.category || 'lainnya';

      const dotEl2 = document.createElement('span');
      dotEl2.textContent = '•';

      const tempoEl = document.createElement('span');
      tempoEl.textContent = `${song.tempo_bpm} BPM`;

      metaRow.appendChild(artistEl);
      metaRow.appendChild(dotEl);
      metaRow.appendChild(categoryEl);
      metaRow.appendChild(dotEl2);
      metaRow.appendChild(tempoEl);

      card.appendChild(topRow);
      card.appendChild(metaRow);

      // Klik kartu -> Buka Lagu Latihan
      card.addEventListener('click', () => {
        openSongForPractice(song.id);
      });

      dom.songListContainer.appendChild(card);
    });
  }

  async function openSongForPractice(songId) {
    const config = window.APP_CONFIG || {};
    const supabaseUrl = (config.SUPABASE_URL || '').replace(/\/+$/, '');
    const anonKey = config.SUPABASE_PUBLISHABLE_KEY || '';

    // Ambil detail lengkap lagu beserta array notes dari Supabase (Fitur: 4)
    try {
      const headers = {
        apikey: anonKey,
        'Content-Type': 'application/json'
      };
      if (anonKey.startsWith('eyJ')) {
        headers['Authorization'] = `Bearer ${anonKey}`;
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/songs?id=eq.${encodeURIComponent(songId)}&select=*`, {
        headers: headers
      });

      if (!res.ok) {
        showSearchAlert('Gagal memuat partitur lagu.', 'error');
        return;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return;

      const fullSong = data[0];
      setupPracticeSong(fullSong);
    } catch (e) {
      showSearchAlert('Terjadi gangguan jaringan saat memuat lagu.', 'error');
    }
  }

  function setupPracticeSong(song) {
    state.currentSong = song;

    // Hitung detik per ketukan
    const beatSec = 60 / song.tempo_bpm;

    // Normalisasi notes ke satuan detik
    state.songNotes = (song.notes || []).map((n) => {
      const timeSec = n.t * beatSec;
      const durationSec = n.d * beatSec;
      return {
        n: n.n,
        t: n.t,
        d: n.d,
        timeSec: timeSec,
        durationSec: durationSec,
        hit: false,
        missed: false
      };
    });

    // Durasi total lagu
    const lastNote = state.songNotes[state.songNotes.length - 1];
    state.songDurationSec = lastNote ? (lastNote.timeSec + lastNote.durationSec) : 10;

    // Reset kontrol latihan (Layar latihan mulai terjeda dengan tombol "Mulai") (Fitur: 5)
    state.isPlaying = false;
    state.songTime = 0;
    state.loopPointA = null;
    state.loopPointB = null;
    state.loopEnabled = false;
    state.scoreCorrect = 0;
    state.scoreWrong = 0;
    state.scoreMissed = 0;

    dom.iconPlay.classList.remove('hidden');
    dom.iconPause.classList.add('hidden');
    dom.labelPlayPause.textContent = 'Mulai';

    // Set Info di HUD Header
    dom.practiceSongTitle.textContent = song.title; // Aman textContent
    dom.practiceSongArtist.textContent = song.artist || 'Anonim';
    dom.practiceSongTempo.textContent = `${song.tempo_bpm} BPM`;

    if (song.is_ai) {
      dom.practiceAiBadge.classList.remove('hidden');
    } else {
      dom.practiceAiBadge.classList.add('hidden');
    }

    updatePlaybackTimeUI();

    // Pindah Tampilan Layar ke Latihan
    state.currentScreen = 'practice';
    dom.songListScreen.classList.add('hidden');
    dom.practiceScreen.classList.remove('hidden');
    dom.practiceScreen.classList.add('flex');

    // Update dimensi tuts dan canvas
    setTimeout(() => {
      updateKeyAndLanePositions();
    }, 100);

    // Cek Banner Landscape di Layar HP
    checkOrientationBanner();
  }

  // ============================================================================
  // 10. GENERASI LAGU DENGAN AI (POST /api/song) (Fitur: 4)
  // Dipanggil lewat tombol user, bukan otomatis
  // ============================================================================
  async function generateSongWithAI() {
    const query = dom.searchInput.value.trim();
    if (!query || query.length < 2) {
      showSearchAlert('Masukkan minimal 2 karakter judul lagu.', 'warning');
      return;
    }

    if (state.isGeneratingAI) return;
    state.isGeneratingAI = true;

    // Sembunyikan empty state, tampilkan loading AI
    dom.emptyStateCard.classList.add('hidden');
    dom.aiLoadingCard.classList.remove('hidden');
    dom.aiLoadingCard.classList.add('flex');
    hideSearchAlert();

    try {
      const res = await fetch('/api/song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query })
      });

      const data = await res.json();
      state.isGeneratingAI = false;
      dom.aiLoadingCard.classList.add('hidden');

      if (!res.ok) {
        // Tampilkan error ramah dari server
        showSearchAlert(data.error || 'Gagal membuat lagu dengan AI.', 'error');
        dom.emptyStateCard.classList.remove('hidden');
        return;
      }

      if (data.song) {
        // Berhasil! Buka langsung untuk dimainkan
        setupPracticeSong(data.song);
      }
    } catch (err) {
      state.isGeneratingAI = false;
      dom.aiLoadingCard.classList.add('hidden');
      dom.emptyStateCard.classList.remove('hidden');
      showSearchAlert('Tidak ada internet atau server tidak dapat dijangkau.', 'error');
    }
  }

  function showSearchAlert(message, type = 'info') {
    dom.searchAlert.textContent = message; // Aman dari XSS
    dom.searchAlert.classList.remove('hidden', 'border-rose-500/40', 'bg-rose-500/10', 'text-rose-300', 'border-amber-500/40', 'bg-amber-500/10', 'text-amber-300');

    if (type === 'error') {
      dom.searchAlert.classList.add('border-rose-500/40', 'bg-rose-500/10', 'text-rose-300');
    } else {
      dom.searchAlert.classList.add('border-amber-500/40', 'bg-amber-500/10', 'text-amber-300');
    }
  }

  function hideSearchAlert() {
    dom.searchAlert.classList.add('hidden');
  }

  // ============================================================================
  // 11. KONTROL UI, CHIPS, LOOP, SLIDER, SOUND & MIDI (Fitur: 5, 6, 9, 10, 11, 12)
  // ============================================================================
  function bindUIEvents() {
    // Tombol Kembali ke Daftar Lagu
    dom.btnBackToList.addEventListener('click', () => {
      state.isPlaying = false;
      state.currentScreen = 'list';
      dom.practiceScreen.classList.add('hidden');
      dom.songListScreen.classList.remove('hidden');
      fetchSongsFromSupabase(false);
    });

    // Kontrol Play/Pause/Restart
    dom.btnPlayPause.addEventListener('click', togglePlayPause);
    dom.btnRestart.addEventListener('click', restartPlayback);

    // Toggle Mode Auto / Step-by-Step (Fitur: 6)
    dom.btnModeToggle.addEventListener('click', () => {
      state.mode = state.mode === 'auto' ? 'step' : 'auto';
      dom.labelCurrentMode.textContent = state.mode === 'auto' ? 'Auto' : 'Step-by-Step';
      state.waitingForStepKey = null;
    });

    // Slider Kecepatan 50% - 120% (Fitur: 5)
    dom.speedSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.playbackSpeed = val / 100;
      dom.speedLabel.textContent = `${val}%`;
    });

    // Kontrol Loop Titik A dan B (Fitur: 9)
    dom.btnLoopA.addEventListener('click', () => {
      state.loopPointA = state.songTime;
      dom.btnLoopA.classList.add('text-[#FF6B00]', 'font-bold');
    });

    dom.btnLoopB.addEventListener('click', () => {
      state.loopPointB = state.songTime;
      dom.btnLoopB.classList.add('text-[#FF6B00]', 'font-bold');
    });

    dom.btnLoopToggle.addEventListener('click', () => {
      state.loopEnabled = !state.loopEnabled;
      if (state.loopEnabled) {
        dom.btnLoopToggle.classList.add('bg-[#FF6B00]', 'text-black');
      } else {
        dom.btnLoopToggle.classList.remove('bg-[#FF6B00]', 'text-black');
      }
    });

    // Metronom (Fitur: 10)
    dom.btnMetronome.addEventListener('click', () => {
      state.metronomeEnabled = !state.metronomeEnabled;
      if (state.metronomeEnabled) {
        dom.btnMetronome.classList.add('text-[#FF6B00]', 'border-[#FF6B00]');
      } else {
        dom.btnMetronome.classList.remove('text-[#FF6B00]', 'border-[#FF6B00]');
      }
    });

    // Sustain Pedal Button (Fitur: 10)
    dom.btnSustain.addEventListener('click', () => {
      setSustain(!state.isSustain);
    });

    // Pilihan Suara (Fitur: 11)
    dom.soundSelect.addEventListener('change', (e) => {
      state.soundType = e.target.value;
    });

    // Pencarian Input & Chips (Fitur: 4)
    let searchDebounce = null;
    dom.searchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      state.searchQuery = val;
      dom.btnClearSearch.classList.toggle('hidden', val.length === 0);

      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        fetchSongsFromSupabase(false);
      }, 400);
    });

    dom.btnClearSearch.addEventListener('click', () => {
      dom.searchInput.value = '';
      state.searchQuery = '';
      dom.btnClearSearch.classList.add('hidden');
      fetchSongsFromSupabase(false);
    });

    // Chips Kata Kunci Lagu
    document.querySelectorAll('[data-chip-search]').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-chip-search');
        dom.searchInput.value = text;
        state.searchQuery = text;
        dom.btnClearSearch.classList.remove('hidden');
        dom.btnResetFilters.classList.remove('hidden');
        fetchSongsFromSupabase(false);
      });
    });

    // Chips Filter Kategori
    document.querySelectorAll('[data-chip-category]').forEach(chip => {
      chip.addEventListener('click', () => {
        const cat = chip.getAttribute('data-chip-category');
        state.selectedCategory = cat;

        document.querySelectorAll('[data-chip-category]').forEach(c => {
          c.classList.remove('bg-[#FF6B00]/20', 'text-[#FF6B00]', 'border-[#FF6B00]');
        });
        chip.classList.add('bg-[#FF6B00]/20', 'text-[#FF6B00]', 'border-[#FF6B00]');
        dom.btnResetFilters.classList.remove('hidden');

        fetchSongsFromSupabase(false);
      });
    });

    // Reset Filters
    dom.btnResetFilters.addEventListener('click', () => {
      dom.searchInput.value = '';
      state.searchQuery = '';
      state.selectedCategory = null;
      dom.btnClearSearch.classList.add('hidden');
      dom.btnResetFilters.classList.add('hidden');

      document.querySelectorAll('[data-chip-category]').forEach(c => {
        c.classList.remove('bg-[#FF6B00]/20', 'text-[#FF6B00]', 'border-[#FF6B00]');
      });

      fetchSongsFromSupabase(false);
    });

    // Tombol AI Buat Lagu
    dom.btnGenerateAi.addEventListener('click', generateSongWithAI);

    // Tombol Cadangan Muat Lebih Banyak
    dom.btnLoadMore.addEventListener('click', () => {
      fetchSongsFromSupabase(true);
    });

    // Modal Hasil
    dom.btnReplaySong.addEventListener('click', () => {
      dom.resultModal.classList.add('hidden');
      restartPlayback();
      togglePlayPause();
    });

    dom.btnChooseOtherSong.addEventListener('click', () => {
      dom.resultModal.classList.add('hidden');
      dom.btnBackToList.click();
    });

    // Infinite Scroll IntersectionObserver (Fitur: 4)
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && state.hasMoreSongs && !state.isLoadingSongs) {
          fetchSongsFromSupabase(true);
        }
      }, { rootMargin: '200px' });
      observer.observe(dom.infiniteScrollTrigger);
    }

    // Banner Landscape Dismiss
    dom.btnDismissLandscapeBanner.addEventListener('click', () => {
      state.landscapeBannerDismissed = true;
      dom.rotateLandscapeBanner.classList.add('hidden');
    });

    // Web MIDI API (Fitur: 12)
    initWebMidi();
  }

  // Cek Banner Landscape saat di HP Portrait
  function checkOrientationBanner() {
    if (state.landscapeBannerDismissed || state.currentScreen !== 'practice') return;
    const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth < 768;
    if (isPortrait) {
      dom.rotateLandscapeBanner.classList.remove('hidden');
    } else {
      dom.rotateLandscapeBanner.classList.add('hidden');
    }
  }

  // Inisialisasi Keyboard MIDI USB (Fitur: 12)
  function initWebMidi() {
    if (navigator.requestMIDIAccess) {
      dom.btnMidi.classList.remove('hidden');
      dom.btnMidi.addEventListener('click', async () => {
        try {
          const midiAccess = await navigator.requestMIDIAccess();
          dom.btnMidi.classList.add('text-[#FF6B00]', 'border-[#FF6B00]');

          midiAccess.inputs.forEach((input) => {
            input.onmidimessage = handleMidiMessage;
          });

          midiAccess.onstatechange = (e) => {
            if (e.port.type === 'input') {
              if (e.port.state === 'connected') {
                e.port.onmidimessage = handleMidiMessage;
              }
            }
          };
        } catch (midiErr) {
          showSearchAlert('Akses keyboard MIDI ditolak atau tidak didukung perangkat.', 'warning');
        }
      });
    }
  }

  function handleMidiMessage(event) {
    const [status, noteNumber, velocity] = event.data;
    const command = status >> 4;

    // Abaikan bila di luar jangkauan C4 (60) sampai B5 (83)
    if (noteNumber < 60 || noteNumber > 83) return;

    const keyInfo = KEY_MAP_BY_MIDI.get(noteNumber);
    if (!keyInfo) return;

    // Note On (command 9 dan velocity > 0)
    if (command === 9 && velocity > 0) {
      handleKeyPress(keyInfo.note);
    }
    // Note Off (command 8 atau command 9 dengan velocity 0)
    else if (command === 8 || (command === 9 && velocity === 0)) {
      handleKeyRelease(keyInfo.note);
    }
  }

  // ============================================================================
  // 12. PWA SERVICE WORKER & ADD TO HOME SCREEN (Fitur: 13)
  // ============================================================================
  function initPWA() {
    // Registrasi Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {
          // Abaikan kegagalan registrasi offline
        });
      });
    }

    // Deteksi jika sudah berjalan Standalone (PWA terpasang)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      return; // Sembunyikan kartu instalasi
    }

    // Android / Chrome: Tangkap event beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredPrompt = e;
      if (!state.pwaCardDismissed) {
        dom.pwaInstallCard.classList.remove('hidden');
      }
    });

    dom.btnInstallPwa.addEventListener('click', async () => {
      // Periksa apakah di iOS Safari
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIos) {
        dom.iosInstallModal.classList.remove('hidden');
        return;
      }

      if (state.deferredPrompt) {
        state.deferredPrompt.prompt();
        const { outcome } = await state.deferredPrompt.userChoice;
        state.deferredPrompt = null;
        if (outcome === 'accepted') {
          dom.pwaInstallCard.classList.add('hidden');
        }
      } else {
        dom.iosInstallModal.classList.remove('hidden');
      }
    });

    dom.btnDismissPwa.addEventListener('click', () => {
      state.pwaCardDismissed = true;
      dom.pwaInstallCard.classList.add('hidden');
    });

    dom.btnCloseIosModal.addEventListener('click', () => {
      dom.iosInstallModal.classList.add('hidden');
    });

    // Tampilkan tombol pasang jika di iOS Safari non-standalone
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIos && !state.pwaCardDismissed) {
      dom.pwaInstallCard.classList.remove('hidden');
    }
  }

  // ============================================================================
  // 13. INISIALISASI UTAMA
  // ============================================================================
  function init() {
    initLogos();
    renderPianoKeyboard();
    bindPianoPointerEvents();
    bindUIEvents();
    startPlaybackLoop();
    initPWA();

    // Muat daftar lagu awal
    fetchSongsFromSupabase(false);

    // Event resize & orientationchange
    window.addEventListener('resize', () => {
      updateKeyAndLanePositions();
      checkOrientationBanner();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        updateKeyAndLanePositions();
        checkOrientationBanner();
      }, 200);
    });
  }

  // Jalankan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
