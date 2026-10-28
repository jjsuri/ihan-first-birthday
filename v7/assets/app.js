/* =====================================================================
 * 이한이의 첫 번째 생일 — 편집 안내
 * 1) 갤러리: 사진을 assets/photos/ 에 넣고 assets/photos/manifest.json 의 "gallery" 목록에 파일명을 적으면 '함께한 순간들' 섹션이 나타나요.
 *    목록이 비어 있으면(기본값) 섹션 전체가 숨겨지고 사진 파일도 요청하지 않아요. (첫 사진은 크게)
 * 2) 성장 기록: manifest.json 의 "timeline" 에 "m1.jpg" 처럼 적으면 '이한이의 1년' 섹션이 나타나요. (아래 MILESTONES 의 문구 사용)
 *    MILESTONES 의 date('2026. 04. 03' 처럼), note 는 선택 입력입니다. (날짜는 실제 값으로 직접 입력)
 * 3) 배경 영상(항상 재생, 색보정됨): assets/bg.mp4(소리 없음, 상시 재생) / assets/bg_sound.mp4(소리 버튼을 눌렀을 때만 로드).
 * ===================================================================== */
var PHOTOS = [
  { src: 'assets/photos/01.jpg', alt: '이한이 사진 1' },
  { src: 'assets/photos/02.jpg', alt: '이한이 사진 2' },
  { src: 'assets/photos/03.jpg', alt: '이한이 사진 3' },
  { src: 'assets/photos/04.jpg', alt: '이한이 사진 4' },
  { src: 'assets/photos/05.jpg', alt: '이한이 사진 5' },
  { src: 'assets/photos/06.jpg', alt: '이한이 사진 6' }
];
var MILESTONES = [
  { en: 'Born',        label: '태어난 날', date: '', note: '', photo: 'assets/photos/m1.jpg' },
  { en: '100 days',    label: '100일',    date: '', note: '', photo: 'assets/photos/m2.jpg' },
  { en: 'First steps', label: '첫 걸음',  date: '', note: '', photo: 'assets/photos/m3.jpg' },
  { en: 'One year',    label: '첫 돌',    date: '', note: '', photo: 'assets/photos/m4.jpg' }
];
var PARENTS = { dad: { name: '아빠', tel: '010-2500-9017' }, mom: { name: '엄마', tel: '010-4046-0796' } };
var EVENT = {
  title: '이한이의 첫 번째 생일 (정이한 첫돌 잔치)',
  startISO: '2027-04-03T11:00:00+09:00',
  endISO: '2027-04-03T13:00:00+09:00',
  location: '고메스퀘어 동탄직영점 (룸 3번)',
  address: '경기 화성시 동탄구 동탄역로 102 엘리스빌 3층 (Gate 6)',
  description: '이한이의 첫 번째 생일에 초대합니다. 런치 1부 (11:00~13:00). 건물 지하 무료 주차 2시간. 아빠 정성훈 · 엄마 김수림'
};

/* ---------------- 순수 로직 (node 테스트 대상) ---------------- */
var KST = 9 * 3600 * 1000, DAY = 86400000;
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function kstDayNumber(ms) { return Math.floor((ms + KST) / DAY); }

function computeCountdown(nowMs, ev) {
  var start = Date.parse(ev.startISO), end = Date.parse(ev.endISO);
  var diff = Math.max(0, start - nowMs);
  var dDay = kstDayNumber(start) - kstDayNumber(nowMs);
  var state = nowMs >= end ? 'over' : (nowMs >= start ? 'live' : (dDay === 0 ? 'today' : 'before'));
  return { state: state, dDay: dDay, days: Math.floor(diff / DAY), hours: Math.floor(diff % DAY / 3600000),
    minutes: Math.floor(diff % 3600000 / 60000), seconds: Math.floor(diff % 60000 / 1000) };
}
function ddayLabel(c) {
  if (c.state === 'over') return 'D+' + Math.max(1, -c.dDay);
  return c.dDay === 0 ? 'D-DAY' : 'D-' + c.dDay;
}

/** 달력 데이터: month 는 1~12. 일요일 시작. */
function buildMonth(year, month) {
  var first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  var days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  var cells = [], i;
  for (i = 0; i < first; i++) cells.push(null);
  for (i = 1; i <= days; i++) cells.push(i);
  while (cells.length % 7) cells.push(null);
  var weeks = [];
  for (i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { year: year, month: month, firstDow: first, days: days, weeks: weeks };
}
function weekdayOf(y, m, d) { return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }

function icsStamp(ms) {
  var d = new Date(ms);
  return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
}
function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function icsFold(line) {
  var out = [], cur = '', bytes = 0;
  for (var i = 0; i < line.length; ) {
    var cp = line.codePointAt(i), ch = String.fromCodePoint(cp);
    var b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + b > 75) { out.push(cur); cur = ' '; bytes = 1; }
    cur += ch; bytes += b; i += ch.length;
  }
  out.push(cur);
  return out.join('\r\n');
}
function buildICS(ev, nowMs) {
  var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ihan First Birthday//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', 'UID:ihan-first-birthday-20270403@invite',
    'DTSTAMP:' + icsStamp(nowMs), 'DTSTART:' + icsStamp(Date.parse(ev.startISO)), 'DTEND:' + icsStamp(Date.parse(ev.endISO)),
    'SUMMARY:' + icsEscape(ev.title), 'LOCATION:' + icsEscape(ev.location + ' / ' + ev.address), 'DESCRIPTION:' + icsEscape(ev.description),
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(ev.title), 'TRIGGER:-P1D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(ev.title), 'TRIGGER:-PT2H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

/** RSVP 문자 링크 (iOS/Android 공용 형식: sms:번호?&body=) */
function buildSms(tel, name, going, count) {
  var n = String(name || '').trim(), c = Math.max(1, Math.min(20, parseInt(count, 10) || 1));
  var body = going
    ? '[이한이 첫 번째 생일] ' + n + ' 외 ' + (c - 1) + '명, 총 ' + c + '명 참석할게요! 4월 3일(토) 11시에 뵐게요 :)'
    : '[이한이 첫 번째 생일] ' + n + '입니다. 아쉽게도 참석하지 못해요. 이한이의 첫 생일 진심으로 축하해요!';
  if (going && c === 1) body = '[이한이 첫 번째 생일] ' + n + ' 참석할게요! 4월 3일(토) 11시에 뵐게요 :)';
  return 'sms:' + String(tel).replace(/[^0-9+]/g, '') + '?&body=' + encodeURIComponent(body);
}
function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeCountdown: computeCountdown, ddayLabel: ddayLabel, buildMonth: buildMonth, weekdayOf: weekdayOf,
    buildICS: buildICS, icsFold: icsFold, buildSms: buildSms, EVENT: EVENT, PHOTOS: PHOTOS, MILESTONES: MILESTONES, PARENTS: PARENTS };
}

/* ---------------- 브라우저 ---------------- */
(function () {
  if (typeof document === 'undefined') return;
  var $ = function (s) { return document.querySelector(s); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  var ICON = {
    soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11"/></svg>',
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>',
    noteOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M3 3l18 18"/></svg>'
  };

  var CIRCLE = '<svg class="circ" viewBox="0 0 54 50" aria-hidden="true" focusable="false"><path pathLength="1" d="M28 5C42 3 51 14 49 26 47 39 35 46 23 45 10 43 4 32 7 21 10 10 22 4 36 7"/></svg>';

  /* 달력의 3일에 붙는 손글씨 메모 + 화살표: 3일 칸(span) 안에 있어서 화살표 끝이 항상 동그라미에 닿아요 */
  var NOTE = '<i class="hand note" aria-hidden="true">이한이 첫돌!</i><svg class="arrow" viewBox="0 0 40 80" aria-hidden="true" focusable="false"><path pathLength="1" d="M30 3C37 24 35 46 18 64"/><path pathLength="1" d="M18 64L28 60M18 64L18 52"/></svg>';

  /* 스크롤 리빌 (동적으로 추가된 요소도 다시 호출하면 관찰) */
  var io = null;
  function reveal() {
    var els = document.querySelectorAll('.reveal:not(.in):not([data-o])');
    if (!('IntersectionObserver' in window)) { for (var i = 0; i < els.length; i++) els[i].classList.add('in'); return; }
    if (!io) io = new IntersectionObserver(function (ents) {
      var vis = ents.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      vis.forEach(function (e, i) {          // 같은 순간에 보이는 요소는 위에서부터 순서대로 (스태거)
        e.target.style.setProperty('--d', Math.min(i * 0.11, 0.55).toFixed(2) + 's');
        e.target.classList.add('in'); io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    for (var j = 0; j < els.length; j++) { els[j].setAttribute('data-o', '1'); io.observe(els[j]); }
  }

  /* 달력 */
  function renderCalendar() {
    var box = $('#calendar'); if (!box) return;
    var d = new Date(Date.parse(EVENT.startISO) + KST);
    var y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
    var mo = buildMonth(y, m), names = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    var h = '<p class="cal-title">' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1] + ' ' + y + '</p><table><thead><tr>';
    names.forEach(function (n, i) { h += '<th class="' + (i === 0 ? 'sun' : '') + '" scope="col">' + n + '</th>'; });
    h += '</tr></thead><tbody>';
    mo.weeks.forEach(function (w) {
      h += '<tr>';
      w.forEach(function (c, i) {
        h += '<td class="' + (i === 0 ? 'sun ' : '') + (c === day ? 'on' : '') + '"' + (c === day ? ' aria-label="' + y + '년 ' + m + '월 ' + c + '일 토요일, 행사일"' : '') + '>' + (c ? '<span>' + c + (c === day ? CIRCLE + NOTE : '') + '</span>' : '') + '</td>';
      });
      h += '</tr>';
    });
    box.innerHTML = h + '</tbody></table>';
  }

  /* D-day (한 줄) */
  function startCountdown() {
    var el = $('#dday'); if (!el) return;
    function tick() {
      var c = computeCountdown(Date.now(), EVENT);
      if (c.state === 'live') { el.textContent = '지금 잔치가 한창이에요'; el.classList.add('done'); return false; }
      if (c.state === 'over') { el.textContent = '와 주셔서 감사합니다'; el.classList.add('done'); return false; }
      el.textContent = ddayLabel(c); return true;
    }
    if (tick() !== false) { var t = setInterval(function () { if (tick() === false) clearInterval(t); }, 60000); }
  }

  /* 사진 확인: 실제로 열리는 파일만 사용 (없으면 섹션 숨김) */
  function probe(srcs, cb) {
    var ok = [], left = srcs.length, done = false;
    if (!left) { cb(ok); return; }
    srcs.forEach(function (src, i) {
      var im = new Image(), fin = false, to;
      function end(v) { if (fin) return; fin = true; clearTimeout(to); ok[i] = v; if (--left === 0 && !done) { done = true; cb(ok); } }
      im.onload = function () { end(!!(im.naturalWidth || im.width)); };
      im.onerror = function () { end(false); };
      to = setTimeout(function () { end(false); }, 10000);
      im.src = src;
    });
  }
  /* assets/photos/manifest.json 을 읽어 어떤 사진을 보여줄지 정해요 (목록이 비어 있으면 사진 파일을 아예 요청하지 않고 섹션도 숨김 → 콘솔 404 없음) */
  var manifestP = null;
  function loadManifest() {
    if (manifestP) return manifestP;
    manifestP = (window.fetch ? fetch('assets/photos/manifest.json', { cache: 'no-cache' }) : Promise.reject())
      .then(function (r) { return r && r.ok ? r.json() : {}; }).catch(function () { return {}; })
      .then(function (m) { return { gallery: Array.isArray(m && m.gallery) ? m.gallery : [], timeline: Array.isArray(m && m.timeline) ? m.timeline : [] }; });
    return manifestP;
  }
  function base(f) { return String(f).split('/').pop(); }
  function renderTimeline() {
    var ol = $('#timeline'), sec = $('#timelineSec'); if (!ol || !sec) return;
    loadManifest().then(function (man) {
      var items = man.timeline.map(function (t) {
        var o = typeof t === 'string' ? { file: t } : (t || {}), file = o.file ? base(o.file) : '';
        var d = MILESTONES.filter(function (m) { return base(m.photo) === file; })[0] || {};
        return { en: o.en || d.en || '', label: o.label || d.label || '', date: o.date || d.date || '', note: o.note || d.note || '', photo: file ? 'assets/photos/' + file : '' };
      }).filter(function (m) { return m.photo && m.label; });
      probe(items.map(function (m) { return m.photo; }), function (ok) {
        var shown = items.filter(function (m, i) { return ok[i]; });
        if (!shown.length) { sec.hidden = true; return; }
        ol.innerHTML = shown.map(function (m, i) {
          return '<li class="reveal" style="--d:' + (i * 0.05) + 's"><div class="mono" aria-hidden="true">IH</div><div>' +
            '<div class="en-l">' + esc(m.en || '') + '</div><div class="lab">' + esc(m.label) + '</div>' +
            (m.date ? '<div class="dt">' + esc(m.date) + '</div>' : '') + (m.note ? '<p class="note">' + esc(m.note) + '</p>' : '') +
            '<div class="ph"><img src="' + esc(m.photo) + '" alt="' + esc(m.label) + '" loading="lazy" decoding="async"></div></div></li>';
        }).join('');
        sec.hidden = false; tilt(); reveal();
      });
    });
  }
  function renderGallery() {
    var g = $('#photoGrid'), sec = $('#gallerySec'); if (!g || !sec) return;
    loadManifest().then(function (man) {
      var list = man.gallery.map(function (t, i) {
        var o = typeof t === 'string' ? { file: t } : (t || {}), file = o.file ? base(o.file) : '';
        var d = PHOTOS.filter(function (p) { return base(p.src) === file; })[0];
        return { src: file ? 'assets/photos/' + file : '', alt: o.alt || (d && d.alt) || ('이한이 사진 ' + (i + 1)) };
      }).filter(function (p) { return p.src; });
      probe(list.map(function (p) { return p.src; }), function (ok) {
        var shown = list.filter(function (p, i) { return ok[i]; });
        if (!shown.length) { sec.hidden = true; return; }
        var rest = shown.length - 1;
        g.innerHTML = shown.map(function (p, i) {
          var wide = i === 0 || (i === shown.length - 1 && rest % 2 === 1);
          return '<figure class="shot reveal' + (wide ? ' wide' : '') + '"><img src="' + esc(p.src) + '" alt="' + esc(p.alt || '') + '" decoding="async"></figure>';
        }).join('');
        [].forEach.call(g.querySelectorAll('.shot'), function (f) { f.addEventListener('click', function () { openLb(f.querySelector('img')); }); });
        sec.hidden = false; tilt(); reveal();
      });
    });
  }
  /* 시트를 번갈아 살짝 기울여요 (보이는 시트만 세서 -,+,-,+ 순서가 유지돼요) */
  function tilt() {
    var s = document.querySelectorAll('.sheet:not([hidden]):not(.credits)'), k = 0, i;
    for (i = 0; i < s.length; i++) { s[i].style.setProperty('--rot', (k % 2 ? 1.3 : -1.5) + 'deg'); k++; }
  }

  /* 라이트박스 */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), cur = null;
  function visibleImgs() { return [].slice.call(document.querySelectorAll('#photoGrid .shot img')); }
  function openLb(img) { cur = img; lbImg.src = img.currentSrc || img.src; lbImg.alt = img.alt; lb.hidden = false; document.documentElement.style.overflow = 'hidden'; $('#lbClose').focus(); }
  function closeLb() { lb.hidden = true; document.documentElement.style.overflow = ''; }
  function step(d) { var l = visibleImgs(); if (!l.length) return; var i = (l.indexOf(cur) + d + l.length) % l.length; openLb(l[i]); }
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
  $('#lbNext').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbImg) closeLb(); });
  document.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') closeLb(); else if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); });
  var sx = null;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); }, { passive: true });

  /* 캘린더 저장 */
  $('#calBtn').addEventListener('click', function () {
    var text = buildICS(EVENT, Date.now());
    try {
      var url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
      var a = document.createElement('a'); a.href = url; a.download = 'ihan-first-birthday.ics';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast('캘린더 파일을 열어 일정에 추가해 주세요');
    } catch (e) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text); }
  });

  /* 주소 복사 */
  $('#copyBtn').addEventListener('click', function () {
    var ok = function () { toast('주소가 복사되었습니다'); };
    var fb = function () {
      var ta = document.createElement('textarea'); ta.value = EVENT.address; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; document.body.appendChild(ta); ta.select();
      var r = false; try { r = document.execCommand('copy'); } catch (e) {} ta.remove();
      r ? ok() : toast('주소를 길게 눌러 복사해 주세요');
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(EVENT.address).then(ok, fb); else fb();
  });

  /* RSVP */
  var who = 'dad', count = 1, hint = $('#rsvpHint');
  var segs = document.querySelectorAll('.seg-btn');
  [].forEach.call(segs, function (b) {
    b.addEventListener('click', function () { who = b.getAttribute('data-who'); [].forEach.call(segs, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); }); });
  });
  function setCount(n) { count = Math.max(1, Math.min(20, n)); $('#cntVal').textContent = count; }
  $('#cntMinus').addEventListener('click', function () { setCount(count - 1); });
  $('#cntPlus').addEventListener('click', function () { setCount(count + 1); });
  /* 참석 눌렀을 때: 작은 콘페티 + 진동 (모션 줄이기면 콘페티 생략) */
  function celebrate(btn) {
    try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
    if (reduce) return;
    var r = btn.getBoundingClientRect(), box = document.createElement('div'), cols = ['#F0603F', '#BFE3C8', '#F2DDA0', '#9CC7F0', '#FBD3C2', '#8A5A48'], n = 30, i;
    box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    for (i = 0; i < n; i++) {
      var p = document.createElement('i'), a = Math.PI * (1.12 + 0.76 * Math.random()), d = 90 + Math.random() * 190, big = Math.random() < 0.3;
      p.style.cssText = '--ox:' + (r.left + r.width / 2 - 5 + (Math.random() - .5) * r.width * .5).toFixed(0) + 'px;--oy:' + (r.top + r.height / 2).toFixed(0) + 'px;' +
        '--dx:' + (Math.cos(a) * d).toFixed(0) + 'px;--dy:' + (Math.sin(a) * d * 1.05 + 160 + Math.random() * 120).toFixed(0) + 'px;--rot:' + ((Math.random() - .5) * 900).toFixed(0) + 'deg;' +
        '--c:' + cols[i % cols.length] + ';--w:' + (big ? 11 : 7) + 'px;--h:' + (big ? 11 : 12) + 'px;--br:' + (big ? '50%' : '2px') + ';animation-delay:' + (Math.random() * 0.12).toFixed(2) + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1800);
  }
  function send(going) {
    var name = $('#guestName').value.trim();
    if (!name) { hint.hidden = false; hint.textContent = '성함을 입력해 주세요.'; $('#guestName').focus(); return; }
    hint.hidden = true;
    if (going) celebrate($('#goBtn'));
    location.href = buildSms(PARENTS[who].tel, name, going, count);
  }
  $('#goBtn').addEventListener('click', function () { send(true); });
  $('#noBtn').addEventListener('click', function () { send(false); });
  $('#rsvpForm').addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------- 배경 영상 (고정, 상시 재생) ---------- */
  var stage = $('#stage'), bg = $('#bgVid'), far = $('#bgFar'), sb = $('#soundBtn');
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var still = reduce || saveData;               // 모션 줄이기 / 데이터 절약: 포스터만 표시
  var wide = window.matchMedia && matchMedia('(min-width: 640px)').matches;
  var soundOn = false, soundLoaded = false;

  function srcInto(v, withWebm) {
    v.innerHTML = '';
    var m = document.createElement('source'); m.src = 'assets/bg.mp4'; m.type = 'video/mp4'; v.appendChild(m);
    if (withWebm) { var w = document.createElement('source'); w.src = 'assets/bg.webm'; w.type = 'video/webm'; v.appendChild(w); }
    v.load();
  }
  function playQuiet(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function syncSound() {
    sb.innerHTML = (soundOn ? ICON.soundOn : ICON.soundOff) + '<span class="t">' + (soundOn ? '소리 끄기' : '소리 켜기') + '</span>';
    sb.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    sb.setAttribute('aria-label', soundOn ? '배경 영상 소리 끄기' : '배경 영상 소리 켜기');
  }
  syncSound();
  if (still) {
    stage.classList.add('still'); bg.removeAttribute('autoplay'); sb.hidden = true;
  } else {
    bg.autoplay = true; srcInto(bg, true); playQuiet(bg);
    if (wide) { far.preload = 'auto'; srcInto(far, true); playQuiet(far); }
    else if (far.parentNode) far.parentNode.removeChild(far);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { bg.pause(); far.pause && far.pause(); } else { playQuiet(bg); if (wide) playQuiet(far); }
    });
    /* 소리: 같은 위치에서 소리 있는 파일로 교체 (처음 눌렀을 때만 로드) */
    sb.addEventListener('click', function () {
      if (soundOn) { bg.muted = true; soundOn = false; syncSound(); return; }
      var go = function () { bg.muted = false; bg.volume = 1; soundOn = true; syncSound(); playQuiet(bg); };
      if (soundLoaded) { go(); return; }
      var t = bg.currentTime || 0;
      bg.pause(); bg.removeAttribute('poster'); bg.innerHTML = ''; bg.src = 'assets/bg_sound.mp4'; bg.load();
      bg.addEventListener('loadedmetadata', function f() {
        bg.removeEventListener('loadedmetadata', f);
        try { bg.currentTime = t % (bg.duration || 10); } catch (e) {}
        soundLoaded = true; go();
      });
      bg.addEventListener('error', function () { toast('소리를 켤 수 없어요'); }, { once: true });
    });
  }

  /* ---------- 소리 버튼: 스크롤 중에는 숨기고, 멈추면 다시 표시 (버튼·입력·사진 위에 겹치면 숨김 유지) ---------- */
  var tools = $('.tools'), idleT = null;
  function overlapsInteractive() {
    var r = sb.getBoundingClientRect(); if (!r.width && !r.height) return false;
    var m = 8, list = document.querySelectorAll('.btn, .seg-btn, .stepper button, .field input, .shot, .scroll-cue, .credits');
    for (var i = 0; i < list.length; i++) {
      var q = list[i].getBoundingClientRect();
      if (q.right > r.left - m && q.left < r.right + m && q.bottom > r.top - m && q.top < r.bottom + m && q.width && q.height) return true;
    }
    return false;
  }
  function showTools() { if (!still && !overlapsInteractive()) tools.classList.remove('away'); else if (!still) idleT = setTimeout(showTools, 700); }
  function hideTools() {
    if (still) return;
    tools.classList.add('away'); clearTimeout(idleT); idleT = setTimeout(showTools, 650);
  }
  if (!still) window.addEventListener('scroll', hideTools, { passive: true });
  /* 엔딩 크레딧이 보이면 소리 버튼을 숨겨요 (크레딧 모서리를 가리지 않도록) */
  var credits = document.querySelector('.credits');
  if (credits && tools && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { tools.classList.toggle('off', e.isIntersecting); });
    }, { rootMargin: '0px 0px -20px 0px', threshold: 0 }).observe(credits);
  }

  /* ---------- 스크롤 연동 스크림(가볍게) + 섹션별 컬러 무드 ---------- */
  var scrim = $('#scrim'), tint = $('#tint'), ticking = false;
  var DIM0 = 0.04, DIM1 = 0.18;
  function dim() {
    ticking = false;
    var h = window.innerHeight || 700, y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var t = Math.max(0, Math.min(1, (y - h * 0.08) / (h * 0.4)));
    scrim.style.setProperty('--dim', (DIM0 + (DIM1 - DIM0) * t).toFixed(3));
  }
  if (reduce) scrim.style.setProperty('--dim', String(DIM1));
  else {
    dim();
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(dim); } }, { passive: true });
    window.addEventListener('resize', dim);
  }
  /* 화면 가운데에 있는 시트의 색으로 영상 위 워시를 바꿔요 (영상 틈에서만 살짝 보임) */
  if (tint && 'IntersectionObserver' in window) {
    var tio = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) {
        if (!e.isIntersecting) return;
        var c = e.target.getAttribute('data-tint'); if (!c) return;
        tint.style.backgroundColor = 'rgb(' + c + ')'; tint.style.opacity = c === '18,11,9' ? '0' : '.34';
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    [].forEach.call(document.querySelectorAll('.sheet[data-tint]'), function (s) { tio.observe(s); });
  }

  tilt(); renderCalendar(); renderTimeline(); renderGallery(); startCountdown(); reveal();
})();
