/* KPI Card con count-up y sparkline opcional — Raycy Dashboard */

import { Icon } from '../icons.js';

/**
 * Crea una KPI card.
 * @param {Object} opts
 * @param {string} opts.label
 * @param {number|string} opts.valor
 * @param {Function} [opts.formatear] - función para formatear valor
 * @param {string} [opts.subtitulo]
 * @param {number} [opts.delta] - % cambio vs mes anterior
 * @param {number[]} [opts.sparkline] - array de valores para el sparkline
 * @param {boolean} [opts.hero] - borde azul superior
 * @param {number} [opts.delay] - delay de animación en ms (stagger)
 */
export function crearKpiCard({
  label,
  valor,
  formatear = (v) => v,
  subtitulo = '',
  delta = null,
  sparkline = null,
  hero = false,
  delay = 0,
}) {
  const el = document.createElement('div');
  el.className = `kpi-card card-enter${hero ? ' kpi-card--hero' : ''}`;
  el.style.animationDelay = `${delay}ms`;

  const labelEl = document.createElement('div');
  labelEl.className = 'kpi-card__label';
  labelEl.textContent = label;

  const valorEl = document.createElement('div');
  valorEl.className = 'kpi-card__valor tabular';
  valorEl.textContent = formatear(valor);
  valorEl.dataset.valor = valor;

  el.appendChild(labelEl);
  el.appendChild(valorEl);

  if (delta !== null && !isNaN(delta)) {
    const deltaEl = document.createElement('div');
    deltaEl.className = `kpi-card__delta ${delta >= 0 ? 'delta--up' : 'delta--down'}`;
    const iconName = delta >= 0 ? 'arrow-up-right' : 'arrow-down-right';
    const sign = delta >= 0 ? '+' : '';
    deltaEl.innerHTML = `${Icon(iconName, { size: 14 })}<span>${sign}${delta.toFixed(1)}%</span>`;
    el.appendChild(deltaEl);
  }

  if (subtitulo) {
    const subEl = document.createElement('div');
    subEl.className = 'kpi-card__subtitulo';
    subEl.textContent = subtitulo;
    el.appendChild(subEl);
  }

  if (sparkline && sparkline.length > 1) {
    const canvas = document.createElement('canvas');
    canvas.className = 'kpi-card__sparkline';
    canvas.height = 40;
    el.appendChild(canvas);
    _renderSparkline(canvas, sparkline);
  }

  // Count-up al montar
  if (typeof valor === 'number') {
    _countUp(valorEl, 0, valor, formatear, 700, delay);
  }

  return el;
}

function _countUp(el, from, to, fmt, duration, delay) {
  if (to === 0) return;
  setTimeout(() => {
    const start = performance.now();
    function tick(now) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const current = from + (to - from) * eased;
      el.textContent = fmt(current);
      if (elapsed < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(to);
    }
    requestAnimationFrame(tick);
  }, delay);
}

function _renderSparkline(canvas, data) {
  const ctx = canvas.getContext('2d');
  const w = canvas.offsetWidth || 120;
  const h = 40;
  canvas.width = w;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 6) - 3,
  }));

  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = '#1E5EFF';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Área
  ctx.lineTo(pts[pts.length - 1].x, h);
  ctx.lineTo(pts[0].x, h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(30,94,255,0.08)';
  ctx.fill();
}

/** Actualiza el valor de una KPI card con count-up. */
export function actualizarKpiCard(el, nuevoValor, formatear = (v) => v) {
  const valorEl = el.querySelector('.kpi-card__valor');
  if (!valorEl) return;
  const prev = parseFloat(valorEl.dataset.valor) || 0;
  valorEl.dataset.valor = nuevoValor;
  if (typeof nuevoValor === 'number') {
    _countUp(valorEl, prev, nuevoValor, formatear, 700, 0);
  } else {
    valorEl.textContent = formatear(nuevoValor);
  }
}
