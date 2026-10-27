/**
 * Juswa Portfolio — Community Presence, Live Chat & 2D Lounge Controller
 * Coordinates Supabase Realtime presence, live chat message feed,
 * client-side geolocation/device tagging, and the 2D walkable grid lounge.
 */

import { getSupabase, isSupabaseConfigured, SUPABASE_CONFIG } from './supabase.js';
import { SketchLounge } from './lounge.js';

// Random Sketch Nicknames Pool
const RANDOM_NICKNAMES = [
  'Rwow', 'Ceetlog', 'Loe Po', 'KapeFan', 'DoodleCat', 
  'SketchGuy', 'PixelBoi', 'Chillin', 'PasigDev', 'NightOwl'
];

// Clean Inline SVG Doodle Avatars
export const AVATAR_PRESETS = [
  {
    id: 'sketch-1',
    label: 'Cap Guy',
    svg: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="18" r="15" fill="var(--bg-primary)"/>
      <path d="M10 13c2-4 14-4 16 0"/>
      <path d="M8 14h20"/>
      <circle cx="14" cy="20" r="1.5" fill="currentColor"/>
      <circle cx="22" cy="20" r="1.5" fill="currentColor"/>
      <path d="M15 25c1.5 1.5 4.5 1.5 6 0"/>
    </svg>`
  },
  {
    id: 'sketch-2',
    label: 'Glasses',
    svg: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="18" r="15" fill="var(--bg-primary)"/>
      <circle cx="13" cy="18" r="4"/>
      <circle cx="23" cy="18" r="4"/>
      <line x1="17" y1="18" x2="19" y2="18"/>
      <path d="M10 12c3-3 13-3 16 0"/>
      <path d="M15 26c2 1 4 1 6 0"/>
    </svg>`
  },
  {
    id: 'sketch-3',
    label: 'Beanie',
    svg: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="18" r="15" fill="var(--bg-primary)"/>
      <path d="M9 16c0-6 18-6 18 0H9z"/>
      <circle cx="18" cy="8" r="2.5" fill="currentColor"/>
      <circle cx="13" cy="21" r="1.5" fill="currentColor"/>
      <circle cx="23" cy="21" r="1.5" fill="currentColor"/>
      <path d="M15 26c1.5 1 4.5 1 6 0"/>
    </svg>`
  },
  {
    id: 'sketch-4',
    label: 'Cat Ear',
    svg: `<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="18" cy="18" r="15" fill="var(--bg-primary)"/>
      <path d="M10 13l3-5 4 4"/>
      <path d="M26 13l-3-5-4 4"/>
      <circle cx="13" cy="19" r="1.5" fill="currentColor"/>
      <circle cx="23" cy="19" r="1.5" fill="currentColor"/>
      <path d="M15 24c1.5 1 4.5 1 6 0"/>
      <line x1="8" y1="21" x2="11" y2="21"/>
      <line x1="25" y1="21" x2="28" y2="21"/>
    </svg>`
  }
];

class CommunityManager {
  constructor() {
    this.playerId = 'guest-' + Math.random().toString(36).substring(2, 9);
    this.nickname = localStorage.getItem('juswa_nickname') || this._generateRandomNickname();
    this.avatarId = localStorage.getItem('juswa_avatar') || 'sketch-1';
    this.locationTag = sessionStorage.getItem('juswa_location') || 'Earth 🌍';
    this.deviceIcon = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? '📱' : '💻';

    this.supabase = null;
    this.presenceChannel = null;
    this.broadcastChannel = null;
    this.messages = [];
    this.presenceCount = 1;
    this.presenceAvatars = [];

    this.lounge = null;
    this.activeTab = 'chat'; // 'chat' or 'lounge'
    this.lastMessageSentTime = 0;

    this.isConfigured = isSupabaseConfigured();
  }

  init() {
    this._fetchLocation();
    this._initUI();
    this._setupBackend();
    this._loadInitialMessages();
  }

  _generateRandomNickname() {
    const name = RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];
    localStorage.setItem('juswa_nickname', name);
    return name;
  }

  async _fetchLocation() {
    if (sessionStorage.getItem('juswa_location')) return;
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.city && data.country_code) {
          this.locationTag = `${data.city}, ${data.country_code}`;
          sessionStorage.setItem('juswa_location', this.locationTag);
          this._updateUserBadge();
        }
      }
    } catch {
      this.locationTag = 'Earth 🌍';
    }
  }

  _initUI() {
    // 1. Presence Pill
    this.pill = document.getElementById('community-presence-pill');
    this.countEl = document.getElementById('presence-count-number');
    this.avatarStackEl = document.getElementById('presence-avatar-stack');
    this.openChatBtn = document.getElementById('presence-chat-trigger');
    this.openLoungeBtn = document.getElementById('presence-lounge-trigger');

    // 2. Community Modal
    this.modal = document.getElementById('community-modal');
    this.modalCloseBtn = document.getElementById('community-modal-close');
    this.tabChatBtn = document.getElementById('tab-btn-chat');
    this.tabLoungeBtn = document.getElementById('tab-btn-lounge');
    this.viewChat = document.getElementById('community-view-chat');
    this.viewLounge = document.getElementById('community-view-lounge');

    // 3. Chat Controls
    this.messagesContainer = document.getElementById('community-messages-list');
    this.messageCountBadge = document.getElementById('community-message-count');
    this.chatInput = document.getElementById('community-chat-input');
    this.chatForm = document.getElementById('community-chat-form');
    this.nicknameBtn = document.getElementById('community-nickname-btn');
    this.userBadgeEl = document.getElementById('community-user-badge');
    this.avatarPickerBtn = document.getElementById('community-avatar-picker-btn');

    // 4. Lounge Canvas
    this.loungeCanvas = document.getElementById('sketch-lounge-canvas');

    // Bind Event Listeners
    if (this.pill) {
      this.pill.onclick = (e) => {
        if (e.target.closest('#presence-lounge-trigger')) {
          this.openModal('lounge');
        } else {
          this.openModal('chat');
        }
      };
    }

    if (this.openChatBtn) {
      this.openChatBtn.onclick = (e) => {
        e.stopPropagation();
        this.openModal('chat');
      };
    }

    if (this.openLoungeBtn) {
      this.openLoungeBtn.onclick = (e) => {
        e.stopPropagation();
        this.openModal('lounge');
      };
    }

    if (this.modalCloseBtn) {
      this.modalCloseBtn.onclick = (e) => {
        e.stopPropagation();
        this.closeModal();
      };
    }

    // Click outside modal card to close
    if (this.modal) {
      this.modal.onclick = (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      };
    }

    if (this.tabChatBtn) {
      this.tabChatBtn.onclick = () => this.switchTab('chat');
    }

    if (this.tabLoungeBtn) {
      this.tabLoungeBtn.onclick = () => this.switchTab('lounge');
    }

    if (this.chatForm) {
      this.chatForm.onsubmit = (e) => {
        e.preventDefault();
        this.sendMessage();
      };
    }

    if (this.nicknameBtn) {
      this.nicknameBtn.onclick = () => this.promptChangeNickname();
    }

    if (this.avatarPickerBtn) {
      this.avatarPickerBtn.onclick = () => this.cycleAvatar();
    }

    // Close modal on escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('is-open')) {
        this.closeModal();
      }
    });

    this._updateUserBadge();
    this._renderPresence();
  }

  _updateUserBadge() {
    if (this.nicknameBtn) {
      this.nicknameBtn.textContent = this.nickname;
    }
    if (this.avatarPickerBtn) {
      const av = AVATAR_PRESETS.find(a => a.id === this.avatarId) || AVATAR_PRESETS[0];
      this.avatarPickerBtn.innerHTML = av.svg;
    }
    if (this.userBadgeEl) {
      this.userBadgeEl.textContent = `${this.locationTag} ${this.deviceIcon}`;
    }
  }

  promptChangeNickname() {
    const current = this.nickname;
    const newName = window.prompt("What should we call you in the sketchbook room?", current);
    if (newName && newName.trim().length > 0) {
      const cleanName = newName.trim().substring(0, 20);
      this.nickname = cleanName;
      localStorage.setItem('juswa_nickname', cleanName);
      this._updateUserBadge();

      if (this.lounge) {
        this.lounge.updateProfile(this.nickname, this.avatarId);
      }
      if (this.presenceChannel) {
        this.presenceChannel.track(this._getPresenceState());
      }
      if (window.JuswaSound) window.JuswaSound.playClick();
    }
  }

  cycleAvatar() {
    const currentIndex = AVATAR_PRESETS.findIndex(a => a.id === this.avatarId);
    const nextIndex = (currentIndex + 1) % AVATAR_PRESETS.length;
    this.avatarId = AVATAR_PRESETS[nextIndex].id;
    localStorage.setItem('juswa_avatar', this.avatarId);
    this._updateUserBadge();

    if (this.lounge) {
      this.lounge.updateProfile(this.nickname, this.avatarId);
    }
    if (this.presenceChannel) {
      this.presenceChannel.track(this._getPresenceState());
    }
    if (window.JuswaSound) window.JuswaSound.playClick();
  }

  openModal(tab = 'chat') {
    if (!this.modal) return;
    this.modal.style.display = 'flex';
    this.modal.classList.add('is-open');
    this.modal.setAttribute('aria-hidden', 'false');
    this.switchTab(tab);
    if (window.JuswaSound) window.JuswaSound.playClick();
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.style.display = 'none';
    this.modal.classList.remove('is-open');
    this.modal.setAttribute('aria-hidden', 'true');
    if (window.JuswaSound) window.JuswaSound.playClick();
  }

  switchTab(tab) {
    this.activeTab = tab;
    if (this.tabChatBtn) this.tabChatBtn.classList.toggle('active', tab === 'chat');
    if (this.tabLoungeBtn) this.tabLoungeBtn.classList.toggle('active', tab === 'lounge');

    if (this.viewChat) this.viewChat.style.display = tab === 'chat' ? 'flex' : 'none';
    if (this.viewLounge) this.viewLounge.style.display = tab === 'lounge' ? 'block' : 'none';

    if (tab === 'lounge') {
      if (!this.lounge && this.loungeCanvas) {
        this.lounge = new SketchLounge(this.loungeCanvas, {
          playerId: this.playerId,
          nickname: this.nickname,
          avatarId: this.avatarId,
          isDemoMode: !this.isConfigured,
          onMove: (pos) => this._onPlayerMove(pos),
          onWave: (wave) => this._onPlayerWave(wave)
        });
      }
    } else if (tab === 'chat') {
      this._scrollToBottom();
      if (this.chatInput) this.chatInput.focus();
    }
  }

  _getPresenceState() {
    return {
      id: this.playerId,
      nickname: this.nickname,
      avatarId: this.avatarId,
      location: this.locationTag,
      device: this.deviceIcon,
      onlineAt: new Date().toISOString()
    };
  }

  // --- Backend & Realtime Setup ---
  _setupBackend() {
    this.supabase = getSupabase();

    if (!this.supabase) {
      console.log('[Juswa Community] Supabase not configured, using local mode.');
      this._setupDemoPresence();
      return;
    }

    try {
      console.log('[Juswa Community] Connecting to Supabase Realtime channel: juswa-community-room...');

      // Unified Room Channel for Presence, Movement Broadcast & Live Chat
      this.roomChannel = this.supabase.channel('juswa-community-room', {
        config: {
          presence: { key: this.playerId },
          broadcast: { self: false }
        }
      });

      const syncPresence = () => {
        const state = this.roomChannel.presenceState();
        const users = [];
        for (const key in state) {
          users.push(...state[key]);
        }
        this.presenceCount = Math.max(1, users.length);
        this.presenceAvatars = users.map(u => u.avatarId || 'sketch-1');
        console.log('[Juswa Community] Realtime presence updated. Count:', this.presenceCount);
        this._renderPresence();
      };

      this.roomChannel
        .on('presence', { event: 'sync' }, syncPresence)
        .on('presence', { event: 'join' }, syncPresence)
        .on('presence', { event: 'leave' }, syncPresence)
        .on('broadcast', { event: 'player_move' }, ({ payload }) => {
          if (this.lounge && payload && payload.id !== this.playerId) {
            this.lounge.setRemotePlayerPosition(payload.id, payload);
          }
        })
        .on('broadcast', { event: 'player_wave' }, ({ payload }) => {
          if (this.lounge && payload) {
            this.lounge.showSpeech(payload.id, payload.text || '👋');
          }
        })
        .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          if (payload && payload.nickname !== this.nickname) {
            const isDuplicate = this.messages.some(m => m.id === payload.id || (m.nickname === payload.nickname && m.message === payload.message));
            if (!isDuplicate) {
              this._appendMessage(payload);
            }
          }
        })
        .subscribe(async (status) => {
          console.log('[Juswa Community] WebSocket connection status:', status);
          if (status === 'SUBSCRIBED') {
            await this.roomChannel.track(this._getPresenceState());
            console.log('[Juswa Community] Tracked presence as:', this.nickname, this.playerId);
          }
        });

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        if (this.roomChannel) {
          this.roomChannel.untrack();
        }
      });

      // Postgres Changes for Live Chat (Database level sync)
      this.supabase
        .channel('public:community_messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'community_messages' },
          (payload) => {
            const incoming = payload.new;
            if (incoming) {
              const isDuplicate = this.messages.some(m => m.id === incoming.id || (m.nickname === incoming.nickname && m.message === incoming.message));
              if (!isDuplicate) {
                this._appendMessage(incoming);
              }
            }
          }
        )
        .subscribe();

    } catch (err) {
      console.warn('Supabase Realtime connection failed, falling back to local demo:', err);
      this._setupDemoPresence();
    }
  }

  _setupDemoPresence() {
    this.presenceCount = 4;
    this.presenceAvatars = ['sketch-1', 'sketch-2', 'sketch-3', 'sketch-4'];
    this._renderPresence();
  }

  _onPlayerMove(pos) {
    if (this.roomChannel) {
      this.roomChannel.send({
        type: 'broadcast',
        event: 'player_move',
        payload: pos
      });
    }
  }

  _onPlayerWave(wave) {
    if (this.roomChannel) {
      this.roomChannel.send({
        type: 'broadcast',
        event: 'player_wave',
        payload: wave
      });
    }
  }

  _renderPresence() {
    if (this.countEl) {
      this.countEl.textContent = this.presenceCount;
    }
    if (this.avatarStackEl) {
      const avatars = (this.presenceAvatars && this.presenceAvatars.length > 0) 
        ? this.presenceAvatars 
        : [this.avatarId || 'sketch-1'];
      const showCount = Math.min(3, avatars.length);
      let html = '';
      for (let i = 0; i < showCount; i++) {
        const av = AVATAR_PRESETS.find(a => a.id === avatars[i]) || AVATAR_PRESETS[i % AVATAR_PRESETS.length];
        html += `<div class="presence-mini-avatar" title="Visitor">${av.svg}</div>`;
      }
      if (this.presenceCount > 3) {
        html += `<div class="presence-mini-avatar presence-extra">+${this.presenceCount - 3}</div>`;
      }
      this.avatarStackEl.innerHTML = html;
    }
  }

  // --- Live Chat Feed ---

  async _loadInitialMessages() {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('community_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);

        if (!error && data && data.length > 0) {
          this.messages = data;
          this._renderAllMessages();
          return;
        }
      } catch (err) {
        console.warn('Could not fetch from Supabase, loading local messages:', err);
      }
    }

    // Default Friendly Initial Messages
    const saved = localStorage.getItem('juswa_demo_chat');
    if (saved) {
      try {
        this.messages = JSON.parse(saved);
      } catch {
        this.messages = this._getDefaultMessages();
      }
    } else {
      this.messages = this._getDefaultMessages();
    }
    this._renderAllMessages();
  }

  _getDefaultMessages() {
    return [
      {
        id: 'msg-1',
        nickname: 'Juswa (Joshua)',
        location: 'Pasig City, PH',
        device: '💻',
        message: 'wassup! welcome to my sketchbook room :) feel free to say hi or walk around the lounge!',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        avatar_id: 'sketch-1'
      },
      {
        id: 'msg-2',
        nickname: 'Ceetlog',
        location: 'Manila, PH',
        device: '💻',
        message: 'hi idol! love the sketchbook aesthetic',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        avatar_id: 'sketch-2'
      },
      {
        id: 'msg-3',
        nickname: 'Rwow',
        location: 'Manila, PH',
        device: '💻',
        message: 'yow hello mga idol',
        created_at: new Date(Date.now() - 120000).toISOString(),
        avatar_id: 'sketch-3'
      }
    ];
  }

  _renderAllMessages() {
    if (!this.messagesContainer) return;
    this.messagesContainer.innerHTML = '';
    for (const msg of this.messages) {
      this._appendMessageDOM(msg);
    }
    if (this.messageCountBadge) {
      this.messageCountBadge.textContent = `${this.messages.length} messages`;
    }
    this._scrollToBottom();
  }

  _appendMessage(msg) {
    this.messages.push(msg);
    this._appendMessageDOM(msg);
    if (this.messageCountBadge) {
      this.messageCountBadge.textContent = `${this.messages.length} messages`;
    }
    this._scrollToBottom();

    // If lounge exists, pop a speech bubble over player
    if (this.lounge) {
      this.lounge.showSpeech(msg.nickname === this.nickname ? this.playerId : msg.nickname, msg.message);
    }
  }

  _appendMessageDOM(msg) {
    if (!this.messagesContainer) return;

    const av = AVATAR_PRESETS.find(a => a.id === msg.avatar_id) || AVATAR_PRESETS[0];
    const timeAgo = this._formatRelativeTime(msg.created_at);
    const isMe = (msg.nickname === this.nickname);

    const el = document.createElement('div');
    el.className = `chat-msg-row ${isMe ? 'is-me' : ''}`;
    el.innerHTML = `
      <div class="chat-msg-avatar" aria-hidden="true">${av.svg}</div>
      <div class="chat-msg-content">
        <div class="chat-msg-header">
          <span class="chat-msg-author">${this._escapeHTML(msg.nickname)}</span>
          <span class="chat-msg-meta">· ${this._escapeHTML(msg.location || 'Earth')} ${msg.device || '💻'} · ${timeAgo}</span>
        </div>
        <div class="chat-msg-bubble">${this._escapeHTML(msg.message)}</div>
      </div>
    `;
    this.messagesContainer.appendChild(el);
  }

  async sendMessage() {
    if (!this.chatInput) return;
    const text = this.chatInput.value.trim();
    if (!text) return;

    // 3s Anti-Spam Rate Limit
    const now = Date.now();
    if (now - this.lastMessageSentTime < 3000) {
      alert('Please wait a moment before sending another message!');
      return;
    }
    this.lastMessageSentTime = now;

    const newMsg = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      nickname: this.nickname,
      location: this.locationTag,
      device: this.deviceIcon,
      message: text.substring(0, 280),
      avatar_id: this.avatarId,
      created_at: new Date().toISOString()
    };

    this.chatInput.value = '';

    // 1. Instant optimistic local append
    this._appendMessage(newMsg);

    // 2. Instant WebSocket Broadcast to all active visitors in room
    if (this.roomChannel) {
      this.roomChannel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: newMsg
      });
    }

    // 3. Persist to Supabase Database for future visits
    if (this.supabase) {
      try {
        const { error } = await this.supabase
          .from('community_messages')
          .insert([{
            nickname: newMsg.nickname,
            location: newMsg.location,
            device: newMsg.device,
            message: newMsg.message,
            avatar_id: newMsg.avatar_id
          }]);
        if (error) {
          console.warn('Supabase DB save error:', error);
          this._saveDemoMessages();
        }
      } catch (err) {
        console.warn('Failed to insert to Supabase, saving locally:', err);
        this._saveDemoMessages();
      }
    } else {
      this._saveDemoMessages();
    }

    if (window.JuswaSound) window.JuswaSound.playClick();
  }

  _saveDemoMessages() {
    try {
      localStorage.setItem('juswa_demo_chat', JSON.stringify(this.messages.slice(-50)));
    } catch {
      // ignore
    }
  }

  _scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  _formatRelativeTime(isoString) {
    if (!isoString) return 'just now';
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  _escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }
}

// Global Singleton Instance
let communityInstance = null;

export function initCommunity() {
  if (!communityInstance) {
    communityInstance = new CommunityManager();
    communityInstance.init();
    window.JuswaCommunity = communityInstance;
  }
  return communityInstance;
}
