/**
 * Globe Translator — Hub/Studio footer globe (center of Contrast · Globe · Gear).
 * Product beat (locked): PIT Crew Creed — all the colors in between · all are welcome · all aboard.
 * Opens the world of languages (flags). See OSS-HUB.md · IDEA-BACKLOG.md · PIT Crew Creed.
 */
export function attachGlobeTranslator(opts = {}) {
  const anchorIds =
    opts.anchorIds ?? (opts.anchorId ? [opts.anchorId] : ['btn-translate-footer']);
  const flagAssetPath = opts.flagAssetPath ?? './assets/flags/';

  const STORAGE_KEY_LANG = 'oss-globe-translator-active-lang';
  const WIDGET_SRC = 'https://translate.google.com/translate_a/element.js?cb=__ossGoogleTranslateInit';
  const OVERLAY_ID = 'oss-globe-translator-overlay';
  const GT_HOST_ID = 'oss-google-translate-host';
  /** Debounce timer for resize → placeFlagsPolar (GT can fire resize bursts). */
  let polarResizeTimer = null;
  const TOAST_ID = 'oss-globe-translator-toast';
  const FLAG_ASSET_PATH = flagAssetPath;

  // Phyllotaxis / radial layout tuning. The spiral is a *seed* only —
  // placeFlagsPolar() rejects any candidate that lands off-viewport or
  // too close to an already-placed flag, so the final result is always
  // on-screen and comfortably spaced.
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~137.5°
  const RADIAL_BASE = 64; // distance from globe to innermost flag
  const RADIAL_SCALE = 12; // growth rate of spiral (r = base + scale * sqrt(i))
  // v2: footer-left anchor — burst upward/right into the stage (mirror of v1 q100 top-left)
  const RADIAL_START = -Math.PI * 0.35;
  const FLAG_PX_SIZE = 48; // matches .globe-translator-flag width/height (3rem @ 16px)
  const FLAG_MIN_GAP_PX = 16; // 1 rem breathing room between flags
  const FLAG_MIN_DIST = FLAG_PX_SIZE + FLAG_MIN_GAP_PX; // center-to-center
  const VIEWPORT_PAD = 8; // buffer from viewport edges
  const MAX_SPIRAL_TRIES = 2000; // fail-safe upper bound per flag

  /**
   * Flags ordered by priority (closest-to-globe first). Tier 1 lands in the
   * top-left of the overlay grid; tier 8 lands in the bottom-right. One
   * flag = one language EXCEPT where the same language has multiple
   * distinctive national/regional flags — in those cases (Arabic across
   * the Mediterranean, English across the Caribbean, Spanish across Latin
   * America) we intentionally show multiple flags because the *flag* is
   * half the point. The GT target language is still the same, but the
   * visitor gets to pick the regional identity they connect with.
   * `regionEn` is US-English for the country or region the roundel
   * represents only — never a language name (Spanish flags get Mexico,
   * Argentina, … not “Spanish”). Shown as name + (regionEn) in title /
   * aria-label.
   */
  var FLAGS_ORDERED = [
    // Tier 1 — British Isles first (innermost ring, closest to the paw).
    // Osbard is Irish-rooted, so Gaeilge sits next to English (Ireland)
    // and the whole British Isles cluster lands in the first ring around
    // the globe. US follows Wales; Scotland after Ireland pair. Other
    // English variants (Commonwealth, Caribbean)
    // follow immediately after.
    { tier: 1, cc: 'ie',     lang: 'en',  name: 'English (Ireland)', regionEn: 'Ireland' },
    { tier: 1, cc: 'gb-wls', lang: 'cy',  name: 'Cymraeg', regionEn: 'Wales' },
    { tier: 1, cc: 'us',     lang: 'en',  name: 'English (US)', regionEn: 'United States' },
    { tier: 1, cc: 'gb',     lang: 'en',  name: 'English (UK)', regionEn: 'United Kingdom' },
    { tier: 1, cc: 'ie-ga',  lang: 'ga',  name: 'Gaeilge', regionEn: 'Ireland' },
    { tier: 1, cc: 'gb-sct', lang: 'gd',  name: 'Gàidhlig', regionEn: 'Scotland' },
    { tier: 1, cc: 'ca',     lang: 'en',  name: 'English (Canada)', regionEn: 'Canada' },
    { tier: 1, cc: 'au',     lang: 'en',  name: 'English (Australia)', regionEn: 'Australia' },
    { tier: 1, cc: 'nz',     lang: 'en',  name: 'English (NZ)', regionEn: 'New Zealand' },
    { tier: 1, cc: 'jm',     lang: 'en',  name: 'English (Jamaica)', regionEn: 'Jamaica' },
    { tier: 1, cc: 'tt',     lang: 'en',  name: 'English (Trinidad & Tobago)', regionEn: 'Trinidad and Tobago' },
    { tier: 1, cc: 'bs',     lang: 'en',  name: 'English (Bahamas)', regionEn: 'Bahamas' },
    { tier: 1, cc: 'bb',     lang: 'en',  name: 'English (Barbados)', regionEn: 'Barbados' },

    // Tier 2 — Japan, China
    { tier: 2, cc: 'jp', lang: 'ja',    name: '日本語', regionEn: 'Japan' },
    { tier: 2, cc: 'cn', lang: 'zh-CN', name: '中文 (简体)', regionEn: 'China' },
    { tier: 2, cc: 'tw', lang: 'zh-TW', name: '中文 (繁體)', regionEn: 'Taiwan' },

    // Tier 3 — Spanish
    { tier: 3, cc: 'es', lang: 'es',    name: 'Español (España)', regionEn: 'Spain' },
    { tier: 3, cc: 'mx', lang: 'es',    name: 'Español (México)', regionEn: 'Mexico' },
    { tier: 3, cc: 'ar', lang: 'es',    name: 'Español (Argentina)', regionEn: 'Argentina' },
    { tier: 3, cc: 'co', lang: 'es',    name: 'Español (Colombia)', regionEn: 'Colombia' },
    { tier: 3, cc: 'pe', lang: 'es',    name: 'Español (Perú)', regionEn: 'Peru' },
    { tier: 3, cc: 'cl', lang: 'es',    name: 'Español (Chile)', regionEn: 'Chile' },
    { tier: 3, cc: 'cu', lang: 'es',    name: 'Español (Cuba)', regionEn: 'Cuba' },
    { tier: 3, cc: 'bo', lang: 'es',    name: 'Español (Bolivia)', regionEn: 'Bolivia' },
    { tier: 3, cc: 'py', lang: 'es',    name: 'Español (Paraguay)', regionEn: 'Paraguay' },
    { tier: 3, cc: 'do', lang: 'es',    name: 'Español (República Dominicana)', regionEn: 'Dominican Republic' },
    { tier: 3, cc: 'pr', lang: 'es',    name: 'Español (Puerto Rico)', regionEn: 'Puerto Rico' },

    // Tier 4 — Brazil, Portugal
    { tier: 4, cc: 'br', lang: 'pt',    name: 'Português (Brasil)', regionEn: 'Brazil' },
    { tier: 4, cc: 'pt', lang: 'pt',    name: 'Português (Portugal)', regionEn: 'Portugal' },

    // Tier 5 — Remaining Europe
    { tier: 5, cc: 'fr', lang: 'fr',    name: 'Français', regionEn: 'France' },
    { tier: 5, cc: 'de', lang: 'de',    name: 'Deutsch', regionEn: 'Germany' },
    { tier: 5, cc: 'it', lang: 'it',    name: 'Italiano', regionEn: 'Italy' },
    { tier: 5, cc: 'nl', lang: 'nl',    name: 'Nederlands', regionEn: 'Netherlands' },
    { tier: 5, cc: 'se', lang: 'sv',    name: 'Svenska', regionEn: 'Sweden' },
    { tier: 5, cc: 'no', lang: 'no',    name: 'Norsk', regionEn: 'Norway' },
    { tier: 5, cc: 'dk', lang: 'da',    name: 'Dansk', regionEn: 'Denmark' },
    { tier: 5, cc: 'fi', lang: 'fi',    name: 'Suomi', regionEn: 'Finland' },
    { tier: 5, cc: 'is', lang: 'is',    name: 'Íslenska', regionEn: 'Iceland' },
    { tier: 5, cc: 'pl', lang: 'pl',    name: 'Polski', regionEn: 'Poland' },
    { tier: 5, cc: 'cz', lang: 'cs',    name: 'Čeština', regionEn: 'Czech Republic' },
    { tier: 5, cc: 'sk', lang: 'sk',    name: 'Slovenčina', regionEn: 'Slovakia' },
    { tier: 5, cc: 'hu', lang: 'hu',    name: 'Magyar', regionEn: 'Hungary' },
    { tier: 5, cc: 'ro', lang: 'ro',    name: 'Română', regionEn: 'Romania' },
    { tier: 5, cc: 'bg', lang: 'bg',    name: 'Български', regionEn: 'Bulgaria' },
    { tier: 5, cc: 'gr', lang: 'el',    name: 'Ελληνικά', regionEn: 'Greece' },
    { tier: 5, cc: 'hr', lang: 'hr',    name: 'Hrvatski', regionEn: 'Croatia' },
    { tier: 5, cc: 'si', lang: 'sl',    name: 'Slovenščina', regionEn: 'Slovenia' },
    { tier: 5, cc: 'rs', lang: 'sr',    name: 'Српски', regionEn: 'Serbia' },
    { tier: 5, cc: 'al', lang: 'sq',    name: 'Shqip', regionEn: 'Albania' },
    { tier: 5, cc: 'mk', lang: 'mk',    name: 'Македонски', regionEn: 'North Macedonia' },
    { tier: 5, cc: 'ua', lang: 'uk',    name: 'Українська', regionEn: 'Ukraine' },
    { tier: 5, cc: 'by', lang: 'be',    name: 'Беларуская', regionEn: 'Belarus' },
    { tier: 5, cc: 'ru', lang: 'ru',    name: 'Русский', regionEn: 'Russia' },
    { tier: 5, cc: 'ee', lang: 'et',    name: 'Eesti', regionEn: 'Estonia' },
    { tier: 5, cc: 'lv', lang: 'lv',    name: 'Latviešu', regionEn: 'Latvia' },
    { tier: 5, cc: 'lt', lang: 'lt',    name: 'Lietuvių', regionEn: 'Lithuania' },
    { tier: 5, cc: 'mt', lang: 'mt',    name: 'Malti', regionEn: 'Malta' },
    { tier: 5, cc: 'lu', lang: 'lb',    name: 'Lëtzebuergesch', regionEn: 'Luxembourg' },
    { tier: 5, cc: 'ad', lang: 'ca',    name: 'Català', regionEn: 'Andorra' },
    // Tier 5 — Iberian subdivisions, Caribbean French-creole, Mediterranean Greek
    // (Celtic UK/Irish languages live in Tier 1 next to English (UK/Ireland).)
    { tier: 5, cc: 'es-pv',  lang: 'eu', name: 'Euskara', regionEn: 'Basque Country' },
    { tier: 5, cc: 'es-ga',  lang: 'gl', name: 'Galego', regionEn: 'Galicia' },
    { tier: 5, cc: 'ht',     lang: 'ht', name: 'Kreyòl Ayisyen', regionEn: 'Haiti' },
    { tier: 5, cc: 'cy',     lang: 'el', name: 'Ελληνικά (Κύπρος)', regionEn: 'Cyprus' },

    // Tier 6 — Remaining Eurasia (incl. Middle East, South Asia, SE Asia)
    { tier: 6, cc: 'kr', lang: 'ko',    name: '한국어', regionEn: 'South Korea' },
    { tier: 6, cc: 'vn', lang: 'vi',    name: 'Tiếng Việt', regionEn: 'Vietnam' },
    { tier: 6, cc: 'th', lang: 'th',    name: 'ไทย', regionEn: 'Thailand' },
    { tier: 6, cc: 'id', lang: 'id',    name: 'Bahasa Indonesia', regionEn: 'Indonesia' },
    { tier: 6, cc: 'my', lang: 'ms',    name: 'Bahasa Melayu', regionEn: 'Malaysia' },
    { tier: 6, cc: 'ph', lang: 'tl',    name: 'Filipino', regionEn: 'Philippines' },
    { tier: 6, cc: 'mm', lang: 'my',    name: 'မြန်မာ', regionEn: 'Myanmar' },
    { tier: 6, cc: 'kh', lang: 'km',    name: 'ខ្មែរ', regionEn: 'Cambodia' },
    { tier: 6, cc: 'la', lang: 'lo',    name: 'ລາວ', regionEn: 'Laos' },
    { tier: 6, cc: 'in', lang: 'hi',    name: 'हिन्दी', regionEn: 'India' },
    { tier: 6, cc: 'bd', lang: 'bn',    name: 'বাংলা', regionEn: 'Bangladesh' },
    { tier: 6, cc: 'pk', lang: 'ur',    name: 'اردو', regionEn: 'Pakistan' },
    { tier: 6, cc: 'lk', lang: 'si',    name: 'සිංහල', regionEn: 'Sri Lanka' },
    { tier: 6, cc: 'np', lang: 'ne',    name: 'नेपाली', regionEn: 'Nepal' },
    { tier: 6, cc: 'mn', lang: 'mn',    name: 'Монгол', regionEn: 'Mongolia' },
    { tier: 6, cc: 'kz', lang: 'kk',    name: 'Қазақша', regionEn: 'Kazakhstan' },
    { tier: 6, cc: 'uz', lang: 'uz',    name: 'Oʻzbek', regionEn: 'Uzbekistan' },
    { tier: 6, cc: 'kg', lang: 'ky',    name: 'Кыргызча', regionEn: 'Kyrgyzstan' },
    { tier: 6, cc: 'tj', lang: 'tg',    name: 'Тоҷикӣ', regionEn: 'Tajikistan' },
    { tier: 6, cc: 'af', lang: 'ps',    name: 'پښتو', regionEn: 'Afghanistan' },
    { tier: 6, cc: 'am', lang: 'hy',    name: 'Հայերեն', regionEn: 'Armenia' },
    { tier: 6, cc: 'az', lang: 'az',    name: 'Azərbaycan', regionEn: 'Azerbaijan' },
    { tier: 6, cc: 'ge', lang: 'ka',    name: 'ქართული', regionEn: 'Georgia' },
    { tier: 6, cc: 'tr', lang: 'tr',    name: 'Türkçe', regionEn: 'Turkey' },
    { tier: 6, cc: 'ir', lang: 'fa',    name: 'فارسی', regionEn: 'Iran' },
    { tier: 6, cc: 'iq', lang: 'ku',    name: 'Kurdî', regionEn: 'Iraq' },
    { tier: 6, cc: 'il', lang: 'he',    name: 'עברית', regionEn: 'Israel' },
    { tier: 6, cc: 'sa', lang: 'ar',    name: 'العربية', regionEn: 'Saudi Arabia' },
    { tier: 6, cc: 'ps', lang: 'ar',    name: 'العربية (فلسطين)', regionEn: 'Palestine' },
    { tier: 6, cc: 'ma', lang: 'ar',    name: 'العربية (المغرب)', regionEn: 'Morocco' },
    { tier: 6, cc: 'tn', lang: 'ar',    name: 'العربية (تونس)', regionEn: 'Tunisia' },
    { tier: 6, cc: 'eg', lang: 'ar',    name: 'العربية (مصر)', regionEn: 'Egypt' },
    { tier: 6, cc: 'lb', lang: 'ar',    name: 'العربية (لبنان)', regionEn: 'Lebanon' },
    { tier: 6, cc: 'bt', lang: 'dz',    name: 'རྫོང་ཁ', regionEn: 'Bhutan' },
    { tier: 6, cc: 'mv', lang: 'dv',    name: 'ދިވެހި', regionEn: 'Maldives' },

    // Tier 7 — Africa
    { tier: 7, cc: 'et', lang: 'am',    name: 'አማርኛ', regionEn: 'Ethiopia' },
    { tier: 7, cc: 'so', lang: 'so',    name: 'Soomaali', regionEn: 'Somalia' },
    { tier: 7, cc: 'ke', lang: 'sw',    name: 'Kiswahili', regionEn: 'Kenya' },
    { tier: 7, cc: 'za', lang: 'zu',    name: 'isiZulu', regionEn: 'South Africa' },
    { tier: 7, cc: 'ng', lang: 'ha',    name: 'Hausa', regionEn: 'Nigeria' },
    { tier: 7, cc: 'rw', lang: 'rw',    name: 'Kinyarwanda', regionEn: 'Rwanda' },
    { tier: 7, cc: 'mw', lang: 'ny',    name: 'Chichewa', regionEn: 'Malawi' },
    { tier: 7, cc: 'zw', lang: 'sn',    name: 'ChiShona', regionEn: 'Zimbabwe' },
    { tier: 7, cc: 'mg', lang: 'mg',    name: 'Malagasy', regionEn: 'Madagascar' },
    { tier: 7, cc: 'bw', lang: 'tn',    name: 'Setswana', regionEn: 'Botswana' },
    { tier: 7, cc: 'ls', lang: 'st',    name: 'Sesotho', regionEn: 'Lesotho' },

    // Tier 8 — Pacific / Oceania (outermost ring of the spiral)
    { tier: 8, cc: 'hawaii', lang: 'haw', name: 'ʻŌlelo Hawaiʻi', regionEn: 'Hawaii' },
    { tier: 8, cc: 'ws',     lang: 'sm',  name: 'Gagana Sāmoa', regionEn: 'Samoa' },
    { tier: 8, cc: 'maori',  lang: 'mi',  name: 'Te Reo Māori', regionEn: 'New Zealand' }
  ];

  var state = {
    built: false,
    open: false,
    overlayEl: null,
    anchorEl: null,
    /** @type {HTMLElement[]} */
    anchorEls: [],
    widgetLoading: false,
    widgetLoaded: false,
    pendingLang: null,
    reduceMotion: false,
    lastToggleTs: 0,
    animating: false,   // true while an explosion/implosion is in flight
    animTimer: null     // setTimeout id that clears `animating`
  };

  function safeGetStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSetStorage(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* quota/privacy */ }
  }

  /**
   * Convert an ISO-3166 alpha-2 code to the regional-indicator emoji pair.
   * Used only as the `onerror` fallback if the SVG fails to load.
   */
  function codeToFlagGlyph(cc) {
    if (!cc || cc.length !== 2) return '';
    var A = 127397;
    try {
      var up = cc.toUpperCase();
      return String.fromCodePoint(up.charCodeAt(0) + A, up.charCodeAt(1) + A);
    } catch (e) {
      return cc.toUpperCase();
    }
  }

  function showToast(message, ms) {
    var t = document.getElementById(TOAST_ID);
    if (!t) {
      t = document.createElement('div');
      t.id = TOAST_ID;
      t.className = 'globe-translator-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.classList.add('is-visible');
    if (t.__hideTimer) window.clearTimeout(t.__hideTimer);
    t.__hideTimer = window.setTimeout(function () {
      t.classList.remove('is-visible');
    }, ms || 2600);
  }

  /**
   * Replace a failed <img> with an emoji-glyph span so the flag entry
   * still communicates a country identity.
   */
  function swapImgForEmojiFallback(img) {
    try {
      var cc = img.getAttribute('data-cc') || '';
      var span = document.createElement('span');
      span.className = 'globe-translator-flag__emoji';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = codeToFlagGlyph(cc);
      img.parentNode.replaceChild(span, img);
    } catch (e) { /* noop */ }
  }

  /** Native `name` plus US-English country/region in parentheses — never a language name alone. */
  function flagButtonTooltip(item) {
    var r = item.regionEn;
    if (!r || typeof r !== 'string') return item.name;
    return item.name + ' (' + r + ')';
  }

  function buildOverlay() {
    if (state.built) return;
    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'globe-translator-overlay notranslate';
    overlay.setAttribute('translate', 'no');
    overlay.setAttribute('role', 'region');
    overlay.setAttribute('aria-label', 'Translate — click a flag to switch language');
    overlay.setAttribute('data-open', 'false');

    // Transparent layer over #q200 only: same geometry as the stage in app.css
    // so pointer-events pass through to sidebars/toolbars but not the canvas.
    var backdrop = document.createElement('div');
    backdrop.className = 'globe-translator-backdrop notranslate';
    backdrop.setAttribute('translate', 'no');
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.tabIndex = -1;
    function swallowStagePointer(ev) {
      ev.stopPropagation();
    }
    backdrop.addEventListener('mousedown', swallowStagePointer);
    backdrop.addEventListener('click', swallowStagePointer);
    overlay.appendChild(backdrop);

    // Flat list of flag buttons — positioned via inline left/top in
    // placeFlagsPolar(). No tier wrappers, no headings: "no hints, just fun".
    for (var i = 0; i < FLAGS_ORDERED.length; i++) {
      var item = FLAGS_ORDERED[i];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'globe-translator-flag';
      btn.setAttribute('data-lang', item.lang);
      btn.setAttribute('data-cc', item.cc);
      btn.setAttribute('data-idx', String(i));
      var tip = flagButtonTooltip(item);
      btn.setAttribute('aria-label', 'Translate to ' + tip);
      btn.setAttribute('title', tip);

      var img = document.createElement('img');
      img.className = 'globe-translator-flag__img';
      img.src = FLAG_ASSET_PATH + item.cc + '.svg';
      img.alt = '';
      img.setAttribute('data-cc', item.cc);
      // Intentionally NOT loading="lazy": the overlay is display:none
      // until first open, and browsers skip loading lazy images whose
      // parent has no layout — so they'd flash in only on first paint.
      // Decoding stays async so parsing doesn't block the main thread.
      img.setAttribute('decoding', 'async');
      img.setAttribute('draggable', 'false');
      (function (im) {
        im.addEventListener('error', function () { swapImgForEmojiFallback(im); }, { once: true });
      })(img);

      btn.appendChild(img);
      overlay.appendChild(btn);
    }

    // Hidden host for the lazy-loaded Google Translate widget.
    var gtHost = document.createElement('div');
    gtHost.id = GT_HOST_ID;
    gtHost.className = 'notranslate';
    gtHost.setAttribute('translate', 'no');
    gtHost.style.position = 'fixed';
    gtHost.style.left = '-9999px';
    gtHost.style.top = '0';
    gtHost.setAttribute('aria-hidden', 'true');
    document.body.appendChild(gtHost);

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (ev) {
      // While flags are retracting the CSS also sets pointer-events: none
      // on them, so this click should never even arrive. But if it does
      // (animation race, old cached CSS, etc.), drop it: a click on a
      // retracting flag is almost always an accidental "I meant the paw".
      if (overlay.getAttribute('data-retracting') === 'true') {
        console.log('[OGT] flag click IGNORED (retracting)');
        ev.stopPropagation();
        return;
      }
      // If the overlay isn't fully open (state.open === false), clicks
      // to flags are also ignored — the explosion/implosion is in flight.
      if (!state.open) {
        console.log('[OGT] flag click IGNORED (overlay not open)');
        ev.stopPropagation();
        return;
      }
      var target = ev.target;
      var flagBtn = target && target.closest ? target.closest('.globe-translator-flag') : null;
      if (flagBtn) {
        ev.stopPropagation();
        var lang = flagBtn.getAttribute('data-lang');
        console.log('[OGT] flag click ->', lang);
        markActiveFlag(lang);
        translateTo(lang);
        // Close after selection — the flags finish their reverse spiral
        // back into the paw, which feels like the translate "lands".
        // Same debounce timestamp so the follow-up close$() isn't
        // immediately re-opened by a phantom bubbled event.
        state.lastToggleTs = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
        close$();
      }
    });

    window.addEventListener('resize', function () {
      if (!state.open) return;
      if (polarResizeTimer) window.clearTimeout(polarResizeTimer);
      polarResizeTimer = window.setTimeout(function () {
        polarResizeTimer = null;
        if (state.open) placeFlagsPolar();
      }, 150);
    });

    try {
      state.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      state.reduceMotion = false;
    }

    state.overlayEl = overlay;
    state.built = true;
  }

  /**
   * Place every flag in a phyllotaxis (sunflower) spiral centered on the
   * globe anchor, BUT reject any slot that (a) would clip the viewport or
   * (b) sits closer than FLAG_MIN_DIST to an already-placed flag. On
   * rejection, the spiral advances to the next candidate slot.
   *
   * Net effect: index 0 (tier 1 / English) still lands as close to the
   * paw as geometry allows; tier 8 (Pacific) ends up on the outer
   * expansion. All 112 flags stay on-screen and keep ≥ 1 rem between
   * them. Readability wins over a mathematically pure spiral.
   *
   * If the viewport is extreme enough that we exhaust MAX_SPIRAL_TRIES
   * before placing every flag, the overflow flags are hidden rather
   * than allowed to stack or clip.
   */
  function placeFlagsPolar() {
    if (!state.overlayEl || !state.anchorEl) return;
    var flags = state.overlayEl.querySelectorAll('.globe-translator-flag');
    if (!flags.length) return;

    var anchorRect = state.anchorEl.getBoundingClientRect();
    var originX = anchorRect.left + anchorRect.width / 2;
    var originY = anchorRect.top + anchorRect.height / 2;

    var vw = window.innerWidth || document.documentElement.clientWidth;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var halfFlag = FLAG_PX_SIZE / 2;
    var minX = halfFlag + VIEWPORT_PAD;
    var maxX = vw - halfFlag - VIEWPORT_PAD;
    var minY = halfFlag + VIEWPORT_PAD;
    var maxY = vh - halfFlag - VIEWPORT_PAD;
    var minDistSq = FLAG_MIN_DIST * FLAG_MIN_DIST;

    var placed = []; // [{x, y}, ...] of center coordinates
    var spiralStep = 0;

    for (var i = 0; i < flags.length; i++) {
      var el = flags[i];
      var tries = 0;
      var cx, cy;
      var found = false;

      while (tries < MAX_SPIRAL_TRIES) {
        var angle = RADIAL_START + spiralStep * GOLDEN_ANGLE;
        var radius = RADIAL_BASE + RADIAL_SCALE * Math.sqrt(spiralStep);
        cx = originX + radius * Math.cos(angle);
        cy = originY + radius * Math.sin(angle);
        spiralStep++;
        tries++;

        if (cx < minX || cx > maxX || cy < minY || cy > maxY) continue;

        var clashes = false;
        for (var p = 0; p < placed.length; p++) {
          var ddx = placed[p].x - cx;
          var ddy = placed[p].y - cy;
          if (ddx * ddx + ddy * ddy < minDistSq) { clashes = true; break; }
        }
        if (clashes) continue;

        found = true;
        break;
      }

      if (found) {
        placed.push({ x: cx, y: cy });
        el.style.left = (cx - halfFlag) + 'px';
        el.style.top = (cy - halfFlag) + 'px';
        el.style.visibility = '';
      } else {
        // Viewport too small to fit every flag — hide the overflow gracefully.
        el.style.visibility = 'hidden';
      }
    }
  }

  function markActiveFlag(lang) {
    if (!state.overlayEl) return;
    var all = state.overlayEl.querySelectorAll('.globe-translator-flag');
    for (var i = 0; i < all.length; i++) {
      all[i].classList.toggle('is-active', all[i].getAttribute('data-lang') === lang);
    }
    safeSetStorage(STORAGE_KEY_LANG, lang || '');
  }

  /**
   * Cancel every Web Animations API animation currently attached to the
   * flag buttons. Used before starting an explosion or implosion so the
   * two directions never fight over the same element.
   */
  function cancelFlagAnimations(flags) {
    for (var k = 0; k < flags.length; k++) {
      var el = flags[k];
      if (!el.getAnimations) continue;
      var anims = el.getAnimations();
      for (var a = 0; a < anims.length; a++) {
        try { anims[a].cancel(); } catch (e) { /* noop */ }
      }
    }
  }

  /**
   * Radial spiral-burst entry. Each flag's resting position is already set
   * on its inline left/top via placeFlagsPolar(); the animation only needs
   * to translate it IN from the globe's origin to (0, 0) along a curved
   * arc. Delay stagger runs in declared index order so the ripple
   * visually expands outward from the globe.
   */
  function playFlagExplosion() {
    if (!state.overlayEl || !state.anchorEl) return;
    placeFlagsPolar();
    var flags = state.overlayEl.querySelectorAll('.globe-translator-flag');
    if (!flags.length) return;

    cancelFlagAnimations(flags);

    if (state.reduceMotion) {
      for (var r = 0; r < flags.length; r++) {
        if (flags[r].style.visibility === 'hidden') { flags[r].style.opacity = '0'; continue; }
        flags[r].style.opacity = '1';
      }
      return;
    }

    var anchorRect = state.anchorEl.getBoundingClientRect();
    var originX = anchorRect.left + anchorRect.width / 2;
    var originY = anchorRect.top + anchorRect.height / 2;

    // Spiral tuning
    var CURL_DEG = 32;
    var MID_FRACTION = 0.55;
    var PER_FLAG_MS = 620;
    var STAGGER_MS = 5;
    var MAX_STAGGER_MS = 420;
    var curlRad = (CURL_DEG * Math.PI) / 180;

    for (var i = 0; i < flags.length; i++) {
      var el = flags[i];
      if (el.style.visibility === 'hidden') { el.style.opacity = '0'; continue; }

      var left = parseFloat(el.style.left) || 0;
      var top = parseFloat(el.style.top) || 0;
      var fx = left + FLAG_PX_SIZE / 2;
      var fy = top + FLAG_PX_SIZE / 2;
      var dx = fx - originX;
      var dy = fy - originY;
      var radius = Math.sqrt(dx * dx + dy * dy) || 1;
      var theta = Math.atan2(dy, dx);

      var startTx = -dx;
      var startTy = -dy;

      var midTheta = theta - curlRad;
      var midR = radius * MID_FRACTION;
      var midTx = Math.cos(midTheta) * midR - dx;
      var midTy = Math.sin(midTheta) * midR - dy;

      var delay = Math.min(i * STAGGER_MS, MAX_STAGGER_MS);

      try {
        var anim = el.animate(
          [
            {
              transform: 'translate(' + startTx + 'px, ' + startTy + 'px) scale(0.15) rotate(-18deg)',
              opacity: 0
            },
            {
              transform: 'translate(' + midTx + 'px, ' + midTy + 'px) scale(0.85) rotate(-6deg)',
              opacity: 0.92,
              offset: 0.45
            },
            {
              transform: 'translate(0,0) scale(1) rotate(0deg)',
              opacity: 1
            }
          ],
          {
            duration: PER_FLAG_MS,
            delay: delay,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards'
          }
        );
        // Once the flag lands, release the WAAPI hold on `transform` so
        // CSS :hover (which also sets transform) can actually animate the
        // grow-on-hover. Without this, fill:'forwards' keeps the
        // animation's end transform and outranks CSS until the next
        // explosion replaces it.
        (function (elem, animation) {
          if (!animation || !animation.finished || typeof animation.finished.then !== 'function') return;
          animation.finished.then(function () {
            try { animation.cancel(); } catch (e) { /* noop */ }
            elem.style.removeProperty('transform');
            elem.style.opacity = '1';
          }, function () { /* cancelled — implosion took over */ });
        })(el, anim);
      } catch (e) {
        el.style.opacity = '1';
      }
    }
  }

  /**
   * Reverse of playFlagExplosion: flags retract back to the paw/globe
   * origin along a mirrored curved arc. Outer flags leave first, inner
   * flags last, so the ripple visually collapses inward. Invokes
   * onComplete() once every flag has finished animating.
   */
  function playFlagImplosion(onComplete) {
    var done = function () { if (onComplete) { try { onComplete(); } catch (e) { /* noop */ } } };
    if (!state.overlayEl || !state.anchorEl) { done(); return; }
    var flags = state.overlayEl.querySelectorAll('.globe-translator-flag');
    if (!flags.length) { done(); return; }

    cancelFlagAnimations(flags);

    if (state.reduceMotion) {
      for (var r = 0; r < flags.length; r++) flags[r].style.opacity = '0';
      done();
      return;
    }

    var anchorRect = state.anchorEl.getBoundingClientRect();
    var originX = anchorRect.left + anchorRect.width / 2;
    var originY = anchorRect.top + anchorRect.height / 2;

    // Mirror-tune of the explosion
    var CURL_DEG = -32;
    var MID_FRACTION = 0.55;
    var PER_FLAG_MS = 520;
    var STAGGER_MS = 4;
    var MAX_STAGGER_MS = 320;
    var curlRad = (CURL_DEG * Math.PI) / 180;

    var N = flags.length;
    var longestFinish = 0;

    for (var i = 0; i < N; i++) {
      // Reverse stagger: outer flags (high index) retract first.
      var idx = N - 1 - i;
      var el = flags[idx];
      if (el.style.visibility === 'hidden') { el.style.opacity = '0'; continue; }

      var left = parseFloat(el.style.left) || 0;
      var top = parseFloat(el.style.top) || 0;
      var fx = left + FLAG_PX_SIZE / 2;
      var fy = top + FLAG_PX_SIZE / 2;
      var dx = fx - originX;
      var dy = fy - originY;
      var radius = Math.sqrt(dx * dx + dy * dy) || 1;
      var theta = Math.atan2(dy, dx);

      var endTx = -dx;
      var endTy = -dy;

      var midTheta = theta - curlRad;
      var midR = radius * MID_FRACTION;
      var midTx = Math.cos(midTheta) * midR - dx;
      var midTy = Math.sin(midTheta) * midR - dy;

      var delay = Math.min(i * STAGGER_MS, MAX_STAGGER_MS);
      var finish = delay + PER_FLAG_MS;
      if (finish > longestFinish) longestFinish = finish;

      try {
        el.animate(
          [
            {
              transform: 'translate(0,0) scale(1) rotate(0deg)',
              opacity: 1
            },
            {
              transform: 'translate(' + midTx + 'px, ' + midTy + 'px) scale(0.85) rotate(6deg)',
              opacity: 0.9,
              offset: 0.55
            },
            {
              transform: 'translate(' + endTx + 'px, ' + endTy + 'px) scale(0.15) rotate(18deg)',
              opacity: 0
            }
          ],
          {
            duration: PER_FLAG_MS,
            delay: delay,
            easing: 'cubic-bezier(0.64, 0, 0.78, 0)',
            fill: 'forwards'
          }
        );
      } catch (e) {
        el.style.opacity = '0';
      }
    }

    window.setTimeout(done, longestFinish + 40);
  }

  function open$() {
    if (!state.built) buildOverlay();
    if (state.open) return;
    console.log('[OGT] open');
    state.open = true;
    state.overlayEl.setAttribute('data-open', 'true');
    // Clear the "retracting" flag that blocks flag clicks during implosion.
    state.overlayEl.removeAttribute('data-retracting');
    state.anchorEl && state.anchorEl.setAttribute('aria-expanded', 'true');
    for (var ai = 0; ai < state.anchorEls.length; ai++) {
      state.anchorEls[ai].setAttribute('aria-expanded', 'true');
    }

    // Start loading the Google Translate widget the moment the user
    // signals translation intent (opens the flag cloud). By the time
    // they actually pick a flag — typically 1-3s later while they scan
    // the options — the widget has finished its async init handshake,
    // so the very first flag click reliably translates the page.
    // Without this, the first applyLanguage() fires against a widget
    // whose select exists but whose internal pipeline isn't wired yet,
    // and the dispatch lands in the void (bug: "first click does
    // nothing, second flag works").
    if (!state.widgetLoaded && !state.widgetLoading) {
      console.log('[OGT] preloading GT widget on paw open');
      loadGoogleTranslateWidget();
    }

    // Budget: per-flag 620ms + max stagger 420ms + buffer.
    markAnimating(1100);

    var saved = safeGetStorage(STORAGE_KEY_LANG);
    if (saved) markActiveFlag(saved);

    requestAnimationFrame(playFlagExplosion);
  }

  function close$() {
    if (!state.open) return;
    console.log('[OGT] close');
    state.open = false;
    state.anchorEl && state.anchorEl.setAttribute('aria-expanded', 'false');
    for (var aj = 0; aj < state.anchorEls.length; aj++) {
      state.anchorEls[aj].setAttribute('aria-expanded', 'false');
    }

    // While flags are retracting they physically cover the paw button.
    // Tagging the overlay lets CSS switch every flag to pointer-events: none
    // so a rapid-second click goes THROUGH the flags to the paw (re-opening)
    // instead of being hijacked by whichever flag is currently over the
    // cursor. Without this, a mid-implosion click re-fires translateTo()
    // with the wrong language and also stacks another close$() behind it,
    // which is what produces the oscillation + "first click doesn't
    // translate" behavior.
    if (state.overlayEl) state.overlayEl.setAttribute('data-retracting', 'true');

    // Budget: per-flag 520ms + max stagger 320ms + buffer.
    markAnimating(900);

    playFlagImplosion(function () {
      // If the user re-opened the overlay mid-implosion, bail out — the
      // new open$() call already scheduled its own explosion.
      if (state.open) return;
      if (!state.overlayEl) return;
      state.overlayEl.setAttribute('data-open', 'false');
      state.overlayEl.removeAttribute('data-retracting');
      var flags = state.overlayEl.querySelectorAll('.globe-translator-flag');
      // Strip WAAPI fill:forwards so opacity/transform never outrank the next open.
      cancelFlagAnimations(flags);
      for (var i = 0; i < flags.length; i++) flags[i].style.opacity = '0';
    });
  }

  function toggle() {
    // Hard guard: if an animation is in flight, ignore the toggle.
    if (state.animating) return;

    // Debounce rapid repeat triggers. Swallows any phantom second click
    // inside the lockout window.
    var now = (window.performance && window.performance.now) ? window.performance.now() : Date.now();
    if (now - state.lastToggleTs < 200) return;
    state.lastToggleTs = now;
    if (state.open) close$(); else open$();
  }

  function markAnimating(totalMs) {
    state.animating = true;
    if (state.animTimer) { window.clearTimeout(state.animTimer); state.animTimer = null; }
    state.animTimer = window.setTimeout(function () {
      state.animating = false;
      state.animTimer = null;
    }, totalMs);
  }

  function loadGoogleTranslateWidget() {
    if (state.widgetLoaded || state.widgetLoading) return;
    state.widgetLoading = true;

    window.__ossGoogleTranslateInit = function () {
      try {
        if (!window.google || !window.google.translate) {
          onWidgetFail();
          return;
        }
        new window.google.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false },
          GT_HOST_ID
        );
        state.widgetLoaded = true;
        state.widgetLoading = false;
        console.log('[OGT] GT widget ready  pendingLang=' + state.pendingLang);
        if (state.pendingLang) {
          var p = state.pendingLang;
          state.pendingLang = null;
          // Poll immediately — applyLanguage already retries on its own
          // timer if the <select> hasn't materialized yet. The 60ms
          // delay we used to schedule was just guessing at GT's internal
          // render time and added a flake window on first use.
          applyLanguage(p);
        }
      } catch (e) {
        onWidgetFail();
      }
    };

    var s = document.createElement('script');
    s.src = WIDGET_SRC;
    s.async = true;
    s.onerror = onWidgetFail;
    document.head.appendChild(s);
  }

  function onWidgetFail() {
    state.widgetLoading = false;
    state.widgetLoaded = false;
    state.pendingLang = null;
    showToast('Translator offline — check your connection.', 3200);
  }

  /**
   * Program the Google Translate widget by setting its hidden <select> and
   * firing a change event. The widget swaps text in-place, so repeat calls
   * simply switch languages. Passing 'en' restores English.
   *
   * The widget constructor returns immediately but the <select> it
   * creates is inserted asynchronously — typically 100-600ms later.
   * If the select isn't there yet we retry on an rAF loop for up to
   * ~4 seconds so the *first* flag click still lands its translation
   * rather than silently deferring to the next user interaction.
   */
  function applyLanguage(lang, attempt) {
    var a = attempt || 0;
    var sel = document.querySelector('#' + GT_HOST_ID + ' select.goog-te-combo') ||
              document.querySelector('select.goog-te-combo');
    if (!sel) {
      if (a < 40) {
        if (a === 0) console.log('[OGT] applyLanguage(' + lang + ') waiting for <select>');
        window.setTimeout(function () { applyLanguage(lang, a + 1); }, 100);
      } else {
        // Widget is taking way too long — stash the intent so the next
        // translateTo() call can pick it up and try again.
        console.log('[OGT] applyLanguage(' + lang + ') GAVE UP after 40 tries');
        state.pendingLang = lang;
        showToast('Translator is slow — try again.', 2600);
      }
      return;
    }
    try {
      console.log('[OGT] applyLanguage(' + lang + ') select found on attempt ' + a);
      sel.value = lang;
      // Google Translate's combo box is wired to bubbling change +
      // input events. Firing a non-bubbling synthetic `change` alone is
      // inconsistent across GT widget versions — the first translation
      // request after widget load sometimes silently no-ops. Dispatch
      // both with bubbles: true to match how a real user interaction
      // fires, which reliably triggers the translation pipeline.
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {
      console.log('[OGT] applyLanguage error', e);
      showToast('Could not switch language.', 2600);
    }
  }

  function translateTo(lang) {
    if (!lang) return;
    if (!state.widgetLoaded) {
      state.pendingLang = lang;
      loadGoogleTranslateWidget();
      showToast('Loading translator…', 1400);
      return;
    }
    applyLanguage(lang);
  }

  const api = {
    init,
    open: open$,
    close: close$,
    toggle,
    translateTo,
  };

  function onAnchorClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.currentTarget instanceof HTMLElement) {
      state.anchorEl = ev.currentTarget;
    }
    toggle();
  }

  function init() {
    state.anchorEls = anchorIds
      .map(function (id) {
        return document.getElementById(id);
      })
      .filter(function (el) {
        return el instanceof HTMLElement;
      });
    if (!state.anchorEls.length) return null;
    state.anchorEl = state.anchorEls[0];
    for (var i = 0; i < state.anchorEls.length; i++) {
      var anchor = state.anchorEls[i];
      anchor.setAttribute('aria-expanded', 'false');
      anchor.setAttribute('aria-haspopup', 'true');
      anchor.addEventListener('click', onAnchorClick);
    }

    document.addEventListener('keydown', function (ev) {
      if (!state.open) return;
      if (ev.key === 'Escape') {
        ev.preventDefault();
        close$();
      }
    });

    return api;
  }

  init();
  return api;
}
