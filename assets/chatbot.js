(function () {
  'use strict';

  // Prevent multiple initializations
  if (window.__TDS_CHATBOT_INITIALIZED__) return;
  window.__TDS_CHATBOT_INITIALIZED__ = true;

  // ── Bot identity ────────────────────────────────────────────────────────────
  var BOT_NAME = 'Jenny Smith';
  var BOT_AVATAR_URL = '/images/chat-bot/avtar.jfif';

  // ── Constants ───────────────────────────────────────────────────────────────
  var TOKEN_STORAGE_KEY = 'tds_chat_token';
  var INTRO_SHOWN_KEY   = 'tds_chat_intro_shown';
  var GREETED_KEY       = 'tds_chat_already_greeted';
  var EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  // ── State ───────────────────────────────────────────────────────────────────
  var isOpen = false;
  var pendingIdentifier = '';
  var resendTimerInterval = null;

  // ── DOM refs ────────────────────────────────────────────────────────────────
  var launcherEl = null;
  var panelEl    = null;
  var bodyEl     = null;
  var footerEl   = null;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function formatTime(date) {
    var d = date ? new Date(date) : new Date();
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
  }

  function renderMarkdownLite(raw) {
    if (!raw) return '';
    var safe = String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/techdataseeders\.com)?(\/[^)]*)\)/g,
      '<a href="$3" target="_blank" rel="noopener noreferrer" class="tds-chat-link">$1</a>');
    safe = safe.replace(/\n/g, '<br>');
    return safe;
  }

  // ── Build widget DOM ────────────────────────────────────────────────────────
  function createWidgetDOM() {
    // Launcher button
    launcherEl = document.createElement('button');
    launcherEl.id = 'tdsChatLauncher';
    launcherEl.className = 'tds-chat-launcher';
    launcherEl.setAttribute('aria-label', 'Chat with ' + BOT_NAME);
    launcherEl.setAttribute('type', 'button');
    launcherEl.innerHTML = [
      '<svg class="tds-chat-launcher-icon" viewBox="0 0 24 24">',
      '  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
      '</svg>',
      '<span class="tds-chat-tooltip">Chat with us \uD83D\uDC4B</span>'
    ].join('');

    // Panel container
    panelEl = document.createElement('div');
    panelEl.id = 'tdsChatPanel';
    panelEl.className = 'tds-chat-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-modal', 'true');
    panelEl.setAttribute('aria-labelledby', 'tdsChatTitle');

    // Header — Jenny persona
    var headerEl = document.createElement('div');
    headerEl.className = 'tds-chat-header';
    headerEl.innerHTML = [
      '<div class="tds-chat-header-left">',
      '  <div class="tds-chat-avatar-wrap">',
      '    <img class="tds-chat-avatar" src="' + BOT_AVATAR_URL + '" alt="' + BOT_NAME + '" loading="lazy">',
      '    <span class="tds-chat-status-dot" aria-hidden="true"></span>',
      '  </div>',
      '  <div class="tds-chat-header-info">',
      '    <h2 id="tdsChatTitle" class="tds-chat-title">' + BOT_NAME + '</h2>',
      '    <p class="tds-chat-subtitle">Techdataseeders Team &bull; Online</p>',
      '  </div>',
      '</div>',
      '<button id="tdsChatCloseBtn" class="tds-chat-close-btn" type="button" aria-label="Close chat">',
      '  <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      '</button>'
    ].join('');

    // Body
    bodyEl = document.createElement('div');
    bodyEl.id = 'tdsChatBody';
    bodyEl.className = 'tds-chat-body';

    // Footer
    footerEl = document.createElement('div');
    footerEl.id = 'tdsChatFooter';
    footerEl.className = 'tds-chat-footer';
    footerEl.innerHTML = [
      '<form id="tdsChatMsgForm" class="tds-chat-footer-row" onsubmit="return false;">',
      '  <label for="tdsChatMsgInput" class="tds-chat-sr-only">Type a message</label>',
      '  <input type="text" id="tdsChatMsgInput" class="tds-chat-footer-input" placeholder="Message Jenny..." autocomplete="off">',
      '  <button type="submit" id="tdsChatSendBtn" class="tds-chat-send-btn" aria-label="Send message">',
      '    <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>',
      '  </button>',
      '</form>'
    ].join('');

    panelEl.appendChild(headerEl);
    panelEl.appendChild(bodyEl);
    panelEl.appendChild(footerEl);

    document.body.appendChild(launcherEl);
    document.body.appendChild(panelEl);

    bindEvents();
    renderInitialView();
  }

  // ── Event bindings ──────────────────────────────────────────────────────────
  function bindEvents() {
    launcherEl.addEventListener('click', toggleChat);
    panelEl.querySelector('#tdsChatCloseBtn').addEventListener('click', closeChat);

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeChat();
    });

    var navEl = document.querySelector('.nav');
    if (navEl && window.MutationObserver) {
      new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].attributeName === 'class' && navEl.classList.contains('nav-open')) {
            if (isOpen) closeChat();
            break;
          }
        }
      }).observe(navEl, { attributes: true });
    }

    footerEl.querySelector('#tdsChatMsgForm').addEventListener('submit', function (e) {
      e.preventDefault();
      handleSendMessage();
    });

    panelEl.addEventListener('keydown', function (e) {
      if (!isOpen || e.key !== 'Tab') return;
      var focusable = panelEl.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { last.focus(); e.preventDefault(); }
      } else {
        if (document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    });
  }

  // ── Open / Close ────────────────────────────────────────────────────────────
  function toggleChat() {
    isOpen ? closeChat() : openChat();
  }

  function openChat() {
    isOpen = true;
    panelEl.classList.add('tds-chat-open');
    launcherEl.setAttribute('aria-expanded', 'true');
    setTimeout(function () {
      var msgInput   = document.getElementById('tdsChatMsgInput');
      var emailInput = document.getElementById('tdsChatEmailInput');
      if (msgInput && footerEl.style.display !== 'none') {
        msgInput.focus();
      } else if (emailInput) {
        emailInput.focus();
      }
    }, 150);
  }

  function closeChat() {
    isOpen = false;
    panelEl.classList.remove('tds-chat-open');
    launcherEl.setAttribute('aria-expanded', 'false');
    launcherEl.focus();
  }

  // ── Initial view routing ────────────────────────────────────────────────────
  function renderInitialView() {
    var token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      showChatView();
      loadHistory();
    } else {
      showGateView();
    }
  }

  // ── Gate view (conversational Jenny persona) ────────────────────────────────
  function showGateView(step) {
    footerEl.style.display = 'none';
    bodyEl.innerHTML = '';

    var gateContainer = document.createElement('div');
    gateContainer.className = 'tds-chat-gate';

    var currentStep = step || 'request';

    if (currentStep === 'request') {
      gateContainer.innerHTML = [
        // Jenny avatar
        '<img class="tds-chat-gate-avatar" src="' + BOT_AVATAR_URL + '" alt="' + BOT_NAME + '">',
        // Conversational intro bubble
        '<div class="tds-chat-gate-intro-bubble">',
        '  Hi there! \uD83D\uDC4B I\'m Jenny from Techdataseeders. Great to meet you! To get started, verify your email \u2014 it only takes a few seconds. \uD83D\uDE0A',
        '</div>',
        '<p class="tds-chat-gate-divider">Verify to chat</p>',
        // Form fields
        '<div class="tds-chat-form-group">',
        '  <div>',
        '    <label for="tdsChatEmailInput" class="tds-chat-sr-only">Email address</label>',
        '    <input type="email" id="tdsChatEmailInput" class="tds-chat-input" placeholder="Your work email" autocomplete="email">',
        '  </div>',
        '  <button type="button" id="tdsChatSendCodeBtn" class="tds-chat-btn">Send Verification Code</button>',
        '  <div id="tdsChatGateStatus" class="tds-chat-gate-msg"></div>',
        '</div>'
      ].join('');

      bodyEl.appendChild(gateContainer);

      var sendCodeBtn = gateContainer.querySelector('#tdsChatSendCodeBtn');
      sendCodeBtn.addEventListener('click', handleSendOtp);

      var emailIn = gateContainer.querySelector('#tdsChatEmailInput');
      emailIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSendOtp(); });

    } else if (currentStep === 'verify') {
      gateContainer.innerHTML = [
        '<img class="tds-chat-gate-avatar" src="' + BOT_AVATAR_URL + '" alt="' + BOT_NAME + '">',
        '<div class="tds-chat-gate-intro-bubble">',
        '  Almost there! \uD83D\uDC4C I\'ve sent a 6-digit code to <strong>' + renderMarkdownLite(pendingIdentifier) + '</strong>. Pop it in below and we\'re good to go!',
        '</div>',
        '<div class="tds-chat-form-group tds-chat-otp-box">',
        '  <label for="tdsChatOtpInput" class="tds-chat-sr-only">6-Digit Code</label>',
        '  <input type="text" id="tdsChatOtpInput" class="tds-chat-input tds-chat-otp-input" maxlength="6" inputmode="numeric" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022" autocomplete="one-time-code">',
        '  <button type="button" id="tdsChatVerifyBtn" class="tds-chat-btn">Verify &amp; Start Chatting</button>',
        '  <div class="tds-chat-resend-row">',
        '    <button type="button" id="tdsChatChangeBtn" class="tds-chat-resend-btn" style="text-decoration:none;color:#64748b;">&#8592; Change email</button>',
        '    <span id="tdsChatCountdown">Resend in 30s</span>',
        '    <button type="button" id="tdsChatResendBtn" class="tds-chat-resend-btn" style="display:none;">Resend Code</button>',
        '  </div>',
        '  <div id="tdsChatGateStatus" class="tds-chat-gate-msg"></div>',
        '</div>'
      ].join('');

      bodyEl.appendChild(gateContainer);

      var otpInput    = gateContainer.querySelector('#tdsChatOtpInput');
      var verifyBtn   = gateContainer.querySelector('#tdsChatVerifyBtn');
      var changeBtn   = gateContainer.querySelector('#tdsChatChangeBtn');
      var resendBtn   = gateContainer.querySelector('#tdsChatResendBtn');
      var countdownEl = gateContainer.querySelector('#tdsChatCountdown');

      otpInput.focus();
      verifyBtn.addEventListener('click', handleVerifyOtp);
      otpInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleVerifyOtp(); });

      changeBtn.addEventListener('click', function () {
        if (resendTimerInterval) clearInterval(resendTimerInterval);
        showGateView('request');
      });

      var secondsLeft = 30;
      if (resendTimerInterval) clearInterval(resendTimerInterval);
      resendTimerInterval = setInterval(function () {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          clearInterval(resendTimerInterval);
          countdownEl.style.display = 'none';
          resendBtn.style.display = 'inline';
        } else {
          countdownEl.textContent = 'Resend in ' + secondsLeft + 's';
        }
      }, 1000);

      resendBtn.addEventListener('click', function () {
        resendBtn.style.display = 'none';
        countdownEl.style.display = 'inline';
        countdownEl.textContent = 'Resend in 30s';
        handleSendOtp();
      });
    }
  }

  // ── OTP: request ────────────────────────────────────────────────────────────
  function handleSendOtp() {
    var statusEl = document.getElementById('tdsChatGateStatus');
    var sendBtn  = document.getElementById('tdsChatSendCodeBtn');

    function showError(msg) {
      if (!statusEl) return;
      statusEl.className = 'tds-chat-gate-msg tds-chat-error';
      statusEl.textContent = msg;
      statusEl.style.display = 'block';
    }

    var emailEl = document.getElementById('tdsChatEmailInput');
    var identifier = emailEl ? emailEl.value.trim() : '';
    if (!identifier) { showError('Please enter your email address.'); return; }
    if (!EMAIL_REGEX.test(identifier)) { showError('Please enter a valid email address.'); return; }

    pendingIdentifier = identifier;
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = 'Sending\u2026'; }
    if (statusEl) statusEl.style.display = 'none';

    fetch('/api/chat/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier, channel: 'email' })
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send Verification Code'; }
        if (result.ok && result.data.success) {
          showGateView('verify');
        } else {
          var errorMsg = result.data.message || 'Failed to send verification code.';
          showError(errorMsg);
        }
      })
      .catch(function () {
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send Verification Code'; }
        showError('Network error. Please try again.');
      });
  }

  // ── OTP: verify ─────────────────────────────────────────────────────────────
  function handleVerifyOtp() {
    var otpInput  = document.getElementById('tdsChatOtpInput');
    var verifyBtn = document.getElementById('tdsChatVerifyBtn');
    var statusEl  = document.getElementById('tdsChatGateStatus');

    function showError(msg) {
      if (!statusEl) return;
      statusEl.className = 'tds-chat-gate-msg tds-chat-error';
      statusEl.textContent = msg;
      statusEl.style.display = 'block';
    }

    var code = otpInput ? otpInput.value.trim() : '';
    if (!code || code.length < 6) { showError('Please enter the 6-digit code.'); return; }

    if (verifyBtn) { verifyBtn.disabled = true; verifyBtn.textContent = 'Verifying\u2026'; }
    if (statusEl) statusEl.style.display = 'none';

    fetch('/api/chat/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: pendingIdentifier, code: code })
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = 'Verify & Start Chatting'; }
        if (result.ok && result.data.success && result.data.chatToken) {
          sessionStorage.setItem(TOKEN_STORAGE_KEY, result.data.chatToken);
          if (resendTimerInterval) clearInterval(resendTimerInterval);
          showChatView();
          if (!sessionStorage.getItem(INTRO_SHOWN_KEY)) {
            appendSystemMessage('\u2705 Verified! Welcome to Techdataseeders.');
            appendBotMessage('Welcome! \uD83D\uDC4B I\'m Jenny from Techdataseeders. Ask me anything about web scraping, mobile app data, custom APIs, or data analytics \u2014 or just say hi! (Looking for a quote? \u2192 [Contact Us](/#contact) \uD83D\uDE0A)');
            sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');
          }
        } else {
          showError(result.data.message || 'Invalid or expired code. Please try again.');
        }
      })
      .catch(function () {
        if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = 'Verify & Start Chatting'; }
        showError('Network error. Please check your connection.');
      });
  }

  // ── Chat view ────────────────────────────────────────────────────────────────
  function showChatView() {
    bodyEl.innerHTML = '';
    footerEl.style.display = 'block';
    var msgInput = document.getElementById('tdsChatMsgInput');
    if (msgInput) msgInput.focus();
  }

  // ── Load history ─────────────────────────────────────────────────────────────
  function loadHistory() {
    var token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    fetch('/api/chat/history', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function (res) {
        if (res.status === 401) {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          showGateView('request');
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.success) return;
        if (data.messages && data.messages.length > 0) {
          sessionStorage.setItem(GREETED_KEY, 'true');
          data.messages.forEach(function (msg) {
            if (msg.role === 'user') appendUserMessage(msg.content, msg.createdAt);
            else                    appendBotMessage(msg.content, msg.createdAt);
          });
        } else {
          if (!sessionStorage.getItem(INTRO_SHOWN_KEY)) {
            appendSystemMessage('\u2705 Verified! Welcome to Techdataseeders.');
            appendBotMessage('Welcome! \uD83D\uDC4B I\'m Jenny from Techdataseeders. Ask me anything about web scraping, mobile app data, custom APIs, or data analytics \u2014 or just say hi! (Looking for a quote? \u2192 [Contact Us](/#contact) \uD83D\uDE0A)');
            sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');
          }
        }
      })
      .catch(function () {
        if (!sessionStorage.getItem(INTRO_SHOWN_KEY)) {
          appendSystemMessage('\u2705 Verified! Welcome to Techdataseeders.');
          appendBotMessage('Welcome! \uD83D\uDC4B I\'m Jenny from Techdataseeders. Ask me anything about web scraping, mobile app data, custom APIs, or data analytics \u2014 or just say hi! (Looking for a quote? \u2192 [Contact Us](/#contact) \uD83D\uDE0A)');
          sessionStorage.setItem(INTRO_SHOWN_KEY, 'true');
        }
      });
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  function handleSendMessage() {
    var inputEl = document.getElementById('tdsChatMsgInput');
    var sendBtn = document.getElementById('tdsChatSendBtn');
    if (!inputEl) return;

    var text = inputEl.value.trim();
    if (!text) return;

    var token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) { showGateView('request'); return; }

    appendUserMessage(text);
    inputEl.value = '';
    showTypingIndicator();
    if (sendBtn) sendBtn.disabled = true;

    var alreadyGreeted = sessionStorage.getItem(GREETED_KEY) === 'true';
    var payload = {
      message: text,
      userAlreadyGreeted: alreadyGreeted
    };

    fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (res.status === 401) {
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          hideTypingIndicator();
          if (sendBtn) sendBtn.disabled = false;
          showGateView('request');
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        hideTypingIndicator();
        if (sendBtn) sendBtn.disabled = false;
        if (data && data.success && data.reply) {
          sessionStorage.setItem(GREETED_KEY, 'true');
          appendBotMessage(data.reply);
        } else if (data) {
          appendBotMessage('Hmm, I hit a small snag there. \uD83D\uDE05 You can also reach our team directly via [Contact Us](/#contact).');
        }
      })
      .catch(function () {
        hideTypingIndicator();
        if (sendBtn) sendBtn.disabled = false;
        appendBotMessage('Looks like we lost connection for a sec. \uD83D\uDE05 Please check your network and try again!');
      });
  }

  // ── Bubble builders ──────────────────────────────────────────────────────────
  function appendUserMessage(text, time) {
    var row = document.createElement('div');
    row.className = 'tds-chat-msg-row tds-chat-msg-user';

    var bubble = document.createElement('div');
    bubble.className = 'tds-chat-bubble';
    bubble.textContent = text;

    var timeEl = document.createElement('span');
    timeEl.className = 'tds-chat-time';
    timeEl.textContent = formatTime(time);

    row.appendChild(bubble);
    row.appendChild(timeEl);
    bodyEl.appendChild(row);
    scrollToBottom();
  }

  function appendBotMessage(rawMarkdown, time) {
    var row = document.createElement('div');
    row.className = 'tds-chat-msg-row tds-chat-msg-bot';

    // Avatar + bubble side-by-side
    var inner = document.createElement('div');
    inner.className = 'tds-chat-msg-bot-inner';

    var avatar = document.createElement('img');
    avatar.className = 'tds-chat-msg-bot-avatar';
    avatar.src = BOT_AVATAR_URL;
    avatar.alt = BOT_NAME;
    avatar.loading = 'lazy';

    var bubble = document.createElement('div');
    bubble.className = 'tds-chat-bubble';
    bubble.innerHTML = renderMarkdownLite(rawMarkdown);

    inner.appendChild(avatar);
    inner.appendChild(bubble);

    var timeEl = document.createElement('span');
    timeEl.className = 'tds-chat-time';
    timeEl.style.paddingLeft = '36px';
    timeEl.textContent = BOT_NAME + ' \u2022 ' + formatTime(time);

    row.appendChild(inner);
    row.appendChild(timeEl);
    bodyEl.appendChild(row);
    scrollToBottom();
  }

  function appendSystemMessage(text) {
    var bubble = document.createElement('div');
    bubble.className = 'tds-chat-system-bubble';
    bubble.textContent = text;
    bodyEl.appendChild(bubble);
    scrollToBottom();
  }

  function showTypingIndicator() {
    hideTypingIndicator();

    var row = document.createElement('div');
    row.id = 'tdsChatTyping';
    row.className = 'tds-chat-typing-row';

    var avatar = document.createElement('img');
    avatar.className = 'tds-chat-msg-bot-avatar';
    avatar.src = BOT_AVATAR_URL;
    avatar.alt = BOT_NAME;

    var bubble = document.createElement('div');
    bubble.className = 'tds-chat-typing-bubble';
    bubble.innerHTML = [
      '<div class="tds-chat-luma-spin" aria-label="Jenny is typing" role="status">',
      '  <span></span>',
      '  <span></span>',
      '</div>'
    ].join('');

    row.appendChild(avatar);
    row.appendChild(bubble);
    bodyEl.appendChild(row);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    var existing = document.getElementById('tdsChatTyping');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
  }

  function scrollToBottom() {
    setTimeout(function () { bodyEl.scrollTop = bodyEl.scrollHeight; }, 10);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(createWidgetDOM);
    } else {
      setTimeout(createWidgetDOM, 100);
    }
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }

})();
