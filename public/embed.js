/**
 * Chatbot Embed Script
 * This script loads the chatbot widget in an iframe.
 */
(function() {
  'use strict';

  // Prevent loading if already inside an iframe to avoid recursion
  if (window.self !== window.top) return;

  // Create global chatbot queue if it doesn't exist
  window.chatbot = window.chatbot || function() {
    (window.chatbot.q = window.chatbot.q || []).push(arguments);
  };

  const script = document.currentScript;
  const scriptUrl = script ? script.src : '';
  const defaultBaseUrl = scriptUrl ? new URL(scriptUrl).origin : window.location.origin;

  const defaults = {
    chatbotId: null,
    baseUrl: defaultBaseUrl,
    showButton: true,
    autoOpen: false,
    delay: 1000,
    position: 'bottom-right',
    buttonColor: '#3b82f6',
    buttonTextColor: '#ffffff',
    buttonSize: 'medium'
  };

  let config = { ...defaults };
  let iframe = null;
  let button = null;
  let isInitialized = false;

  function init(userConfig) {
    if (isInitialized) return;
    
    config = { ...defaults, ...userConfig };
    if (!config.chatbotId) {
      console.error('Chatbot ID is required');
      return;
    }

    createIframe();
    if (config.showButton) {
      createButton();
    }

    if (config.autoOpen) {
      setTimeout(openChat, config.delay);
    }

    setupMessageListener();
    isInitialized = true;
  }

  function createIframe() {
    iframe = document.createElement('iframe');
    const chatbotUrl = `${config.baseUrl}/embed/widget/${config.chatbotId}`;
    
    iframe.src = chatbotUrl;
    iframe.style.cssText = `
      position: fixed;
      z-index: 999999;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 600px;
      max-height: 80vh;
      border: none;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      display: none;
      transition: all 0.3s ease;
      background: white;
    `;

    applyPosition(iframe, true);
    document.body.appendChild(iframe);
  }

  function createButton() {
    button = document.createElement('div');
    button.innerHTML = '💬';
    button.style.cssText = `
      position: fixed;
      z-index: 999999;
      bottom: 20px;
      right: 20px;
      width: ${getButtonSize()};
      height: ${getButtonSize()};
      border-radius: 50%;
      background-color: ${config.buttonColor};
      color: ${config.buttonTextColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
    `;

    applyPosition(button, false);
    
    button.onclick = toggleChat;
    button.onmouseenter = () => button.style.transform = 'scale(1.1)';
    button.onmouseleave = () => button.style.transform = 'scale(1)';
    
    document.body.appendChild(button);
  }

  function applyPosition(el, isIframe) {
    const pos = config.position;
    const margin = '20px';
    const iframeMargin = '90px';
    
    el.style.bottom = 'auto';
    el.style.top = 'auto';
    el.style.left = 'auto';
    el.style.right = 'auto';

    const offset = isIframe ? iframeMargin : margin;

    if (pos.includes('bottom')) el.style.bottom = offset;
    if (pos.includes('top')) el.style.top = offset;
    if (pos.includes('right')) el.style.right = margin;
    if (pos.includes('left')) el.style.left = margin;
  }

  function getButtonSize() {
    switch(config.buttonSize) {
      case 'small': return '50px';
      case 'large': return '70px';
      default: return '60px';
    }
  }

  function toggleChat() {
    if (iframe.style.display === 'none') {
      openChat();
    } else {
      closeChat();
    }
  }

  function openChat() {
    iframe.style.display = 'block';
    if (button) button.style.display = 'none';
  }

  function closeChat() {
    iframe.style.display = 'none';
    if (button) button.style.display = 'flex';
  }

  function setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.data.chatbotId !== config.chatbotId) return;

      if (event.data.type === 'chatbot-close') {
        closeChat();
      }
      if (event.data.type === 'chatbot-resize') {
        if (event.data.width) iframe.style.width = event.data.width;
        if (event.data.height) iframe.style.height = event.data.height;
      }
    });
  }

  // Handle API commands
  const processCommand = (args) => {
    const cmd = args[0];
    const params = args[1];
    if (cmd === 'init') {
      init(params);
    } else if (cmd === 'open') {
      openChat();
    } else if (cmd === 'close') {
      closeChat();
    }
  };

  // Process queue
  if (window.chatbot.q) {
    window.chatbot.q.forEach(processCommand);
  }

  // Override queue with direct execution
  window.chatbot = function() {
    processCommand(arguments);
  };

  // Auto-init from data attributes
  if (script) {
    const chatbotId = script.getAttribute('data-chatbot-id');
    if (chatbotId) {
      init({
        chatbotId,
        baseUrl: script.getAttribute('data-base-url') || defaultBaseUrl,
        showButton: script.getAttribute('data-show-button') !== 'false',
        autoOpen: script.getAttribute('data-auto-open') === 'true',
        position: script.getAttribute('data-position') || 'bottom-right'
      });
    }
  }

})();
