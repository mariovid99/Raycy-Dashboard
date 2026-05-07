/* Carga y cache del JSON */

let cache = null;

export async function loadData() {
  if (cache) return cache;

  // Intenta el JSON real; si falla, intenta el SAMPLE
  const urls = ['./dashboard_compras_data.json', './dashboard_compras_data.SAMPLE.json'];
  let lastError;

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      cache = await res.json();
      if (url.includes('SAMPLE')) {
        console.warn('[Dashboard Compras] Usando datos de muestra (SAMPLE). El JSON real aun no existe.');
      }
      return cache;
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error('No se pudo cargar dashboard_compras_data.json. Verifica que el dashboard este servido por HTTP local (python -m http.server 8000 desde esta carpeta).');
}

export function getMeses(data) {
  return data.meses_disponibles || [];
}

export function getMes(data, key) {
  return data.datos_por_mes[key] || null;
}

export function getSupervisores(mesData) {
  return mesData.supervisores || [];
}

export function getSupervisorById(mesData, id) {
  return (mesData.supervisores || []).find(s => s.supervisor_id === id) || null;
}
