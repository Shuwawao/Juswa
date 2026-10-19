/**
 * Juswa Portfolio Floating Sketch Music Player
 * Connects the UI controls with window.JuswaSound singleton.
 * Supports play/pause, next/prev, scrubbing, volume adjustments,
 * spinning vinyl disc, and expandable/collapsible sketch window.
 */

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function initMusicPlayer() {
  const player = document.getElementById('sketch-music-player');
  if (!player) return;

  if (player.dataset.playerInitialized === 'true') {
    return;
  }
  player.dataset.playerInitialized = 'true';

  const toggleBtn = document.getElementById('player-toggle-btn');
  const toggleIcon = document.getElementById('player-toggle-icon');
  const playerBody = document.getElementById('player-body');
  const playerMinimizedView = document.getElementById('player-minimized-view');

  const discWrapper = document.getElementById('player-disc-wrapper');
  const disc = document.getElementById('player-disc');
  const miniDisc = document.getElementById('minimized-disc');

  const songTitleEl = document.getElementById('player-song-title');
  const artistNameEl = document.getElementById('player-artist-name');
  const trackCounterEl = document.getElementById('player-track-counter');
  const miniSongTitleEl = document.getElementById('mini-song-title');

  const currentTimeEl = document.getElementById('player-current-time');
  const totalDurationEl = document.getElementById('player-total-duration');
  const progressFillEl = document.getElementById('player-progress-fill');
  const seekSlider = document.getElementById('player-seek-slider');

  const prevBtn = document.getElementById('player-prev-btn');
  const playBtn = document.getElementById('player-play-btn');
  const nextBtn = document.getElementById('player-next-btn');
  const miniPlayBtn = document.getElementById('mini-play-btn');

  const playIcon = document.getElementById('player-play-icon');
  const pauseIcon = document.getElementById('player-pause-icon');
  const miniPlaySymbol = document.getElementById('mini-play-symbol');

  const muteBtn = document.getElementById('player-mute-btn');
  const volHighIcon = document.getElementById('player-vol-high-icon');
  const volMuteIcon = document.getElementById('player-vol-mute-icon');
  const volSlider = document.getElementById('player-volume-slider');

  let isSeeking = false;

  // Restore minimized state
  const isMinimized = localStorage.getItem('juswa_player_minimized') === 'true';
  if (isMinimized) {
    player.classList.add('is-minimized');
    if (playerBody) playerBody.style.display = 'none';
    if (playerMinimizedView) playerMinimizedView.style.display = 'flex';
    if (toggleIcon) toggleIcon.textContent = '+';
  }

  // Toggle minimize/expand
  if (toggleBtn) {
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      const nowMinimized = player.classList.toggle('is-minimized');
      localStorage.setItem('juswa_player_minimized', nowMinimized ? 'true' : 'false');

      if (nowMinimized) {
        if (playerBody) playerBody.style.display = 'none';
        if (playerMinimizedView) playerMinimizedView.style.display = 'flex';
        if (toggleIcon) toggleIcon.textContent = '+';
      } else {
        if (playerBody) playerBody.style.display = 'block';
        if (playerMinimizedView) playerMinimizedView.style.display = 'none';
        if (toggleIcon) toggleIcon.textContent = '−';
      }

      if (window.JuswaSound) window.JuswaSound.playClick();
    };
  }

  // Click on minimized view opens expanded view
  if (playerMinimizedView) {
    playerMinimizedView.onclick = (e) => {
      // If clicking mini play button, do not toggle expand
      if (e.target.closest('#mini-play-btn')) return;
      player.classList.remove('is-minimized');
      localStorage.setItem('juswa_player_minimized', 'false');
      if (playerBody) playerBody.style.display = 'block';
      if (playerMinimizedView) playerMinimizedView.style.display = 'none';
      if (toggleIcon) toggleIcon.textContent = '−';
      if (window.JuswaSound) window.JuswaSound.playClick();
    };
  }

  // Controls Binding
  if (playBtn) {
    playBtn.onclick = () => {
      if (window.JuswaSound) {
        window.JuswaSound.toggleMusic();
        window.JuswaSound.playClick();
      }
    };
  }

  if (miniPlayBtn) {
    miniPlayBtn.onclick = (e) => {
      e.stopPropagation();
      if (window.JuswaSound) {
        window.JuswaSound.toggleMusic();
      }
    };
  }

  if (discWrapper) {
    discWrapper.onclick = () => {
      if (window.JuswaSound) {
        window.JuswaSound.toggleMusic();
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (window.JuswaSound) window.JuswaSound.nextTrack();
    };
  }

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (window.JuswaSound) window.JuswaSound.prevTrack();
    };
  }

  // Scrub Bar
  if (seekSlider) {
    seekSlider.onmousedown = () => { isSeeking = true; };
    seekSlider.ontouchstart = () => { isSeeking = true; };

    seekSlider.oninput = () => {
      if (!window.JuswaSound) return;
      const duration = window.JuswaSound.getState().duration;
      if (duration > 0) {
        const targetTime = (parseFloat(seekSlider.value) / 100) * duration;
        if (currentTimeEl) currentTimeEl.textContent = formatTime(targetTime);
        if (progressFillEl) progressFillEl.style.width = `${seekSlider.value}%`;
      }
    };

    const handleSeekCommit = () => {
      if (!isSeeking) return;
      isSeeking = false;
      if (!window.JuswaSound) return;
      const duration = window.JuswaSound.getState().duration;
      if (duration > 0) {
        const targetTime = (parseFloat(seekSlider.value) / 100) * duration;
        window.JuswaSound.seek(targetTime);
      }
    };

    seekSlider.onmouseup = handleSeekCommit;
    seekSlider.ontouchend = handleSeekCommit;
    seekSlider.onchange = handleSeekCommit;
  }

  // Volume
  if (volSlider) {
    volSlider.oninput = () => {
      if (window.JuswaSound) {
        window.JuswaSound.setVolume(parseFloat(volSlider.value));
      }
    };
  }

  if (muteBtn) {
    muteBtn.onclick = () => {
      if (window.JuswaSound) {
        window.JuswaSound.toggleMute();
      }
    };
  }

  // Hover SFX for player buttons
  player.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (window.JuswaSound) window.JuswaSound.playHover();
    });
  });

  // State Update Subscriber
  const updateUI = (state) => {
    if (!state) return;

    // Track Meta
    if (songTitleEl && state.track) {
      songTitleEl.textContent = state.track.title;
      songTitleEl.title = `${state.track.title} — ${state.track.artist}`;
    }
    if (artistNameEl && state.track) {
      artistNameEl.textContent = state.track.artist;
    }
    if (miniSongTitleEl && state.track) {
      miniSongTitleEl.textContent = state.track.title;
    }
    if (trackCounterEl) {
      trackCounterEl.textContent = `${state.currentTrackIndex + 1}/${state.trackTotal}`;
    }

    // Play / Pause Icons
    if (playIcon && pauseIcon) {
      playIcon.style.display = state.isPlayingMusic ? 'none' : 'block';
      pauseIcon.style.display = state.isPlayingMusic ? 'block' : 'none';
    }
    if (miniPlaySymbol) {
      miniPlaySymbol.textContent = state.isPlayingMusic ? '❚❚' : '▶';
    }

    // Vinyl Spin Animation
    if (disc) {
      disc.classList.toggle('spinning', state.isPlayingMusic);
    }
    if (miniDisc) {
      miniDisc.classList.toggle('spinning', state.isPlayingMusic);
    }

    // Timeline & Scrubber
    if (!isSeeking) {
      if (currentTimeEl) currentTimeEl.textContent = formatTime(state.currentTime);
      if (totalDurationEl) totalDurationEl.textContent = formatTime(state.duration);

      const percent = (state.duration > 0) ? (state.currentTime / state.duration) * 100 : 0;
      if (progressFillEl) progressFillEl.style.width = `${percent}%`;
      if (seekSlider) seekSlider.value = percent.toString();
    }

    // Volume & Mute
    if (volSlider && !isSeeking) {
      volSlider.value = state.isMuted ? '0' : state.volume.toString();
    }
    if (volHighIcon && volMuteIcon) {
      volHighIcon.style.display = (state.isMuted || state.volume === 0) ? 'none' : 'block';
      volMuteIcon.style.display = (state.isMuted || state.volume === 0) ? 'block' : 'none';
    }
  };

  if (window.JuswaSound) {
    window.JuswaSound.subscribe(updateUI);
  }
}

window.initMusicPlayer = initMusicPlayer;
export default initMusicPlayer;
