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
let speechTimeout = null;
let hoverLingerTimer = null;

// --- Character Dialogue State System ---
// The original dialogues are shown first, followed by random selections from the pools.
function createDialogueState(original, additions) {
  return {
    original,
    additions: [...additions],
    all: [original, ...additions],
    hasShownOriginal: false,
    unseenAdditions: [...additions],
    lastShown: null
  };
}

const dialoguesCharClick = createDialogueState(
  "wassup! welcome to my sketchbook room :)",
  [
    "you're welcome to look around",
    "Suit yourself",
    "Wubba Lubba Dub-Dub!"
  ]
);

const dialoguesNightMode = createDialogueState(
  "I prefer working at night",
  [
    "I never sleep",
    "my body clock is broken"
  ]
);

const dialoguesLightMode = createDialogueState(
  "ugh i hate mornings",
  [
    "I usually sleep at this time",
    "what day is it now?"
  ]
);

const dialoguesPhoto = createDialogueState(
  "learn more about me?",
  [
    "don't mind my face",
    "click to know more about me",
    "you actually wanna click that?"
  ]
);

const dialoguesArt = createDialogueState(
  "check out my artworks",
  [
    "you might like to click that",
    "that's my wife",
    "wanna see my drawings",
    "wanna commission my art?"
  ]
);

const dialoguesPrototype = createDialogueState(
  "check out my projects",
  [
    "I also build stuffs",
    "wanna see my protoypes?",
    "yeah I can build things"
  ]
);

function getNextDialogue(state) {
  if (!state.hasShownOriginal) {
    state.hasShownOriginal = true;
    state.lastShown = state.original;
    return state.original;
  }

  // If there are unseen new additions, pick from unseen first
  if (state.unseenAdditions.length > 0) {
    const idx = Math.floor(Math.random() * state.unseenAdditions.length);
    const picked = state.unseenAdditions.splice(idx, 1)[0];
    state.lastShown = picked;
    return picked;
  }

  // Once all have been seen at least once, pick randomly from all, avoiding immediate repetition
  const candidates = state.all.filter(d => d !== state.lastShown);
  const options = candidates.length > 0 ? candidates : state.all;
  const picked = options[Math.floor(Math.random() * options.length)];
  state.lastShown = picked;
  return picked;
}

export function cleanupRoom() {
  if (workingInterval) {
    clearInterval(workingInterval);
    workingInterval = null;
  }
  if (speakingInterval) {
    clearInterval(speakingInterval);
    speakingInterval = null;
  }
  if (speechTimeout) {
    clearTimeout(speechTimeout);
    speechTimeout = null;
  }
  if (hoverLingerTimer) {
    clearInterval(hoverLingerTimer);
    hoverLingerTimer = null;
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
  function showSpeech(text, isSpeaking = true) {
    if (!speechBubble || !speechText) return;
    if (speechTimeout) {
      clearTimeout(speechTimeout);
      speechTimeout = null;
    }

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
    if (speechTimeout) {
      clearTimeout(speechTimeout);
      speechTimeout = null;
    }
    clearHoverLinger();
    if (!speechBubble) return;
    speechBubble.classList.remove('active');
    setCharacterState('working');
  }

  function scheduleSpeechHide(delay = 3500) {
    if (speechTimeout) {
      clearTimeout(speechTimeout);
    }
    speechTimeout = setTimeout(() => {
      hideSpeech();
      speechTimeout = null;
    }, delay);
  }

  function startHoverLinger(dialogueState) {
    clearHoverLinger();
    hoverLingerTimer = setInterval(() => {
      const nextLine = getNextDialogue(dialogueState);
      showSpeech(nextLine, true);
    }, 3500);
  }

  function clearHoverLinger() {
    if (hoverLingerTimer) {
      clearInterval(hoverLingerTimer);
      hoverLingerTimer = null;
    }
  }

  // --- Hotspots Configuration ---

  // 1. Main Character (Stops working on hover, character bobs down & up behind laptop, says "wassup")
  const hotspotChar = document.getElementById('hotspot-char');
  if (hotspotChar) {
    hotspotChar.onmouseenter = () => {
      clearHoverLinger();
      showSpeech('wassup', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
    };

    hotspotChar.onmouseleave = () => {
      clearHoverLinger();
      if (!speechTimeout) {
        hideSpeech();
      }
    };

    hotspotChar.onclick = (e) => {
      if (e) e.preventDefault();
      clearHoverLinger();
      const text = getNextDialogue(dialoguesCharClick);
      showSpeech(text, true);
      scheduleSpeechHide(3500);
      if (window.JuswaSound) window.JuswaSound.playClick();
    };
  }

  // 2. Personal Photograph (About Me)
  const hotspotPhoto = document.getElementById('hotspot-photo');
  if (hotspotPhoto) {
    hotspotPhoto.onmouseenter = () => {
      clearHoverLinger();
      const text = getNextDialogue(dialoguesPhoto);
      showSpeech(text, true);
      startHoverLinger(dialoguesPhoto);
      if (window.JuswaSound) window.JuswaSound.playHover();
      if (frameAbout) frameAbout.classList.add('frame-dangling');
    };

    hotspotPhoto.onmouseleave = () => {
      clearHoverLinger();
      hideSpeech();
      if (frameAbout) frameAbout.classList.remove('frame-dangling');
    };

    hotspotPhoto.onclick = (e) => {
      if (e) e.preventDefault();
      clearHoverLinger();
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
      clearHoverLinger();
      const text = getNextDialogue(dialoguesArt);
      showSpeech(text, true);
      startHoverLinger(dialoguesArt);
      if (window.JuswaSound) window.JuswaSound.playHover();
      if (frameArt) frameArt.classList.add('frame-dangling');
    };

    hotspotArt.onmouseleave = () => {
      clearHoverLinger();
      hideSpeech();
      if (frameArt) frameArt.classList.remove('frame-dangling');
    };

    hotspotArt.onclick = (e) => {
      if (e) e.preventDefault();
      clearHoverLinger();
      if (window.JuswaSound) window.JuswaSound.playClick();
      window.open('https://juswa-draws.vercel.app/', '_blank', 'noopener,noreferrer');
    };
  }

  // 4. Portal Gun Prototype (Projects)
  const hotspotPrototype = document.getElementById('hotspot-prototype');
  if (hotspotPrototype) {
    hotspotPrototype.onmouseenter = () => {
      clearHoverLinger();
      const text = getNextDialogue(dialoguesPrototype);
      showSpeech(text, true);
      startHoverLinger(dialoguesPrototype);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(propPrototype);
    };

    hotspotPrototype.onmouseleave = () => {
      clearHoverLinger();
      hideSpeech();
      if (propPrototype) propPrototype.classList.remove('prop-jumping');
    };

    hotspotPrototype.onclick = (e) => {
      if (e) e.preventDefault();
      clearHoverLinger();
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
      clearHoverLinger();
      showSpeech(getMusicPrompt(), true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(musicBox);
    };

    hotspotMusic.onmouseleave = () => {
      clearHoverLinger();
      if (musicBox) musicBox.classList.remove('prop-jumping');
      if (!speechTimeout) {
        hideSpeech();
      }
    };

    hotspotMusic.onclick = (e) => {
      if (e) e.preventDefault();
      clearHoverLinger();
      if (window.JuswaSound) {
        const isPlaying = window.JuswaSound.toggleMusic();
        roomStage.classList.toggle('music-playing', isPlaying);
        if (!isPlaying) {
          showSpeech(getMusicPrompt(), true);
          scheduleSpeechHide(2000);
        }
      }
    };
  }

  // 6. Email Envelope (Send an Email)
  const hotspotMail = document.getElementById('hotspot-mail');
  if (hotspotMail) {
    hotspotMail.onmouseenter = () => {
      clearHoverLinger();
      showSpeech('Send an Email?', true);
      if (layerMailNormal && layerMailHover) {
        layerMailNormal.style.display = 'none';
        layerMailHover.style.display = 'block';
      }
      if (window.JuswaSound) window.JuswaSound.playPaperRustle();
    };

    hotspotMail.onmouseleave = () => {
      clearHoverLinger();
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
      clearHoverLinger();
      showSpeech('change theme?', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
    };

    hotspotSwitch.onmouseleave = () => {
      clearHoverLinger();
      if (!speechTimeout) {
        hideSpeech();
      }
    };

    hotspotSwitch.onclick = (e) => {
      if (e) e.preventDefault();
      clearHoverLinger();
      if (window.JuswaTheme) {
        const newTheme = window.JuswaTheme.toggleTheme();
        const text = newTheme === 'dark'
          ? getNextDialogue(dialoguesNightMode)
          : getNextDialogue(dialoguesLightMode);
        showSpeech(text, true);
        scheduleSpeechHide(3500);
      }
    };
  }

  // 8. GitHub Icon
  const hotspotGithub = document.getElementById('hotspot-github');
  if (hotspotGithub) {
    hotspotGithub.onmouseenter = () => {
      clearHoverLinger();
      showSpeech('Check out my github', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(socialGithub);
    };

    hotspotGithub.onmouseleave = () => {
      clearHoverLinger();
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
      clearHoverLinger();
      showSpeech('Follow me on Instagram', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(socialInstagram);
    };

    hotspotInstagram.onmouseleave = () => {
      clearHoverLinger();
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
      clearHoverLinger();
      showSpeech('Lets be friends', true);
      if (window.JuswaSound) window.JuswaSound.playHover();
      triggerPropJump(socialFacebook);
    };

    hotspotFacebook.onmouseleave = () => {
      clearHoverLinger();
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

  // Sync Audio State Listener: toggles .music-playing on roomStage & character speech
  if (window.JuswaSound) {
    let hasSubscribedInitially = false;
    let prevIsPlayingMusic = false;

    window.JuswaSound.subscribe((state) => {
      const isPlaying = Boolean(state && state.isPlayingMusic);
      if (roomStage) {
        roomStage.classList.toggle('music-playing', isPlaying);
      }
      if (!hasSubscribedInitially) {
        hasSubscribedInitially = true;
        prevIsPlayingMusic = isPlaying;
        return;
      }
      if (isPlaying && !prevIsPlayingMusic) {
        showSpeech("Ohh I like this one", true);
        scheduleSpeechHide(3500);
      }
      prevIsPlayingMusic = isPlaying;
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
