(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const header = $('.site-header');
  let headerFrame = 0;
  const updateHeader = () => {
    headerFrame = 0;
    if (window.scrollY > 24) header.classList.add('is-scrolled');
    else if (window.scrollY <= 8) header.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', () => {
    if (!headerFrame) headerFrame = requestAnimationFrame(updateHeader);
  }, { passive: true });
  window.addEventListener('pageshow', updateHeader);
  updateHeader();
  let index;
  const getIndex = () => index ||= fetch(document.body.dataset.index).then(r => { if (!r.ok) throw Error('Could not load search index'); return r.json(); }).then(notes => notes.map(n => ({ ...n, tags: n.tags || [] })));
  const themeButton = $('.theme-toggle');
  const updateThemeLabel = () => themeButton.setAttribute('aria-label', `Switch to ${document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'} mode`);
  updateThemeLabel();
  themeButton.onclick = () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    updateThemeLabel();
    try { localStorage.setItem('garden-theme', theme); } catch {}
  };
  $('.mobile-menu').onclick = e => { const open = $('.nav-links').classList.toggle('is-open'); e.currentTarget.setAttribute('aria-expanded', open); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('.nav-links').classList.contains('is-open')) {
      $('.nav-links').classList.remove('is-open');
      $('.mobile-menu').setAttribute('aria-expanded', 'false');
      $('.mobile-menu').focus();
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-links, .mobile-menu')) {
      $('.nav-links').classList.remove('is-open');
      $('.mobile-menu').setAttribute('aria-expanded', 'false');
    }
  });
  const toc = $('.toc-sidebar');
  if (toc) {
    const toggle = $('.toc-toggle', toc), drawer = $('.toc-drawer', toc);
    const setOpen = open => {
      toc.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', `${open ? 'Close' : 'Open'} table of contents`);
      drawer.inert = !open;
      drawer.setAttribute('aria-hidden', String(!open));
    };
    toggle.onclick = () => setOpen(!toc.classList.contains('is-open'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toc.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus({ preventScroll: true });
      }
    });
    document.addEventListener('click', event => {
      if (!toc.contains(event.target)) setOpen(false);
    });
    $$('#TableOfContents a', toc).forEach(link => link.addEventListener('click', () => {
      if (matchMedia('(max-width: 1380px)').matches) setOpen(false);
    }));
  }
  const dialog = $('.search-dialog'), input = $('input', dialog), results = $('.search-results', dialog), label = $('.search-label', dialog);
  let searchGeneration = 0;
  const search = async () => {
    const generation = ++searchGeneration;
    try {
      const notes = await getIndex();
      if (generation !== searchGeneration) return;
      const terms = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      const hits = notes.filter(n => terms.every(t => `${n.title} ${n.summary} ${n.tags.join(' ')} ${n.body}`.toLowerCase().includes(t))).slice(0, 30);
      results.replaceChildren(...hits.map(n => {
        const a = document.createElement('a'); a.href = n.url;
        const strong = document.createElement('strong'); strong.textContent = n.title;
        const small = document.createElement('small'); small.textContent = `${n.section === 'thoughts' ? 'Thought · ' : ''}${n.summary}`;
        a.append(strong, small); return a;
      }));
      label.textContent = hits.length ? `${hits.length} results` : 'No results found';
    } catch { label.textContent = 'Search could not load. Please try again.'; }
  };
  $('.nav-search').onclick = () => { dialog.showModal(); input.focus(); search(); };
  $('.search-close').onclick = () => dialog.close();
  dialog.addEventListener('click', e => { if (e.target === dialog) { const b = dialog.getBoundingClientRect(); if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close(); } });
  input.addEventListener('input', search);
  dialog.addEventListener('keydown', e => {
    const links = $$('a', results), current = links.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); links[(current + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length]?.focus(); }
    if (e.key === 'Enter' && document.activeElement === input) links[0]?.click();
  });
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (dialog.open) dialog.close(); else $('.nav-search').click(); } });
  $$('.copy-code').forEach(button => {
    button.hidden = false;
    button.onclick = async () => {
      const pre = $('pre', button.parentElement).cloneNode(true);
      $$('.ln,.lnt', pre).forEach(el => el.remove());
      const text = pre.textContent.replace(/\n$/, '');
      let copied = false;
      try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); copied = true; } } catch {}
      if (!copied) {
        const focus = document.activeElement;
        const area = document.createElement('textarea');
        area.value = text;
        area.style.cssText = 'position:fixed;opacity:0;left:0;top:0;pointer-events:none;';
        document.body.append(area); area.select(); area.setSelectionRange(0, area.value.length);
        try { copied = document.execCommand('copy'); } catch {}
        area.remove(); focus?.focus({ preventScroll: true });
      }
      button.querySelector('span').textContent = copied ? 'Copied' : 'Copy unavailable';
      setTimeout(() => button.querySelector('span').textContent = 'Copy', 1800);
    };
  });
  // Vendor scripts are deferred; they have finished loading by DOMContentLoaded.
  document.addEventListener('DOMContentLoaded', () => {
    if (window.katex) $$('.math').forEach(el => katex.render(el.textContent, el, { displayMode: el.dataset.display === 'true', throwOnError: false }));
    if (window.mermaid) { mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'neutral' }); mermaid.run({ querySelector: '.mermaid' }).catch(console.error); }
  });
  const archive = $('.archive-page');
  if (archive) {
    const field = $('.archive-search input'), year = $('[aria-label="Filter by year"]'), sort = $('[aria-label="Sort notes"]');
    const params = new URLSearchParams(location.search);
    field.value = params.get('q') || ''; year.value = params.get('year') || ''; sort.value = params.get('sort') || 'newest';
    const rows = $$('.note-row', archive), groups = $('.archive-groups');
    const update = () => {
      const q = field.value.toLowerCase().trim(), y = year.value, tag = params.get('tag');
      const visible = rows.filter(r => (!y || r.dataset.date.startsWith(y)) && (!tag || JSON.parse(r.dataset.tags).includes(tag)) && (!q || r.textContent.toLowerCase().includes(q)));
      visible.sort((a,b) => sort.value === 'title' ? a.dataset.title.localeCompare(b.dataset.title) : (sort.value === 'oldest' ? 1 : -1) * a.dataset.date.localeCompare(b.dataset.date));
      groups.replaceChildren();
      const buckets = new Map();
      visible.forEach(row => { const key = sort.value === 'title' ? row.dataset.title[0].toUpperCase() : row.dataset.date.slice(0,4); if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(row); });
      buckets.forEach((items,key) => { const section = document.createElement('section'); section.className='archive-group'; const h=document.createElement('h2'); h.textContent=key; const count=document.createElement('span');count.textContent=`${items.length} notes`;h.append(count);section.append(h,...items);groups.append(section); });
      $('.archive-results span').textContent = `${visible.length} notes`;
      $('.empty-state',archive).hidden = !!visible.length;
      for(const [key,value] of [['q',field.value],['year',year.value],['sort',sort.value==='newest'?'':sort.value]]) { if(value)params.set(key,value);else params.delete(key); }
      history.replaceState(null,'',location.pathname+(params.size?'?'+params.toString():''));
    };
    [field,year,sort].forEach(el=>el.addEventListener(el===field?'input':'change',update)); update();
  }
  // Text-only previews use the same small, Hugo-generated index as search.
  let preview, timer;
  const closePreview = () => { preview?.remove(); preview=null; };
  document.addEventListener('keydown', e=>{if(e.key==='Escape')closePreview();});
  window.addEventListener('resize',closePreview);
  $$('a[data-preview]').forEach(a => {
    const show = () => { clearTimeout(timer); timer=setTimeout(async()=>{
      try {
        const notes=await getIndex(), note=notes.find(n=>new URL(a.href).pathname===n.url);
        if(!note || (!a.matches(':hover') && document.activeElement!==a)) return;
        closePreview(); preview=document.createElement('div');preview.className='note-preview';preview.setAttribute('role','tooltip');
        const tag=document.createElement('span');tag.className='preview-tag';tag.textContent=note.tags[0]||'note';
        const h=document.createElement('h3');h.textContent=note.title;
        const p=document.createElement('p');p.className='preview-summary';p.textContent=note.summary;
        const excerpt=document.createElement('p');excerpt.className='preview-excerpt';excerpt.textContent=note.body.slice(0,260);
        const footer=document.createElement('div');footer.className='preview-footer';footer.textContent=`${note.date} · ${note.readingTime} min read`;
        preview.append(tag,h,p,excerpt,footer);document.body.append(preview);
        const b=a.getBoundingClientRect();preview.style.left=Math.max(12,Math.min(b.left,innerWidth-preview.offsetWidth-12))+'px';preview.style.top=Math.max(12,b.top>280?b.top-274:Math.min(b.bottom+6,innerHeight-276))+'px';
      } catch {}
    },150); };
    const hide=()=>{clearTimeout(timer);closePreview();};a.addEventListener('mouseenter',show);a.addEventListener('focus',show);a.addEventListener('mouseleave',hide);a.addEventListener('blur',hide);a.addEventListener('click',hide);
  });
  const tocLinks=$$('#TableOfContents a');
  if(tocLinks.length){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)tocLinks.forEach(a=>a.classList.toggle('active',decodeURIComponent(a.hash.slice(1))===entry.target.id));},{rootMargin:'-10% 0px -70% 0px'});tocLinks.forEach(a=>{const h=document.getElementById(decodeURIComponent(a.hash.slice(1)));if(h)observer.observe(h);});}
})();
