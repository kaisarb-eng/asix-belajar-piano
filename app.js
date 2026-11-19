/*
 * File: app.js
 * Fungsi: Logika utama aplikasi Asix Belajar Piano (Mode Bebas Piano & Mode Belajar Synthesia, Web Audio sintesis, Falling Notes Canvas, Supabase REST & AI, PWA)
 * Fitur: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
 */

(function () {
  'use strict';

  // ============================================================================
  // 1. DATA NADA (C4 - B5: 14 TUTS PUTIH + 10 TUTS HITAM) (Fitur: 1, 8)
  // ============================================================================
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

  const ALL_KEYS = [...WHITE_KEYS, ...BLACK_KEYS].sort((a, b) => a.midi - b.midi);
  const KEY_MAP_BY_NOTE = new Map();
  const KEY_MAP_BY_MIDI = new Map();
  const KEY_MAP_BY_KEYBOARD = new Map();

  ALL_KEYS.forEach(k => {
    KEY_MAP_BY_NOTE.set(k.note, k);
    KEY_MAP_BY_MIDI.set(k.midi, k);
    KEY_MAP_BY_KEYBOARD.set(k.key.toLowerCase(), k);
  });

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // ============================================================================
  // KOLEKSI LAGU TERVERIFIKASI & AKURAT (Built-in Fallback & Supabase Cache)
  // ============================================================================
  const BUILTIN_SONGS = [
    {
      id: 'kartini-akurat-1',
      slug: 'ibu-kita-kartini',
      title: 'Ibu Kita Kartini',
      artist: 'W.R. Supratman',
      category: 'nasional',
      tempo_bpm: 80,
      time_signature: '4/4',
      is_ai: false,
      notes: [
        {n:'C4',t:0,d:1},{n:'D4',t:1,d:1},{n:'E4',t:2,d:1.5},{n:'F4',t:3.5,d:0.5},
        {n:'G4',t:4,d:2},{n:'E4',t:6,d:2},
        {n:'C4',t:8,d:1},{n:'A4',t:9,d:1},{n:'G4',t:10,d:1.5},{n:'F4',t:11.5,d:0.5},
        {n:'E4',t:12,d:2},{n:'D4',t:14,d:2},
        {n:'F4',t:16,d:1},{n:'A4',t:17,d:1},{n:'G4',t:18,d:1.5},{n:'F4',t:19.5,d:0.5},
        {n:'E4',t:20,d:2},{n:'C4',t:22,d:2},
        {n:'D4',t:24,d:1},{n:'F4',t:25,d:1},{n:'E4',t:26,d:1.5},{n:'D4',t:27.5,d:0.5},
        {n:'C4',t:28,d:4},
        {n:'F4',t:32,d:1},{n:'E4',t:33,d:0.5},{n:'F4',t:33.5,d:0.5},{n:'A4',t:34,d:1},{n:'G4',t:35,d:1},
        {n:'A4',t:36,d:0.5},{n:'G4',t:36.5,d:0.5},{n:'E4',t:37,d:1},{n:'C4',t:38,d:2},
        {n:'F4',t:40,d:1},{n:'E4',t:41,d:0.5},{n:'F4',t:41.5,d:0.5},{n:'A4',t:42,d:1},{n:'G4',t:43,d:1},
        {n:'A4',t:44,d:0.5},{n:'G4',t:44.5,d:0.5},{n:'A4',t:45,d:3},
        {n:'F4',t:48,d:1},{n:'E4',t:49,d:0.5},{n:'F4',t:49.5,d:0.5},{n:'A4',t:50,d:1},{n:'G4',t:51,d:1},
        {n:'A4',t:52,d:0.5},{n:'G4',t:52.5,d:0.5},{n:'E4',t:53,d:1},{n:'C4',t:54,d:2},
        {n:'D4',t:56,d:1},{n:'F4',t:57,d:1},{n:'E4',t:58,d:1.5},{n:'D4',t:59.5,d:0.5},
        {n:'C4',t:60,d:4}
      ]
    },
    {
      id: 'gundul-pacul-akurat-2',
      slug: 'gundul-gundul-pacul',
      title: 'Gundul-Gundul Pacul',
      artist: 'Tradisional Jawa Tengah',
      category: 'daerah',
      tempo_bpm: 95,
      time_signature: '4/4',
      is_ai: false,
      notes: [
        {n:'C4',t:0,d:1},{n:'E4',t:1,d:1},{n:'C4',t:2,d:1},{n:'E4',t:3,d:1},{n:'F4',t:4,d:1},{n:'G4',t:5,d:1},{n:'G4',t:6,d:2},
        {n:'B4',t:8,d:1},{n:'C5',t:9,d:1},{n:'B4',t:10,d:1},{n:'C5',t:11,d:1},{n:'B4',t:12,d:1},{n:'G4',t:13,d:3},
        {n:'C4',t:16,d:1},{n:'E4',t:17,d:1},{n:'C4',t:18,d:1},{n:'E4',t:19,d:1},{n:'F4',t:20,d:1},{n:'G4',t:21,d:1},{n:'G4',t:22,d:2},
        {n:'B4',t:24,d:1},{n:'C5',t:25,d:1},{n:'B4',t:26,d:1},{n:'C5',t:27,d:1},{n:'B4',t:28,d:1},{n:'G4',t:29,d:3},
        {n:'C4',t:32,d:1},{n:'E4',t:33,d:1},{n:'G4',t:34,d:1},{n:'F4',t:35,d:0.5},{n:'F4',t:35.5,d:0.5},{n:'G4',t:36,d:1},{n:'F4',t:37,d:0.5},{n:'E4',t:37.5,d:0.5},{n:'C4',t:38,d:2},
        {n:'C4',t:40,d:1},{n:'E4',t:41,d:1},{n:'G4',t:42,d:1},{n:'F4',t:43,d:0.5},{n:'F4',t:43.5,d:0.5},{n:'G4',t:44,d:1},{n:'F4',t:45,d:0.5},{n:'E4',t:45.5,d:0.5},{n:'C4',t:46,d:2}
      ]
    },
    {
      id: 'balonku-akurat-3',
      slug: 'balonku-ada-lima',
      title: 'Balonku Ada Lima',
      artist: 'A.T. Mahmud',
      category: 'lainnya',
      tempo_bpm: 90,
      time_signature: '4/4',
      is_ai: false,
      notes: [
        {n:'E4',t:0,d:1},{n:'F4',t:1,d:1},{n:'G4',t:2,d:1},{n:'C5',t:3,d:1},{n:'G4',t:4,d:2},{n:'E4',t:6,d:1},{n:'G4',t:7,d:1},
        {n:'C5',t:8,d:1},{n:'B4',t:9,d:1},{n:'A4',t:10,d:1},{n:'G4',t:11,d:3},
        {n:'F4',t:14,d:1},{n:'G4',t:15,d:1},{n:'A4',t:16,d:1},{n:'A4',t:17,d:1},{n:'G4',t:18,d:1},{n:'F4',t:19,d:1},{n:'E4',t:20,d:2},
        {n:'D4',t:22,d:1},{n:'E4',t:23,d:1},{n:'F4',t:24,d:1},{n:'G4',t:25,d:1},{n:'D4',t:26,d:1},{n:'E4',t:27,d:1},{n:'C4',t:28,d:3}
      ]
    },
    {
      id: 'twinkle-akurat-4',
      slug: 'twinkle-twinkle-little-star',
      title: 'Twinkle Twinkle Little Star',
      artist: 'Klasik',
      category: 'lainnya',
      tempo_bpm: 90,
      time_signature: '4/4',
      is_ai: false,
      notes: [
        {n:'C4',t:0,d:1},{n:'C4',t:1,d:1},{n:'G4',t:2,d:1},{n:'G4',t:3,d:1},{n:'A4',t:4,d:1},{n:'A4',t:5,d:1},{n:'G4',t:6,d:2},
        {n:'F4',t:8,d:1},{n:'F4',t:9,d:1},{n:'E4',t:10,d:1},{n:'E4',t:11,d:1},{n:'D4',t:12,d:1},{n:'D4',t:13,d:1},{n:'C4',t:14,d:2},
        {n:'G4',t:16,d:1},{n:'G4',t:17,d:1},{n:'F4',t:18,d:1},{n:'F4',t:19,d:1},{n:'E4',t:20,d:1},{n:'E4',t:21,d:1},{n:'D4',t:22,d:2},
        {n:'G4',t:24,d:1},{n:'G4',t:25,d:1},{n:'F4',t:26,d:1},{n:'F4',t:27,d:1},{n:'E4',t:28,d:1},{n:'E4',t:29,d:1},{n:'D4',t:30,d:2},
        {n:'C4',t:32,d:1},{n:'C4',t:33,d:1},{n:'G4',t:34,d:1},{n:'G4',t:35,d:1},{n:'A4',t:36,d:1},{n:'A4',t:37,d:1},{n:'G4',t:38,d:2},
        {n:'F4',t:40,d:1},{n:'F4',t:41,d:1},{n:'E4',t:42,d:1},{n:'E4',t:43,d:1},{n:'D4',t:44,d:1},{n:'D4',t:45,d:1},{n:'C4',t:46,d:2}
      ]
    },
    {
      id: 'tombo-ati-akurat-5',
      slug: 'tombo-ati',
      title: 'Tombo Ati',
      artist: 'Opick / Sunan Bonang',
      category: 'islami',
      tempo_bpm: 75,
      time_signature: '4/4',
      is_ai: false,
      notes: [
        {n:'E4',t:0,d:1},{n:'G4',t:1,d:1},{n:'A4',t:2,d:1},{n:'A4',t:3,d:1.5},{n:'G4',t:4.5,d:0.5},{n:'A4',t:5,d:2},
        {n:'C5',t:7,d:1},{n:'B4',t:8,d:1},{n:'A4',t:9,d:1},{n:'G4',t:10,d:1},{n:'E4',t:11,d:3},
        {n:'E4',t:14,d:1},{n:'G4',t:15,d:1},{n:'A4',t:16,d:1},{n:'A4',t:17,d:1.5},{n:'G4',t:18.5,d:0.5},{n:'A4',t:19,d:2},
        {n:'C5',t:21,d:1},{n:'B4',t:22,d:1},{n:'A4',t:23,d:1},{n:'G4',t:24,d:1},{n:'A4',t:25,d:3}
      ]
    },
    {
      id: 'kopi-dangdut-akurat-6',
      slug: 'kopi-dangdut',
      title: 'Kopi Dangdut',
      artist: 'Fahmi Shahab',
      category: 'dangdut',
      tempo_bpm: 115,
      time_signature: '4/4',
      is_ai: false,
      notes: [
        {n:'A4',t:0,d:0.5},{n:'A4',t:0.5,d:0.5},{n:'A4',t:1,d:0.5},{n:'B4',t:1.5,d:0.5},{n:'C5',t:2,d:1},{n:'B4',t:3,d:0.5},{n:'A4',t:3.5,d:0.5},{n:'G#4',t:4,d:2},
        {n:'G#4',t:6,d:0.5},{n:'G#4',t:6.5,d:0.5},{n:'G#4',t:7,d:0.5},{n:'A4',t:7.5,d:0.5},{n:'B4',t:8,d:1},{n:'A4',t:9,d:0.5},{n:'G#4',t:9.5,d:0.5},{n:'A4',t:10,d:2},
        {n:'A4',t:12,d:0.5},{n:'A4',t:12.5,d:0.5},{n:'A4',t:13,d:0.5},{n:'B4',t:13.5,d:0.5},{n:'C5',t:14,d:1},{n:'B4',t:15,d:0.5},{n:'A4',t:15.5,d:0.5},{n:'G#4',t:16,d:2},
        {n:'B4',t:18,d:0.5},{n:'B4',t:18.5,d:0.5},{n:'B4',t:19,d:0.5},{n:'C5',t:19.5,d:0.5},{n:'D5',t:20,d:1},{n:'C5',t:21,d:0.5},{n:'B4',t:21.5,d:0.5},{n:'A4',t:22,d:3}
      ]
    }
  ];

  // ============================================================================
  // 2. STATE APLIKASI
  // ============================================================================
  const state = {
    // Mode Utama: 'free' (Piano Bebas) | 'practice' (Latihan Synthesia)
    appMode: 'free',
    landscapeBannerDismissed: false,

    // Pencarian & Koleksi Lagu
    searchQuery: '',
    selectedCategory: null,
    songsList: [...BUILTIN_SONGS],
    pageOffset: 0,
    hasMoreSongs: false,
    isLoadingSongs: false,
    isGeneratingAI: false,

    // Lagu Aktif
    currentSong: null,
    songNotes: [],
    songDurationSec: 0,

    // Audio & Sintesis (Polifoni maks 24)
    audioCtx: null,
    soundType: 'piano',
    isSustain: false,
    activeVoices: new Map(),

    // Playback Engine
    isPlaying: false,
    playbackSpeed: 1.0,
    songTime: 0,
    mode: 'auto', // 'auto' | 'step'

    // Step-by-Step
    waitingForStepKey: null,
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

    // Visualizer Mode Bebas
    freeVisualRipples: [], // { note, x, width, y, speed, alpha, isBlack }

    // Posisi Lane Canvas
    keyPositions: new Map()
  };

  const HIT_WINDOW_SEC = 0.3;

  // ============================================================================
  // 3. ELEMEN DOM UTAMA
  // ============================================================================
  const dom = {
    // Header & Mode Containers
    headerFreeMode: document.getElementById('header-free-mode'),
    headerPracticeMode: document.getElementById('header-practice-mode'),
    practiceToolbar: document.getElementById('practice-toolbar'),
    btnOpenCatalog: document.getElementById('btn-open-catalog'),
    btnExitToFree: document.getElementById('btn-exit-to-free'),

    // Logo & Banner
    appLogoImg: document.getElementById('app-logo-img'),
    appLogoFallback: document.getElementById('app-logo-fallback'),
    rotateLandscapeBanner: document.getElementById('rotate-landscape-banner'),
    btnDismissLandscapeBanner: document.getElementById('btn-dismiss-landscape-banner'),

    // Canvas & Keyboard
    waterfallContainer: document.getElementById('waterfall-container'),
    waterfallCanvas: document.getElementById('waterfall-canvas'),
    pianoKeyboard: document.getElementById('piano-keyboard'),
    freePlayHint: document.getElementById('free-play-hint'),

    // Modal Katalog Lagu
    songCatalogModal: document.getElementById('song-catalog-modal'),
    btnCloseCatalog: document.getElementById('btn-close-catalog'),
    searchInput: document.getElementById('search-input'),
    btnClearSearch: document.getElementById('btn-clear-search'),
    songListContainer: document.getElementById('song-list-container'),
    emptyStateCard: document.getElementById('empty-state-card'),
    emptyStateTitle: document.getElementById('empty-state-title'),
    emptyStateDesc: document.getElementById('empty-state-desc'),
    btnGenerateAi: document.getElementById('btn-generate-ai'),
    aiLoadingCard: document.getElementById('ai-loading-card'),
    searchAlert: document.getElementById('search-alert'),
    btnLoadMore: document.getElementById('btn-load-more'),

    // Practice Header Info
    practiceSongTitle: document.getElementById('practice-song-title'),
    practiceSongArtist: document.getElementById('practice-song-artist'),
    practiceSongTempo: document.getElementById('practice-song-tempo'),
    practiceAiBadge: document.getElementById('practice-ai-badge'),

    // Practice Controls
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

    // Tambahan Kontrol
    soundSelect: document.getElementById('sound-select'),
    btnSustain: document.getElementById('btn-sustain'),
    btnMetronome: document.getElementById('btn-metronome'),
    btnMidi: document.getElementById('btn-midi'),
    btnLoopA: document.getElementById('btn-loop-a'),
    btnLoopB: document.getElementById('btn-loop-b'),
    btnLoopToggle: document.getElementById('btn-loop-toggle'),

    // Modal Hasil
    resultModal: document.getElementById('result-modal'),
    scoreAccuracy: document.getElementById('score-accuracy'),
    scoreCorrect: document.getElementById('score-correct'),
    scoreWrong: document.getElementById('score-wrong'),
    scoreMissed: document.getElementById('score-missed'),
    btnReplay: document.getElementById('btn-replay'),
    btnChangeSong: document.getElementById('btn-change-song'),

    // PWA iOS
    iosPwaModal: document.getElementById('ios-pwa-modal'),
    btnCloseIosModal: document.getElementById('btn-close-ios-modal')
  };

  // ============================================================================
  // 4. WEB AUDIO SYNTHESIS ENGINE (Fitur: 3, 10, 11)
  // Polifoni maks 24 suara, ADSR envelope, Piano, E-Piano, Organ
  // ============================================================================
  function getAudioContext() {
    if (!state.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioCtx();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
    return state.audioCtx;
  }

  function playNoteSynthesis(noteName) {
    const keyInfo = KEY_MAP_BY_NOTE.get(noteName);
    if (!keyInfo) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const freq = midiToFreq(keyInfo.midi);

    // Hentikan suara lama untuk nada yang sama
    stopNoteSynthesis(noteName, true);

    // Batasi polifoni maksimal 24 suara
    if (state.activeVoices.size >= 24) {
      const oldestKey = state.activeVoices.keys().next().value;
      if (oldestKey) stopNoteSynthesis(oldestKey, true);
    }

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    const soundType = state.soundType;
    const oscillators = [];

    if (soundType === 'epiano') {
      // E-Piano: Dual Sine/Triangle dengan metallic decay
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);

      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      g1.gain.setValueAtTime(0.7, now);
      g2.gain.setValueAtTime(0.3, now);

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(masterGain);
      g2.connect(masterGain);

      // ADSR
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(0.4, now + 0.015);
      masterGain.gain.exponentialRampToValueAtTime(0.15, now + 0.8);

      osc1.start(now);
      osc2.start(now);
      oscillators.push(osc1, osc2);
    } else if (soundType === 'organ') {
      // Organ: Drawbar harmonics
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3, now);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(0.25, now + 0.02);

      osc1.start(now);
      osc2.start(now);
      oscillators.push(osc1, osc2);
    } else {
      // Piano Akustik: Fundamental + Overtone + Filter
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4.5, now);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 1.2);

      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      g1.gain.setValueAtTime(0.75, now);
      g2.gain.setValueAtTime(0.25, now);

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(filter);
      g2.connect(filter);
      filter.connect(masterGain);

      // ADSR
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(0.5, now + 0.012);
      masterGain.gain.exponentialRampToValueAtTime(0.18, now + 0.6);

      osc1.start(now);
      osc2.start(now);
      oscillators.push(osc1, osc2);
    }

    state.activeVoices.set(noteName, {
      oscillators,
      gainNode: masterGain,
      startTime: now
    });
  }

  function stopNoteSynthesis(noteName, immediate = false) {
    const voice = state.activeVoices.get(noteName);
    if (!voice) return;

    if (state.isSustain && !immediate) return;

    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const releaseTime = immediate ? 0.02 : 0.25;

    try {
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(Math.max(0.0001, voice.gainNode.gain.value), now);
      voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

      setTimeout(() => {
        voice.oscillators.forEach(osc => {
          try { osc.stop(); osc.disconnect(); } catch (e) {}
        });
        voice.gainNode.disconnect();
      }, releaseTime * 1000 + 50);
    } catch (e) {}

    state.activeVoices.delete(noteName);
  }

  function stopAllActiveVoices() {
    state.activeVoices.forEach((_, note) => stopNoteSynthesis(note, true));
    state.activeVoices.clear();
  }

  function playMetronomeClick(isDownbeat = false) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isDownbeat ? 1200 : 800, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // ============================================================================
  // 5. RENDERING TUTS PIANO PROPORSIONAL (Fitur: 1, 8)
  // 14 Tuts Putih + 10 Tuts Hitam
  // ============================================================================
  function renderPianoKeyboard() {
    dom.pianoKeyboard.textContent = '';

    // Render 14 Tuts Putih
    WHITE_KEYS.forEach((keyData) => {
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

    updateKeyAndLanePositions();
  }

  function updateKeyAndLanePositions() {
    const keyboardRect = dom.pianoKeyboard.getBoundingClientRect();
    if (keyboardRect.width <= 0) return;

    const totalWhiteKeys = WHITE_KEYS.length; // 14
    const whiteKeyWidth = keyboardRect.width / totalWhiteKeys;
    const blackKeyWidth = whiteKeyWidth * 0.65;

    state.keyPositions.clear();

    // Petakan koordinat tuts putih
    WHITE_KEYS.forEach((k, idx) => {
      const x = idx * whiteKeyWidth;
      state.keyPositions.set(k.note, {
        x: x,
        width: whiteKeyWidth,
        center: x + (whiteKeyWidth / 2),
        isBlack: false
      });
    });

    // Posisikan tuts hitam dan petakan koordinatnya
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

    resizeWaterfallCanvas();
  }

  // Interaksi Penekanan Tuts
  function handleKeyPress(noteName) {
    const keyInfo = KEY_MAP_BY_NOTE.get(noteName);
    if (!keyInfo) return;

    const el = dom.pianoKeyboard.querySelector(`[data-note="${noteName}"]`);
    if (el) el.classList.add('is-pressed');

    playNoteSynthesis(noteName);

    // Visualizer Mode Bebas: Buat efek ripple neon naik
    if (state.appMode === 'free') {
      const pos = state.keyPositions.get(noteName);
      if (pos) {
        state.freeVisualRipples.push({
          note: noteName,
          x: pos.x + (pos.width * 0.1),
          width: pos.width * 0.8,
          y: dom.waterfallCanvas.height / (window.devicePixelRatio || 1) - 10,
          height: 30,
          speed: 260,
          alpha: 1.0,
          isBlack: pos.isBlack
        });
      }
    } else {
      evaluateKeyInput(noteName);
    }
  }

  function handleKeyRelease(noteName) {
    const el = dom.pianoKeyboard.querySelector(`[data-note="${noteName}"]`);
    if (el) el.classList.remove('is-pressed');
    stopNoteSynthesis(noteName, false);
  }

  function bindPianoPointerEvents() {
    const activePointers = new Map();

    dom.pianoKeyboard.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const targetKey = e.target.closest('[data-note]');
      if (!targetKey) return;

      const note = targetKey.dataset.note;
      activePointers.set(e.pointerId, note);
      handleKeyPress(note);
    });

    dom.pianoKeyboard.addEventListener('pointermove', (e) => {
      if (!activePointers.has(e.pointerId)) return;
      e.preventDefault();

      const elUnderPointer = document.elementFromPoint(e.clientX, e.clientY);
      const targetKey = elUnderPointer ? elUnderPointer.closest('[data-note]') : null;

      const prevNote = activePointers.get(e.pointerId);
      const newNote = targetKey ? targetKey.dataset.note : null;

      if (prevNote !== newNote) {
        if (prevNote) handleKeyRelease(prevNote);
        if (newNote) {
          activePointers.set(e.pointerId, newNote);
          handleKeyPress(newNote);
        } else {
          activePointers.delete(e.pointerId);
        }
      }
    });

    const endPointer = (e) => {
      if (activePointers.has(e.pointerId)) {
        const note = activePointers.get(e.pointerId);
        handleKeyRelease(note);
        activePointers.delete(e.pointerId);
      }
    };

    dom.pianoKeyboard.addEventListener('pointerup', endPointer);
    dom.pianoKeyboard.addEventListener('pointercancel', endPointer);
    dom.pianoKeyboard.addEventListener('pointerleave', endPointer);

    // Keyboard Komputer (Z-M & Q-U)
    const activeKeyboardKeys = new Set();

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        state.isSustain = !state.isSustain;
        updateSustainButtonUI();
        return;
      }

      const keyChar = e.key.toLowerCase();
      if (activeKeyboardKeys.has(keyChar)) return;

      const keyData = KEY_MAP_BY_KEYBOARD.get(keyChar);
      if (keyData) {
        activeKeyboardKeys.add(keyChar);
        handleKeyPress(keyData.note);
      }
    });

    window.addEventListener('keyup', (e) => {
      const keyChar = e.key.toLowerCase();
      if (activeKeyboardKeys.has(keyChar)) {
        activeKeyboardKeys.delete(keyChar);
        const keyData = KEY_MAP_BY_KEYBOARD.get(keyChar);
        if (keyData) handleKeyRelease(keyData.note);
      }
    });
  }

  // ============================================================================
  // 6. WATERFALL CANVAS & FALLING NOTES RENDERING (Fitur: 2, 8)
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
    const canvas = dom.waterfallCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    // 1. Gambar Garis Panduan Track / Lane Vertikal (Synthesia Guide Lines)
    state.keyPositions.forEach((pos) => {
      if (pos.isBlack) {
        // Shading kolom untuk tuts hitam
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.fillRect(pos.x, 0, pos.width, height);
      } else {
        // Garis batas antar tuts putih
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pos.x, 0);
        ctx.lineTo(pos.x, height);
        ctx.stroke();
      }
    });

    // 2. Garis Target Neon di Atas Tuts
    const targetY = height - 6;
    ctx.shadowColor = '#FF6B00';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#FF6B00';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, targetY);
    ctx.lineTo(width, targetY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // JIKA DALAM MODE BEBAS (Free Play Visualizer)
    if (state.appMode === 'free') {
      for (let i = state.freeVisualRipples.length - 1; i >= 0; i--) {
        const r = state.freeVisualRipples[i];
        r.y -= (r.speed * 0.016);
        r.alpha -= 0.015;

        if (r.alpha <= 0 || r.y < -50) {
          state.freeVisualRipples.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, r.alpha);
        const grad = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.height);
        if (r.isBlack) {
          grad.addColorStop(0, '#C084FC');
          grad.addColorStop(1, 'transparent');
        } else {
          grad.addColorStop(0, '#FFA040');
          grad.addColorStop(1, 'transparent');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(r.x, r.y, r.width, r.height);
        ctx.restore();
      }
      return;
    }

    // JIKA DALAM MODE LATIHAN SYNTHESIA
    const lookaheadSec = 3.2; // Waktu jatuh yang lebih rileks & elegan
    const speedPxPerSec = targetY / lookaheadSec;

    // Bersihkan highlight target pada tuts
    dom.pianoKeyboard.querySelectorAll('.is-target').forEach(el => el.classList.remove('is-target'));

    state.songNotes.forEach((noteItem) => {
      const timeDiff = noteItem.timeSec - state.songTime;
      const noteBottomY = targetY - (timeDiff * speedPxPerSec);
      
      // Ukuran balok proporsional, sudut membulat rapi
      const rawHeight = noteItem.durationSec * speedPxPerSec;
      const noteHeight = Math.max(16, Math.min(rawHeight, height * 0.38));
      const noteTopY = noteBottomY - noteHeight;

      const pos = state.keyPositions.get(noteItem.n);
      if (!pos) return;

      const isAtTarget = timeDiff <= 0.06 && (timeDiff + noteItem.durationSec) >= -0.06;

      if (isAtTarget) {
        const keyEl = dom.pianoKeyboard.querySelector(`[data-note="${noteItem.n}"]`);
        if (keyEl) keyEl.classList.add('is-target');

        // Efek Flare Cahaya di Garis Target
        ctx.save();
        ctx.shadowColor = '#FF8800';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#FFA726';
        ctx.beginPath();
        ctx.arc(pos.center, targetY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render balok not jika berada dalam canvas
      if (noteBottomY >= 0 && noteTopY <= height) {
        const isSharp = noteItem.n.includes('#');

        ctx.save();
        ctx.shadowColor = isSharp ? 'rgba(168, 85, 247, 0.7)' : 'rgba(255, 107, 0, 0.7)';
        ctx.shadowBlur = isAtTarget ? 18 : 8;

        // Dimensi elegan (lebar 82% lane tuts, centered)
        const padX = Math.max(2.5, pos.width * 0.09);
        const rx = pos.x + padX;
        const rw = pos.width - (padX * 2);
        const ry = noteTopY;
        const rh = Math.max(14, noteHeight);
        const radius = Math.min(6, rw / 2);

        // Gradasi balok not
        const grad = ctx.createLinearGradient(rx, ry, rx, ry + rh);
        if (isSharp) {
          grad.addColorStop(0, '#F3E8FF');
          grad.addColorStop(0.3, '#C084FC');
          grad.addColorStop(0.85, '#9333EA');
          grad.addColorStop(1, '#6B21A8');
        } else {
          grad.addColorStop(0, '#FFF3E0');
          grad.addColorStop(0.25, '#FFA24D');
          grad.addColorStop(0.8, '#FF6B00');
          grad.addColorStop(1, '#E65100');
        }
        ctx.fillStyle = grad;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(rx, ry, rw, rh, radius);
        else ctx.rect(rx, ry, rw, rh);
        ctx.fill();

        // Garis tepi halus berkilau (glow outline)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Leading edge bar (kepala not yang menyentuh tuts)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(rx + 2, ry + rh - 3, rw - 4, 2);

        // Label Nama Not di dalam Not Melayang
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
  // 7. GAME LOOP & PLAYBACK ENGINE (Fitur: 5, 6, 7, 9, 10)
  // ============================================================================
  let animationFrameId = null;

  function startPlaybackLoop() {
    let lastTimestamp = performance.now();

    function loop(currentTimestamp) {
      const deltaSec = (currentTimestamp - lastTimestamp) / 1000;
      lastTimestamp = currentTimestamp;

      if (state.appMode === 'practice' && state.isPlaying && state.currentSong) {
        // Cek Mode Step-by-Step
        if (state.mode === 'step') {
          checkStepByStepPause();
        }

        if (!state.waitingForStepKey) {
          state.songTime += deltaSec * state.playbackSpeed;

          // Metronom
          if (state.metronomeEnabled && state.currentSong) {
            const beatDuration = 60 / state.currentSong.tempo_bpm;
            const currentBeat = Math.floor(state.songTime / beatDuration);
            if (currentBeat > state.lastMetronomeBeat && currentBeat >= 0) {
              state.lastMetronomeBeat = currentBeat;
              playMetronomeClick(currentBeat % 4 === 0);
            }
          }

          // Loop A-B
          if (state.loopEnabled && state.loopPointB !== null && state.songTime >= state.loopPointB) {
            state.songTime = state.loopPointA !== null ? state.loopPointA : 0;
            resetNoteHitStates();
          }

          // Lagu Selesai
          if (state.songTime >= state.songDurationSec + 1.0) {
            finishSongPractice();
          }

          // Cek Not Terlewat
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
    for (let i = 0; i < state.songNotes.length; i++) {
      const note = state.songNotes[i];
      if (!note.hit && !note.missed) {
        if (state.songTime >= note.timeSec) {
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
    if (state.mode === 'step') {
      if (state.waitingForStepKey) {
        if (pressedNote === state.waitingForStepKey) {
          const matching = state.songNotes.find(n => !n.hit && !n.missed && n.n === pressedNote);
          if (matching) matching.hit = true;

          if (!state.stepWrongPressedSinceLast) state.scoreCorrect++;
          else state.scoreWrong++;

          state.waitingForStepKey = null;
          state.stepWrongPressedSinceLast = false;
        } else {
          state.stepWrongPressedSinceLast = true;
          state.scoreWrong++;
        }
      }
    } else {
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
    getAudioContext();
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

    const totalNotes = state.songNotes.length || 1;
    const accuracy = Math.round((state.scoreCorrect / totalNotes) * 100);

    dom.scoreAccuracy.textContent = `${accuracy}%`;
    dom.scoreCorrect.textContent = String(state.scoreCorrect);
    dom.scoreWrong.textContent = String(state.scoreWrong);
    dom.scoreMissed.textContent = String(state.scoreMissed);

    dom.resultModal.classList.remove('hidden');
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.isPlaying) {
      togglePlayPause();
    }
  });

  // ============================================================================
  // 8. MODAL KATALOG LAGU & SUPABASE INTEGRATION (Fitur: 4)
  // ============================================================================
  function openSongCatalog() {
    dom.songCatalogModal.classList.remove('hidden');
    renderSongCatalogCards(state.songsList);
    fetchSongsFromSupabase();
  }

  function closeSongCatalog() {
    dom.songCatalogModal.classList.add('hidden');
  }

  async function fetchSongsFromSupabase(isLoadMore = false) {
    const config = window.APP_CONFIG || {};
    const supabaseUrl = (config.SUPABASE_URL || '').replace(/\/+$/, '');
    const anonKey = config.SUPABASE_PUBLISHABLE_KEY || '';
    const pageSize = config.PAGE_SIZE || 10;

    if (!supabaseUrl || !anonKey || supabaseUrl === 'ISI_PROJECT_URL') {
      return; // Gunakan koleksi built-in
    }

    if (state.isLoadingSongs) return;
    state.isLoadingSongs = true;

    let queryUrl = `${supabaseUrl}/rest/v1/songs?select=id,slug,title,artist,category,tempo_bpm,time_signature,is_ai,created_at&order=created_at.desc&limit=${pageSize}&offset=${state.pageOffset}`;

    if (state.selectedCategory) {
      queryUrl += `&category=eq.${encodeURIComponent(state.selectedCategory)}`;
    }

    if (state.searchQuery) {
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
        state.isLoadingSongs = false;
        return;
      }

      const remoteData = await res.json();
      state.isLoadingSongs = false;

      if (Array.isArray(remoteData)) {
        // Gabungkan data Supabase dengan Built-in tanpa duplikat slug
        const mergedMap = new Map();
        BUILTIN_SONGS.forEach(s => mergedMap.set(s.slug, s));
        remoteData.forEach(s => mergedMap.set(s.slug, s));

        state.songsList = Array.from(mergedMap.values());
        filterAndRenderCatalog();
      }
    } catch (netErr) {
      state.isLoadingSongs = false;
    }
  }

  function filterAndRenderCatalog() {
    let filtered = state.songsList;

    if (state.selectedCategory) {
      filtered = filtered.filter(s => (s.category || '').toLowerCase() === state.selectedCategory.toLowerCase());
    }

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => (s.title || '').toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q));
    }

    renderSongCatalogCards(filtered);

    if (filtered.length === 0) {
      dom.emptyStateCard.classList.remove('hidden');
      dom.emptyStateCard.classList.add('flex');
    } else {
      dom.emptyStateCard.classList.add('hidden');
      dom.emptyStateCard.classList.remove('flex');
    }
  }

  function renderSongCatalogCards(songs) {
    dom.songListContainer.textContent = '';

    songs.forEach((song) => {
      const card = document.createElement('div');
      card.className = 'group bg-[#181822] hover:bg-[#20202C] border border-[#2A2A38] hover:border-[#FF6B00]/60 rounded-2xl p-3.5 transition cursor-pointer flex flex-col justify-between gap-2.5 shadow-md';

      const topRow = document.createElement('div');
      topRow.className = 'flex items-start justify-between gap-2';

      const titleEl = document.createElement('h4');
      titleEl.className = 'font-bold font-display text-white text-xs sm:text-sm group-hover:text-[#FF6B00] transition line-clamp-1';
      titleEl.textContent = song.title;

      topRow.appendChild(titleEl);

      const badge = document.createElement('span');
      if (song.is_ai) {
        badge.className = 'px-1.5 py-0.5 bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF9500] text-[10px] font-semibold rounded shrink-0';
        badge.textContent = 'AI';
      } else {
        badge.className = 'px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold rounded shrink-0';
        badge.textContent = 'Akurat';
      }
      topRow.appendChild(badge);

      const metaRow = document.createElement('div');
      metaRow.className = 'flex items-center gap-2 text-[11px] text-zinc-400';
      metaRow.innerHTML = `<span>${song.artist || 'Anonim'}</span><span>•</span><span class="capitalize">${song.category || 'lainnya'}</span><span>•</span><span>${song.tempo_bpm} BPM</span>`;

      card.appendChild(topRow);
      card.appendChild(metaRow);

      card.addEventListener('click', () => {
        selectSongToPractice(song);
      });

      dom.songListContainer.appendChild(card);
    });
  }

  async function selectSongToPractice(song) {
    closeSongCatalog();

    // Jika lagu adalah built-in dan sudah punya notes
    if (song.notes && Array.isArray(song.notes) && song.notes.length > 0) {
      setupPracticeSong(song);
      return;
    }

    // Jika dari Supabase tanpa notes, fetch detail lengkapnya
    const config = window.APP_CONFIG || {};
    const supabaseUrl = (config.SUPABASE_URL || '').replace(/\/+$/, '');
    const anonKey = config.SUPABASE_PUBLISHABLE_KEY || '';

    try {
      const headers = { apikey: anonKey, 'Content-Type': 'application/json' };
      if (anonKey.startsWith('eyJ')) headers['Authorization'] = `Bearer ${anonKey}`;

      const res = await fetch(`${supabaseUrl}/rest/v1/songs?id=eq.${encodeURIComponent(song.id)}&select=*`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setupPracticeSong(data[0]);
          return;
        }
      }
    } catch (e) {}

    setupPracticeSong(song);
  }

  function setupPracticeSong(song) {
    state.currentSong = song;
    state.appMode = 'practice';

    const beatSec = 60 / song.tempo_bpm;
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

    const lastNote = state.songNotes[state.songNotes.length - 1];
    state.songDurationSec = lastNote ? (lastNote.timeSec + lastNote.durationSec) : 10;

    // Reset Playback
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

    // Update Header HUD
    dom.practiceSongTitle.textContent = song.title;
    dom.practiceSongArtist.textContent = song.artist || 'Anonim';
    dom.practiceSongTempo.textContent = `${song.tempo_bpm} BPM`;

    if (song.is_ai) dom.practiceAiBadge.classList.remove('hidden');
    else dom.practiceAiBadge.classList.add('hidden');

    updatePlaybackTimeUI();

    // Alihkan Header ke Mode Latihan
    dom.headerFreeMode.classList.add('hidden');
    dom.headerPracticeMode.classList.remove('hidden');
    dom.headerPracticeMode.classList.add('flex');
    dom.practiceToolbar.classList.remove('hidden');
    dom.practiceToolbar.classList.add('flex');
    dom.freePlayHint.classList.add('opacity-0');

    updateKeyAndLanePositions();
  }

  function exitToFreeMode() {
    state.appMode = 'free';
    state.isPlaying = false;
    stopAllActiveVoices();

    dom.headerPracticeMode.classList.add('hidden');
    dom.headerPracticeMode.classList.remove('flex');
    dom.practiceToolbar.classList.add('hidden');
    dom.practiceToolbar.classList.remove('flex');

    dom.headerFreeMode.classList.remove('hidden');
    dom.freePlayHint.classList.remove('opacity-0');

    dom.pianoKeyboard.querySelectorAll('.is-target').forEach(el => el.classList.remove('is-target'));
  }

  // ============================================================================
  // 9. BUAT LAGU DENGAN AI (POST /api/song) (Fitur: 4)
  // ============================================================================
  async function generateSongWithAI() {
    const query = (state.searchQuery || '').trim();
    if (query.length < 2) return;

    dom.emptyStateCard.classList.add('hidden');
    dom.aiLoadingCard.classList.remove('hidden');
    dom.aiLoadingCard.classList.add('flex');

    try {
      const res = await fetch('/api/song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query })
      });

      dom.aiLoadingCard.classList.add('hidden');
      dom.aiLoadingCard.classList.remove('flex');

      if (res.ok) {
        const resData = await res.json();
        if (resData && resData.song) {
          state.songsList.unshift(resData.song);
          selectSongToPractice(resData.song);
          return;
        }
      }

      showSearchAlert('Gagal membuat lagu dengan AI. Silakan coba judul lain.', 'error');
      dom.emptyStateCard.classList.remove('hidden');
    } catch (e) {
      dom.aiLoadingCard.classList.add('hidden');
      dom.aiLoadingCard.classList.remove('flex');
      showSearchAlert('Terjadi gangguan jaringan atau timeout saat memanggil AI.', 'error');
      dom.emptyStateCard.classList.remove('hidden');
    }
  }

  function showSearchAlert(message, type = 'error') {
    dom.searchAlert.textContent = message;
    dom.searchAlert.className = `p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
      type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
    }`;
    dom.searchAlert.classList.remove('hidden');
    setTimeout(() => dom.searchAlert.classList.add('hidden'), 5000);
  }

  // ============================================================================
  // 10. SETUP EVENT LISTENERS & INTI SISTEM
  // ============================================================================
  function updateSustainButtonUI() {
    if (state.isSustain) {
      dom.btnSustain.classList.add('bg-[#FF6B00]', 'text-black', 'border-[#FF6B00]');
      dom.btnSustain.classList.remove('bg-white/5', 'text-zinc-300');
    } else {
      dom.btnSustain.classList.remove('bg-[#FF6B00]', 'text-black', 'border-[#FF6B00]');
      dom.btnSustain.classList.add('bg-white/5', 'text-zinc-300');
    }
  }

  function bindUIEvents() {
    // Navigasi & Modal
    dom.btnOpenCatalog.addEventListener('click', openSongCatalog);
    dom.btnCloseCatalog.addEventListener('click', closeSongCatalog);
    dom.btnExitToFree.addEventListener('click', exitToFreeMode);

    // Search & Chips
    dom.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (state.searchQuery) dom.btnClearSearch.classList.remove('hidden');
      else dom.btnClearSearch.classList.add('hidden');
      filterAndRenderCatalog();
    });

    dom.btnClearSearch.addEventListener('click', () => {
      dom.searchInput.value = '';
      state.searchQuery = '';
      dom.btnClearSearch.classList.add('hidden');
      filterAndRenderCatalog();
    });

    document.querySelectorAll('[data-chip-search]').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.dataset.chipSearch;
        dom.searchInput.value = text;
        state.searchQuery = text;
        dom.btnClearSearch.classList.remove('hidden');
        filterAndRenderCatalog();
      });
    });

    document.querySelectorAll('[data-chip-category]').forEach(chip => {
      chip.addEventListener('click', () => {
        const cat = chip.dataset.chipCategory;
        state.selectedCategory = state.selectedCategory === cat ? null : cat;
        filterAndRenderCatalog();
      });
    });

    dom.btnGenerateAi.addEventListener('click', generateSongWithAI);

    // Playback Toolbar
    dom.btnPlayPause.addEventListener('click', togglePlayPause);
    dom.btnRestart.addEventListener('click', restartPlayback);

    dom.btnModeToggle.addEventListener('click', () => {
      state.mode = state.mode === 'auto' ? 'step' : 'auto';
      dom.labelCurrentMode.textContent = state.mode === 'auto' ? 'Auto' : 'Step';
    });

    dom.speedSlider.addEventListener('input', (e) => {
      state.playbackSpeed = parseInt(e.target.value, 10) / 100;
      dom.speedLabel.textContent = `${e.target.value}%`;
    });

    dom.soundSelect.addEventListener('change', (e) => {
      state.soundType = e.target.value;
    });

    dom.btnSustain.addEventListener('click', () => {
      state.isSustain = !state.isSustain;
      updateSustainButtonUI();
    });

    dom.btnMetronome.addEventListener('click', () => {
      state.metronomeEnabled = !state.metronomeEnabled;
      if (state.metronomeEnabled) {
        dom.btnMetronome.classList.add('text-[#FF6B00]', 'border-[#FF6B00]');
      } else {
        dom.btnMetronome.classList.remove('text-[#FF6B00]', 'border-[#FF6B00]');
      }
    });

    // Loop A-B
    dom.btnLoopA.addEventListener('click', () => {
      state.loopPointA = state.songTime;
      dom.btnLoopA.classList.add('text-[#FF6B00]');
    });

    dom.btnLoopB.addEventListener('click', () => {
      state.loopPointB = state.songTime;
      dom.btnLoopB.classList.add('text-[#FF6B00]');
    });

    dom.btnLoopToggle.addEventListener('click', () => {
      state.loopEnabled = !state.loopEnabled;
      if (state.loopEnabled) dom.btnLoopToggle.classList.add('text-[#FF6B00]');
      else dom.btnLoopToggle.classList.remove('text-[#FF6B00]');
    });

    // Modal Hasil
    dom.btnReplay.addEventListener('click', () => {
      dom.resultModal.classList.add('hidden');
      restartPlayback();
      togglePlayPause();
    });

    dom.btnChangeSong.addEventListener('click', () => {
      dom.resultModal.classList.add('hidden');
      openSongCatalog();
    });

    // Landscape Banner
    dom.btnDismissLandscapeBanner.addEventListener('click', () => {
      dom.rotateLandscapeBanner.classList.add('hidden');
      state.landscapeBannerDismissed = true;
    });

    // Check Orientasi HP
    function checkOrientation() {
      if (window.innerWidth < 640 && window.innerHeight > window.innerWidth && !state.landscapeBannerDismissed) {
        dom.rotateLandscapeBanner.classList.remove('hidden');
      } else {
        dom.rotateLandscapeBanner.classList.add('hidden');
      }
      updateKeyAndLanePositions();
    }

    window.addEventListener('resize', updateKeyAndLanePositions);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();

    // Fallback Logo
    if (dom.appLogoImg) {
      dom.appLogoImg.addEventListener('error', () => {
        dom.appLogoImg.classList.add('hidden');
        dom.appLogoFallback.classList.remove('hidden');
      });
    }

    // Web MIDI USB (Fitur: 12)
    if (navigator.requestMIDIAccess) {
      dom.btnMidi.classList.remove('hidden');
      dom.btnMidi.classList.add('inline-flex');
      dom.btnMidi.addEventListener('click', async () => {
        try {
          const midiAccess = await navigator.requestMIDIAccess();
          for (let input of midiAccess.inputs.values()) {
            input.onmidimessage = (msg) => {
              const [status, noteNumber, velocity] = msg.data;
              const command = status >> 4;
              if (command === 9 && velocity > 0) {
                const keyInfo = KEY_MAP_BY_MIDI.get(noteNumber);
                if (keyInfo) handleKeyPress(keyInfo.note);
              } else if (command === 8 || (command === 9 && velocity === 0)) {
                const keyInfo = KEY_MAP_BY_MIDI.get(noteNumber);
                if (keyInfo) handleKeyRelease(keyInfo.note);
              }
            };
          }
          dom.btnMidi.classList.add('text-[#FF6B00]');
        } catch (e) {}
      });
    }
  }

  // ============================================================================
  // 11. REGISTRASI SERVICE WORKER PWA (Fitur: 13)
  // ============================================================================
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  // Inisialisasi Aplikasi Saat DOM Siap
  document.addEventListener('DOMContentLoaded', () => {
    renderPianoKeyboard();
    bindPianoPointerEvents();
    bindUIEvents();
    startPlaybackLoop();
    registerServiceWorker();

    // Pre-fetch lagu Supabase di background
    fetchSongsFromSupabase();
  });

})();
