/**
 * Juswa Portfolio Room Controller
 * Coordinates 3000x2000 layer state machine:
 * - 4-frame working animation loop (working-1..4)
 * - Stationary foreground laptop with desk line
 * - Character head/body layer behind laptop that bobs down and up while speaking
 * - Alternating mouth flap (closed look <-> open speak) during speech
 * - Automatic pause of working animation on mouse hover
 */

let workingInterval = null;
let speakingInterval = null;

export function cleanupRoom() {
  if (workingInterval) {
    clearInterval(workingInterval);
    workingInterval = null;
  }
  if (speakingInterval) {
    clearInterval(speakingInterval);
    speakingInterval = null;
  }
}

export function initRoom() {
  const roomStage = document.getElementById('room-stage');
  if (!roomStage) return;

  if (roomStage.dataset.roomInitialized === 'true') {
    return;
  }
  roomStage.dataset.roomInitialized = 'true';
  cleanupRoom();

  // Working Animation Container & Frames
  const charWorkingContainer = document.getElementById('char-working-container');
  const workFrames = [
    document.getElementById('char-work-1'),
    document.getElementById('char-work-2'),
    document.getElementById('char-work-3'),
    document.getElementById('char-work-4')
  ];

  // Looking & Speaking Elements (Separated Head and Laptop)
  const charHeadContainer = document.getElementById('char-head-container');
  const charHeadLook = document.getElementById('char-head-look');
  const charHeadSpeak = document.getElementById('char-head-speak');
  const charLaptopForeground = document.getElementById('char-laptop-foreground');

  // Prop Layers
  const layerMailNormal = document.getElementById('room-mail-normal');
  const layerMailHover = document.getElementById('room-mail-hover');
  const frameAbout = document.getElementById('room-frame-about');
  const frameArt = document.getElementById('room-frame-art');
  const socialGithub = document.getElementById('room-social-github');
  const socialInstagram = document.getElementById('room-social-instagram');
  const socialFacebook = document.getElementById('room-social-facebook');
  const propPrototype = document.getElementById('room-prototype');
  const musicBox = document.getElementById('room-music-box');

  function triggerPropJump(el) {
    if (!el) return;
    el.classList.remove('prop-jumping');
    void el.offsetWidth;
    el.classList.add('prop-jumping');
  }

  // Speech Bubble Elements
  const speechBubble = document.getElementById('room-speech-bubble');
  const speechText = document.getElementById('speech-bubble-text');

  // --- Working Animation Loop ---
  // Fluid sketching stroke: 1 -> 2 -> 3 -> 4 -> 3 -> 2
  const workSequence = [0, 1, 2, 3, 2, 1];
  let workSeqIdx = 0;
  const WORK_INTERVAL_MS = 160;

  function stepWorkingAnimation() {
    const frameIndex = workSequence[workSeqIdx];
    workFrames.forEach((frameEl, idx) => {
      if (frameEl) {
        frameEl.style.display = (idx === frameIndex) ? 'block' : 'none';
      }
    });
    workSeqIdx = (workSeqIdx + 1) % workSequence.length;
  }

  function startWorkingAnimation() {
    stopSpeakingAnimation();

    // Hide separated head and stationary laptop
    if (charHeadContainer) charHeadContainer.style.display = 'none';
    if (charLaptopForeground) charLaptopForeground.style.display = 'none';

    // Show working container
    if (charWorkingContainer) charWorkingContainer.style.display = 'block';

    if (!workingInterval) {
      stepWorkingAnimation();
      workingInterval = setInterval(stepWorkingAnimation, WORK_INTERVAL_MS);
    }
  }

  function stopWorkingAnimation() {
    if (workingInterval) {
      clearInterval(workingInterval);
      workingInterval = null;
    }
    if (charWorkingContainer) charWorkingContainer.style.display = 'none';
  }

  // --- Speaking Animation (Character Bobs Down & Up Behind Stationary Laptop) ---
  let isMouthOpen = false;
  const SPEAK_INTERVAL_MS = 140;

  function stepSpeakingAnimation() {
    isMouthOpen = !isMouthOpen;
    if (charHeadSpeak && charHeadLook) {
      charHeadSpeak.style.display = isMouthOpen ? 'block' : 'none';
      charHeadLook.style.display = isMouthOpen ? 'none' : 'block';
    }
  }

  function startSpeakingAnimation() {
    stopWorkingAnimation();

    // Show stationary laptop in front (stays completely still)
    if (charLaptopForeground) charLaptopForeground.style.display = 'block';

    // Show character head/torso behind laptop and enable down-up bobbing
    if (charHeadContainer) {
      charHeadContainer.style.display = 'block';
      charHeadContainer.classList.add('char-speaking-bob-down');
    }

    if (!speakingInterval) {
      isMouthOpen = true;
      if (charHeadSpeak) charHeadSpeak.style.display = 'block';
      if (charHeadLook) charHeadLook.style.display = 'none';
      speakingInterval = setInterval(stepSpeakingAnimation, SPEAK_INTERVAL_MS);
    }
  }

  function stopSpeakingAnimation() {
    if (speakingInterval) {
      clearInterval(speakingInterval);
      speakingInterval = null;
    }
    if (charHeadContainer) {
      charHeadContainer.classList.remove('char-speaking-bob-down');
    }
    // Return mouth to closed resting pose
    if (charHeadSpeak) charHeadSpeak.style.display = 'none';
    if (charHeadLook) charHeadLook.style.display = 'block';
  }

  // --- Character State Coordinator ---
  function setCharacterState(state) {
    if (state === 'working') {
      startWorkingAnimation();
    } else if (state === 'speaking') {
      startSpeakingAnimation();
    } else if (state === 'looking') {
      stopWorkingAnimation();
      stopSpeakingAnimation();
      if (charLaptopForeground) charLaptopForeground.style.display = 'block';
      if (charHeadContainer) charHeadContainer.style.display = 'block';
      if (charHeadLook) charHeadLook.style.display = 'block';
      if (charHeadSpeak) charHeadSpeak.style.display = 'none';
    }
  }

  // --- Speech Bubble Controller ---
  let speechTimeout = null;

  function showSpeech(text, isSpeaking = true) {
    if (!speechBubble || !speechText) return;
    if (speechTimeout) clearTimeout(speechTimeout);

    speechText.textContent = text;
    speechBubble.classList.add('active');

    if (isSpeaking) {
      startSpeakingAnimation();
    } else {
      setCharacterState('looking');
    }

    if (window.JuswaSound) {
      window.JuswaSound.playBubble();
    }
  }

  function hideSpeech() {
    if (!speechBubble) return;
    speechBubble.classList.remove('active');
    setCharacterState('working');
  }

  // --- Hotspots Configuration ---

  // 1. Main Character (Stops working on hover, character bobs down & up behind laptop, says "wassup")
  const hotspotChar = document.getElementById('hotspot-char');
  if (hotspotChar) {
    hotspotChar.onmouseenter = () => {
      showSpeech('wassup', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
    };

    hotspotChar.onmouseleave = () => {
      hideSpeech();
    };

    hotspotChar.onclick = (e) => {
      if (e) e.preventDefault();
      showSpeech('wassup! welcome to my sketchbook room :)', true);
      if (window.JuswaSound) window.JuswaSound.playClick();
    };
  }

  // 2. Personal Photograph (About Me)
  const hotspotPhoto = document.getElementById('hotspot-photo');
  if (hotspotPhoto) {
    hotspotPhoto.onmouseenter = () => {
      showSpeech('learn more about me?', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      if (frameAbout) frameAbout.classList.add('frame-dangling');
    };

    hotspotPhoto.onmouseleave = () => {
      hideSpeech();
      if (frameAbout) frameAbout.classList.remove('frame-dangling');
    };

    hotspotPhoto.onclick = (e) => {
      if (e) e.preventDefault();
      if (window.JuswaSound) window.JuswaSound.playClick();
      setTimeout(() => {
        if (window.navigateToPage) {
          window.navigateToPage('about.html');
        } else {
          window.location.href = 'about.html';
        }
      }, 120);
    };
  }

  // 3. Illustrated Portrait (Art Portfolio)
  const hotspotArt = document.getElementById('hotspot-art');
  if (hotspotArt) {
    hotspotArt.onmouseenter = () => {
      showSpeech('check out my artworks', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      if (frameArt) frameArt.classList.add('frame-dangling');
    };

    hotspotArt.onmouseleave = () => {
      hideSpeech();
      if (frameArt) frameArt.classList.remove('frame-dangling');
    };

    hotspotArt.onclick = (e) => {
      if (e) e.preventDefault();
      if (window.JuswaSound) window.JuswaSound.playClick();
      window.open('https://juswa-draws.vercel.app/', '_blank', 'noopener,noreferrer');
    };
  }

  // 4. Portal Gun Prototype (Projects)
  const hotspotPrototype = document.getElementById('hotspot-prototype');
  if (hotspotPrototype) {
    hotspotPrototype.onmouseenter = () => {
      showSpeech('check out my projects', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(propPrototype);
    };

    hotspotPrototype.onmouseleave = () => {
      hideSpeech();
      if (propPrototype) propPrototype.classList.remove('prop-jumping');
    };

    hotspotPrototype.onclick = (e) => {
      if (e) e.preventDefault();
      if (window.JuswaSound) window.JuswaSound.playClick();
      setTimeout(() => {
        if (window.navigateToPage) {
          window.navigateToPage('projects.html');
        } else {
          window.location.href = 'projects.html';
        }
      }, 120);
    };
  }

  // 5. Music Box (Play/Pause background music)
  const hotspotMusic = document.getElementById('hotspot-music');
  if (hotspotMusic) {
    const getMusicPrompt = () => {
      const state = window.JuswaSound ? window.JuswaSound.getState() : null;
      if (state && state.isPlayingMusic && state.track) {
        return `Stop "${state.track.title}"?`;
      }
      return 'Play the music?';
    };

    hotspotMusic.onmouseenter = () => {
      showSpeech(getMusicPrompt(), true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(musicBox);
    };

    hotspotMusic.onmouseleave = () => {
      hideSpeech();
      if (musicBox) musicBox.classList.remove('prop-jumping');
    };

    hotspotMusic.onclick = (e) => {
      if (e) e.preventDefault();
      if (window.JuswaSound) {
        const isPlaying = window.JuswaSound.toggleMusic();
        roomStage.classList.toggle('music-playing', isPlaying);
        showSpeech(getMusicPrompt(), true);
      }
    };
  }

  // 6. Email Envelope (Send an Email)
  const hotspotMail = document.getElementById('hotspot-mail');
  if (hotspotMail) {
    hotspotMail.onmouseenter = () => {
      showSpeech('Send an Email?', true);
      if (layerMailNormal && layerMailHover) {
        layerMailNormal.style.display = 'none';
        layerMailHover.style.display = 'block';
      }
      if (window.JuswaSound) window.JuswaSound.playPaperRustle();
    };

    hotspotMail.onmouseleave = () => {
      hideSpeech();
      if (layerMailNormal && layerMailHover) {
        layerMailNormal.style.display = 'block';
        layerMailHover.style.display = 'none';
      }
    };

    hotspotMail.onclick = (e) => {
      if (e) e.preventDefault();
      if (window.JuswaSound) window.JuswaSound.playClick();
      window.location.href = 'mailto:joshualagare24@gmail.com';
    };
  }

  // 7. Theme Switch (Toggle light/dark)
  const hotspotSwitch = document.getElementById('hotspot-switch');
  if (hotspotSwitch) {
    hotspotSwitch.onmouseenter = () => {
      showSpeech('change theme?', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
    };

    hotspotSwitch.onmouseleave = () => {
      hideSpeech();
    };

    hotspotSwitch.onclick = (e) => {
      if (e) e.preventDefault();
      if (window.JuswaTheme) {
        window.JuswaTheme.toggleTheme();
      }
    };
  }

  // 8. GitHub Icon
  const hotspotGithub = document.getElementById('hotspot-github');
  if (hotspotGithub) {
    hotspotGithub.onmouseenter = () => {
      showSpeech('Check out my github', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(socialGithub);
    };

    hotspotGithub.onmouseleave = () => {
      hideSpeech();
      if (socialGithub) socialGithub.classList.remove('prop-jumping');
    };

    hotspotGithub.onclick = (e) => {
      if (e) e.preventDefault();
      if (window.JuswaSound) window.JuswaSound.playClick();
      window.open('https://github.com/Shuwawao', '_blank', 'noopener,noreferrer');
    };
  }

  // 9. Instagram Icon
  const hotspotInstagram = document.getElementById('hotspot-instagram');
  if (hotspotInstagram) {
    hotspotInstagram.onmouseenter = () => {
      showSpeech('Follow me on Instagram', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(socialInstagram);
    };

    hotspotInstagram.onmouseleave = () => {
      hideSpeech();
      if (socialInstagram) socialInstagram.classList.remove('prop-jumping');
    };

    hotspotInstagram.onclick = (e) => {
      if (e) e.preventDefault();
      if (window.JuswaSound) window.JuswaSound.playClick();
      window.open('https://www.instagram.com/juswa_draws', '_blank', 'noopener,noreferrer');
    };
  }

  // 10. Facebook Icon
  const hotspotFacebook = document.getElementById('hotspot-facebook');
  if (hotspotFacebook) {
    hotspotFacebook.onmouseenter = () => {
      showSpeech('Lets be friends', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(socialFacebook);
    };

    hotspotFacebook.onmouseleave = () => {
      hideSpeech();
      if (socialFacebook) socialFacebook.classList.remove('prop-jumping');
    };

    hotspotFacebook.onclick = (e) => {
      if (e) e.preventDefault();
      if (window.JuswaSound) window.JuswaSound.playClick();
      window.open('https://www.facebook.com/joshua.aquino25/', '_blank', 'noopener,noreferrer');
    };
  }

  // Music Box Alternating Animation (music-1 idle, alternates with music-2 when playing)
  const roomMusic1 = document.getElementById('room-music-1');
  const roomMusic2 = document.getElementById('room-music-2');
  if (roomMusic1) roomMusic1.style.display = '';
  if (roomMusic2) roomMusic2.style.display = '';

  // Sync Audio State Listener: toggles .music-playing on roomStage
  if (window.JuswaSound) {
    window.JuswaSound.subscribe((state) => {
      const isPlaying = Boolean(state && state.isPlayingMusic);
      if (roomStage) {
        roomStage.classList.toggle('music-playing', isPlaying);
      }
    });
  }

  // Initial Theme sync for room elements
  if (window.JuswaTheme) {
    window.JuswaTheme.syncRoomElements(window.JuswaTheme.currentTheme);
  }

  // Start the working animation on page load
  startWorkingAnimation();
}

window.initJuswaRoom = initRoom;
window.cleanupJuswaRoom = cleanupRoom;
export default initRoom;
