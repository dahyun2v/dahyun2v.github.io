// 장수 전신 그림 배경 지우기(화면 표시용, 원본 파일은 그대로) — Claude 2026-10-08
// 장수 그림은 대부분 밝은 단색 배경이다. 테두리에서 배경색과 가까운 픽셀을 이어 채우기(flood fill)로 찾아 투명하게 하고,
// 경계는 1~2px 부드럽게. 결과는 blob URL 로 기억해 둔다(같은 그림은 한 번만 처리).
const cache = new Map();

export function cutout(src, {maxH = 1100, tol = 30} = {}) {
  if (!src || typeof document === 'undefined') return Promise.resolve(null);
  if (cache.has(src)) return cache.get(src);
  const job = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const k = Math.min(1, maxH / img.naturalHeight), w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d', {willReadFrequently: true}); ctx.drawImage(img, 0, 0, w, h);
        const im = ctx.getImageData(0, 0, w, h), d = im.data;
        // 이미 투명한 그림이면 그대로
        if (d[3] < 250 && d[(w * h - 1) * 4 + 3] < 250) { resolve(src); return; }
        // 배경색: 네 모서리 근처 표본의 중앙값
        const samples = [];
        for (const [x0, y0] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3], [w >> 1, 2]]) { const i = (y0 * w + x0) * 4; samples.push([d[i], d[i + 1], d[i + 2]]); }
        const med = [0, 1, 2].map((c) => samples.map((s) => s[c]).sort((a, b) => a - b)[2]);
        const dist = (i) => Math.abs(d[i] - med[0]) + Math.abs(d[i + 1] - med[1]) + Math.abs(d[i + 2] - med[2]);
        const bg = new Uint8Array(w * h), q = new Int32Array(w * h); let head = 0, tail = 0;
        const push = (p) => { if (!bg[p] && dist(p * 4) <= tol * 3) { bg[p] = 1; q[tail++] = p; } };
        for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
        for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
        while (head < tail) { const p = q[head++], x = p % w; if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (p >= w) push(p - w); if (p < w * (h - 1)) push(p + w); }
        for (let p = 0; p < w * h; p++) {
          if (bg[p]) { d[p * 4 + 3] = 0; continue; }
          // 배경과 맞닿은 가장자리: 배경색과 가까울수록 더 투명하게(옅은 테두리 빛 제거)
          const x = p % w, edge = (x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (p >= w && bg[p - w]) || (p < w * (h - 1) && bg[p + w]);
          if (edge) d[p * 4 + 3] = Math.min(d[p * 4 + 3], Math.round(255 * Math.min(1, dist(p * 4) / (tol * 6))));
        }
        ctx.putImageData(im, 0, 0);
        cv.toBlob((b) => resolve(b ? URL.createObjectURL(b) : src), 'image/png');
      } catch { resolve(src); }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
  cache.set(src, job);
  return job;
}
