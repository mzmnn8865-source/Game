/* ============================================================
   پالس گیمینگ — Gaming Pulse
   Author: Aria Azizi
   v1.0.0
   ============================================================ */

'use strict';

/* ═══════════════════════════════════
   ۱. ابزارها
═══════════════════════════════════ */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ذخیره‌سازی امن (حتی روی file://) */
const store = {
    get(key, fallback) {
        try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
        catch { return fallback; }
    },
    set(key, val) {
        try { localStorage.setItem(key, val); }
        catch {}
    }
};

/* ═══════════════════════════════════
   ۲. وضعیت برنامه
═══════════════════════════════════ */
const State = {
    theme:    store.get('gp.theme', 'dark'),
    perf:     store.get('gp.perf', 'auto'),
    fontSize: +store.get('gp.fontSize', 100),
    fxBlur:   store.get('gp.fxBlur', 'true') === 'true',
    fxBlobs:  store.get('gp.fxBlobs', 'true') === 'true',
    fxScroll: store.get('gp.fxScroll', 'true') === 'true',
    activeCat: 'all'
};

/* ═══════════════════════════════════
   ۳. Toast
═══════════════════════════════════ */
let toastTimer;
function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ═══════════════════════════════════
   ۴. تشخیص سخت‌افزار
═══════════════════════════════════ */
function detectPerf() {
    let score = 0;
    const cores = navigator.hardwareConcurrency || 2;
    const ram = navigator.deviceMemory || 4;
    const isTouch = matchMedia('(hover: none)').matches || navigator.maxTouchPoints > 1;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* GPU */
    let gpuScore = 0;
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
        if (gl) {
            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            const renderer = (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '').toLowerCase();
            if (renderer.includes('rtx') || renderer.includes('apple m')) gpuScore = 3;
            else if (renderer.includes('radeon rx') || renderer.includes('gtx 1')) gpuScore = 2;
            else if (renderer.includes('intel') || renderer.includes('adreno') || renderer.includes('mali')) gpuScore = -1;
            else if (renderer.includes('swiftshader') || renderer.includes('llvmpipe')) gpuScore = -3;
        }
    } catch {}

    if (cores >= 8) score += 3;
    else if (cores >= 6) score += 2;
    else if (cores >= 4) score += 1;

    if (ram >= 8) score += 3;
    else if (ram >= 4) score += 2;
    else if (ram >= 2) score += 1;

    score += gpuScore;
    if (!isTouch) score += 2;
    if (reduce) score -= 4;
    if (innerWidth < 480) score -= 1;

    let tier = 'high';
    if (score <= 1) tier = 'low';
    else if (score <= 4) tier = 'mid';
    return tier;
}

function applyPerf(tier) {
    document.documentElement.dataset.perf = tier;
    console.log(`%c ⚡ Performance: ${tier.toUpperCase()}`, 'color:#00e5ff;font-weight:bold');
}

function initPerf() {
    const tier = State.perf === 'auto' ? detectPerf() : State.perf;
    applyPerf(tier);
}

/* ═══════════════════════════════════
   ۵. تم روز/شب
═══════════════════════════════════ */
function applyTheme(theme) {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.style.colorScheme = theme;
    State.theme = theme;
    store.set('gp.theme', theme);

    /* آپدیت دکمه‌های تنظیمات */
    $$('.theme-opt').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
}

function flipTheme() {
    const next = State.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    toast(next === 'light' ? '☀️ حالت روز' : '🌙 حالت شب');
}

/* ═══════════════════════════════════
   ۶. تنظیمات کاربر
═══════════════════════════════════ */
function applyFontSize(val) {
    State.fontSize = val;
    document.documentElement.style.setProperty('--font-scale', val / 100);
    store.set('gp.fontSize', val);
}

function applyFX() {
    const root = document.documentElement;

    /* بلور */
    if (!State.fxBlur) {
        root.style.setProperty('--blur', '0px');
        root.style.setProperty('--blur-sm', '0px');
    } else {
        root.style.removeProperty('--blur');
        root.style.removeProperty('--blur-sm');
    }

    /* بلاب‌ها */
    const bg = $('.bg-scene');
    if (bg) bg.style.display = State.fxBlobs ? '' : 'none';
}

/* ═══════════════════════════════════
   ۷. نوار پیشرفت اسکرول
═══════════════════════════════════ */
function initScrollProgress() {
    const bar = $('#scrollProgress');
    if (!bar) return;

    let raf = null;
    window.addEventListener('scroll', () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
            const y = window.scrollY;
            const total = document.documentElement.scrollHeight - innerHeight;
            const pct = total > 0 ? (y / total) * 100 : 0;
            bar.style.width = pct + '%';
            raf = null;
        });
    }, { passive: true });
}

/* ═══════════════════════════════════
   ۸. هدر شیشه‌ای + بازگشت به بالا
═══════════════════════════════════ */
function initHeaderScroll() {
    const nav = $('#navShell');
    const toTop = $('#toTop');
    if (!nav) return;

    let raf = null;
    window.addEventListener('scroll', () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
            const y = window.scrollY;
            nav.classList.toggle('scrolled', y > 40);
            if (toTop) toTop.classList.toggle('show', y > 600);
            raf = null;
        });
    }, { passive: true });

    toTop?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ═══════════════════════════════════
   ۹. پنل جستجو
═══════════════════════════════════ */
function initSearch() {
    const overlay = $('#searchOverlay');
    const btn = $('#searchBtn');
    const closeBtn = $('#searchClose');
    const backdrop = $('#searchBackdrop');
    const input = $('#searchInput');
    if (!overlay || !btn) return;

    const open = () => {
        overlay.hidden = false;
        requestAnimationFrame(() => {
            overlay.classList.add('on');
            setTimeout(() => input?.focus(), 250);
        });
    };

    const close = () => {
        overlay.classList.remove('on');
        setTimeout(() => {
            overlay.hidden = true;
            if (input) input.value = '';
        }, 350);
    };

    btn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !overlay.hidden) close();
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            open();
        }
    });

    /* چیپ‌های پیشنهاد */
    $$('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (input) {
                input.value = chip.textContent;
                input.focus();
            }
        });
    });
}

/* ═══════════════════════════════════
   ۱۰. پنل تنظیمات
═══════════════════════════════════ */
function initSettings() {
    const panel = $('#settingsPanel');
    const fab = $('#settingsFab');
    const closeBtn = $('#settingsClose');
    if (!panel || !fab) return;

    const open = () => panel.classList.add('on');
    const close = () => panel.classList.remove('on');

    fab.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && panel.classList.contains('on')) close();
    });

    /* اسلایدر فونت */
    const fontSlider = $('#fontSize');
    const fontVal = $('#fontSizeVal');
    if (fontSlider) {
        fontSlider.value = State.fontSize;
        if (fontVal) fontVal.textContent = State.fontSize + '٪';

        fontSlider.addEventListener('input', e => {
            const v = +e.target.value;
            if (fontVal) fontVal.textContent = v + '٪';
            applyFontSize(v);
        });
    }

    /* سوییچ‌های افکت */
    $$('.switch[data-fx]').forEach(sw => {
        const key = sw.dataset.fx;
        const isOn = {
            blur:   State.fxBlur,
            blobs:  State.fxBlobs,
            scroll: State.fxScroll
        }[key];
        sw.classList.toggle('active', isOn);

        sw.addEventListener('click', () => {
            const now = !sw.classList.contains('active');
            sw.classList.toggle('active', now);

            if (key === 'blur')   { State.fxBlur   = now; store.set('gp.fxBlur',   now); }
            if (key === 'blobs')  { State.fxBlobs  = now; store.set('gp.fxBlobs',  now); }
            if (key === 'scroll') { State.fxScroll = now; store.set('gp.fxScroll', now); }
            applyFX();
            toast(now ? '✅ روشن شد' : '❌ خاموش شد');
        });
    });

    /* سوییچ تم */
    $$('.theme-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            applyTheme(opt.dataset.theme);
            toast(opt.dataset.theme === 'light' ? '☀️ حالت روز' : '🌙 حالت شب');
        });
    });

    /* سوییچ عملکرد */
    $$('.perf-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            State.perf = opt.dataset.perf;
            store.set('gp.perf', State.perf);
            $$('.perf-opt').forEach(o => o.classList.toggle('active', o === opt));
            applyPerf(State.perf);
            toast(`⚡ سطح: ${State.perf.toUpperCase()}`);
        });
    });
}

/* ═══════════════════════════════════
   ۱۱. فیلتر اخبار
═══════════════════════════════════ */
function initFilter() {
    const tabs = $$('#filterTabs .tab');
    const cards = $$('#newsGrid .news-card');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const cat = tab.dataset.cat;
            State.activeCat = cat;

            cards.forEach(card => {
                const match = cat === 'all' || card.dataset.cat === cat;
                card.style.display = match ? '' : 'none';
                if (match && window.gsap) {
                    gsap.fromTo(card,
                        { opacity: 0, y: 20, filter: 'blur(8px)' },
                        { opacity: 1, y: 0, filter: 'blur(0)', duration: .5, ease: 'power3.out' }
                    );
                }
            });
        });
    });
}

/* ═══════════════════════════════════
   ۱۲. فرم خبرنامه
═══════════════════════════════════ */
function initNewsletter() {
    const form = $('#newsletterForm');
    if (!form) return;

    form.addEventListener('submit', e => {
        e.preventDefault();
        const input = form.querySelector('input');
        const email = input?.value.trim();

        if (!email || !email.includes('@')) {
            toast('❌ ایمیل معتبر وارد کن');
            return;
        }

        toast('✅ عضویتت ثبت شد!');
        form.reset();
    });
}

/* ═══════════════════════════════════
   ۱۳. Load More
═══════════════════════════════════ */
function initLoadMore() {
    const btn = $('#loadMore');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const original = btn.innerHTML;
        btn.innerHTML = '<span>در حال بارگذاری...</span>';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = original;
            btn.disabled = false;
            toast('📰 ۶ خبر جدید اضافه شد');
        }, 900);
    });
}

/* ═══════════════════════════════════
   ۱۴. انیمیشن‌های GSAP
═══════════════════════════════════ */
function initAnimations() {
    if (!window.gsap) {
        console.warn('GSAP بارگذاری نشد');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    /* -------- هیرو: تیتر خط‌به‌خط -------- */
    const heroLines = $$('.hero-title .line');
    if (heroLines.length) {
        gsap.from(heroLines, {
            opacity: 0,
            y: 60,
            rotateX: -30,
            duration: 1.1,
            stagger: 0.15,
            ease: 'power4.out',
            delay: 0.2
        });
    }

    /* -------- هیرو: کارت -------- */
    gsap.from('.hero-card', {
        opacity: 0,
        y: 40,
        scale: 0.97,
        duration: 1,
        ease: 'power3.out',
        delay: 0.1
    });

    gsap.from('.hero-tag > *', {
        opacity: 0, y: 10, duration: .5, stagger: .1, delay: .4
    });

    gsap.from('.hero-excerpt', {
        opacity: 0, y: 20, duration: .8, delay: .6
    });

    gsap.from('.hero-footer > *', {
        opacity: 0, y: 20, duration: .7, stagger: .15, delay: .75
    });

    /* -------- ترندینگ -------- */
    gsap.from('.trending-bar', {
        opacity: 0, y: 20, duration: .8, delay: 1,
        scrollTrigger: { trigger: '.trending-bar', start: 'top 90%' }
    });

    gsap.from('.trend-item', {
        opacity: 0, x: 20, duration: .6, stagger: .08, delay: 1.1,
        scrollTrigger: { trigger: '.trending-bar', start: 'top 90%' }
    });

    /* -------- کارت‌های اخبار -------- */
    gsap.utils.toArray('.news-card').forEach((card, i) => {
        gsap.from(card, {
            opacity: 0,
            y: 50,
            filter: 'blur(10px)',
            duration: .9,
            delay: (i % 2) * 0.1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 88%',
                toggleActions: 'play none none none'
            }
        });
    });

    /* -------- سایدبار -------- */
    gsap.utils.toArray('.side-col > *').forEach((el, i) => {
        gsap.from(el, {
            opacity: 0,
            x: 40,
            duration: .9,
            delay: i * 0.15,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 90%'
            }
        });
    });

    /* -------- نقدها -------- */
    gsap.utils.toArray('.review-card').forEach((card, i) => {
        gsap.from(card, {
            opacity: 0,
            y: 60,
            scale: 0.95,
            duration: .9,
            delay: i * 0.12,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 88%'
            }
        });
    });

    /* -------- بخش Split -------- */
    gsap.utils.toArray('.split-card').forEach((card, i) => {
        gsap.from(card, {
            opacity: 0,
            y: 50,
            duration: .8,
            delay: i * 0.12,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 88%'
            }
        });
    });

    /* -------- CTA -------- */
    gsap.from('.cta-badge', {
        opacity: 0, y: 20, duration: .6,
        scrollTrigger: { trigger: '.cta-card', start: 'top 80%' }
    });

    gsap.from('.cta-title', {
        opacity: 0, y: 40, scale: 0.9, duration: 1, ease: 'power4.out',
        scrollTrigger: { trigger: '.cta-card', start: 'top 80%' }
    });

    gsap.from('.cta-sub', {
        opacity: 0, y: 20, duration: .7, delay: .2,
        scrollTrigger: { trigger: '.cta-card', start: 'top 80%' }
    });

    gsap.from('.cta-actions > *', {
        opacity: 0, y: 20, duration: .7, stagger: .12, delay: .35,
        scrollTrigger: { trigger: '.cta-card', start: 'top 80%' }
    });

    /* -------- فوتر -------- */
    gsap.from('.footer-col', {
        opacity: 0, y: 30, duration: .7, stagger: .1,
        scrollTrigger: { trigger: '.footer', start: 'top 90%' }
    });

    /* -------- بخش‌های Hero Title -------- */
    gsap.utils.toArray('.section-title').forEach(el => {
        gsap.from(el, {
            opacity: 0,
            x: -30,
            duration: .8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 88%'
            }
        });
    });

    /* -------- پارالاکس هیرو (متن محو میشه با اسکرول) -------- */
    if (State.fxScroll && document.documentElement.dataset.perf === 'high') {
        gsap.to('.hero-card', {
            y: 80,
            opacity: 0.3,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            }
        });
    }

    /* -------- پارالاکس Blob ها -------- */
    if (State.fxScroll && document.documentElement.dataset.perf !== 'low') {
        gsap.to('.blob-1', {
            y: 200, x: -100, ease: 'none',
            scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 2 }
        });
        gsap.to('.blob-2', {
            y: -200, x: 100, ease: 'none',
            scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 2 }
        });
        gsap.to('.blob-3', {
            y: 150, x: 80, ease: 'none',
            scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 3 }
        });
        gsap.to('.blob-4', {
            y: -150, x: -80, ease: 'none',
            scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 3 }
        });
    }

    /* -------- افکت پارالاکس سبک روی کارت‌ها -------- */
    if (State.fxScroll && document.documentElement.dataset.perf === 'high') {
        gsap.utils.toArray('.review-card').forEach((card, i) => {
            gsap.to(card, {
                y: -20 - i * 5,
                ease: 'none',
                scrollTrigger: {
                    trigger: card,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1
                }
            });
        });
    }

    /* -------- ری‌فرش روی تغییر سایز -------- */
    window.addEventListener('resize', () => {
        ScrollTrigger.refresh();
    });

    console.log('%c✨ GSAP animations loaded', 'color:#00e5ff;font-weight:bold');
}

/* ═══════════════════════════════════
   ۱۵. تاریخ امروز (هیرو)
═══════════════════════════════════ */
function setToday() {
    const el = $('#heroDate');
    if (!el) return;

    try {
        const now = new Date();
        const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        el.textContent = now.toLocaleDateString('fa-IR', opts);
    } catch {
        el.textContent = new Date().toLocaleDateString();
    }
}

/* ═══════════════════════════════════
   ۱۶. منوی موبایل
═══════════════════════════════════ */
function initMobileMenu() {
    const btn = $('#menuBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        toast('📱 به‌زودی: منوی موبایل');
    });
}

/* ═══════════════════════════════════
   ۱۷. لینک‌های داخلی (smooth)
═══════════════════════════════════ */
function initSmoothLinks() {
    $$('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (href === '#' || href.length < 2) return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });
}

/* ═══════════════════════════════════
   ۱۸. مکث انیمیشن‌ها وقتی تب مخفیه
═══════════════════════════════════ */
function initVisibilityPause() {
    document.addEventListener('visibilitychange', () => {
        const items = $$('.blob, .heart, .live-dot, .hero-shine, .newsletter-icon');
        items.forEach(el => {
            el.style.animationPlayState = document.hidden ? 'paused' : 'running';
        });
    });
}

/* ═══════════════════════════════════
   ۱۹. راه‌اندازی
═══════════════════════════════════ */
function boot() {
    /* ۱. تم */
    applyTheme(State.theme);

    /* ۲. عملکرد */
    initPerf();

    /* ۳. فونت */
    applyFontSize(State.fontSize);

    /* ۴. افکت‌ها */
    applyFX();

    /* ۵. انیمیشن‌ها + اسکرول */
    initScrollProgress();
    initHeaderScroll();
    initSearch();
    initSettings();
    initFilter();
    initNewsletter();
    initLoadMore();
    initMobileMenu();
    initSmoothLinks();
    initVisibilityPause();
    setToday();

    /* ۶. GSAP */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnimations);
    } else {
        initAnimations();
    }

    /* پیام‌ها */
    console.log('%c🎮 پالس گیمینگ', 'color:#00e5ff;font-weight:bold;font-size:16px');
    console.log('%c© ۱۴۰۴ آریا عزیزی', 'color:#ff3d9a;font-size:12px');
    console.log('%cمیانبر: Ctrl+K برای جستجو', 'color:#a855f7;font-size:11px');
}

/* ═══════════════════════════════════
   ۲۰. اجرا
═══════════════════════════════════ */
boot();
