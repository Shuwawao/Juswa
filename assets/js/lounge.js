/**
 * Juswa Portfolio — 2D Multiplayer Virtual Grid Lounge
 * Renders an interactive 2D grid space with pixel/sketch avatars,
 * furniture props, WASD/Arrow navigation, collision boundaries,
 * speech bubbles over avatars, and realtime multiplayer position synchronization.
 */

export class SketchLounge {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.onWave = options.onWave || null;
    this.onMove = options.onMove || null;

    // Grid Configuration
    this.gridSize = 32; // 32px grid units
    this.width = canvasEl.width || 640;
    this.height = canvasEl.height || 420;

    // Local Player State
    this.localPlayer = {
      id: options.playerId || 'player-' + Math.random().toString(36).substring(2, 8),
      nickname: options.nickname || 'Guest',
      avatarId: options.avatarId || 'sketch-1',
      x: 320,
      y: 210,
      targetX: 320,
      targetY: 210,
      vx: 0,
      vy: 0,
      speed: 2.8,
      facing: 'down', // 'down', 'up', 'left', 'right'
      isMoving: false,
      stepFrame: 0,
      stepTimer: 0,
      speechBubble: null,
      speechTimer: null
    };

    // Remote Players Map: { id: playerObj }
    this.remotePlayers = new Map();

    // Simulated Bots for Demo Mode
    this.demoBots = [];
    this.isDemoMode = options.isDemoMode ?? true;

    // Input States
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // Furniture / Props on Grid
    this.furniture = [
      { type: 'workstation', x: 70, y: 220, w: 90, h: 56, label: 'Workstation' },
      { type: 'desk', x: 380, y: 150, w: 76, h: 58, label: 'Juswa Desk' },
      { type: 'server', x: 490, y: 260, w: 46, h: 52, label: 'IoT Server' },
      { type: 'coffee', x: 200, y: 80, w: 38, h: 44, label: 'Coffee Cart' }
    ];

    // Animation & Loop
    this.animationFrameId = null;
    this.lastTime = performance.now();
    this.broadcastThrottle = 0;

    this._bindEvents();
    this._initDemoBots();
    this._startLoop();
  }

  updateProfile(nickname, avatarId) {
    if (nickname) this.localPlayer.nickname = nickname;
    if (avatarId) this.localPlayer.avatarId = avatarId;
  }

  showSpeech(playerId, text) {
    let player = (playerId === this.localPlayer.id) ? this.localPlayer : this.remotePlayers.get(playerId);
    if (!player && this.isDemoMode) {
      player = this.demoBots.find(b => b.id === playerId);
    }
    if (!player) return;

    if (player.speechTimer) clearTimeout(player.speechTimer);
    player.speechBubble = text;
    player.speechTimer = setTimeout(() => {
      player.speechBubble = null;
    }, 4500);
  }

  setRemotePlayerPosition(id, data) {
    if (id === this.localPlayer.id) return;

    let remote = this.remotePlayers.get(id);
    if (!remote) {
      remote = {
        id,
        nickname: data.nickname || 'Visitor',
        avatarId: data.avatarId || 'sketch-2',
        x: data.x,
        y: data.y,
        targetX: data.x,
        targetY: data.y,
        facing: data.facing || 'down',
        isMoving: false,
        stepFrame: 0,
        stepTimer: 0,
        speechBubble: null,
        speechTimer: null
      };
      this.remotePlayers.set(id, remote);
    } else {
      remote.targetX = data.x;
      remote.targetY = data.y;
      remote.facing = data.facing || remote.facing;
      remote.nickname = data.nickname || remote.nickname;
      remote.avatarId = data.avatarId || remote.avatarId;
      remote.isMoving = data.isMoving ?? true;
    }
  }

  removeRemotePlayer(id) {
    const remote = this.remotePlayers.get(id);
    if (remote && remote.speechTimer) clearTimeout(remote.speechTimer);
    this.remotePlayers.delete(id);
  }

  _initDemoBots() {
    if (!this.isDemoMode) return;

    this.demoBots = [
      {
        id: 'bot-andre',
        nickname: 'Andre',
        avatarId: 'sketch-2',
        x: 420,
        y: 280,
        targetX: 420,
        targetY: 280,
        facing: 'up',
        isMoving: false,
        stepFrame: 0,
        stepTimer: 0,
        speechBubble: null,
        speechTimer: null,
        nextActionTime: performance.now() + 2000
      },
      {
        id: 'bot-loe',
        nickname: 'Loe Po',
        avatarId: 'sketch-3',
        x: 540,
        y: 340,
        targetX: 540,
        targetY: 340,
        facing: 'left',
        isMoving: false,
        stepFrame: 0,
        stepTimer: 0,
        speechBubble: null,
        speechTimer: null,
        nextActionTime: performance.now() + 4000
      }
    ];
  }

  _bindEvents() {
    this._onKeyDown = (e) => {
      // Don't intercept movement keys if typing in chat input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      const key = e.key.toLowerCase();
      let handled = false;

      if (['arrowup', 'w'].includes(key)) {
        this.keys.up = true;
        handled = true;
      }
      if (['arrowdown', 's'].includes(key)) {
        this.keys.down = true;
        handled = true;
      }
      if (['arrowleft', 'a'].includes(key)) {
        this.keys.left = true;
        handled = true;
      }
      if (['arrowright', 'd'].includes(key)) {
        this.keys.right = true;
        handled = true;
      }
      if (key === ' ' || key === 'spacebar') {
        // Space to wave!
        this.showSpeech(this.localPlayer.id, '👋 Hi!');
        if (this.onWave) {
          this.onWave({ id: this.localPlayer.id, text: '👋 Hi!' });
        }
        handled = true;
      }

      if (handled && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    this._onKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'w'].includes(key)) this.keys.up = false;
      if (['arrowdown', 's'].includes(key)) this.keys.down = false;
      if (['arrowleft', 'a'].includes(key)) this.keys.left = false;
      if (['arrowright', 'd'].includes(key)) this.keys.right = false;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Click / Tap to Move (Great for Mobile & Mouse)
    this._onPointerDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      if (clickX >= 0 && clickX <= this.width && clickY >= 0 && clickY <= this.height) {
        this.localPlayer.clickTarget = { x: clickX, y: clickY };
      }
    };
    this.canvas.addEventListener('pointerdown', this._onPointerDown);

    // Responsive Canvas Resize
    this._onResize = () => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // High DPI sharpness
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
      }
    };

    window.addEventListener('resize', this._onResize);
    setTimeout(this._onResize, 50);
  }

  _update(dt) {
    // 1. Calculate Local Velocity
    let dx = 0;
    let dy = 0;
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    const p = this.localPlayer;
    const oldX = p.x;
    const oldY = p.y;

    if (dx !== 0 || dy !== 0) {
      p.clickTarget = null;
      p.isMoving = true;
      p.x += dx * p.speed;
      p.y += dy * p.speed;

      // Update facing direction
      if (Math.abs(dx) > Math.abs(dy)) {
        p.facing = dx > 0 ? 'right' : 'left';
      } else {
        p.facing = dy > 0 ? 'down' : 'up';
      }

      // Step animation cycle
      p.stepTimer += dt;
      if (p.stepTimer > 180) {
        p.stepFrame = (p.stepFrame + 1) % 2;
        p.stepTimer = 0;
      }
    } else if (p.clickTarget) {
      const cdx = p.clickTarget.x - p.x;
      const cdy = p.clickTarget.y - p.y;
      const dist = Math.hypot(cdx, cdy);
      if (dist > 4) {
        p.isMoving = true;
        const normX = cdx / dist;
        const normY = cdy / dist;
        p.x += normX * p.speed;
        p.y += normY * p.speed;
        if (Math.abs(normX) > Math.abs(normY)) {
          p.facing = normX > 0 ? 'right' : 'left';
        } else {
          p.facing = normY > 0 ? 'down' : 'up';
        }
        p.stepTimer += dt;
        if (p.stepTimer > 180) {
          p.stepFrame = (p.stepFrame + 1) % 2;
          p.stepTimer = 0;
        }
      } else {
        p.isMoving = false;
        p.stepFrame = 0;
        p.clickTarget = null;
      }
    } else {
      p.isMoving = false;
      p.stepFrame = 0;
    }

    // Keep within bounds
    const margin = 20;
    p.x = Math.max(margin, Math.min(this.width - margin, p.x));
    p.y = Math.max(margin + 20, Math.min(this.height - margin, p.y));

    // Broadcast position changes throttled
    if (p.isMoving || oldX !== p.x || oldY !== p.y) {
      this.broadcastThrottle += dt;
      if (this.broadcastThrottle > 70) { // ~14 updates per second
        this.broadcastThrottle = 0;
        if (this.onMove) {
          this.onMove({
            id: p.id,
            nickname: p.nickname,
            avatarId: p.avatarId,
            x: Math.round(p.x),
            y: Math.round(p.y),
            facing: p.facing,
            isMoving: p.isMoving
          });
        }
      }
    }

    // 2. Interpolate Remote Players
    for (const remote of this.remotePlayers.values()) {
      const dist = Math.hypot(remote.targetX - remote.x, remote.targetY - remote.y);
      if (dist > 1) {
        remote.x += (remote.targetX - remote.x) * 0.22;
        remote.y += (remote.targetY - remote.y) * 0.22;
        remote.isMoving = true;
        remote.stepTimer += dt;
        if (remote.stepTimer > 180) {
          remote.stepFrame = (remote.stepFrame + 1) % 2;
          remote.stepTimer = 0;
        }
      } else {
        remote.x = remote.targetX;
        remote.y = remote.targetY;
        remote.isMoving = false;
        remote.stepFrame = 0;
      }
    }

    // 3. Update Simulated Bots (if in Demo mode)
    if (this.isDemoMode) {
      const now = performance.now();
      for (const bot of this.demoBots) {
        if (now > bot.nextActionTime) {
          bot.nextActionTime = now + 3500 + Math.random() * 4500;
          const wanderX = Math.max(60, Math.min(this.width - 60, bot.x + (Math.random() - 0.5) * 120));
          const wanderY = Math.max(80, Math.min(this.height - 60, bot.y + (Math.random() - 0.5) * 100));
          bot.targetX = wanderX;
          bot.targetY = wanderY;
          bot.facing = (bot.targetX > bot.x) ? 'right' : 'left';

          if (Math.random() < 0.25 && !bot.speechBubble) {
            const botGreetings = ['👋', 'wassup!', 'nice portfolio!', 'lo-fi vibes 🎶', '✨'];
            this.showSpeech(bot.id, botGreetings[Math.floor(Math.random() * botGreetings.length)]);
          }
        }

        const dist = Math.hypot(bot.targetX - bot.x, bot.targetY - bot.y);
        if (dist > 1.5) {
          bot.x += (bot.targetX - bot.x) * 0.05;
          bot.y += (bot.targetY - bot.y) * 0.05;
          bot.isMoving = true;
          bot.stepTimer += dt;
          if (bot.stepTimer > 200) {
            bot.stepFrame = (bot.stepFrame + 1) % 2;
            bot.stepTimer = 0;
          }
        } else {
          bot.isMoving = false;
        }
      }
    }
  }

  _render() {
    const ctx = this.ctx;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Theme Colors
    const bgColor = isDark ? '#141418' : '#FFFFFF';
    const gridLineColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subTextColor = isDark ? '#AAAAAA' : '#666666';
    const propBorder = isDark ? '#FFFFFF' : '#000000';
    const propFill = isDark ? '#1C1C22' : '#F6F6F6';

    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Grid Paper Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1;

    for (let x = 0; x < this.width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(this.width, y + 0.5);
      ctx.stroke();
    }

    // 2. Subtle Room Guide / Control Overlay in Top Corner
    ctx.font = '11px "Space Mono", monospace';
    ctx.fillStyle = subTextColor;
    ctx.textAlign = 'right';
    ctx.fillText('wasd / arrows to move · [space] to wave', this.width - 16, 22);

    // 3. Furniture / Props
    this._renderFurniture(ctx, propBorder, propFill, isDark);

    // 4. Collect & Y-Sort Entities (for 2.5D depth ordering)
    const entities = [this.localPlayer, ...this.remotePlayers.values()];
    if (this.isDemoMode) {
      entities.push(...this.demoBots);
    }
    entities.sort((a, b) => a.y - b.y);

    // 5. Render Characters
    for (const char of entities) {
      this._renderCharacter(ctx, char, char === this.localPlayer, textColor, isDark);
    }
  }

  _renderFurniture(ctx, strokeColor, fillColor, isDark) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;

    for (const f of this.furniture) {
      // Drop Shadow
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(f.x + 3, f.y + 3, f.w, f.h);

      // Main Prop Body
      ctx.fillStyle = fillColor;
      ctx.fillRect(f.x, f.y, f.w, f.h);
      ctx.strokeRect(f.x, f.y, f.w, f.h);

      // Prop Specific Details
      ctx.fillStyle = strokeColor;
      if (f.type === 'workstation') {
        // Multi-monitors
        ctx.strokeRect(f.x + 8, f.y + 6, 24, 18);
        ctx.strokeRect(f.x + 34, f.y + 4, 26, 20);
        ctx.strokeRect(f.x + 62, f.y + 6, 20, 18);
        // Keyboard line
        ctx.fillRect(f.x + 30, f.y + 34, 30, 8);
      } else if (f.type === 'desk') {
        // Laptop
        ctx.strokeRect(f.x + 22, f.y + 10, 32, 22);
        ctx.beginPath();
        ctx.moveTo(f.x + 16, f.y + 34);
        ctx.lineTo(f.x + 60, f.y + 34);
        ctx.stroke();
        // Little "JUSWA" badge
        ctx.font = '8px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VIP', f.x + 38, f.y + 24);
      } else if (f.type === 'server') {
        // Server Rack Slots
        for (let s = 8; s < f.h - 8; s += 10) {
          ctx.strokeRect(f.x + 6, f.y + s, f.w - 12, 6);
          // Blinking LED
          ctx.fillRect(f.x + f.w - 12, f.y + s + 2, 2, 2);
        }
      } else if (f.type === 'coffee') {
        // Coffee Machine
        ctx.strokeRect(f.x + 8, f.y + 8, f.w - 16, 24);
        ctx.fillRect(f.x + 14, f.y + 16, 10, 8);
      }
    }
  }

  _renderCharacter(ctx, char, isLocal, textColor, isDark) {
    const x = Math.round(char.x);
    const y = Math.round(char.y);
    const charColor = isDark ? '#FFFFFF' : '#111111';
    const charBg = isDark ? '#222226' : '#FFFFFF';

    ctx.save();

    // 1. Shadow underneath
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Character Body & Head (Pixel / Line-Art Aesthetic)
    const bob = (char.isMoving && char.stepFrame === 1) ? -1.5 : 0;
    const legOffset = (char.isMoving && char.stepFrame === 1) ? 2 : 0;

    // Body
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = charColor;
    ctx.fillStyle = charBg;

    // Legs
    ctx.fillStyle = charColor;
    ctx.fillRect(x - 6 + legOffset, y - 6, 4, 6);
    ctx.fillRect(x + 2 - legOffset, y - 6, 4, 6);

    // Torso (Shirt)
    ctx.fillStyle = charBg;
    ctx.fillRect(x - 9, y - 18 + bob, 18, 13);
    ctx.strokeRect(x - 9, y - 18 + bob, 18, 13);

    // Head
    ctx.fillStyle = charBg;
    ctx.fillRect(x - 8, y - 32 + bob, 16, 14);
    ctx.strokeRect(x - 8, y - 32 + bob, 16, 14);

    // Hair / Cap
    ctx.fillStyle = charColor;
    ctx.fillRect(x - 8, y - 32 + bob, 16, 4);
    if (char.facing === 'left') {
      ctx.fillRect(x - 11, y - 30 + bob, 5, 3); // Cap brim left
    } else if (char.facing === 'right') {
      ctx.fillRect(x + 6, y - 30 + bob, 5, 3); // Cap brim right
    }

    // Eyes
    if (char.facing !== 'up') {
      ctx.fillStyle = charColor;
      if (char.facing === 'down') {
        ctx.fillRect(x - 4, y - 24 + bob, 2.5, 2.5);
        ctx.fillRect(x + 2, y - 24 + bob, 2.5, 2.5);
      } else if (char.facing === 'left') {
        ctx.fillRect(x - 6, y - 24 + bob, 2.5, 2.5);
      } else if (char.facing === 'right') {
        ctx.fillRect(x + 3.5, y - 24 + bob, 2.5, 2.5);
      }
    }

    // 3. Name Tag
    ctx.font = '10px "Space Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = isLocal ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? '#CCCCCC' : '#444444');
    const nameLabel = isLocal ? `${char.nickname} (You)` : char.nickname;
    ctx.fillText(nameLabel, x, y - 36 + bob);

    // 4. Speech Bubble (if chatting or waving)
    if (char.speechBubble) {
      this._renderSpeechBubble(ctx, x, y - 48 + bob, char.speechBubble, isDark);
    }

    ctx.restore();
  }

  _renderSpeechBubble(ctx, x, y, text, isDark) {
    ctx.font = '11px "Patrick Hand", "Space Mono", sans-serif';
    const metrics = ctx.measureText(text);
    const bubbleW = Math.max(34, metrics.width + 16);
    const bubbleH = 22;
    const bubbleX = x - bubbleW / 2;
    const bubbleY = y - bubbleH;

    // Bubble Background
    ctx.fillStyle = isDark ? '#000000' : '#FFFFFF';
    ctx.strokeStyle = isDark ? '#FFFFFF' : '#000000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 6);
    ctx.fill();
    ctx.stroke();

    // Triangle Tail
    ctx.beginPath();
    ctx.moveTo(x - 4, bubbleY + bubbleH);
    ctx.lineTo(x, bubbleY + bubbleH + 5);
    ctx.lineTo(x + 4, bubbleY + bubbleH);
    ctx.fill();
    ctx.stroke();

    // Text inside bubble
    ctx.fillStyle = isDark ? '#FFFFFF' : '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, bubbleY + 15);
  }

  _startLoop() {
    const loop = (now) => {
      const dt = Math.min(100, now - this.lastTime);
      this.lastTime = now;

      this._update(dt);
      this._render();

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('resize', this._onResize);
    if (this.canvas && this._onPointerDown) {
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    }
  }
}
