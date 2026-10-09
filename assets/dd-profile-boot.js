/** Color Time! — sync hull vars + phone-stack before first paint (CLS). Mirrors profile-engine.mjs. */
(function () {
  var DESK_RAIL_W = 112;
  var BASE_W = 1152;
  var BASE_H = 864;
  var Q400 = 96;
  var Q400_ICON_FRAC = 0.78;
  var PHONE_RAIL_ICON_FRAC = 0.78;
  var PHONE_STACK = { rails: 0.15, q400: 0.15, paw: 0.10 };
  var STORAGE_KEY = 'dd-profile-override';
  var DEFAULT_TOKEN = '16:9';

  var ALLOWED = ['4:3', '3:4', '16:10', '10:16', '16:9', '9:16', '19.5:9', '9:19.5', '20:9', '9:20'];
  var PHONE_PORTRAIT = ['3:4', '9:16', '10:16', '9:19.5', '9:20'];
  var PHONE_LANDSCAPE = ['19.5:9', '20:9', '16:9', '4:3'];

  var TOKENS = [
    { id: '4:3', ratio: 4 / 3, orient: 'landscape' },
    { id: '3:4', ratio: 3 / 4, orient: 'portrait' },
    { id: '16:10', ratio: 16 / 10, orient: 'landscape' },
    { id: '10:16', ratio: 10 / 16, orient: 'portrait' },
    { id: '16:9', ratio: 16 / 9, orient: 'landscape' },
    { id: '9:16', ratio: 9 / 16, orient: 'portrait' },
    { id: '19.5:9', ratio: 19.5 / 9, orient: 'landscape' },
    { id: '9:19.5', ratio: 9 / 19.5, orient: 'portrait' },
    { id: '20:9', ratio: 20 / 9, orient: 'landscape' },
    { id: '9:20', ratio: 9 / 20, orient: 'portrait' },
  ];

  var HUB_FULL_VIEWPORT = { '3:4': 1, '9:16': 1, '10:16': 1, '9:19.5': 1, '9:20': 1 };

  function viewportSize() {
    var vv = window.visualViewport;
    return {
      w: Math.round((vv && vv.width) ? vv.width : window.innerWidth),
      h: Math.round((vv && vv.height) ? vv.height : window.innerHeight),
    };
  }

  function handheld() {
    var vp = viewportSize();
    var minSide = Math.min(vp.w, vp.h);
    var maxSide = Math.max(vp.w, vp.h);
    var coarseOnly = false;
    var hoverNone = false;
    try {
      coarseOnly = window.matchMedia('(pointer: coarse) and not (pointer: fine)').matches;
      hoverNone = window.matchMedia('(hover: none)').matches;
    } catch (e) { /* private mode */ }
    if (minSide <= 480 && maxSide / Math.max(minSide, 1) >= 1.65) return true;
    try {
      if (window.matchMedia('(max-device-width: 480px)').matches) return true;
      if (window.matchMedia('(max-width: 480px) and (orientation: portrait)').matches) return true;
    } catch (e) { /* private mode */ }
    if (coarseOnly && maxSide <= 1600) return true;
    if (minSide <= 520 && coarseOnly && hoverNone) return true;
    if (minSide > 480 && minSide <= 1180 && maxSide <= 1366 && (hoverNone || coarseOnly)) return true;
    return false;
  }

  function stretchDesk(box) {
    var base = authoredLayout(getToken(DEFAULT_TOKEN));
    var scale = Math.min(box.w / base.w, box.h / base.h);
    if (!isFinite(scale) || scale <= 0) return base;
    return layoutFromWidth(Math.round(box.w / scale), Math.round(box.h / scale));
  }

  function isPhone() {
    /* Desk layout on every device — phone-stack retired (see FORCE_DESKTOP_LAYOUT). */
    return false;
  }

  function isPhoneLayoutToken(id) {
    var i;
    for (i = 0; i < PHONE_PORTRAIT.length; i++) {
      if (PHONE_PORTRAIT[i] === id) return true;
    }
    for (i = 0; i < PHONE_LANDSCAPE.length; i++) {
      if (PHONE_LANDSCAPE[i] === id) return true;
    }
    return false;
  }

  function getToken(id) {
    for (var i = 0; i < TOKENS.length; i++) {
      if (TOKENS[i].id === id) return TOKENS[i];
    }
    return TOKENS[0];
  }

  function nearestToken(aspect, pool) {
    var best = null;
    var bestDiff = Infinity;
    for (var i = 0; i < TOKENS.length; i++) {
      var t = TOKENS[i];
      if (pool.indexOf(t.id) === -1) continue;
      var diff = Math.abs(Math.log(aspect / t.ratio));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = t;
      }
    }
    return best || TOKENS[0];
  }

  function layoutFromWidth(w, h) {
    var rowH = h - Q400;
    var railW = DESK_RAIL_W;
    return {
      w: w,
      h: h,
      railW: railW,
      stageW: w - railW * 2,
      rowH: rowH,
      q400: Q400,
      paw: 96,
      wing: Math.round((w - 96) / 2),
    };
  }

  function authoredLayout(token) {
    if (token.id === '4:3') return layoutFromWidth(BASE_W, BASE_H);
    if (token.id === '3:4') return layoutFromWidth(BASE_H, BASE_W);
    var portraitW = BASE_H;
    var w = token.orient === 'landscape'
      ? Math.round(BASE_H * token.ratio)
      : portraitW;
    var h = token.orient === 'landscape'
      ? BASE_H
      : Math.round(w / token.ratio);
    return layoutFromWidth(w, h);
  }

  function clearOverride() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* offline */ }
  }

  function resolveAspectToken() {
    var vp = viewportSize();
    var aspect = vp.w / vp.h;
    var phone = isPhone();
    /* No orientation flip — portrait pool only when actually portrait. */
    if (phone) {
      if (aspect < 1) return getToken(nearestToken(aspect, PHONE_PORTRAIT).id);
      return getToken(nearestToken(aspect, PHONE_LANDSCAPE).id);
    }
    return getToken(nearestToken(aspect, ALLOWED).id);
  }

  function resolveActiveToken() {
    if (isPhone()) return resolveAspectToken();
    return getToken(DEFAULT_TOKEN);
  }

  function hubLayoutForToken(tokenId, phoneLandscape) {
    if (phoneLandscape) return 'fit-stage';
    if (HUB_FULL_VIEWPORT[tokenId]) return 'full-viewport';
    return 'fit-stage';
  }

  /** Always stamp <html>; also body when present (engine / legacy readers). */
  function applyToRoots(fn) {
    fn(document.documentElement);
    if (document.body) fn(document.body);
  }

  function applyLayoutVars(el, layout) {
    el.style.setProperty('--dd-w', layout.w + 'px');
    el.style.setProperty('--dd-h', layout.h + 'px');
    el.style.setProperty('--dd-rail-w', layout.railW + 'px');
    el.style.setProperty('--dd-stage-w', layout.stageW + 'px');
    el.style.setProperty('--dd-row-h', layout.rowH + 'px');
    el.style.setProperty('--dd-q400-h', layout.q400 + 'px');
    el.style.setProperty('--dd-paw', layout.paw + 'px');
    el.style.setProperty('--dd-wing', layout.wing + 'px');
    el.style.setProperty('--dd-q400-icon', Math.round(layout.q400 * Q400_ICON_FRAC) + 'px');
  }

  function applyQ400Grammar(el, layout, phoneStack) {
    var q400H = phoneStack ? Math.round(layout.h / 5) : layout.q400;
    var icon = Math.round(q400H * Q400_ICON_FRAC);
    el.style.setProperty('--dd-q400-h', q400H + 'px');
    el.style.setProperty('--dd-q400-icon', icon + 'px');

    if (phoneStack) {
      var canvasRowH = layout.w;
      var toolBandH = Math.max(0, layout.h - canvasRowH);
      var toolFracSum = PHONE_STACK.rails + PHONE_STACK.q400 + PHONE_STACK.paw;
      var railRowH = Math.round(toolBandH * (PHONE_STACK.rails / toolFracSum));
      var q400RowH = Math.round(toolBandH * (PHONE_STACK.q400 / toolFracSum));
      var pawRowH = Math.max(0, toolBandH - railRowH - q400RowH);
      el.style.setProperty('--dd-phone-canvas-row-h', canvasRowH + 'px');
      el.style.setProperty('--dd-phone-rail-row-h', railRowH + 'px');
      el.style.setProperty('--dd-q400-h', q400RowH + 'px');
      el.style.setProperty('--dd-phone-paw-row-h', pawRowH + 'px');
      el.style.setProperty('--dd-phone-row-icon', Math.round(railRowH * PHONE_RAIL_ICON_FRAC) + 'px');
      el.style.setProperty('--dd-q400-icon', Math.round(q400RowH * Q400_ICON_FRAC) + 'px');
      el.style.setProperty('--dd-paw', Math.round(q400RowH * Q400_ICON_FRAC) + 'px');
    }
  }

  function fitFrame(phoneFill, layout) {
    var frame = document.getElementById('dd-frame');
    if (!frame) return;
    if (phoneFill) {
      frame.style.setProperty('--dd-scale', '1');
      applyToRoots(function (el) { el.style.setProperty('--dd-scale', '1'); });
      return;
    }
    var scale = Math.min(window.innerWidth / layout.w, window.innerHeight / layout.h);
    frame.style.setProperty('--dd-scale', String(scale));
    applyToRoots(function (el) { el.style.setProperty('--dd-scale', String(scale)); });
  }

  function applyStackClasses(phonePortrait, usePhoneStack, phone) {
    var html = document.documentElement;
    html.classList.toggle('dd-layout--phone-stack', usePhoneStack);
    html.classList.toggle('dd-layout--phone-fill', phone);

    var body = document.body;
    if (body) {
      body.classList.toggle('dd-layout--phone-stack', usePhoneStack);
      body.classList.toggle('dd-layout--phone-fill', phone);
      body.classList.toggle('dd-layout--portrait', phonePortrait);
    }

    var viewport = document.getElementById('viewport-container');
    if (viewport) {
      viewport.classList.toggle('dd-layout--phone-wide-stack', false);
      viewport.classList.toggle('dd-layout--phone-stack', usePhoneStack);
    }
  }

  function bootProfile() {
    clearOverride();

    var phone = isPhone();
    var vp = viewportSize();
    var displayToken = resolveActiveToken();
    var tokenId = displayToken.id;

    if (phone && !isPhoneLayoutToken(tokenId)) {
      displayToken = resolveAspectToken();
      tokenId = displayToken.id;
    }

    var phonePortrait = phone && vp.h >= vp.w;
    var phoneLandscape = phone && vp.w > vp.h;
    var layoutToken = getToken(tokenId);
    var usePhoneStack = phonePortrait;
    var layout = phone
      ? layoutFromWidth(vp.w, vp.h)
      : authoredLayout(layoutToken);
    if (!phone && !handheld()) layout = stretchDesk(vp);

    applyToRoots(function (el) {
      applyLayoutVars(el, layout);
      applyQ400Grammar(el, layout, usePhoneStack);
    });

    if (document.body) {
      document.body.dataset.ddToken = displayToken.id;
      document.body.dataset.ddHubLayout = hubLayoutForToken(displayToken.id, phoneLandscape);
    }

    applyStackClasses(phonePortrait, usePhoneStack, phone);
    fitFrame(phone, layout);
  }

  bootProfile();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootProfile);
  }
})();
