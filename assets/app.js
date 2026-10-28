/* =====================================================================
 * 정이한 첫돌 잔치 초대장
 * ---------------------------------------------------------------------
 * ✏️ 사진 바꾸는 법
 *   1) 사진 파일을 assets/photos/ 폴더에 넣으세요 (예: 01.jpg)
 *   2) 아래 PHOTOS 배열에서 해당 칸의 src 를 'assets/photos/01.jpg' 로 바꾸세요
 *   3) 칸을 늘리거나 줄이려면 줄을 추가/삭제하면 됩니다. src 가 비어 있으면 일러스트 자리표시가 보입니다.
 * ===================================================================== */
var PHOTOS = [
  { src: '', alt: '이한이 사진 1', caption: '엉금엉금 기어다니던 날' },
  { src: '', alt: '이한이 사진 2', caption: '처음 웃어준 날' },
  { src: '', alt: '이한이 사진 3', caption: '까르르 폭소' },
  { src: '', alt: '이한이 사진 4', caption: '쑥쑥 자란 이한이' }
];

/* 행사 정보 (필요하면 여기만 고치세요) */
var EVENT = {
  title: '정이한 첫돌 잔치',
  startISO: '2027-04-03T11:00:00+09:00',
  endISO: '2027-04-03T13:00:00+09:00',
  location: '고메스퀘어 동탄직영점 (룸 3번)',
  address: '경기 화성시 동탄구 동탄역로 102 엘리스빌 3층 (Gate 6)',
  description: '이한이의 첫 번째 생일에 초대합니다. 런치 1부 (11:00~13:00). 건물 지하 무료 주차 2시간 지원. 아빠 정성훈 · 엄마 김수림'
};

/* ---------------- 순수 로직 (node 로 테스트 가능) ---------------- */
var KST = 9 * 3600 * 1000, DAY = 86400000;

function kstDayNumber(ms) { return Math.floor((ms + KST) / DAY); }

/** 남은 시간 계산: now(ms) 기준 */
function computeCountdown(nowMs, ev) {
  var start = Date.parse(ev.startISO), end = Date.parse(ev.endISO);
  var diff = Math.max(0, start - nowMs);
  var dDay = kstDayNumber(start) - kstDayNumber(nowMs); // 한국 날짜 기준 D-day
  var state = nowMs >= end ? 'over' : (nowMs >= start ? 'live' : (dDay === 0 ? 'today' : 'before'));
  return {
    state: state, dDay: dDay,
    days: Math.floor(diff / DAY),
    hours: Math.floor(diff % DAY / 3600000),
    minutes: Math.floor(diff % 3600000 / 60000),
    seconds: Math.floor(diff % 60000 / 1000)
  };
}

function ddayLabel(c) {
  if (c.state === 'over') return 'D+' + Math.max(1, -c.dDay);
  if (c.dDay === 0) return 'D-DAY';
  return 'D-' + c.dDay;
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function icsStamp(ms) {
  var d = new Date(ms);
  return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' +
    pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
}
function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
/** RFC5545 75옥텟 줄접기 (UTF-8 바이트 기준, 문자 경계 유지) */
function icsFold(line) {
  var out = [], cur = '', bytes = 0, limit = 75;
  for (var i = 0; i < line.length; ) {
    var cp = line.codePointAt(i), ch = String.fromCodePoint(cp);
    var b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + b > limit) { out.push(cur); cur = ' '; bytes = 1; limit = 75; }
    cur += ch; bytes += b; i += ch.length;
  }
  out.push(cur);
  return out.join('\r\n');
}
function buildICS(ev, nowMs) {
  var lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ihan First Birthday//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:ihan-first-birthday-20270403@invite',
    'DTSTAMP:' + icsStamp(nowMs),
    'DTSTART:' + icsStamp(Date.parse(ev.startISO)),
    'DTEND:' + icsStamp(Date.parse(ev.endISO)),
    'SUMMARY:' + icsEscape(ev.title),
    'LOCATION:' + icsEscape(ev.location + ' / ' + ev.address),
    'DESCRIPTION:' + icsEscape(ev.description),
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(ev.title), 'TRIGGER:-P1D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(ev.title), 'TRIGGER:-PT2H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

/* 갤러리 자리표시 일러스트 (파스텔 SVG) */
var PH_ART = [
  '<rect width="300" height="400" fill="#ffe3d3"/><circle cx="150" cy="150" r="58" fill="#ffb9a0"/><path d="M150 208 q-12 40 8 74" stroke="#c98a62" stroke-width="3" fill="none"/><circle cx="130" cy="132" r="14" fill="#fff" opacity=".45"/><circle cx="70" cy="320" r="26" fill="#fff" opacity=".5"/><circle cx="240" cy="90" r="18" fill="#fff6c9"/>',
  '<rect width="300" height="400" fill="#dff1e6"/><circle cx="150" cy="170" r="70" fill="#fff6d6"/><circle cx="118" cy="132" r="26" fill="#fff6d6"/><circle cx="182" cy="132" r="26" fill="#fff6d6"/><circle cx="130" cy="170" r="6" fill="#7a5b48"/><circle cx="170" cy="170" r="6" fill="#7a5b48"/><ellipse cx="150" cy="192" rx="12" ry="8" fill="#e8b79b"/><circle cx="62" cy="330" r="22" fill="#fff" opacity=".6"/>',
  '<rect width="300" height="400" fill="#e9e1f7"/><path d="M150 90 l17 38 41 5 -31 28 9 41 -36 -21 -36 21 9 -41 -31 -28 41 -5z" fill="#fff0a8"/><circle cx="70" cy="300" r="10" fill="#fff"/><circle cx="232" cy="320" r="14" fill="#ffd3de"/><circle cx="220" cy="80" r="8" fill="#fff"/>',
  '<rect width="300" height="400" fill="#dcedf8"/><rect x="95" y="190" width="110" height="70" rx="10" fill="#fff"/><rect x="95" y="190" width="110" height="22" rx="10" fill="#ffc4d2"/><rect x="146" y="150" width="8" height="40" fill="#f6b08f"/><ellipse cx="150" cy="143" rx="7" ry="11" fill="#ffd36e"/><circle cx="236" cy="300" r="20" fill="#fff" opacity=".6"/>'
];
function placeholderSVG(i) {
  return '<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="사진 자리표시">' +
    PH_ART[i % PH_ART.length] +
    '<text x="150" y="360" text-anchor="middle" font-size="17" fill="#a9856b" font-family="sans-serif">📷 사진이 들어올 자리</text></svg>';
}

/* 이스케이프 유틸 */
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeCountdown: computeCountdown, ddayLabel: ddayLabel, buildICS: buildICS, icsFold: icsFold, EVENT: EVENT, PHOTOS: PHOTOS };
}

/* ---------------- 브라우저 전용 ---------------- */
(function () {
  if (typeof document === 'undefined') return;
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 토스트 */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* 갤러리 */
  var grid = $('#photoGrid');
  if (grid) {
    grid.innerHTML = PHOTOS.map(function (p, i) {
      var has = p.src && String(p.src).trim();
      var inner = has
        ? '<img src="' + esc(p.src) + '" alt="' + esc(p.alt || '') + '" loading="lazy" decoding="async" data-i="' + i + '">'
        : placeholderSVG(i);
      var hint = has ? '' : '<small>assets/photos/' + pad2(i + 1) + '.jpg</small>';
      return '<figure class="shot reveal" style="--rd:' + (i % 2) * 0.12 + 's"><div class="ph">' + inner + '</div>' +
        '<figcaption>' + esc(p.caption || '') + hint + '</figcaption></figure>';
    }).join('');
    grid.addEventListener('error', function (e) { // 이미지 로드 실패 시 자리표시로 대체
      var t = e.target;
      if (t && t.tagName === 'IMG') { t.parentNode.innerHTML = placeholderSVG(+t.getAttribute('data-i') || 0); }
    }, true);
  }

  /* 스크롤 리빌 */
  function setupReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }
  setupReveal();

  /* 카운트다운 */
  var cdBox = $('#countdown');
  function tick() {
    if (!cdBox) return;
    var c = computeCountdown(Date.now(), EVENT);
    var big = $('#dday'), grid4 = $('#cdGrid'), lab = $('#cdLabel'), done = $('#cdDone');
    if (c.state === 'over') {
      big.textContent = ddayLabel(c); grid4.hidden = true; done.hidden = false;
      done.textContent = '이한이의 첫돌 잔치가 즐겁게 마무리되었어요 💛'; lab.textContent = '와주셔서 감사합니다';
      return false;
    }
    big.textContent = ddayLabel(c);
    if (c.state === 'live') { grid4.hidden = true; done.hidden = false; done.textContent = '🎉 지금 잔치가 한창이에요!'; lab.textContent = '2027.04.03 (토)'; return false; }
    lab.textContent = c.state === 'today' ? '오늘이에요! 오전 11시에 만나요 🎈' : '이한이의 첫 생일까지';
    $('#cdD').textContent = c.days; $('#cdH').textContent = pad2(c.hours);
    $('#cdM').textContent = pad2(c.minutes); $('#cdS').textContent = pad2(c.seconds);
    return true;
  }
  if (cdBox) { tick(); var cdTimer = setInterval(function () { if (tick() === false) clearInterval(cdTimer); }, 1000); }

  /* 캘린더 (.ics) */
  var calBtn = $('#calBtn');
  if (calBtn) calBtn.addEventListener('click', function () {
    var text = buildICS(EVENT, Date.now());
    try {
      var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'ihan-first-birthday.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('캘린더 파일을 내려받았어요. 열어서 추가해 주세요 📅');
    } catch (err) {
      location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text);
    }
  });

  /* 주소 복사 */
  var copyBtn = $('#copyBtn');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var done = function () { toast('주소가 복사되었어요 📋'); };
    var fallback = function () {
      var ta = document.createElement('textarea'); ta.value = EVENT.address; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? done() : toast('길게 눌러 주소를 복사해 주세요'); } catch (e) { toast('길게 눌러 주소를 복사해 주세요'); }
      ta.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(EVENT.address).then(done, fallback); else fallback();
  });

  /* 풍선 & 컨페티 */
  function startFX() {
    var fx = $('#fx'); if (!fx || reduce || fx.children.length) return;
    var setH = function () { fx.style.setProperty('--h', (fx.parentNode.offsetHeight || 1500) + 'px'); };
    setH(); window.addEventListener('resize', setH); window.addEventListener('load', setH);
    var colors = ['#ffb9a0', '#ffe08a', '#bfe3cf', '#d7c9f2', '#ffc4d2', '#bfe0f3'];
    var h = '';
    for (var i = 0; i < 4; i++) {
      h += '<i class="balloon" style="left:' + (8 + i * 24 + (i % 2) * 4) + '%;--c:' + colors[i % colors.length] + ';--d:' + (16 + (i * 3) % 9) + 's;--delay:' + (-i * 3.1) + 's;--sway:' + ((i % 2 ? 1 : -1) * (14 + i * 3)) + 'px"></i>';
    }
    for (var j = 0; j < 10; j++) {
      h += '<i class="confetti' + (j % 3 === 0 ? ' round' : '') + '" style="left:' + ((j * 37 + 5) % 100) + '%;--c:' + colors[(j + 2) % colors.length] + ';--s:' + (6 + (j % 3) * 2) + 'px;--d:' + (9 + (j * 5) % 8) + 's;--delay:' + (-(j * 1.7)) + 's;--drift:' + ((j % 2 ? 1 : -1) * (20 + (j * 7) % 50)) + 'px"></i>';
    }
    fx.innerHTML = h;
  }

  /* 비디오 */
  var v = $('#babyVideo'), soundBtn = $('#soundBtn');
  var userPaused = false, autoPausing = false, inView = false, started = false;
  function syncSound() {
    if (!soundBtn || !v) return;
    var on = !v.muted && v.volume > 0;
    soundBtn.setAttribute('data-on', on ? 'true' : 'false');
    soundBtn.textContent = on ? '🔇 소리 끄기' : '🔊 소리 켜기';
  }
  function tryPlay() { if (!v || reduce) return; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  if (v) {
    v.addEventListener('volumechange', syncSound);
    v.addEventListener('pause', function () { if (!autoPausing && !v.ended) userPaused = true; autoPausing = false; });
    v.addEventListener('play', function () { userPaused = false; });
    if (soundBtn) soundBtn.addEventListener('click', function () {
      if (v.muted || v.volume === 0) { v.muted = false; v.volume = 1; v.currentTime = 0; userPaused = false; tryPlayForce(); }
      else v.muted = true;
      syncSound();
    });
    syncSound();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        inView = ents[0].isIntersecting;
        if (!started) return;
        if (inView && !userPaused) tryPlay();
        else if (!inView && !v.paused) { autoPausing = true; v.pause(); }
      }, { threshold: 0.35 }).observe(v);
    } else inView = true;
  }
  function tryPlayForce() { var p = v.play(); if (p && p.catch) p.catch(function () { toast('재생 버튼을 눌러 주세요 ▶'); }); }

  /* 도어 인트로 */
  var intro = $('#intro'), opened = false;
  function afterOpen() {
    root.classList.remove('intro-lock');
    if (intro) intro.classList.add('gone');
    window.scrollTo(0, 0);
    started = true; startFX();
    if (v && (inView || !('IntersectionObserver' in window))) tryPlay();
  }
  function openDoor() {
    if (opened) return; opened = true;
    if (!intro) return afterOpen();
    intro.classList.add('open');
    // 도어가 열리는 동안 즉시 스크롤 잠금 해제 + 안전장치 타이머
    setTimeout(afterOpen, reduce ? 350 : 1750);
  }
  if (intro && root.classList.contains('js')) {
    if (/[?&#]skip\b/.test(location.search + location.hash)) { opened = true; intro.classList.add('gone'); root.classList.remove('intro-lock'); started = true; startFX(); }
    else {
      intro.addEventListener('click', openDoor);
      intro.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); openDoor(); } });
      intro.addEventListener('wheel', openDoor, { passive: true });
      var ty = null;
      intro.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
      intro.addEventListener('touchmove', function (e) { if (ty !== null && Math.abs(e.touches[0].clientY - ty) > 24) openDoor(); }, { passive: true });
      try { intro.focus({ preventScroll: true }); } catch (e) {}
    }
  } else { started = true; startFX(); }
})();
