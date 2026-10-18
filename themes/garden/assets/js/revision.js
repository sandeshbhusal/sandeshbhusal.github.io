(() => {
  const start = async () => {
    const page = document.querySelector('[data-revision]');
    if (!page || !window.Reveal || !window.RevealNotes) return;
    const stage = page.querySelector('.revision-stage');
    const slides = [...stage.querySelectorAll('.slides > section')];
    const previous = page.querySelector('[data-card-prev]');
    const next = page.querySelector('[data-card-next]');
    const fullscreen = page.querySelector('[data-fullscreen]');
    const overview = page.querySelector('[data-overview]');
    const previews = page.querySelector('.revision-thumbnails');
    const receiver = new URLSearchParams(location.search).has('receiver');
    const initialHash = location.hash;
    const legacyIndex = hash => {
      let id;
      try { id = decodeURIComponent(hash.replace(/^#\/?/, '')); } catch { return -1; }
      return slides.findIndex(slide => slide.id === id || [...slide.querySelectorAll('[id]')].some(el => el.id === id));
    };
    const fitSlides = () => {
      for (const slide of slides) {
        const content = slide.querySelector('.revision-slide-content');
        // Reveal hides distant slides. Measure all slides briefly without displaying them.
        const display = slide.style.display;
        const hidden = slide.hidden;
        const zoom = content.style.zoom;
        slide.hidden = false;
        slide.style.display = 'block';
        content.style.zoom = '1';
        const scale = Math.min(1, 460 / content.scrollHeight, 880 / content.scrollWidth);
        content.style.setProperty('--slide-fit', String(scale));
        content.style.zoom = zoom;
        slide.style.display = display;
        slide.hidden = hidden;
      }
    };
    if (new URLSearchParams(location.search).has('print-pdf')) {
      // Print in its own document layout; never run embedded controls or resizing here.
      document.body.classList.add('presentation-active', 'presentation-print');
      document.body.append(stage);
      stage.classList.add('reveal');
      // Hidden slides do not request their fonts. Lay out every slide before
      // waiting, so PDF fitting uses the same fully loaded fonts as the deck.
      slides.forEach(slide => { slide.hidden = false; slide.style.display = 'block'; });
      stage.getBoundingClientRect();
      await document.fonts.ready;
      await Promise.all([...stage.querySelectorAll('img')].map(image => image.decode().catch(() => {})));
      fitSlides();
      const printDeck = new Reveal(stage, {
        embedded: false,
        view: 'print',
        width: 960,
        height: 540,
        margin: 0.04,
        center: false,
        controls: false,
        progress: false,
        hash: false,
        history: false,
        keyboard: false,
        pdfMaxPagesPerSlide: 1,
        pdfSeparateFragments: false,
        pdfPageHeightOffset: 0,
        transition: 'none',
        plugins: [],
      });
      const ready = new Promise(resolve => printDeck.on('pdf-ready', resolve));
      await printDeck.initialize();
      await ready;
      await document.fonts.ready;
      fitSlides();
      document.body.dataset.pdfReady = 'true';
      if (new URLSearchParams(location.search).has('export-pdf')) {
        const returnURL = new URL(location.href);
        returnURL.searchParams.delete('print-pdf');
        returnURL.searchParams.delete('export-pdf');
        window.addEventListener('afterprint', () => location.replace(returnURL.href), { once: true });
        requestAnimationFrame(() => window.print());
      }
      return;
    }
    document.body.classList.add('presentation-active');
    document.body.classList.toggle('presentation-receiver', receiver);
    stage.classList.add('reveal');
    const deck = new Reveal(stage, {
      embedded: true,
      width: 960,
      height: 540,
      margin: 0.04,
      minScale: 0.1,
      maxScale: 4,
      center: false,
      controls: false,
      progress: !receiver,
      hash: !receiver,
      history: !receiver,
      hashOneBasedIndex: false,
      keyboardCondition: () => !document.querySelector('dialog[open]') &&
        !document.activeElement?.closest('input, textarea, select, [contenteditable]') &&
        (receiver || document.body.classList.contains('presentation-fullscreen') || page.contains(document.activeElement)),
      transition: 'none',
      backgroundTransition: 'none',
      scrollActivationWidth: null,
      disableLayout: false,
      help: true,
      plugins: [RevealNotes],
    });
    await deck.initialize();
    const initialIndex = legacyIndex(initialHash);
    if (initialIndex >= 0) deck.slide(initialIndex);
    const sync = () => {
      const index = deck.getIndices().h;
      previous.disabled = index === 0;
      next.disabled = index === slides.length - 1;
      page.querySelector('[data-card-position]').textContent = `${index + 1} / ${slides.length}`;
      previews.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
      const selected = previews.querySelector('[aria-current="true"]');
      if (selected) {
        const left = selected.offsetLeft - previews.offsetLeft;
        if (left < previews.scrollLeft) previews.scrollLeft = left;
        else if (left + selected.offsetWidth > previews.scrollLeft + previews.clientWidth) previews.scrollLeft = left + selected.offsetWidth - previews.clientWidth;
      }
    };
    const buildPreviews = () => {
      if (receiver) return;
      const buttons = slides.map((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'revision-thumbnail';
        button.setAttribute('aria-label', `Go to slide ${index + 1}`);
        const canvas = document.createElement('span');
        canvas.className = 'revision-thumbnail-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        canvas.inert = true;
        const miniature = document.createElement('span');
        miniature.className = 'revision-miniature';
        const content = slide.querySelector('.revision-slide-content').cloneNode(true);
        content.querySelectorAll('aside.notes, .copy-code').forEach(el => el.remove());
        content.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        content.querySelectorAll('a, button, input, select, textarea, summary').forEach(el => {
          const span = document.createElement('span');
          span.append(...el.childNodes);
          el.replaceWith(span);
        });
        miniature.append(content);
        canvas.append(miniature);
        const label = document.createElement('span');
        label.className = 'revision-thumbnail-label';
        label.textContent = `${index + 1}. ${(slide.querySelector('h3') || slide.querySelector('h1, h2'))?.textContent || `Slide ${index + 1}`}`;
        button.append(canvas, label);
        button.addEventListener('click', () => { deck.slide(index); stage.focus({ preventScroll: true }); });
        return button;
      });
      previews.replaceChildren(...buttons);
      sync();
    };
    previous.addEventListener('click', () => { deck.prev(); stage.focus({ preventScroll: true }); });
    next.addEventListener('click', () => { deck.next(); stage.focus({ preventScroll: true }); });
    page.querySelector('[data-speaker]').addEventListener('click', () => deck.getPlugin('notes').open());
    page.querySelector('[data-export-pdf]').addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.set('print-pdf', '');
      url.searchParams.set('export-pdf', '');
      url.hash = slides[deck.getIndices().h].id;
      window.open(url.href, '_blank', 'noopener');
    });
    overview.addEventListener('click', () => { deck.toggleOverview(); stage.focus({ preventScroll: true }); });
    const syncOverview = () => overview.setAttribute('aria-pressed', String(deck.isOverview()));
    deck.on('overviewshown', syncOverview);
    deck.on('overviewhidden', syncOverview);
    deck.on('slidechanged', sync);
    window.addEventListener('hashchange', () => {
      const index = legacyIndex(location.hash);
      if (index >= 0 && index !== deck.getIndices().h) deck.slide(index);
    });
    let idleTimer;
    const wake = () => {
      clearTimeout(idleTimer);
      document.body.classList.remove('presentation-idle');
      if (document.body.classList.contains('presentation-fullscreen')) idleTimer = setTimeout(() => {
        document.body.classList.add('presentation-idle');
      }, 2500);
    };
    const setFullscreen = enabled => {
      document.body.classList.toggle('presentation-fullscreen', enabled);
      fullscreen.setAttribute('aria-pressed', String(enabled));
      fullscreen.textContent = enabled ? 'Exit fullscreen ⛶' : 'Present ⛶';
      deck.configure({ margin: enabled ? 0.08 : 0.04 });
      deck.layout();
      wake();
      stage.focus({ preventScroll: true });
    };
    const toggleFullscreen = async () => {
      if (document.body.classList.contains('presentation-fullscreen')) {
        if (document.fullscreenElement) await document.exitFullscreen();
        setFullscreen(false);
      } else {
        setFullscreen(true);
        try { await document.documentElement.requestFullscreen?.(); } catch {}
      }
    };
    fullscreen.addEventListener('click', toggleFullscreen);
    deck.addKeyBinding({ keyCode: 70, key: 'F', description: 'Toggle presentation fullscreen' }, toggleFullscreen);
    document.addEventListener('fullscreenchange', () => setFullscreen(!!document.fullscreenElement));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('presentation-fullscreen') && !document.fullscreenElement) {
        setFullscreen(false);
        deck.toggleOverview(false);
      }
      wake();
    });
    page.addEventListener('pointermove', wake, { passive: true });
    page.addEventListener('pointerdown', wake, { passive: true });
    page.addEventListener('focusin', wake);
    new ResizeObserver(() => deck.layout()).observe(stage);
    if (!receiver) {
      page.querySelector('.revision-actions').hidden = false;
      page.querySelector('.revision-navigation').hidden = false;
      previews.hidden = false;
    }
    fitSlides();
    buildPreviews();
    sync();
    // Font and diagram completion can change the natural size of slide content.
    document.fonts.ready.then(() => { fitSlides(); buildPreviews(); deck.layout(); });
    const observer = new MutationObserver(() => { fitSlides(); buildPreviews(); });
    slides.forEach(slide => observer.observe(slide.querySelector('.revision-slide-content'), { childList: true, subtree: true }));
    stage.focus({ preventScroll: true });
  };
  // Garden renders KaTeX at DOMContentLoaded; initialize after that rendering completes.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0));
  else setTimeout(start, 0);
})();
