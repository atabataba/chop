(() => {
    const overlay = document.getElementById('intro');
    const canvas  = document.getElementById('introCanvas');
    const ctx     = canvas.getContext('2d', { alpha: true });
  
    const T = { scribble: 700, draw: 1700, hold: 650 };
    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
  
    const INK = '#000';
    const cx = () => window.innerWidth / 2;
    const cy = () => window.innerHeight / 2;
    const R  = () => Math.min(window.innerWidth, window.innerHeight) * 0.30;
    const TAU = Math.PI * 2;
    const deg = d => d * Math.PI / 180;
    const norm = a => (a % TAU + TAU) % TAU;
    const easeInOut = t => (t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2);
    const snoise = (a,b) => Math.sin(a)*0.5 + Math.sin(b)*0.5;
  
    const hairs = 30;
    const hairPts = Array.from({ length: hairs }, (_, i) => ({
      x: cx(), y: cy(), ang: (i/hairs)*TAU, len: 6 + Math.random()*7
    }));
    function drawScribbles(k) {
      const chaos = 1 - k;
      for (let i = 0; i < hairs; i++) {
        const p = hairPts[i];
        p.ang += 0.10 + i*0.0008;
        const radius = (0.12 + 0.82*k) * R();
        const ang = p.ang + snoise(p.x*0.01, p.y*0.01 + i) * 0.7 * chaos;
        const tx = cx() + radius * Math.cos(ang);
        const ty = cy() + radius * Math.sin(ang);
        p.x += (tx - p.x) * (0.18 + 0.12*(1-chaos)) + (Math.random()-0.5)*7*chaos;
        p.y += (ty - p.y) * (0.18 + 0.12*(1-chaos)) + (Math.random()-0.5)*7*chaos;
  
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(ang) * p.len, p.y + Math.sin(ang) * p.len);
        ctx.lineWidth = 4 + 2*(1-k);
        ctx.lineCap = 'round';
        ctx.strokeStyle = INK;
        ctx.globalAlpha = 0.9;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  
    const START_DEG = 135;
    const TARGET_ARC_PCT = 0.82; // keep your current openness (increase toward 1 for more complete)
    const DIR = 1;
    const startA = deg(START_DEG);
    const desiredArc = TARGET_ARC_PCT * TAU;
  
    function drawRibbon(progress) {
      const baseWidth = 54;
      const coreLayers = 4;
      const featherLayers = 2;
      const dryStartT = 0.72;
      const r = R();
      const Cx = cx(), Cy = cy();
      const steps = 900;
      const widthAt = t => {
        let w = baseWidth;
        const e = 0.12;
        if (t < e) w *= easeInOut(t / e);
        else if (t > 1 - e) w *= easeInOut((1 - t) / e);
        if (t > dryStartT) { const d = (t - dryStartT) / (1 - dryStartT); w *= 1 - d * 0.18; }
        return w;
      };
      const drawLayer = (radiusOffset, alpha) => {
        ctx.fillStyle = INK;
        ctx.globalAlpha = alpha;
        let prevL = null, prevR = null;
        const maxStep = Math.floor(steps * progress);
        for (let i = 0; i <= maxStep; i++) {
          const u = i / steps;
          const a = norm(startA + DIR * (desiredArc * u));
          const x = Cx + r * Math.cos(a);
          const y = Cy + r * Math.sin(a);
          const tx = -Math.sin(a), ty = Math.cos(a);
          const nx = -ty, ny = tx;
          const w = 0.5 * widthAt(u);
          const L = { x: x + nx * w, y: y + ny * w };
          const R = { x: x - nx * w, y: y - ny * w };
          if (prevL && prevR) {
            ctx.beginPath();
            ctx.moveTo(prevL.x, prevL.y);
            ctx.lineTo(prevR.x, prevR.y);
            ctx.lineTo(R.x, R.y);
            ctx.lineTo(L.x, L.y);
            ctx.closePath();
            ctx.fill();
          }
          prevL = L; prevR = R;
  
          // smaller tail cap to avoid a blob when nearly closed
          if (i === maxStep) {
            ctx.beginPath();
            ctx.arc(x, y, w * 0.6, 0, TAU); // was w
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      };
      for (let k = 0; k < coreLayers; k++) {
        const f = (k / (coreLayers - 1)) - 0.5;
        drawLayer(f * 1.0, 0.95);
      }
      for (let k = 0; k < featherLayers; k++) {
        drawLayer(-1.2 - k * 0.6, 0.22 * (1 - k * 0.35));
      }
    }
  
    const t0 = performance.now();
    function frame(now) {
      const t = now - t0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      if (t < T.scribble) {
        drawScribbles(t / T.scribble);
        requestAnimationFrame(frame); return;
      }
  
      if (t < T.scribble + T.draw) {
        const k = (t - T.scribble) / T.draw;
        const e = easeInOut(k);
  
        // stop scribbles early so no tiny ticks remain near the gap
        if (e < 0.65) {
          ctx.globalAlpha = 1 - e;   // crossfade out while early
          drawScribbles(1);
          ctx.globalAlpha = 1;
        }
  
        drawRibbon(e);
        requestAnimationFrame(frame); return;
      }
  
      if (t < T.scribble + T.draw + T.hold) {
        drawRibbon(1);
        requestAnimationFrame(frame); return;
      }
  
      overlay.classList.add('fade-out');
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    }
  
    requestAnimationFrame(frame);
  })();
  