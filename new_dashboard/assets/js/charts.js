/* Wrappers de Chart.js con presets de marca — Raycy Dashboard */

const EASE = 'easeOutCubic';
const FONT = 'Inter, system-ui, sans-serif';

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: EASE },
  plugins: {
    legend: {
      labels: {
        font: { family: FONT, size: 12, weight: '500' },
        color: '#4A5160',
        boxWidth: 10,
        boxHeight: 10,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: '#FFFFFF',
      titleColor: '#0A0A0B',
      bodyColor: '#4A5160',
      borderColor: '#E1E5EC',
      borderWidth: 1,
      padding: 10,
      titleFont: { family: FONT, size: 13, weight: '600' },
      bodyFont: { family: FONT, size: 12 },
      callbacks: {},
    },
  },
  scales: {
    x: {
      grid: { color: '#EEF0F4', drawBorder: false },
      ticks: { font: { family: FONT, size: 12 }, color: '#8B92A1' },
    },
    y: {
      grid: { color: '#EEF0F4', drawBorder: false },
      ticks: { font: { family: FONT, size: 12 }, color: '#8B92A1' },
      border: { dash: [4, 4] },
    },
  },
};

function mergeDeep(target, ...sources) {
  for (const source of sources) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = mergeDeep(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

/** Línea + barras combo (venta vs gasto histórico). */
export function crearComboChart(canvas, { labels, barData, lineData, barLabel, lineLabel, formatTooltip }) {
  const opts = mergeDeep({}, BASE_OPTIONS, {
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label(ctx) {
            const v = ctx.raw;
            return formatTooltip ? formatTooltip(ctx.dataset.label, v) : `${ctx.dataset.label}: ${v}`;
          },
        },
      },
    },
  });
  return new Chart(canvas, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar',
          label: barLabel,
          data: barData,
          backgroundColor: 'rgba(30,94,255,0.15)',
          borderColor: '#1E5EFF',
          borderWidth: 1.5,
          borderRadius: 4,
          order: 2,
        },
        {
          type: 'line',
          label: lineLabel,
          data: lineData,
          borderColor: '#0B36A8',
          backgroundColor: 'rgba(11,54,168,0.06)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#0B36A8',
          order: 1,
        },
      ],
    },
    options: opts,
  });
}

/** Donut chart. */
export function crearDonutChart(canvas, { labels, data, colores, formatTooltip }) {
  const colors = colores || ['#1E5EFF', '#88AAFF', '#B7CCFF', '#8B92A1', '#2B3140'];
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 0,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: { duration: 600, easing: EASE },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#FFFFFF',
          titleColor: '#0A0A0B',
          bodyColor: '#4A5160',
          borderColor: '#E1E5EC',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: FONT, size: 13, weight: '600' },
          bodyFont: { family: FONT, size: 12 },
          callbacks: {
            label(ctx) {
              return formatTooltip ? formatTooltip(ctx.label, ctx.raw) : `${ctx.label}: ${ctx.raw}`;
            },
          },
        },
      },
    },
  });
}

/** Barras horizontales. */
export function crearBarHorizontal(canvas, { labels, data, label, formatTooltip, color }) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: label || '',
        data,
        backgroundColor: color || '#1E5EFF',
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: EASE },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#FFFFFF',
          titleColor: '#0A0A0B',
          bodyColor: '#4A5160',
          borderColor: '#E1E5EC',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: FONT, size: 13, weight: '600' },
          bodyFont: { family: FONT, size: 12 },
          callbacks: {
            label(ctx) {
              return formatTooltip ? formatTooltip(ctx.label, ctx.raw) : `${ctx.raw}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#EEF0F4' },
          ticks: { font: { family: FONT, size: 12 }, color: '#8B92A1' },
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: FONT, size: 12 }, color: '#4A5160' },
        },
      },
    },
  });
}

/** Barras verticales simples. */
export function crearBarVertical(canvas, { labels, datasets, formatTooltip }) {
  return new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: mergeDeep({}, BASE_OPTIONS, {
      plugins: {
        tooltip: {
          callbacks: {
            label(ctx) {
              return formatTooltip ? formatTooltip(ctx.dataset.label, ctx.raw) : `${ctx.dataset.label}: ${ctx.raw}`;
            },
          },
        },
      },
    }),
  });
}

/** Scatter plot. */
export function crearScatter(canvas, { datasets, formatTooltip }) {
  return new Chart(canvas, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: EASE },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: FONT, size: 12 }, color: '#4A5160', usePointStyle: true },
        },
        tooltip: {
          backgroundColor: '#FFFFFF',
          titleColor: '#0A0A0B',
          bodyColor: '#4A5160',
          borderColor: '#E1E5EC',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: FONT, size: 13, weight: '600' },
          bodyFont: { family: FONT, size: 12 },
          callbacks: {
            label(ctx) {
              return formatTooltip ? formatTooltip(ctx.dataset.label, ctx.raw, ctx) : `(${ctx.parsed.x}, ${ctx.parsed.y})`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#EEF0F4' },
          ticks: { font: { family: FONT, size: 12 }, color: '#8B92A1' },
        },
        y: {
          grid: { color: '#EEF0F4' },
          ticks: { font: { family: FONT, size: 12 }, color: '#8B92A1' },
        },
      },
    },
  });
}

/** Destruye una instancia de Chart.js de forma segura. */
export function destruirChart(chart) {
  if (chart && typeof chart.destroy === 'function') chart.destroy();
}
