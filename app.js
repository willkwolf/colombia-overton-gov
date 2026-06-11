// Variables de estado global
let casosData = [];
const visiblePresidents = {
  "URIBE": true,
  "SANTOS": true,
  "DUQUE": true,
  "PETRO": true,
  "ESTADO": true
};

// Elementos del DOM
const timelineContainer = document.getElementById('timeline-container');
const radarChart = document.getElementById('radar-chart');
const legendContainer = document.getElementById('radar-legend-container');
const tooltip = document.getElementById('tooltip');

// Configuración del Radar Chart
const RADAR_CENTER_X = 200;
const RADAR_CENTER_Y = 200;
const RADAR_RADIUS = 120;
const AXES_LABELS = [
  { text: "Democracia", x: 200, y: 55, anchor: "middle" },
  { text: "Vida / DD. HH.", x: 345, y: 205, anchor: "start" },
  { text: "Social / Igualdad", x: 200, y: 355, anchor: "middle" },
  { text: "Probidad / Ética", x: 55, y: 205, anchor: "end" }
];

// ==========================================================================
// 1. INICIALIZACIÓN Y CARGA DE DATOS
// ==========================================================================
async function initApp() {
  try {
    const response = await fetch('./dist/data_clean.json');
    if (!response.ok) {
      throw new Error(`Error al cargar JSON: ${response.statusText}`);
    }
    casosData = await response.json();
    
    // Ordenar los casos cronológicamente por año de inicio
    casosData.sort((a, b) => a.anio_inicio - b.anio_inicio);
    
    // Renderizar Línea de Tiempo
    renderTimeline(casosData);
    
    // Inicializar y Renderizar Radar Chart SVG
    initRadarChart(casosData);
    
    // Configurar otros listeners interactivos (Slider, Progress Bar)
    setupInteractions();
    
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    if (timelineContainer) {
      timelineContainer.innerHTML = `
        <div style="color: var(--accent-gravity); padding: 20px; border: 1px solid var(--border); border-radius: 4px;">
          <strong>Error al cargar los datos del archivo.</strong> Asegúrate de ejecutar <code>python scripts/build_database.py</code> para compilar la carpeta <code>dist/</code> antes de correr el proyecto de forma local.
        </div>
      `;
    }
  }
}

// ==========================================================================
// 2. RENDERIZADO DE LÍNEA DE TIEMPO INTERACTIVA (ACORDEÓN)
// ==========================================================================
function renderTimeline(casos) {
  if (!timelineContainer) return;
  timelineContainer.innerHTML = '';

  casos.forEach((caso, index) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.id = `item-${caso.caso_id}`;

    // Formatear montos y víctimas
    const montoText = caso.monto_millones_cop 
      ? `$${caso.monto_millones_cop.toLocaleString('es-CO')} Millones COP` 
      : 'N/A';
      
    const victimasText = caso.victimas 
      ? caso.victimas.toLocaleString('es-CO') 
      : (caso.victimas === 0 ? '0' : 'No consolidado');

    // Mapear artículos y actores
    const articlesTags = caso.articulos_detalles.map(art => 
      `<span class="art-tag" title="${art.titulo}: ${art.descripcion}">Art. ${art.articulo_id}</span>`
    ).join(' ');

    const actorsTags = caso.actores_clave.map(actor => 
      `<span class="actor-tag">${actor}</span>`
    ).join(' ');

    item.innerHTML = `
      <div class="timeline-badge" aria-hidden="true"></div>
      <div class="timeline-card">
        
        <!-- Cabecera de la Tarjeta (Tappable) -->
        <div class="timeline-card-header" role="button" aria-expanded="false" aria-controls="content-${caso.caso_id}">
          <div class="timeline-card-title-group">
            <span class="timeline-year">${caso.anio_inicio}</span>
            <span class="timeline-title">${caso.caso_nombre_corto}</span>
          </div>
          <div class="timeline-president-meta">
            <span class="timeline-badge-president ${caso.presidente_id}">${caso.presidente_nombre}</span>
            <span class="timeline-arrow" aria-hidden="true">▼</span>
          </div>
        </div>

        <!-- Contenido de la Tarjeta (Colapsable) -->
        <div class="timeline-card-content" id="content-${caso.caso_id}">
          <div class="timeline-card-body">
            <p class="timeline-desc">${caso.caso_descripcion_resumida}</p>
            
            <div class="timeline-meta-grid">
              <div><strong>Periodo de Gobierno:</strong> ${caso.periodo_gobierno}</div>
              <div><strong>Ámbito Principal:</strong> ${caso.ambito_principal}</div>
              <div><strong>Monto Involucrado:</strong> ${montoText}</div>
              <div><strong>Víctimas Aprox:</strong> ${victimasText}</div>
              <div><strong>Tiene Condenas Firmes:</strong> ${caso.tiene_condenas_firmes ? 'Sí' : 'No'}</div>
              <div><strong>Métricas Overton:</strong> Gravedad ${caso.overton_gravedad}/5 | Novedad ${caso.overton_novedad}/5</div>
            </div>

            ${caso.monto_detalles || caso.victimas_detalles || caso.condenas_detalles ? `
              <div class="timeline-subnote">
                ${caso.monto_detalles ? `• <strong>Detalles Monto:</strong> ${caso.monto_detalles}<br>` : ''}
                ${caso.victimas_detalles ? `• <strong>Detalles Víctimas:</strong> ${caso.victimas_detalles}<br>` : ''}
                ${caso.condenas_detalles ? `• <strong>Detalles Fallos:</strong> ${caso.condenas_detalles}` : ''}
              </div>
            ` : ''}

            <div class="timeline-subnote" style="border-left-color: var(--accent-info); background-color: rgba(14, 165, 233, 0.02)">
              <strong>Evidencia de Responsabilidad / Respaldo:</strong> ${caso.evidencia_responsabilidad}
            </div>

            <div class="timeline-tags-group">
              <div>
                <div class="tag-label">Artículos Afectados (Constitución del 91)</div>
                <div class="tag-list">${articlesTags}</div>
              </div>
              <div>
                <div class="tag-label">Actores Clave Mencionados</div>
                <div class="tag-list">${actorsTags}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    // Lógica del Clic/Tap para colapsar y expandir (Accordion)
    const header = item.querySelector('.timeline-card-header');
    const content = item.querySelector('.timeline-card-content');
    
    header.addEventListener('click', () => {
      const isExpanded = item.classList.contains('active-item');
      
      // Cerrar todos los demás acordeones
      const allItems = timelineContainer.querySelectorAll('.timeline-item');
      allItems.forEach(i => {
        i.classList.remove('active-item');
        i.querySelector('.timeline-card-content').style.maxHeight = null;
        i.querySelector('.timeline-card-header').setAttribute('aria-expanded', 'false');
      });
      
      // Expandir o contraer el actual
      if (!isExpanded) {
        item.classList.add('active-item');
        content.style.maxHeight = content.scrollHeight + "px";
        header.setAttribute('aria-expanded', 'true');
      }
    });

    timelineContainer.appendChild(item);
  });
}

// ==========================================================================
// 3. EVIDENCIA: RADAR CHART SVG DINÁMICO
// ==========================================================================

function getCaseDimensions(caso) {
  const dims = { democracia: 0, vida: 0, probidad: 0, social: 0 };
  const gravity = caso.overton_gravedad;
  const ambito = caso.ambito_principal.toLowerCase();
  
  if (ambito.includes("democracia") || ambito.includes("electoral")) {
    dims.democracia = gravity;
  }
  if (ambito.includes("vida") || ambito.includes("privacidad") || ambito.includes("libertad") || ambito.includes("dd. hh.") || ambito.includes("dd.hh.")) {
    dims.vida = gravity;
  }
  if (ambito.includes("corrupción") || ambito.includes("corrupcion") || ambito.includes("democracia") || ambito.includes("electoral") || ambito.includes("sociales")) {
    dims.probidad = gravity;
  }
  if (ambito.includes("igualdad") || ambito.includes("sociales") || ambito.includes("agraria")) {
    dims.social = gravity;
  }
  return dims;
}

function calculatePresidentRadarAverages(casos) {
  const presidentes = {};
  
  casos.forEach(c => {
    const presId = c.presidente_id;
    if (!presidentes[presId]) {
      presidentes[presId] = {
        nombre: c.presidente_nombre,
        id: presId,
        democracia: [],
        vida: [],
        probidad: [],
        social: []
      };
    }
    
    const dims = getCaseDimensions(c);
    if (dims.democracia > 0) presidentes[presId].democracia.push(dims.democracia);
    if (dims.vida > 0) presidentes[presId].vida.push(dims.vida);
    if (dims.probidad > 0) presidentes[presId].probidad.push(dims.probidad);
    if (dims.social > 0) presidentes[presId].social.push(dims.social);
  });
  
  const presAverages = {};
  Object.keys(presidentes).forEach(presId => {
    const p = presidentes[presId];
    const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    presAverages[presId] = {
      nombre: p.nombre,
      id: p.id,
      democracia: avg(p.democracia),
      vida: avg(p.vida),
      probidad: avg(p.probidad),
      social: avg(p.social)
    };
  });
  
  return presAverages;
}

function initRadarChart(casos) {
  if (!radarChart || !legendContainer) return;
  
  const averages = calculatePresidentRadarAverages(casos);
  
  // 1. Dibujar el Grid del Radar (Círculos concéntricos y ejes)
  drawRadarGrid();
  
  // 2. Renderizar polígonos de presidentes
  drawRadarPolygons(averages);
  
  // 3. Crear panel de leyendas interactivas con Checkboxes
  renderRadarLegend(averages);
}

function drawRadarGrid() {
  radarChart.innerHTML = '';
  
  // 5 Círculos concéntricos para la escala (1 a 5)
  for (let i = 1; i <= 5; i++) {
    const r = (i / 5) * RADAR_RADIUS;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", RADAR_CENTER_X);
    circle.setAttribute("cy", RADAR_CENTER_Y);
    circle.setAttribute("r", r);
    circle.setAttribute("class", "radar-grid-circle");
    radarChart.appendChild(circle);
    
    // Etiquetas de escala del radar
    const scaleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    scaleText.setAttribute("x", RADAR_CENTER_X + 2);
    scaleText.setAttribute("y", RADAR_CENTER_Y - r - 2);
    scaleText.setAttribute("style", "font-family: var(--font-mono); font-size: 7px; fill: var(--text-muted); opacity: 0.7;");
    scaleText.textContent = i;
    radarChart.appendChild(scaleText);
  }
  
  // Dibujar ejes (Top, Right, Bottom, Left)
  for (let i = 0; i < 4; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI / 2);
    const x2 = RADAR_CENTER_X + RADAR_RADIUS * Math.cos(angle);
    const y2 = RADAR_CENTER_Y + RADAR_RADIUS * Math.sin(angle);
    
    const axisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axisLine.setAttribute("x1", RADAR_CENTER_X);
    axisLine.setAttribute("y1", RADAR_CENTER_Y);
    axisLine.setAttribute("x2", x2);
    axisLine.setAttribute("y2", y2);
    axisLine.setAttribute("class", "radar-axis-line");
    radarChart.appendChild(axisLine);
    
    // Nombre del eje
    const labelData = AXES_LABELS[i];
    const axisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    axisLabel.setAttribute("x", labelData.x);
    axisLabel.setAttribute("y", labelData.y);
    axisLabel.setAttribute("text-anchor", labelData.anchor);
    axisLabel.setAttribute("class", "radar-axis-text");
    axisLabel.textContent = labelData.text;
    radarChart.appendChild(axisLabel);
  }
}

function getRadarPoints(avg, radius) {
  const points = [];
  const metrics = [avg.democracia, avg.vida, avg.social, avg.probidad];
  
  for (let i = 0; i < 4; i++) {
    const score = metrics[i];
    const angle = -Math.PI / 2 + (i * Math.PI / 2);
    const dist = (score / 5) * radius;
    const x = RADAR_CENTER_X + dist * Math.cos(angle);
    const y = RADAR_CENTER_Y + dist * Math.sin(angle);
    points.push({ x, y, score, name: AXES_LABELS[i].text });
  }
  
  return points;
}

function drawRadarPolygons(averages) {
  Object.keys(averages).forEach(presId => {
    const avg = averages[presId];
    const points = getRadarPoints(avg, RADAR_RADIUS);
    
    // Generar string para el polígono SVG
    const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
    
    // Polígono de área
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", pointsStr);
    polygon.setAttribute("class", `radar-polygon poly-${presId}`);
    polygon.setAttribute("id", `radar-poly-${presId}`);
    polygon.setAttribute("style", "opacity: 0.8; transition: opacity 0.4s;");
    radarChart.appendChild(polygon);
    
    // Puntos (vértices) interactivos
    points.forEach((p, idx) => {
      if (p.score === 0) return;
      
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", p.x);
      dot.setAttribute("cy", p.y);
      dot.setAttribute("r", 3);
      dot.setAttribute("class", `radar-vertex-dot poly-${presId}`);
      dot.setAttribute("id", `vertex-${presId}-${idx}`);
      dot.setAttribute("style", "fill: currentColor; transition: r 0.2s; opacity: 0.8;");
      
      // Eventos interactivos en los vértices del radar
      dot.addEventListener('mouseenter', (e) => {
        if (visiblePresidents[presId]) {
          showTooltip(e, avg.nombre, `${p.name}: ${p.score.toFixed(2)} / 5.0`);
          dot.setAttribute("r", 6);
        }
      });
      
      dot.addEventListener('mouseleave', () => {
        hideTooltip();
        dot.setAttribute("r", 3);
      });
      
      radarChart.appendChild(dot);
    });
  });
}

function renderRadarLegend(averages) {
  legendContainer.innerHTML = '';
  
  Object.keys(averages).forEach(presId => {
    const avg = averages[presId];
    const item = document.createElement('label');
    item.className = 'radar-legend-item';
    item.innerHTML = `
      <input type="checkbox" class="radar-checkbox" data-pres="${presId}" checked>
      <span class="legend-color-dot dot-${presId}"></span>
      <span class="legend-name">${avg.nombre}</span>
    `;
    
    const checkbox = item.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      visiblePresidents[presId] = isChecked;
      
      // Controlar opacidad de polígonos y vértices en el SVG
      const elements = radarChart.querySelectorAll(`.poly-${presId}`);
      elements.forEach(el => {
        if (el.tagName === 'polygon') {
          el.style.opacity = isChecked ? "0.8" : "0";
          el.style.pointerEvents = isChecked ? "auto" : "none";
        } else {
          // Vértices (círculos)
          el.style.opacity = isChecked ? "0.8" : "0";
          el.style.pointerEvents = isChecked ? "auto" : "none";
        }
      });
    });
    
    legendContainer.appendChild(item);
  });
}

function showTooltip(event, title, value) {
  tooltip.innerHTML = `
    <strong>${title}</strong>
    <span style="color: var(--accent-novelty)">${value}</span>
  `;
  tooltip.style.opacity = "1";
  tooltip.style.left = `${event.pageX + 15}px`;
  tooltip.style.top = `${event.pageY - 15}px`;
  tooltip.setAttribute("aria-hidden", "false");
}

function hideTooltip() {
  tooltip.style.opacity = "0";
  tooltip.setAttribute("aria-hidden", "true");
}

// ==========================================================================
// 4. INTERACCIONES ADICIONALES (PROGRESS, SLIDER)
// ==========================================================================
function setupInteractions() {
  // 1. Barra de Progreso de Lectura
  window.addEventListener('scroll', () => {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const pBar = document.getElementById('progress-bar');
    if (pBar) {
      pBar.style.width = `${scrolled}%`;
      document.getElementById('progress-bar-container').setAttribute('aria-valuenow', Math.round(scrolled));
    }
  });

  // 2. Simulador de Ventana de Overton
  const slider = document.getElementById('overton-slider');
  const highlight = document.getElementById('slider-window');
  const stateDesc = document.getElementById('simulator-state-desc');
  const zones = [
    document.getElementById('zone-impensable'),
    document.getElementById('zone-radical'),
    document.getElementById('zone-aceptable'),
    document.getElementById('zone-politica')
  ];

  if (slider) {
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      
      const leftPos = Math.max(0, val - 15);
      if (highlight) {
        highlight.style.left = `${leftPos}%`;
        highlight.style.width = '30%';
      }

      zones.forEach(z => {
        if (z) z.classList.remove('active-zone');
      });

      if (val <= 25) {
        if (zones[0]) zones[0].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Impensable.</strong> Las ideas y prácticas están fuera de lo aceptable. El abuso institucional o la corrupción sistemática reciben el repudio absoluto de toda la sociedad.";
      } else if (val > 25 && val <= 50) {
        if (zones[1]) zones[1].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Radical.</strong> La ventana se estira. Ciertas facciones políticas sugieren que el abuso o la compra de congresistas es 'necesaria' para asegurar la gobernabilidad del país.";
      } else if (val > 50 && val <= 75) {
        if (zones[2]) zones[2].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Aceptable / Discutible.</strong> La esfera pública discute ampliamente la legalidad de la conducta. Los medios debaten sobre quién se beneficia y las cortes evalúan demandas.";
      } else {
        if (zones[3]) zones[3].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Política Pública / Normalización.</strong> La conducta se incorpora al quehacer político regular. La corrupción en salud o las interceptaciones ilegales se ven como 'el costo inevitable de hacer política'.";
      }
    });
  }
}

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', initApp);
