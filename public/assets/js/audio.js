/**
 * Juswa Portfolio Audio System
 * Real Lo-Fi & Soundtrack Music Player + Synthesized Web Audio API sound effects.
 * Guarantees zero latency for UI interactions, hand-drawn sketchbook soundtrack playback,
 * and state persistence across page visits.
 */

export const PLAYLIST = [
  {
    id: 'coffee-time',
    title: 'Coffee Time',
    artist: 'Lofi Chill / Juswa Vibes',
    src: 'assets/audio/music/Coffee Time.mp3'
  },
  {
    id: '100-bad-days',
    title: '100 Bad Days',
    artist: 'AJR',
    src: 'assets/audio/music/100 Bad Days - AJR.mp3'
  },
  {
    id: 'inertia',
    title: 'Inertia',
    artist: 'AJR',
    src: 'assets/audio/music/Inertia - AJR.mp3'
  },
  {
    id: 'karma',
    title: 'Karma',
    artist: 'AJR',
    src: 'assets/audio/music/Karma - AJR.mp3'
  },
  {
    id: 'worlds-smallest-violin',
    title: "World's Smallest Violin",
    artist: 'AJR',
    src: "assets/audio/music/World's Smallest Violin -AJR.mp3"
  }
];

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('juswa-muted') === 'true';
    this.masterGain = null;
    this.sfxGain = null;

    // Music Player State
    this.tracks = PLAYLIST;
    this.currentTrackIndex = parseInt(localStorage.getItem('juswa_music_track') || '0', 10);
    if (isNaN(this.currentTrackIndex) || this.currentTrackIndex < 0 || this.currentTrackIndex >= this.tracks.length) {
      this.currentTrackIndex = 0;
    }

    this.volume = parseFloat(localStorage.getItem('juswa_music_volume') || '0.75');
    if (isNaN(this.volume) || this.volume < 0 || this.volume > 1) {
      this.volume = 0.75;
    }

    this.savedPlaybackTime = parseFloat(localStorage.getItem('juswa_music_time') || '0');
    if (isNaN(this.savedPlaybackTime) || this.savedPlaybackTime < 0) {
      this.savedPlaybackTime = 0;
    }

    this.isPlayingMusic = false;
    this.subscribers = [];

    // Initialize HTML5 Audio Element
    this.audioEl = new Audio();
    this.audioEl.preload = 'metadata';
    this.audioEl.volume = this.isMuted ? 0 : this.volume;

    this._setupAudioListeners();
    this._restorePreviousPlayback();
  }

  // --- Web Audio Context for SFX ---

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Audio Element Event Listeners ---

  _setupAudioListeners() {
    // When track finishes, play next automatically
    this.audioEl.addEventListener('ended', () => {
      this.nextTrack(true);
    });

    // Time update for scrub bar and timestamps
    this.audioEl.addEventListener('timeupdate', () => {
      this._saveCurrentTime();
      this.notify();
    });

    this.audioEl.addEventListener('play', () => {
      this.isPlayingMusic = true;
      localStorage.setItem('juswa_music_playing', 'true');
      this.notify();
    });

    this.audioEl.addEventListener('pause', () => {
      this.isPlayingMusic = false;
      localStorage.setItem('juswa_music_playing', 'false');
      this.notify();
    });

    this.audioEl.addEventListener('loadedmetadata', () => {
      this.notify();
    });

    this.audioEl.addEventListener('error', (e) => {
      console.warn('Audio track loading error:', e);
    });

    // Save time before unload
    window.addEventListener('beforeunload', () => {
      this._saveCurrentTime();
    });
  }

  _saveCurrentTime() {
    if (this.audioEl && !isNaN(this.audioEl.currentTime)) {
      localStorage.setItem('juswa_music_time', this.audioEl.currentTime.toFixed(2));
    }
  }

  _restorePreviousPlayback() {
    const wasPlaying = localStorage.getItem('juswa_music_playing') === 'true';
    const currentTrack = this.tracks[this.currentTrackIndex];
    if (!currentTrack) return;

    this.audioEl.src = encodeURI(currentTrack.src);

    // If previously at a certain point, seek once ready
    if (this.savedPlaybackTime > 0) {
      this.audioEl.currentTime = this.savedPlaybackTime;
    }

    if (wasPlaying) {
      // Attempt autoplay (if browser policy allows, e.g. after internal navigation or user granted permission)
      const playPromise = this.audioEl.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.isPlayingMusic = true;
          this.notify();
        }).catch(() => {
          // Autoplay blocked by browser policy until first user interaction
          this.isPlayingMusic = false;
          const unlockAudio = () => {
            if (localStorage.getItem('juswa_music_playing') === 'true') {
              this.audioEl.play().catch(() => {});
            }
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
          };
          window.addEventListener('click', unlockAudio, { once: true });
          window.addEventListener('keydown', unlockAudio, { once: true });
        });
      }
    }
  }

  // --- Subscription Pattern ---

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
      // Immediately notify subscriber of current state
      callback(this.getState());
    }
  }

  notify() {
    const state = this.getState();
    this.subscribers.forEach(cb => {
      try {
        cb(state);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });
  }

  getState() {
    const track = this.tracks[this.currentTrackIndex] || this.tracks[0];
    const isPlaying = this.isPlayingMusic || (!this.audioEl.paused && !this.audioEl.ended);
    return {
      isMuted: this.isMuted,
      isPlayingMusic: isPlaying,
      currentTrackIndex: this.currentTrackIndex,
      trackTotal: this.tracks.length,
      track: track,
      currentTime: this.audioEl.currentTime || 0,
      duration: isNaN(this.audioEl.duration) ? 0 : this.audioEl.duration,
      volume: this.volume
    };
  }

  // --- Track Controls ---

  playTrack(index, startTime = 0) {
    if (index < 0 || index >= this.tracks.length) return;
    this.init();

    this.currentTrackIndex = index;
    localStorage.setItem('juswa_music_track', index.toString());

    const track = this.tracks[index];
    this.audioEl.src = encodeURI(track.src);
    this.audioEl.volume = this.isMuted ? 0 : this.volume;

    this.isPlayingMusic = true;
    localStorage.setItem('juswa_music_playing', 'true');
    this.notify();

    const playPromise = this.audioEl.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (startTime > 0) {
          try { this.audioEl.currentTime = startTime; } catch (e) {}
        }
        this.isPlayingMusic = true;
        localStorage.setItem('juswa_music_playing', 'true');
        this.notify();
      }).catch(err => {
        console.warn('Playback initiation error:', err);
        this.isPlayingMusic = false;
        localStorage.setItem('juswa_music_playing', 'false');
        this.notify();
      });
    }
  }

  toggleMusic() {
    this.init();
    if (this.audioEl.paused) {
      this.isPlayingMusic = true;
      localStorage.setItem('juswa_music_playing', 'true');
      this.notify();

      // Resume current or start first track
      if (!this.audioEl.src || this.audioEl.src === window.location.href) {
        this.playTrack(this.currentTrackIndex, this.savedPlaybackTime);
      } else {
        const playPromise = this.audioEl.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.isPlayingMusic = true;
            localStorage.setItem('juswa_music_playing', 'true');
            this.notify();
          }).catch(e => {
            console.warn('Could not resume audio:', e);
            this.isPlayingMusic = false;
            localStorage.setItem('juswa_music_playing', 'false');
            this.notify();
          });
        }
      }
      return true;
    } else {
      this.pauseMusic();
      return false;
    }
  }

  pauseMusic() {
    this.audioEl.pause();
    this.isPlayingMusic = false;
    localStorage.setItem('juswa_music_playing', 'false');
    this._saveCurrentTime();
    this.notify();
  }

  nextTrack(autoAdvance = false) {
    const nextIdx = (this.currentTrackIndex + 1) % this.tracks.length;
    this.playTrack(nextIdx, 0);
    if (!autoAdvance && window.JuswaSound) {
      this.playClick();
    }
  }

  prevTrack() {
    // If playing for more than 3 seconds, restart current track
    if (this.audioEl.currentTime > 3) {
      this.audioEl.currentTime = 0;
      this.notify();
    } else {
      const prevIdx = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
      this.playTrack(prevIdx, 0);
    }
    this.playClick();
  }

  seek(seconds) {
    if (isNaN(seconds) || seconds < 0) return;
    this.audioEl.currentTime = seconds;
    this._saveCurrentTime();
    this.notify();
  }

  setVolume(newVolume) {
    const clamped = Math.max(0, Math.min(1, newVolume));
    this.volume = clamped;
    localStorage.setItem('juswa_music_volume', clamped.toString());

    if (this.isMuted && clamped > 0) {
      this.isMuted = false;
      localStorage.setItem('juswa-muted', 'false');
    }

    this.audioEl.volume = this.isMuted ? 0 : this.volume;
    this.notify();
  }

  toggleMute() {
    this.init();
    this.isMuted = !this.isMuted;
    localStorage.setItem('juswa-muted', this.isMuted ? 'true' : 'false');

    // Mute or unmute music
    this.audioEl.volume = this.isMuted ? 0 : this.volume;

    // Mute or unmute Web Audio SFX
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : 1;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }

    this.notify();
    return this.isMuted;
  }

  // --- Web Audio SFX ---

  playHover() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.09);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  playSwitch() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(320, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(this.sfxGain);
      osc1.start(now);
      osc1.stop(now + 0.05);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(950, now + 0.03);
      gain2.gain.setValueAtTime(0.18, now + 0.03);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc2.connect(gain2);
      gain2.connect(this.sfxGain);
      osc2.start(now + 0.03);
      osc2.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio switch error', e);
    }
  }

  playBubble() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.07);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('Audio bubble error', e);
    }
  }

  playPaperRustle() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(1.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.13);
    } catch (e) {
      console.warn('Audio paper error', e);
    }
  }
}

// Global singleton instance
window.JuswaSound = new SoundSystem();
export default window.JuswaSound;
