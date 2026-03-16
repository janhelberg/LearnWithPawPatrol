/**
 * game-common.js
 * Shared helpers used by every mini-game.
 *
 * Exports (attached to window.GameCommon):
 *   - shuffle(array)                 – Fisher-Yates in-place shuffle
 *   - pickRandom(array)              – Return one random element
 *   - pickRandomN(array, n)          – Return n unique random elements
 *   - speak(text)                    – Web Speech API wrapper
 *   - playTone(type, duration)       – Simple AudioContext feedback tone
 *   - confettiBurst(canvas, ms)      – Confetti animation overlay on a canvas
 *   - drawRoundRect(ctx, x, y, w, h, r, fill, stroke) – Canvas helper
 *   - loadScore(gameId)              – Load score from sessionStorage
 *   - saveScore(gameId, score)       – Persist score to sessionStorage
 */

const GameCommon = (() => {
  /* ------------------------------------------------------------------ */
  /* Array helpers                                                        */
  /* ------------------------------------------------------------------ */

  /** Fisher-Yates in-place shuffle. Returns the array. */
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Return one random element from an array. */
  function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /** Return n unique random elements from an array (no repeat). */
  function pickRandomN(array, n) {
    return shuffle([...array]).slice(0, n);
  }

  /* ------------------------------------------------------------------ */
  /* Web Speech API                                                       */
  /* ------------------------------------------------------------------ */

  let speechSynth = window.speechSynthesis || null;

  /**
   * Speak a string aloud using the Web Speech API.
   * Silently does nothing if the API is unavailable.
   *
   * @param {string} text
   * @param {{ lang?: string, rate?: number, pitch?: number }} [opts]
   */
  function speak(text, opts = {}) {
    if (!speechSynth) return;
    speechSynth.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = opts.lang  || 'en-US';
    utt.rate  = opts.rate  || 0.9;
    utt.pitch = opts.pitch || 1.1;
    speechSynth.speak(utt);
  }

  /* ------------------------------------------------------------------ */
  /* Audio feedback tones                                                 */
  /* ------------------------------------------------------------------ */

  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_) {
        // Audio not available – ignore.
      }
    }
    return audioCtx;
  }

  /**
   * Play a brief synthesised tone.
   *
   * @param {'correct'|'incorrect'|'start'} type
   * @param {number} [duration=0.35] seconds
   */
  function playTone(type = 'correct', duration = 0.35) {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const TONES = {
      correct:   [523.25, 659.25, 783.99], // C5 E5 G5 – major chord
      incorrect: [220, 180],               // descending low
      start:     [440, 554.37],            // A4 C#5
    };

    const freqs = TONES[type] || TONES.start;
    const step  = duration / freqs.length;
    let   time  = ctx.currentTime;

    freqs.forEach(freq => {
      osc.frequency.setValueAtTime(freq, time);
      time += step;
    });

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration + 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.1);
  }

  /* ------------------------------------------------------------------ */
  /* Canvas helpers                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Draw a rounded rectangle on a 2D canvas context.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number} r  - corner radius
   * @param {string|null} fill   - fill colour (null = no fill)
   * @param {string|null} stroke - stroke colour (null = no stroke)
   * @param {number} [lineWidth=3]
   */
  function drawRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 3) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r,  r);
    ctx.lineTo(x,     y + r);
    ctx.arcTo(x,     y,     x + r, y,           r);
    ctx.closePath();

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth   = lineWidth;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Confetti burst (optional canvas overlay)                             */
  /* ------------------------------------------------------------------ */

  /**
   * Draw a quick confetti burst on a canvas.
   * Automatically clears after `clearAfterMs` milliseconds.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {number} [clearAfterMs=1200]
   */
  function confettiBurst(canvas, clearAfterMs = 1200) {
    const ctx     = canvas.getContext('2d');
    const W       = canvas.width;
    const H       = canvas.height;
    const COLOURS = ['#f9a825','#e53935','#1e88e5','#43a047','#8e24aa','#fb8c00'];
    const PIECES  = 60;

    const particles = Array.from({ length: PIECES }, () => ({
      x:  Math.random() * W,
      y: -10 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 6,
      vy:  3 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      rv:  (Math.random() - 0.5) * 0.2,
      w:   8 + Math.random() * 12,
      h:   4 + Math.random() * 6,
      color: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    }));

    let start = null;

    function frame(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;

      ctx.clearRect(0, 0, W, H);

      particles.forEach(p => {
        p.x   += p.vx;
        p.y   += p.vy;
        p.rot += p.rv;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (elapsed < clearAfterMs) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    }

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Score persistence (sessionStorage)                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Load score for a game from sessionStorage.
   * @param {string} gameId
   * @returns {{ correct: number, total: number }}
   */
  function loadScore(gameId) {
    try {
      const raw = sessionStorage.getItem('score_' + gameId);
      return raw ? JSON.parse(raw) : { correct: 0, total: 0 };
    } catch (_) {
      return { correct: 0, total: 0 };
    }
  }

  /**
   * Save score for a game to sessionStorage.
   * @param {string} gameId
   * @param {{ correct: number, total: number }} score
   */
  function saveScore(gameId, score) {
    try {
      sessionStorage.setItem('score_' + gameId, JSON.stringify(score));
    } catch (_) { /* quota exceeded – ignore */ }
  }

  /* ------------------------------------------------------------------ */
  /* Public API                                                           */
  /* ------------------------------------------------------------------ */
  return {
    shuffle,
    pickRandom,
    pickRandomN,
    speak,
    playTone,
    drawRoundRect,
    confettiBurst,
    loadScore,
    saveScore,
  };
})();
