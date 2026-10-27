/**
 * Juswa Portfolio — 2D Multiplayer Virtual Grid Lounge
 * Renders an interactive 2D grid space with pixel/sketch avatars,
 * furniture props, WASD/Arrow navigation, collision boundaries,
 * speech bubbles over avatars, and realtime multiplayer position synchronization.
 */

export const WORLD_WIDTH = 640;
export const WORLD_HEIGHT = 420;

export class SketchLounge {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.onWave = options.onWave || null;
    this.onMove = options.onMove || null;

    // Grid & World Configuration (Fixed virtual coordinate space)
    this.gridSize = 32;
    this.worldWidth = WORLD_WIDTH;
    this.worldHeight = WORLD_HEIGHT;
    this.width = canvasEl.width || WORLD_WIDTH;
    this.height = canvasEl.height || WORLD_HEIGHT;
    this.renderTransform = { scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };

    // Local Player State (World Coordinates)
    this.localPlayer = {
      id: options.playerId || 'player-' + Math.random().toString(36).substring(2, 8),
      nickname: options.nickname || 'Visitor',
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

    // Simulated Bots for Demo Mode (Only used when disconnected / demo mode)
    this.demoBots = [];
    this.isDemoMode = options.isDemoMode ?? false;

    // Input States
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    // Furniture / Props on Grid
    this.furniture = [
      { type: 'workstation', x: 70, y: 190, w: 90, h: 56, label: 'Workstation' },
      { type: 'desk', x: 380, y: 140, w: 76, h: 58, label: 'Juswa Desk' },
      { type: 'server', x: 490, y: 250, w: 46, h: 52, label: 'IoT Server' },
      { type: 'coffee', x: 200, y: 76, w: 40, h: 44, label: 'Coffee Cart' }
    ];

    // Animation & Loop
    this.animationFrameId = null;
    this.lastTime = performance.now();
    this.broadcastThrottle = 0;
    this.isPaused = false;

    this._bindEvents();
    if (this.isDemoMode) {
      this._initDemoBots();
    }
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

  /**
   * Sync a remote player who was present on join or in presence state.
   */
  syncRemotePlayer(id, data) {
    if (id === this.localPlayer.id) return;

    let remote = this.remotePlayers.get(id);
    if (!remote) {
      const rx = (typeof data.x === 'number' && !isNaN(data.x)) ? data.x : (200 + Math.floor(Math.random() * 240));
      const ry = (typeof data.y === 'number' && !isNaN(data.y)) ? data.y : (160 + Math.floor(Math.random() * 120));
      remote = {
        id,
        nickname: data.nickname || 'Visitor',
        avatarId: data.avatarId || 'sketch-1',
        x: rx,
        y: ry,
        targetX: rx,
        targetY: ry,
        facing: data.facing || 'down',
        isMoving: false,
        stepFrame: 0,
        stepTimer: 0,
        speechBubble: null,
        speechTimer: null
      };
      this.remotePlayers.set(id, remote);
    } else {
      if (data.nickname) remote.nickname = data.nickname;
      if (data.avatarId) remote.avatarId = data.avatarId;
      if (data.facing) remote.facing = data.facing;
      if (typeof data.x === 'number' && !isNaN(data.x)) {
        remote.targetX = data.x;
      }
      if (typeof data.y === 'number' && !isNaN(data.y)) {
        remote.targetY = data.y;
      }
    }
  }

  /**
   * Fast position update from high-frequency broadcast channel.
   */
  setRemotePlayerPosition(id, data) {
    if (id === this.localPlayer.id) return;

    let remote = this.remotePlayers.get(id);
    if (!remote) {
      this.syncRemotePlayer(id, data);
      remote = this.remotePlayers.get(id);
    }

    if (remote && typeof data.x === 'number' && typeof data.y === 'number') {
      remote.targetX = data.x;
      remote.targetY = data.y;
      if (data.facing) remote.facing = data.facing;
      if (data.nickname) remote.nickname = data.nickname;
      if (data.avatarId) remote.avatarId = data.avatarId;
      remote.isMoving = data.isMoving ?? true;
    }
  }

  removeRemotePlayer(id) {
    const remote = this.remotePlayers.get(id);
    if (remote) {
      if (remote.speechTimer) clearTimeout(remote.speechTimer);
      this.remotePlayers.delete(id);
    }
  }

  _initDemoBots() {
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
        nextActionTime: performance.now() + 2500
      },
      {
        id: 'bot-loe',
        nickname: 'Loe Po',
        avatarId: 'sketch-3',
        x: 520,
        y: 330,
        targetX: 520,
        targetY: 330,
        facing: 'left',
        isMoving: false,
        stepFrame: 0,
        stepTimer: 0,
        speechBubble: null,
        speechTimer: null,
        nextActionTime: performance.now() + 4500
      }
    ];
  }

  _bindEvents() {
    this._onKeyDown = (e) => {
      // Don't intercept movement keys if typing in chat input or other fields
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

    // Responsive Touch & Mouse: Click/Tap to Move across any device screen
    this._onPointerDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const { scale, offsetX, offsetY } = this.renderTransform;
      if (!scale || scale <= 0) return;

      // Inverse transform from screen pixels to world coordinates
      const worldX = (screenX - offsetX) / scale;
      const worldY = (screenY - offsetY) / scale;

      if (worldX >= 20 && worldX <= this.worldWidth - 20 && worldY >= 30 && worldY <= this.worldHeight - 20) {
        this.localPlayer.clickTarget = { x: Math.round(worldX), y: Math.round(worldY) };
      }
    };
    this.canvas.addEventListener('pointerdown', this._onPointerDown);

    // Responsive Canvas Resize (Letterboxed & HiDPI sharp)
    this._onResize = () => {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.round(rect.width * dpr);
        this.canvas.height = Math.round(rect.height * dpr);
        this.width = rect.width;
        this.height = rect.height;

        const scale = Math.min(this.width / this.worldWidth, this.height / this.worldHeight);
        const offsetX = Math.round((this.width - this.worldWidth * scale) / 2);
        const offsetY = Math.round((this.height - this.worldHeight * scale) / 2);
        this.renderTransform = { scale, offsetX, offsetY, dpr };
      }
    };

    window.addEventListener('resize', this._onResize);
    setTimeout(this._onResize, 60);
  }

  resize() {
    if (this._onResize) {
      this._onResize();
    }
  }

  _isCollidingFurniture(nx, ny) {
    for (const f of this.furniture) {
      // Collision bounding box is the bottom solid footprint of prop
      const colX = f.x - 10;
      const colY = f.y + f.h * 0.35;
      const colW = f.w + 20;
      const colH = f.h * 0.65;
      if (nx >= colX && nx <= colX + colW && ny >= colY && ny <= colY + colH) {
        return true;
      }
    }
    return false;
  }

  _update(dt) {
    // 1. Calculate Local Velocity
    let dx = 0;
    let dy = 0;
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;

    // Normalize diagonal velocity
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
      
      const moveDist = p.speed;
      const nextX = p.x + dx * moveDist;
      const nextY = p.y + dy * moveDist;

      // Smooth collision sliding with furniture
      if (!this._isCollidingFurniture(nextX, p.y)) {
        p.x = nextX;
      }
      if (!this._isCollidingFurniture(p.x, nextY)) {
        p.y = nextY;
      }

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
        const nextX = p.x + normX * p.speed;
        const nextY = p.y + normY * p.speed;

        if (!this._isCollidingFurniture(nextX, nextY)) {
          p.x = nextX;
          p.y = nextY;
        } else if (!this._isCollidingFurniture(nextX, p.y)) {
          p.x = nextX;
        } else if (!this._isCollidingFurniture(p.x, nextY)) {
          p.y = nextY;
        } else {
          p.clickTarget = null; // Struck obstacle
        }

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

    // Keep strictly within virtual room boundaries
    const margin = 24;
    p.x = Math.max(margin, Math.min(this.worldWidth - margin, p.x));
    p.y = Math.max(margin + 20, Math.min(this.worldHeight - margin, p.y));

    // Broadcast position changes throttled (~14 updates per sec)
    if (p.isMoving || oldX !== p.x || oldY !== p.y) {
      this.broadcastThrottle += dt;
      if (this.broadcastThrottle > 70) {
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
      if (dist > 1.2) {
        remote.x += (remote.targetX - remote.x) * 0.24;
        remote.y += (remote.targetY - remote.y) * 0.24;
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

    // 3. Update Simulated Bots (if enabled in Demo mode)
    if (this.isDemoMode) {
      const now = performance.now();
      for (const bot of this.demoBots) {
        if (now > bot.nextActionTime) {
          bot.nextActionTime = now + 4000 + Math.random() * 4500;
          const wanderX = Math.max(60, Math.min(this.worldWidth - 60, bot.x + (Math.random() - 0.5) * 120));
          const wanderY = Math.max(80, Math.min(this.worldHeight - 60, bot.y + (Math.random() - 0.5) * 100));
          if (!this._isCollidingFurniture(wanderX, wanderY)) {
            bot.targetX = wanderX;
            bot.targetY = wanderY;
            bot.facing = (bot.targetX > bot.x) ? 'right' : 'left';
          }

          if (Math.random() < 0.2 && !bot.speechBubble) {
            const botGreetings = ['👋', 'lo-fi vibes 🎶', '✨', 'nice portfolio!', 'hello!'];
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
    const { scale, offsetX, offsetY, dpr } = this.renderTransform;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Theme Colors
    const outerBgColor = isDark ? '#111115' : '#ECE8E1';
    const roomBgColor = isDark ? '#16161C' : '#FFFFFF';
    const roomBorderColor = isDark ? 'rgba(255, 255, 255, 0.18)' : '#000000';
    const gridLineColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subTextColor = isDark ? '#9999AA' : '#666666';
    const propBorder = isDark ? '#FFFFFF' : '#000000';
    const propFill = isDark ? '#212128' : '#F6F6F6';

    // Reset transform and clear physical canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Letterbox Outer Fill
    ctx.fillStyle = outerBgColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply High DPI and Virtual World Scale & Centering
    ctx.scale(dpr, dpr);
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // 1. Room Floor Clip & Background
    ctx.beginPath();
    ctx.rect(0, 0, this.worldWidth, this.worldHeight);
    ctx.fillStyle = roomBgColor;
    ctx.fill();

    // 2. Grid Lines
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.worldWidth; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, this.worldHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= this.worldHeight; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(this.worldWidth, y + 0.5);
      ctx.stroke();
    }

    // 3. Room Outer Border
    ctx.strokeStyle = roomBorderColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(1, 1, this.worldWidth - 2, this.worldHeight - 2);

    // 4. Subtle Top Guide
    ctx.font = '11px "Space Mono", monospace';
    ctx.fillStyle = subTextColor;
    ctx.textAlign = 'right';
    ctx.fillText('wasd / arrows / tap to move · [space] to wave', this.worldWidth - 14, 20);

    // 5. Furniture Props
    this._renderFurniture(ctx, propBorder, propFill, isDark);

    // 6. Collect & Y-Sort Entities (for 2.5D depth ordering)
    const entities = [this.localPlayer, ...this.remotePlayers.values()];
    if (this.isDemoMode) {
      entities.push(...this.demoBots);
    }
    entities.sort((a, b) => a.y - b.y);

    // 7. Render Characters
    for (const char of entities) {
      this._renderCharacter(ctx, char, char === this.localPlayer, textColor, isDark);
    }

    ctx.restore();
  }

  _renderFurniture(ctx, strokeColor, fillColor, isDark) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;

    for (const f of this.furniture) {
      // Drop Shadow
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.12)';
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
        // Little "VIP" badge
        ctx.font = '8px "Space Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('JUSWA', f.x + 38, f.y + 24);
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
        ctx.fillRect(f.x + 14, f.y + 16, 12, 8);
      }
    }
  }

  _renderCharacter(ctx, char, isLocal, textColor, isDark) {
    const x = Math.round(char.x);
    const y = Math.round(char.y);
    const stroke = isDark ? '#FFFFFF' : '#111111';
    const bodyFill = isDark ? '#26262E' : '#FFFFFF';
    const avatarType = char.avatarId || 'sketch-1';

    ctx.save();

    // 1. Shadow underneath
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.20)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bobbing walk cycle animation
    const bob = (char.isMoving && char.stepFrame === 1) ? -2 : 0;
    const legOffset = (char.isMoving && char.stepFrame === 1) ? 2 : 0;

    ctx.lineWidth = 1.6;
    ctx.strokeStyle = stroke;

    // 2. Legs
    ctx.fillStyle = stroke;
    ctx.fillRect(x - 6 + legOffset, y - 5, 4, 6);
    ctx.fillRect(x + 2 - legOffset, y - 5, 4, 6);

    // 3. Torso (Shirt)
    ctx.fillStyle = bodyFill;
    ctx.fillRect(x - 9, y - 18 + bob, 18, 14);
    ctx.strokeRect(x - 9, y - 18 + bob, 18, 14);

    // Torso Detail per Avatar
    if (avatarType === 'sketch-2') {
      // Horizontal stripes for Glasses
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 14 + bob);
      ctx.lineTo(x + 8, y - 14 + bob);
      ctx.moveTo(x - 8, y - 10 + bob);
      ctx.lineTo(x + 8, y - 10 + bob);
      ctx.stroke();
    } else if (avatarType === 'sketch-3') {
      // Hoodie pocket for Beanie
      ctx.strokeRect(x - 5, y - 10 + bob, 10, 5);
    } else if (avatarType === 'sketch-4') {
      // Cute collar for Cat Ear
      ctx.strokeRect(x - 3, y - 17 + bob, 6, 3);
    }

    // 4. Head
    ctx.fillStyle = bodyFill;
    ctx.fillRect(x - 8, y - 32 + bob, 16, 14);
    ctx.strokeRect(x - 8, y - 32 + bob, 16, 14);

    // 5. Headwear & Features based on avatarId
    if (avatarType === 'sketch-1') {
      // Cap Guy: Cap dome + directional brim
      ctx.fillStyle = stroke;
      ctx.fillRect(x - 8, y - 33 + bob, 16, 4);
      if (char.facing === 'left') {
        ctx.fillRect(x - 12, y - 31 + bob, 6, 3);
      } else if (char.facing === 'right') {
        ctx.fillRect(x + 6, y - 31 + bob, 6, 3);
      } else {
        ctx.fillRect(x - 9, y - 30 + bob, 18, 2.5);
      }
    } else if (avatarType === 'sketch-2') {
      // Glasses: Tousled hair + circular wireframe glasses
      ctx.fillStyle = stroke;
      ctx.fillRect(x - 9, y - 35 + bob, 5, 4);
      ctx.fillRect(x - 3, y - 36 + bob, 6, 5);
      ctx.fillRect(x + 4, y - 34 + bob, 5, 4);

      if (char.facing !== 'up') {
        if (char.facing === 'down') {
          ctx.strokeRect(x - 7, y - 26 + bob, 5, 5);
          ctx.strokeRect(x + 2, y - 26 + bob, 5, 5);
          ctx.beginPath();
          ctx.moveTo(x - 2, y - 24 + bob);
          ctx.lineTo(x + 2, y - 24 + bob);
          ctx.stroke();
        } else if (char.facing === 'left') {
          ctx.strokeRect(x - 8, y - 26 + bob, 5, 5);
        } else if (char.facing === 'right') {
          ctx.strokeRect(x + 3, y - 26 + bob, 5, 5);
        }
      }
    } else if (avatarType === 'sketch-3') {
      // Beanie: Ribbed beanie + top pom-pom
      ctx.fillStyle = stroke;
      ctx.fillRect(x - 9, y - 36 + bob, 18, 7);
      ctx.strokeRect(x - 10, y - 30 + bob, 20, 3.5);
      // Pom-pom on top
      ctx.beginPath();
      ctx.arc(x, y - 38 + bob, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (avatarType === 'sketch-4') {
      // Cat Ear: Triangular cat ears
      ctx.fillStyle = stroke;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 32 + bob);
      ctx.lineTo(x - 6, y - 38 + bob);
      ctx.lineTo(x - 2, y - 32 + bob);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x + 2, y - 32 + bob);
      ctx.lineTo(x + 6, y - 38 + bob);
      ctx.lineTo(x + 8, y - 32 + bob);
      ctx.fill();

      ctx.fillRect(x - 8, y - 32 + bob, 16, 3);
    }

    // 6. Eyes
    if (char.facing !== 'up') {
      ctx.fillStyle = stroke;
      if (char.facing === 'down') {
        ctx.fillRect(x - 4, y - 24 + bob, 2.5, 2.5);
        ctx.fillRect(x + 2, y - 24 + bob, 2.5, 2.5);
      } else if (char.facing === 'left') {
        ctx.fillRect(x - 6, y - 24 + bob, 2.5, 2.5);
      } else if (char.facing === 'right') {
        ctx.fillRect(x + 3.5, y - 24 + bob, 2.5, 2.5);
      }
    }

    // 7. Name Tag Badge
    ctx.font = '10px "Space Mono", monospace';
    ctx.textAlign = 'center';
    const nameLabel = isLocal ? `${char.nickname} (You)` : char.nickname;
    const tagWidth = ctx.measureText(nameLabel).width + 8;
    const tagHeight = 15;
    const tagX = x - tagWidth / 2;
    const tagY = y - 46 + bob;

    // Subtle tag pill behind text
    ctx.fillStyle = isLocal 
      ? (isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.08)')
      : (isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.85)');
    ctx.strokeStyle = isLocal
      ? (isDark ? '#FFFFFF' : '#000000')
      : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)');
    ctx.lineWidth = 1;
    
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagWidth, tagHeight, 4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(tagX, tagY, tagWidth, tagHeight);
      ctx.strokeRect(tagX, tagY, tagWidth, tagHeight);
    }

    ctx.fillStyle = isLocal
      ? (isDark ? '#FFFFFF' : '#000000')
      : (isDark ? '#E0E0E0' : '#222222');
    ctx.fillText(nameLabel, x, tagY + 11);

    // 8. Speech Bubble (if waving or chatting)
    if (char.speechBubble) {
      this._renderSpeechBubble(ctx, x, y - 56 + bob, char.speechBubble, isDark);
    }

    ctx.restore();
  }

  _renderSpeechBubble(ctx, x, y, text, isDark) {
    ctx.font = '11px "Space Mono", monospace';
    const metrics = ctx.measureText(text);
    const bubbleW = Math.max(36, metrics.width + 16);
    const bubbleH = 22;
    const bubbleX = x - bubbleW / 2;
    const bubbleY = y - bubbleH;

    ctx.fillStyle = isDark ? '#1C1C24' : '#FFFFFF';
    ctx.strokeStyle = isDark ? '#FFFFFF' : '#000000';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 6);
    } else {
      ctx.rect(bubbleX, bubbleY, bubbleW, bubbleH);
    }
    ctx.fill();
    ctx.stroke();

    // Triangle Tail
    ctx.beginPath();
    ctx.moveTo(x - 4, bubbleY + bubbleH);
    ctx.lineTo(x, bubbleY + bubbleH + 5);
    ctx.lineTo(x + 4, bubbleY + bubbleH);
    ctx.fill();
    ctx.stroke();

    // Bubble Text
    ctx.fillStyle = isDark ? '#FFFFFF' : '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, bubbleY + 15);
  }

  _startLoop() {
    const loop = (now) => {
      const dt = Math.min(100, now - this.lastTime);
      this.lastTime = now;

      if (!this.isPaused) {
        this._update(dt);
        this._render();
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
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
