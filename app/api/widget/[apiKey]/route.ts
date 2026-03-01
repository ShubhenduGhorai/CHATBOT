import { NextResponse } from 'next/server';
import { z } from 'zod';

const apiKeySchema = z.string().min(20).max(200).regex(/^cb_live_[A-Za-z0-9_-]+$/);

function getWidgetScript(apiKey: string) {
  const safeApiKey = JSON.stringify(apiKey);

  return `(function () {
  if (window.__chatbotWidgetLoaded) return;
  window.__chatbotWidgetLoaded = true;

  var API_KEY = ${safeApiKey};
  var scriptEl = document.currentScript;
  var backendOrigin = scriptEl && scriptEl.src ? new URL(scriptEl.src).origin : window.location.origin;
  var endpoint = backendOrigin + '/api/chatbot/message';
  var visitorStorageKey = 'chatbot_widget_visitor_id_' + API_KEY.slice(0, 12);

  function getVisitorId() {
    try {
      var existing = localStorage.getItem(visitorStorageKey);
      if (existing) return existing;
      var created = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(visitorStorageKey, created);
      return created;
    } catch (e) {
      return 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  var visitorId = getVisitorId();

  var style = document.createElement('style');
  style.textContent = '' +
    '.cbw-btn{position:fixed;right:24px;bottom:24px;width:56px;height:56px;border:none;border-radius:999px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;font-size:22px;cursor:pointer;box-shadow:0 12px 30px rgba(15,23,42,.25);z-index:2147483000;}' +
    '.cbw-panel{position:fixed;right:24px;bottom:92px;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 116px);display:none;flex-direction:column;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 24px 48px rgba(15,23,42,.22);z-index:2147483000;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}' +
    '.cbw-open{display:flex;}' +
    '.cbw-header{padding:14px 16px;background:#0f172a;color:#fff;font-weight:600;font-size:14px;}' +
    '.cbw-body{flex:1;padding:12px;overflow:auto;background:#f8fafc;}' +
    '.cbw-row{display:flex;margin-bottom:10px;}' +
    '.cbw-user{justify-content:flex-end;}' +
    '.cbw-bot{justify-content:flex-start;}' +
    '.cbw-msg{max-width:82%;padding:10px 12px;border-radius:12px;line-height:1.35;font-size:14px;white-space:pre-wrap;word-break:break-word;}' +
    '.cbw-user .cbw-msg{background:#0f172a;color:#fff;border-bottom-right-radius:4px;}' +
    '.cbw-bot .cbw-msg{background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-bottom-left-radius:4px;}' +
    '.cbw-input{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff;}' +
    '.cbw-input input{flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;outline:none;font-size:14px;}' +
    '.cbw-input input:focus{border-color:#64748b;box-shadow:0 0 0 3px rgba(100,116,139,.16);}' +
    '.cbw-input button{border:none;border-radius:10px;background:#0f172a;color:#fff;padding:10px 14px;font-size:13px;font-weight:600;cursor:pointer;}' +
    '.cbw-input button:disabled{opacity:.6;cursor:not-allowed;}';
  document.head.appendChild(style);

  var button = document.createElement('button');
  button.className = 'cbw-btn';
  button.type = 'button';
  button.setAttribute('aria-label', 'Open chat');
  button.textContent = 'Chat';

  var panel = document.createElement('section');
  panel.className = 'cbw-panel';
  panel.innerHTML = '' +
    '<div class="cbw-header">Chat Support</div>' +
    '<div class="cbw-body" id="cbw-body"></div>' +
    '<form class="cbw-input" id="cbw-form">' +
      '<input id="cbw-text" type="text" placeholder="Type your message..." autocomplete="off" />' +
      '<button id="cbw-send" type="submit">Send</button>' +
    '</form>';

  document.body.appendChild(button);
  document.body.appendChild(panel);

  var bodyEl = panel.querySelector('#cbw-body');
  var formEl = panel.querySelector('#cbw-form');
  var textEl = panel.querySelector('#cbw-text');
  var sendEl = panel.querySelector('#cbw-send');

  function appendMessage(role, text) {
    var row = document.createElement('div');
    row.className = 'cbw-row ' + (role === 'user' ? 'cbw-user' : 'cbw-bot');
    var bubble = document.createElement('div');
    bubble.className = 'cbw-msg';
    bubble.textContent = text;
    row.appendChild(bubble);
    bodyEl.appendChild(row);
    bodyEl.scrollTop = bodyEl.scrollHeight;
    return bubble;
  }

  button.addEventListener('click', function () {
    var opened = panel.classList.toggle('cbw-open');
    if (opened) textEl.focus();
  });

  formEl.addEventListener('submit', async function (event) {
    event.preventDefault();
    var text = (textEl.value || '').trim();
    if (!text) return;

    appendMessage('user', text);
    textEl.value = '';
    sendEl.disabled = true;
    textEl.disabled = true;

    var assistantBubble = appendMessage('assistant', '');

    try {
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: API_KEY,
          message: text,
          visitorId: visitorId
        })
      });

      if (!response.ok || !response.body) {
        assistantBubble.textContent = 'Unable to respond right now.';
        return;
      }

      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var result = '';

      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        result += decoder.decode(chunk.value, { stream: true });
        assistantBubble.textContent = result;
        bodyEl.scrollTop = bodyEl.scrollHeight;
      }
    } catch (e) {
      assistantBubble.textContent = 'Network error. Please try again.';
    } finally {
      sendEl.disabled = false;
      textEl.disabled = false;
      textEl.focus();
    }
  });
})();`;
}

type RouteContext = {
  params: { apiKey: string };
};

export async function GET(_: Request, context: RouteContext) {
  const apiKey = context.params?.apiKey ?? '';
  const parsed = apiKeySchema.safeParse(apiKey);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid widget API key'
        }
      },
      { status: 400 }
    );
  }

  const script = getWidgetScript(parsed.data);

  return new NextResponse(script, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
}
