(async () => {
    const notes = await fetch(document.body.dataset.index).then(r => { if (!r.ok)
        throw Error('Graph index unavailable'); return r.json(); }).then(notes => notes.map(n => ({ ...n, tags: n.tags || [] })));
    const colors = ['#608cc0', '#a381b5', '#6ba4be', '#87a567', '#c18d6c', '#c388a5', '#62a69b', '#b3a064', '#b17f88', '#86a69e'];
    function colorForTag(tag = '') { let hash = 0; for (const c of tag.toLowerCase())
        hash = (hash * 31 + c.charCodeAt(0)) >>> 0; return colors[hash % colors.length]; }
    function createGraph(notes) { const nodes = notes.map(note => ({ note, title: note.title, url: note.url, root: true })); const edges = []; for (let i = 0; i < notes.length; i++)
        for (let j = i + 1; j < notes.length; j++) {
            if (notes[i].tags.some(t => notes[j].tags.includes(t)) || (notes[i].links || []).includes(notes[j].url) || (notes[j].links || []).includes(notes[i].url))
                edges.push([i, j]);
        } return { nodes, edges }; }
    const categories = [...new Set(notes.map(note => note.tags[0]))].sort();
    const { nodes, edges } = createGraph(notes);
    const points = nodes.map((node, i) => {
        const note = node.note;
        const slot = (i + Math.floor(nodes.length * .35)) % nodes.length;
        const y = 1 - (slot / Math.max(1, nodes.length - 1)) * 2;
        const radius = Math.sqrt(1 - y * y), angle = slot * Math.PI * (3 - Math.sqrt(5));
        return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius, note, category: categories.indexOf(note.tags[0]), color: colorForTag(note.tags[0]) };
    });
    let rotation = { yaw: .6, pitch: .38 }, zoom = 1, category = null, paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const section = document.querySelector('.knowledge-graph');
    const changeZoom = value => { zoom = Math.max(.65, Math.min(2.6, value)); section.querySelector('output').textContent = Math.round(zoom * 100) + '%'; section.querySelector('canvas').dataset.zoom = zoom.toFixed(2); };
    section.querySelector('.graph-stats').textContent = `${notes.length} posts · ${edges.length} connections`;
    section.querySelector('canvas').dataset.nodeCount = nodes.length;
    const filter = section.querySelector('[aria-label="Filter graph by topic"]');
    categories.forEach((tag, index) => filter.add(new Option(tag || 'Uncategorized', index)));
    filter.addEventListener('change', () => { category = filter.value === '' ? null : Number(filter.value); });
    section.querySelector('[aria-label="Open a graph note"]').addEventListener('change', e => { if (e.target.value)
        location.assign(e.target.value); });
    const pause = section.querySelector('[data-graph="pause"]');
    const updatePause = () => { pause.textContent = paused ? '▶' : 'Ⅱ'; pause.setAttribute('aria-label', paused ? 'Rotate graph' : 'Pause graph'); };
    updatePause();
    section.querySelector('[data-graph="in"]').onclick = () => changeZoom(zoom * 1.2);
    section.querySelector('[data-graph="out"]').onclick = () => changeZoom(zoom / 1.2);
    pause.onclick = () => { paused = !paused; updatePause(); };
    section.querySelector('[data-graph="reset"]').onclick = () => { rotation = { yaw: .6, pitch: .38 }; category = null; filter.value = ''; changeZoom(1); };
    changeZoom(1);
    const canvas = document.querySelector('.globe-wrap canvas');
    if (!canvas)
        return;
    const ctx = canvas.getContext('2d');
    const aura = canvas.closest('.knowledge-graph')?.querySelector('.globe-aura');
    let width = 0, height = 0, frame = 0, last = 0, visible = true, hover = -1;
    let projected = [];
    let labelHits = [];
    let drag = null;
    let pressedNode = -1;
    const pointers = new Map();
    let pinchDistance = 0;
    const resize = new ResizeObserver(([entry]) => {
        width = entry.contentRect.width;
        height = entry.contentRect.height;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    resize.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (aura)
        aura.style.opacity = visible ? '1' : '0'; });
    intersection.observe(canvas);
    const draw = (time) => {
        frame = requestAnimationFrame(draw);
        if (!visible || document.hidden || time - last < 32 || !width)
            return;
        const dt = Math.min(time - (last || time), 100);
        last = time;
        if (!paused && !drag && hover < 0)
            rotation.yaw += dt * .000075;
        if (aura)
            aura.style.setProperty('--glow-center', `${canvas.getBoundingClientRect().top + height / 2}px`);
        ctx.clearRect(0, 0, width, height);
        const radius = Math.min(width * .4, height * .43) * zoom, centerX = width / 2, centerY = height / 2;
        const { yaw, pitch } = rotation;
        const isDark = document.documentElement.dataset.theme === 'dark';
        projected = points.map(p => {
            const x = p.x * Math.cos(yaw) + p.z * Math.sin(yaw);
            const z1 = -p.x * Math.sin(yaw) + p.z * Math.cos(yaw);
            const y = p.y * Math.cos(pitch) - z1 * Math.sin(pitch);
            const z = p.y * Math.sin(pitch) + z1 * Math.cos(pitch);
            const scale = 2.7 / (2.7 - z * .28);
            return { x: centerX + x * radius * scale, y: centerY - y * radius * scale, z, scale };
        });
        for (const [a, b] of edges) {
            const p = projected[a], q = projected[b];
            const connected = hover === a || hover === b;
            const dim = category !== null && points[a].category !== category && points[b].category !== category;
            ctx.strokeStyle = connected ? (isDark ? '#9ebae9' : '#5871a2') : (isDark ? '#8da9d2' : '#647ea8');
            ctx.globalAlpha = dim ? .012 : connected ? .7 : .055 + ((p.z + q.z + 2) / 4) * .13;
            ctx.lineWidth = connected ? 1.2 : .55;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
        }
        if (projected[0]) {
            canvas.dataset.latestX = projected[0].x.toFixed(2);
            canvas.dataset.latestY = projected[0].y.toFixed(2);
        }
        const order = projected.map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z);
        for (const p of order) {
            const dim = category !== null && points[p.i].category !== category;
            ctx.globalAlpha = dim ? .12 : .4 + ((p.z + 1) / 2) * .6;
            const nodeRadius = (p.i === 0 ? 5 : nodes[p.i].root ? 4.5 : 2.7) * p.scale;
            const dotGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, nodeRadius * 4);
            dotGlow.addColorStop(0, points[p.i].color + '88');
            dotGlow.addColorStop(.3, points[p.i].color + '30');
            dotGlow.addColorStop(1, points[p.i].color + '00');
            ctx.fillStyle = dotGlow;
            ctx.beginPath();
            ctx.arc(p.x, p.y, nodeRadius * 4, 0, Math.PI * 2);
            ctx.fill();
            if (p.i === 0 && !dim) {
                const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                const pulse = reduced ? .4 : (Math.sin(time * .0025) + 1) / 2;
                ctx.globalAlpha = .2 * (1 - pulse) + .04;
                ctx.strokeStyle = points[p.i].color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 9 + pulse * 13, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            ctx.fillStyle = points[p.i].color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.i === hover ? nodeRadius + 2 : nodeRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        const labelIndex = hover >= 0 ? hover : 0;
        const candidates = [labelIndex, ...order.filter(p => p.z > .1 && p.i !== labelIndex).sort((a, b) => Number(nodes[b.i].root) - Number(nodes[a.i].root) || b.z - a.z).map(p => p.i)];
        const occupied = [];
        const labelOpacity = Math.max(0, Math.min(1, (zoom - 1.08) * 2.2));
        const maxLabels = 1 + Math.floor(Math.max(0, zoom - 1) * 35);
        let labelCount = 0;
        labelHits = [];
        for (const index of candidates) {
            if (labelCount >= maxLabels)
                break;
            if (index !== labelIndex && labelOpacity === 0)
                continue;
            if (category !== null && points[index].category !== category)
                continue;
            const p = projected[index];
            if (p.x < 8 || p.x > width - 8 || p.y < 16 || p.y > height - 16)
                continue;
            ctx.font = '12px Inter, ui-sans-serif, system-ui';
            const title = nodes[index].title, textWidth = ctx.measureText(title).width;
            const labelX = Math.min(Math.max(p.x + 12, 8), width - textWidth - 16), labelY = Math.max(25, p.y - 6);
            const box = { x: labelX - 5, y: labelY - 15, width: textWidth + 10, height: 23 };
            if (occupied.some(other => box.x < other.x + other.width && box.x + box.width > other.x && box.y < other.y + other.height && box.y + box.height > other.y))
                continue;
            occupied.push(box);
            labelCount++;
            labelHits.push({ ...box, index });
            ctx.globalAlpha = index === labelIndex ? 1 : labelOpacity * (.55 + p.z * .45);
            ctx.fillStyle = isDark ? '#242e40ee' : '#fffef7ee';
            ctx.beginPath();
            ctx.roundRect(labelX - 6, labelY - 15, textWidth + 12, 23, 5);
            ctx.fill();
            ctx.fillStyle = isDark ? '#c8d8ee' : '#5871a2';
            ctx.fillText(title, labelX, labelY);
        }
        ctx.globalAlpha = 1;
    };
    frame = requestAnimationFrame(draw);
    const move = (event) => {
        if (pointers.has(event.pointerId))
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinchDistance)
                changeZoom(zoom * distance / pinchDistance);
            pinchDistance = distance;
            return;
        }
        if (drag) {
            const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 2)
                drag.moved = true;
            rotation.yaw += dx * .008;
            rotation.pitch = Math.max(-1.2, Math.min(1.2, rotation.pitch + dy * .006));
            drag.x = event.clientX;
            drag.y = event.clientY;
            return;
        }
        const bounds = canvas.getBoundingClientRect(), x = event.clientX - bounds.left, y = event.clientY - bounds.top;
        hover = labelHits.find(box => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height)?.index ?? projected.map((p, i) => ({ i, d: Math.hypot(p.x - x, p.y - y), z: p.z })).filter(p => p.d < 12 && (category === null || points[p.i].category === category)).sort((a, b) => b.z - a.z)[0]?.i ?? -1;
        canvas.style.cursor = hover >= 0 ? 'pointer' : 'grab';
    };
    const down = (event) => {
        canvas.focus({ preventScroll: true });
        move(event);
        pressedNode = hover;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        drag = pointers.size === 1 ? { x: event.clientX, y: event.clientY, moved: false } : null;
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
        }
        canvas.setPointerCapture(event.pointerId);
    };
    const up = (event) => { if (event.type !== 'pointercancel' && drag && !drag.moved && pressedNode >= 0)
        location.assign(nodes[pressedNode].url); pointers.delete(event.pointerId); pinchDistance = 0; drag = null; pressedNode = -1; };
    const leave = () => { hover = -1; };
    const wheel = (event) => { event.preventDefault(); changeZoom(zoom * Math.exp(-event.deltaY * .0015)); };
    canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', leave);
})().catch(console.error);
