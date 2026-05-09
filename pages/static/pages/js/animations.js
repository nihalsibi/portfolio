/**
 * Cinematic frontend motion layer.
 * GSAP + ScrollTrigger when available; static fallback when unavailable.
 */
(function() {
    'use strict';

    const prefersReducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasFinePointer = window.matchMedia &&
        window.matchMedia('(pointer: fine)').matches;
    const isTouchFirstDevice = ((navigator.maxTouchPoints || 0) > 0) ||
        (window.matchMedia && window.matchMedia('(hover: none)').matches);
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isLowPerformanceDevice = Boolean(
        (connection && connection.saveData) ||
        (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4) ||
        (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4)
    );
    const canUseMouseParallax = hasFinePointer && !isTouchFirstDevice && !isLowPerformanceDevice;
    const MOUSE_PARALLAX_THROTTLE_MS = 48;
    const MOUSE_PARALLAX_EASE = 0.16;
    const MOUSE_PARALLAX_STOP_THRESHOLD = 0.008;
    const MOUSE_PARALLAX_MAX_FRAMES = 36;

    const $ = (selector, scope = document) => scope.querySelector(selector);
    const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
            return;
        }
        callback();
    }

    function getCounterParts(counter) {
        const baseValue = parseFloat(counter.dataset.statValue || '0');
        let suffix = counter.dataset.statSuffix || '';
        let endValue = Number.isFinite(baseValue) ? baseValue : 0;
        let decimals = 0;

        const decimalSuffix = suffix.match(/^(\.\d+)(.*)$/);
        if (decimalSuffix) {
            endValue = parseFloat(`${Math.trunc(endValue)}${decimalSuffix[1]}`);
            decimals = decimalSuffix[1].length - 1;
            suffix = decimalSuffix[2];
        }

        return { endValue, suffix, decimals };
    }

    function formatCounter(value, decimals, suffix) {
        const number = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
        return `${number}${suffix}`;
    }

    function setCounterFinal(counter) {
        const { endValue, suffix, decimals } = getCounterParts(counter);
        counter.textContent = formatCounter(endValue, decimals, suffix);
        counter.dataset.counted = 'true';
    }

    function setMotionHint(gsap, targets, value) {
        if (!targets || (Array.isArray(targets) && !targets.length)) return;
        gsap.set(targets, { willChange: value });
    }

    function hasAnimationRuntime(gsap, ScrollTrigger) {
        return Boolean(
            gsap &&
            ScrollTrigger &&
            typeof gsap.registerPlugin === 'function' &&
            typeof gsap.config === 'function' &&
            typeof gsap.defaults === 'function' &&
            typeof gsap.set === 'function' &&
            typeof gsap.to === 'function' &&
            typeof gsap.fromTo === 'function' &&
            typeof gsap.timeline === 'function' &&
            typeof ScrollTrigger.config === 'function' &&
            typeof ScrollTrigger.create === 'function' &&
            typeof ScrollTrigger.refresh === 'function'
        );
    }

    function initBasicFallback() {
        return;
    }

    function initVisibilityPause(gsap, ScrollTrigger) {
        let isPaused = false;

        function setPaused(nextPaused) {
            if (nextPaused === isPaused) return;
            isPaused = nextPaused;

            document.body.classList.toggle('is-motion-paused', isPaused);

            if (gsap.globalTimeline) {
                if (isPaused) {
                    gsap.globalTimeline.pause();
                } else {
                    gsap.globalTimeline.resume();
                }
            }

            if (gsap.ticker) {
                if (isPaused && typeof gsap.ticker.sleep === 'function') {
                    gsap.ticker.sleep();
                } else if (!isPaused && typeof gsap.ticker.wake === 'function') {
                    gsap.ticker.wake();
                }
            }

            if (!isPaused) {
                ScrollTrigger.refresh();
            }
        }

        document.addEventListener('visibilitychange', () => {
            setPaused(document.hidden);
        }, { passive: true });

        setPaused(document.hidden);
    }

    function initScrollChrome(gsap) {
        const header = $('.site-header');
        if (!header) return;

        let ticking = false;
        let scrollIdleTimer = 0;
        let scrollDecorPaused = false;
        let lastScrollY = window.scrollY || window.pageYOffset || 0;
        let isScrolled = false;
        let isHidden = false;
        const setHeaderY = gsap ? gsap.quickTo(header, 'y', {
            duration: 0.45,
            ease: 'power4.out'
        }) : null;

        if (gsap) {
            gsap.set(header, {
                xPercent: -50,
                x: 0,
                y: 0,
                force3D: true
            });
        }

        function setHidden(nextHidden) {
            if (nextHidden === isHidden) return;

            isHidden = nextHidden;
            header.classList.toggle('nav-hidden', nextHidden);

            if (setHeaderY) {
                setHeaderY(nextHidden ? -Math.min(110, header.offsetHeight + 36) : 0);
            }
        }

        function update() {
            const scrollY = window.scrollY || window.pageYOffset || 0;
            const nextScrolled = scrollY > 48;
            const delta = scrollY - lastScrollY;
            const menuOpen = $('.nav-links.open') !== null;

            if (nextScrolled !== isScrolled) {
                header.classList.toggle('nav-scrolled', nextScrolled);
                isScrolled = nextScrolled;
            }

            if (scrollY <= 20 || menuOpen) {
                setHidden(false);
            } else if (delta > 8 && scrollY > 80) {
                setHidden(true);
            } else if (delta < -4) {
                setHidden(false);
            }

            lastScrollY = Math.max(scrollY, 0);
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!scrollDecorPaused) {
                document.body.classList.add('is-scrolling');
                scrollDecorPaused = true;
            }

            window.clearTimeout(scrollIdleTimer);
            scrollIdleTimer = window.setTimeout(() => {
                document.body.classList.remove('is-scrolling');
                scrollDecorPaused = false;
            }, 140);

            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }, { passive: true });

        update();
    }

    function initHeroLoad(gsap) {
        const header = $('.site-header');
        const heroTag = $('.hero .hero-tag');
        const heroHeading = $('.hero h1');
        const heroParagraph = $('.hero .container > p:not(.hero-tag)');
        const leftButton = $('.hero .btn-group .btn:nth-child(1)');
        const rightButton = $('.hero .btn-group .btn:nth-child(2)');
        const heroTargets = [header, heroTag, heroHeading, heroParagraph, leftButton, rightButton]
            .filter(Boolean);

        const timeline = gsap.timeline({
            defaults: {
                ease: 'power4.out',
                force3D: true
            },
            onStart: () => setMotionHint(gsap, heroTargets, 'transform, opacity, filter'),
            onComplete: () => setMotionHint(gsap, heroTargets, 'auto')
        });

        if (header) {
            timeline.fromTo(header, {
                autoAlpha: 0,
                xPercent: -50,
                x: 0,
                y: -80
            }, {
                autoAlpha: 1,
                xPercent: -50,
                x: 0,
                y: 0,
                duration: 1.2,
                clearProps: 'opacity,visibility'
            }, 0);
        }

        if (heroTag) {
            timeline.fromTo(heroTag, {
                autoAlpha: 0,
                y: 60,
                filter: 'blur(10px)'
            }, {
                autoAlpha: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.9,
                clearProps: 'opacity,visibility,transform,filter'
            }, 0.22);
        }

        if (heroHeading) {
            timeline.fromTo(heroHeading, {
                autoAlpha: 0,
                y: 120,
                filter: 'blur(18px)'
            }, {
                autoAlpha: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 1.15,
                clearProps: 'opacity,visibility,transform,filter'
            }, 0.4);
        }

        if (heroParagraph) {
            timeline.fromTo(heroParagraph, {
                autoAlpha: 0,
                y: 70,
                filter: 'blur(8px)'
            }, {
                autoAlpha: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 0.95,
                clearProps: 'opacity,visibility,transform,filter'
            }, '-=0.5');
        }

        if (leftButton) {
            timeline.fromTo(leftButton, {
                autoAlpha: 0,
                x: -95,
                filter: 'blur(8px)'
            }, {
                autoAlpha: 1,
                x: 0,
                filter: 'blur(0px)',
                duration: 0.9,
                clearProps: 'opacity,visibility,transform,filter'
            }, '-=0.42');
        }

        if (rightButton) {
            timeline.fromTo(rightButton, {
                autoAlpha: 0,
                x: 95,
                filter: 'blur(8px)'
            }, {
                autoAlpha: 1,
                x: 0,
                filter: 'blur(0px)',
                duration: 0.9,
                clearProps: 'opacity,visibility,transform,filter'
            }, '<0.08');
        }
    }

    function initBackgroundParallax(gsap, ScrollTrigger) {
        if (!gsap || !ScrollTrigger) return;

        const pageBg = $('.page-bg');
        const layerConfigs = [
            { element: $('.cinematic-beams'), y: -22 },
            { element: $('.cinematic-depth-one'), y: -34 },
            { element: $('.cinematic-depth-two'), y: -17 },
            { element: $('.ambient-glow-one'), y: -28 },
            { element: $('.ambient-glow-two'), y: -42 },
            { element: $('.ambient-glow-three'), y: -15 },
            { element: $('.ambient-grain'), y: -9 }
        ].filter((layer) => layer.element);
        const backgroundLayers = layerConfigs.map((layer) => layer.element);
        if (!pageBg) return;

        const backgroundScrollTrigger = () => ({
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.15
        });
        const setBackgroundVar = (element, property, value) => {
            element.style.setProperty(property, `${value.toFixed(2)}px`);
        };
        const setScrollProgress = (progress) => {
            const clampedProgress = Math.min(Math.max(progress, 0), 1);

            setBackgroundVar(pageBg, '--bg-scroll-y', -54 * clampedProgress);
            layerConfigs.forEach(({ element, y }) => {
                setBackgroundVar(element, '--layer-scroll-y', y * clampedProgress);
            });
        };

        pageBg.style.setProperty('--bg-mouse-x', '0px');
        pageBg.style.setProperty('--bg-mouse-y', '0px');
        backgroundLayers.forEach((layer) => {
            layer.style.setProperty('--layer-mouse-x', '0px');
            layer.style.setProperty('--layer-mouse-y', '0px');
        });
        setScrollProgress(0);

        gsap.set([pageBg, ...backgroundLayers], { force3D: true });

        gsap.to(pageBg, {
            '--bg-scroll-y': '-54px',
            ease: 'none',
            scrollTrigger: backgroundScrollTrigger()
        });

        layerConfigs.forEach(({ element, y }) => {
            gsap.to(element, {
                '--layer-scroll-y': `${y}px`,
                ease: 'none',
                scrollTrigger: backgroundScrollTrigger()
            });
        });

        if (!canUseMouseParallax) return;

        const mouseLayers = [
            { element: pageBg, xVar: '--bg-mouse-x', yVar: '--bg-mouse-y', x: -10, y: -7 },
            { element: $('.cinematic-beams'), x: 18, y: 8 },
            { element: $('.cinematic-depth-one'), x: -15, y: -10 },
            { element: $('.cinematic-depth-two'), x: 12, y: 9 },
            { element: $('.ambient-glow-one'), x: 22, y: 14 },
            { element: $('.ambient-glow-two'), x: -20, y: 16 },
            { element: $('.ambient-glow-three'), x: 16, y: -12 },
            { element: $('.ambient-grain'), x: 6, y: 4 }
        ].filter((layer) => layer.element);

        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        let rafId = 0;
        let frameCount = 0;
        let lastPointerTime = -MOUSE_PARALLAX_THROTTLE_MS;

        function writeLayer(layer, x, y) {
            layer.element.style.setProperty(layer.xVar || '--layer-mouse-x', `${x.toFixed(2)}px`);
            layer.element.style.setProperty(layer.yVar || '--layer-mouse-y', `${y.toFixed(2)}px`);
        }

        function cancelMouseShift() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
            frameCount = 0;
        }

        function resetMouseShift() {
            targetX = 0;
            targetY = 0;
            currentX = 0;
            currentY = 0;
            mouseLayers.forEach((layer) => writeLayer(layer, 0, 0));
        }

        function renderMouseShift() {
            if (document.hidden) {
                cancelMouseShift();
                return;
            }

            rafId = 0;
            frameCount += 1;
            currentX += (targetX - currentX) * MOUSE_PARALLAX_EASE;
            currentY += (targetY - currentY) * MOUSE_PARALLAX_EASE;

            mouseLayers.forEach((layer) => {
                writeLayer(layer, currentX * layer.x, currentY * layer.y);
            });

            const shouldContinue = (
                frameCount < MOUSE_PARALLAX_MAX_FRAMES &&
                (Math.abs(targetX - currentX) > MOUSE_PARALLAX_STOP_THRESHOLD ||
                    Math.abs(targetY - currentY) > MOUSE_PARALLAX_STOP_THRESHOLD)
            );

            if (shouldContinue) {
                rafId = requestAnimationFrame(renderMouseShift);
                return;
            }

            currentX = targetX;
            currentY = targetY;
            mouseLayers.forEach((layer) => {
                writeLayer(layer, currentX * layer.x, currentY * layer.y);
            });
            frameCount = 0;
            rafId = 0;
        }

        function requestMouseShift() {
            if (document.hidden || rafId) return;
            rafId = requestAnimationFrame(renderMouseShift);
        }

        window.addEventListener('pointermove', (event) => {
            if (document.hidden) return;

            const eventTime = event.timeStamp || performance.now();
            if (eventTime - lastPointerTime < MOUSE_PARALLAX_THROTTLE_MS) return;

            lastPointerTime = eventTime;
            targetX = (event.clientX / Math.max(window.innerWidth, 1)) - 0.5;
            targetY = (event.clientY / Math.max(window.innerHeight, 1)) - 0.5;
            frameCount = 0;
            requestMouseShift();
        }, { passive: true });

        document.addEventListener('mouseleave', () => {
            targetX = 0;
            targetY = 0;
            frameCount = 0;
            requestMouseShift();
        }, { passive: true });

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) return;
            cancelMouseShift();
            resetMouseShift();
        }, { passive: true });
    }

    function initNavbarShrink(gsap) {
        const nav = $('.site-header .nav');
        if (!nav) return;

        gsap.to(nav, {
            scale: 0.94,
            transformOrigin: 'center center',
            ease: 'none',
            force3D: true,
            scrollTrigger: {
                trigger: document.documentElement,
                start: 'top top',
                end: '+=240',
                scrub: 0.35
            }
        });
    }

    function revealCtaContent(gsap) {
        const ctaContent = $$('.cta-content h2, .cta-content p, .cta-content .btn');
        const ctaButton = $('.cta-content .btn');
        if (!ctaContent.length || ctaContent[0].dataset.ctaRevealed === 'true') return;

        ctaContent.forEach((element) => {
            element.dataset.ctaRevealed = 'true';
        });

        setMotionHint(gsap, ctaContent, 'transform, opacity');

        gsap.to(ctaContent, {
            autoAlpha: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.12,
            ease: 'power4.out',
            clearProps: 'opacity,visibility,transform',
            onComplete: () => {
                setMotionHint(gsap, ctaContent, 'auto');
                if (ctaButton) ctaButton.classList.add('motion-shine');
            }
        });
    }

    function initSectionTransitions(gsap) {
        const sections = $$('.main-content > section:not(.hero)');
        const directions = [
            { x: 0, y: 120 },
            { x: -140, y: 0 },
            { x: 140, y: 0 },
            { x: 0, y: 120 }
        ];

        const ctaContent = $$('.cta-content h2, .cta-content p, .cta-content .btn');
        if (ctaContent.length) {
            gsap.set(ctaContent, {
                autoAlpha: 0,
                y: 62
            });
        }

        sections.forEach((section, index) => {
            const direction = directions[index % directions.length];
            const isCta = section.classList.contains('cta-section');

            gsap.fromTo(section, {
                autoAlpha: 0,
                x: direction.x,
                y: direction.y,
                scale: isCta ? 0.8 : 0.98
            }, {
                autoAlpha: 1,
                x: 0,
                y: 0,
                scale: 1,
                duration: isCta ? 1.2 : 1.05,
                ease: 'power4.out',
                force3D: true,
                clearProps: 'opacity,visibility,transform',
                onStart: () => setMotionHint(gsap, section, 'transform, opacity'),
                onComplete: () => {
                    setMotionHint(gsap, section, 'auto');
                    if (isCta) revealCtaContent(gsap);
                },
                scrollTrigger: {
                    trigger: section,
                    start: 'top 84%',
                    once: true
                }
            });
        });
    }

    function animateCounter(gsap, counter, index) {
        if (counter.dataset.counted === 'true') return;
        counter.dataset.counted = 'true';

        const { endValue, suffix, decimals } = getCounterParts(counter);
        const state = { value: 0 };
        let renderedText = '';

        gsap.to(state, {
            value: endValue,
            duration: 1.6 + index * 0.12,
            ease: 'power3.out',
            onUpdate: () => {
                const nextText = formatCounter(state.value, decimals, suffix);
                if (nextText !== renderedText) {
                    counter.textContent = nextText;
                    renderedText = nextText;
                }
            },
            onComplete: () => {
                counter.textContent = formatCounter(endValue, decimals, suffix);
            }
        });
    }

    function startCardFloat(gsap, element, delay) {
        setMotionHint(gsap, element, 'transform');

        const floatTween = gsap.to(element, {
            y: -7,
            duration: 2.8,
            delay,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            force3D: true,
            overwrite: false
        });

        const ScrollTrigger = window.ScrollTrigger;
        if (ScrollTrigger) {
            ScrollTrigger.create({
                trigger: element,
                start: 'top bottom',
                end: 'bottom top',
                onEnter: () => floatTween.resume(),
                onEnterBack: () => floatTween.resume(),
                onLeave: () => floatTween.pause(),
                onLeaveBack: () => floatTween.pause()
            });
        }
    }

    function initStatsCards(gsap, ScrollTrigger) {
        const cards = $$('.stats-section .stat-card');
        if (!cards.length) return;

        const directions = [
            { x: -140, y: 0 },
            { x: 0, y: 120 },
            { x: 140, y: 0 },
            { x: 0, y: 120 }
        ];

        cards.forEach((card, index) => {
            const direction = directions[index % directions.length];

            gsap.set(card, {
                autoAlpha: 0,
                x: direction.x,
                y: direction.y,
                scale: 0.8,
                rotation: 3,
                transformOrigin: 'center center',
                force3D: true
            });

            ScrollTrigger.create({
                trigger: card,
                start: 'top 86%',
                once: true,
                onEnter: () => {
                    setMotionHint(gsap, card, 'transform, opacity');

                    gsap.to(card, {
                        autoAlpha: 1,
                        x: 0,
                        y: 0,
                        scale: 1,
                        rotation: 0,
                        duration: 1,
                        ease: 'power4.out',
                        force3D: true,
                        onStart: () => {
                            $$('[data-stat-value]', card).forEach((counter, counterIndex) => {
                                animateCounter(gsap, counter, counterIndex);
                            });
                        },
                        onComplete: () => {
                            startCardFloat(gsap, card, index * 0.08);
                        }
                    });
                }
            });
        });
    }

    function initFeatureAnimations(gsap, ScrollTrigger) {
        const section = $('.features-section');
        const titleBits = $$('.features-section .section-title > *');
        const cards = $$('.features-section .card');
        const grid = $('.features-section .card-grid') || section;

        if (titleBits.length && section) {
            gsap.fromTo(titleBits, {
                autoAlpha: 0,
                y: 72
            }, {
                autoAlpha: 1,
                y: 0,
                duration: 0.9,
                stagger: 0.1,
                ease: 'power4.out',
                clearProps: 'opacity,visibility,transform',
                onStart: () => setMotionHint(gsap, titleBits, 'transform, opacity'),
                onComplete: () => setMotionHint(gsap, titleBits, 'auto'),
                scrollTrigger: {
                    trigger: section,
                    start: 'top 76%',
                    once: true
                }
            });
        }

        if (!cards.length || !grid) return;

        gsap.set(cards, {
            autoAlpha: 0,
            y: 120,
            scale: 0.9,
            rotationX: 12,
            transformPerspective: 900,
            transformOrigin: '50% 60%',
            force3D: true
        });

        ScrollTrigger.create({
            trigger: grid,
            start: 'top 82%',
            once: true,
            onEnter: () => {
                setMotionHint(gsap, cards, 'transform, opacity');

                gsap.to(cards, {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    rotationX: 0,
                    duration: 1.05,
                    stagger: 0.14,
                    ease: 'back.out(1.25)',
                    force3D: true,
                    onComplete: () => {
                        cards.forEach((card, index) => startCardFloat(gsap, card, index * 0.12));
                    }
                });
            }
        });
    }

    function initFeatureTilt(gsap) {
        const cards = $$('.features-section .card');
        if (!cards.length || !hasFinePointer) return;

        cards.forEach((card) => {
            const layers = $$('.card-icon, h3, p', card);
            const cardX = gsap.quickTo(card, 'x', { duration: 0.55, ease: 'power3.out' });
            const cardY = gsap.quickTo(card, 'y', { duration: 0.55, ease: 'power3.out' });
            const cardRotationX = gsap.quickTo(card, 'rotationX', { duration: 0.55, ease: 'power3.out' });
            const cardRotationY = gsap.quickTo(card, 'rotationY', { duration: 0.55, ease: 'power3.out' });
            const layerSetters = layers.map((layer) => ({
                x: gsap.quickTo(layer, 'x', { duration: 0.55, ease: 'power3.out' }),
                y: gsap.quickTo(layer, 'y', { duration: 0.55, ease: 'power3.out' })
            }));
            let rect = null;

            function cacheRect() {
                rect = card.getBoundingClientRect();
            }

            card.addEventListener('pointerenter', () => {
                cacheRect();
                setMotionHint(gsap, [card, ...layers], 'transform');
            }, { passive: true });

            card.addEventListener('pointermove', (event) => {
                if (!rect) cacheRect();
                const x = ((event.clientX - rect.left) / rect.width) - 0.5;
                const y = ((event.clientY - rect.top) / rect.height) - 0.5;

                cardRotationX(-y * 7);
                cardRotationY(x * 9);
                cardX(x * 8);
                cardY(y * 6);

                layerSetters.forEach((setters, index) => {
                    const depth = index + 1;
                    setters.x(x * depth * 5);
                    setters.y(y * depth * 4);
                });
            }, { passive: true });

            card.addEventListener('pointerleave', () => {
                rect = null;

                gsap.to(card, {
                    rotationX: 0,
                    rotationY: 0,
                    x: 0,
                    y: 0,
                    duration: 0.75,
                    ease: 'elastic.out(1, 0.45)',
                    force3D: true,
                    overwrite: 'auto'
                });

                gsap.to(layers, {
                    x: 0,
                    y: 0,
                    duration: 0.65,
                    ease: 'power3.out',
                    force3D: true,
                    overwrite: 'auto',
                    onComplete: () => setMotionHint(gsap, layers, 'auto')
                });
            }, { passive: true });
        });
    }

    function initMagneticButtons(gsap) {
        const buttons = $$('.btn');
        if (!buttons.length || !hasFinePointer) return;

        buttons.forEach((button) => {
            const buttonX = gsap.quickTo(button, 'x', { duration: 0.45, ease: 'power3.out' });
            const buttonY = gsap.quickTo(button, 'y', { duration: 0.45, ease: 'power3.out' });
            const buttonScale = gsap.quickTo(button, 'scale', { duration: 0.45, ease: 'power3.out' });
            let rect = null;

            function cacheRect() {
                rect = button.getBoundingClientRect();
            }

            button.addEventListener('pointerenter', () => {
                cacheRect();
                setMotionHint(gsap, button, 'transform');
            }, { passive: true });

            button.addEventListener('pointermove', (event) => {
                if (!rect) cacheRect();
                const x = ((event.clientX - rect.left) / rect.width) - 0.5;
                const y = ((event.clientY - rect.top) / rect.height) - 0.5;

                button.style.setProperty('--pointer-x', `${((x + 0.5) * 100).toFixed(2)}%`);
                button.style.setProperty('--pointer-y', `${((y + 0.5) * 100).toFixed(2)}%`);

                buttonX(x * 18);
                buttonY(y * 12);
                buttonScale(1.035);
            }, { passive: true });

            button.addEventListener('pointerleave', () => {
                rect = null;

                gsap.to(button, {
                    x: 0,
                    y: 0,
                    scale: 1,
                    duration: 0.65,
                    ease: 'elastic.out(1, 0.45)',
                    force3D: true,
                    overwrite: 'auto',
                    onComplete: () => setMotionHint(gsap, button, 'auto')
                });
            }, { passive: true });
        });
    }

    function initResponsiveRefresh(ScrollTrigger) {
        let resizeTimer = 0;
        let lastWidth = window.innerWidth;

        window.addEventListener('resize', () => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => {
                const nextWidth = window.innerWidth;
                if (Math.abs(nextWidth - lastWidth) < 16) return;
                lastWidth = nextWidth;

                ScrollTrigger.refresh();
            }, 180);
        }, { passive: true });
    }

    function initReducedOrFallback() {
        document.body.classList.add('motion-reduced');
        $$('[data-stat-value]').forEach(setCounterFinal);
    }

    onReady(() => {
        const gsap = window.gsap;
        const ScrollTrigger = window.ScrollTrigger;

        if (!hasAnimationRuntime(gsap, ScrollTrigger)) {
            initBasicFallback();
            return;
        }

        if (prefersReducedMotion) {
            initScrollChrome();
            initReducedOrFallback();
            return;
        }

        document.body.classList.add('gsap-motion');
        gsap.registerPlugin(ScrollTrigger);
        gsap.config({ nullTargetWarn: false });
        gsap.defaults({ force3D: true });
        ScrollTrigger.config({
            ignoreMobileResize: true,
            limitCallbacks: true
        });

        initVisibilityPause(gsap, ScrollTrigger);
        initScrollChrome(gsap);
        initHeroLoad(gsap);
        initBackgroundParallax(gsap, ScrollTrigger);
        initNavbarShrink(gsap);
        initSectionTransitions(gsap);
        initStatsCards(gsap, ScrollTrigger);
        initFeatureAnimations(gsap, ScrollTrigger);
        initFeatureTilt(gsap);
        initMagneticButtons(gsap);
        initResponsiveRefresh(ScrollTrigger);

        ScrollTrigger.refresh();
    });
})();
