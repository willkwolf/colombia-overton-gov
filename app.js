// Variables de estado global
let casosData = [];
const visiblePresidents = {
  "GAVIRIA": true,
  "SAMPER": true,
  "PASTRANA": true,
  "ESTRUCTURAL": true,
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
    
    // Inicializar y Renderizar Scatter Plot SVG
    initScatterPlot(casosData);
    
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
  
  if (ambito.includes("democracia") || ambito.includes("electoral") || ambito.includes("institución") || ambito.includes("institucion")) {
    dims.democracia = gravity;
  }
  if (ambito.includes("vida") || ambito.includes("privacidad") || ambito.includes("libertad") || ambito.includes("dd. hh.") || ambito.includes("dd.hh.") || ambito.includes("seguridad") || ambito.includes("paz")) {
    dims.vida = gravity;
  }
  if (ambito.includes("corrupción") || ambito.includes("corrupcion") || ambito.includes("democracia") || ambito.includes("electoral") || ambito.includes("sociales") || ambito.includes("social")) {
    dims.probidad = gravity;
  }
  if (ambito.includes("igualdad") || ambito.includes("sociales") || ambito.includes("social") || ambito.includes("agraria")) {
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
    const isVisible = visiblePresidents[presId] !== false;
    
    // Generar string para el polígono SVG
    const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
    
    // Polígono de área
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", pointsStr);
    polygon.setAttribute("class", `radar-polygon poly-${presId}`);
    polygon.setAttribute("id", `radar-poly-${presId}`);
    polygon.setAttribute("style", `opacity: ${isVisible ? "0.8" : "0"}; pointer-events: ${isVisible ? "auto" : "none"}; transition: opacity 0.4s;`);
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
      dot.setAttribute("style", `fill: currentColor; transition: r 0.2s; opacity: ${isVisible ? "0.8" : "0"}; pointer-events: ${isVisible ? "auto" : "none"};`);
      
      // Eventos interactivos en los vértices del radar
      dot.addEventListener('mouseenter', (e) => {
        if (visiblePresidents[presId] !== false) {
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
    const isChecked = visiblePresidents[presId] !== false;
    const item = document.createElement('label');
    item.className = 'radar-legend-item';
    item.innerHTML = `
      <input type="checkbox" class="radar-checkbox" data-pres="${presId}" ${isChecked ? 'checked' : ''}>
      <span class="legend-color-dot dot-${presId}"></span>
      <span class="legend-name">${avg.nombre}</span>
    `;
    
    const checkbox = item.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      visiblePresidents[presId] = checked;
      
      // Controlar opacidad de polígonos y vértices en el SVG
      const elements = radarChart.querySelectorAll(`.poly-${presId}`);
      elements.forEach(el => {
        el.style.opacity = checked ? "0.8" : "0";
        el.style.pointerEvents = checked ? "auto" : "none";
      });

      // Controlar visibilidad en el Scatter Plot
      const scatterElements = document.querySelectorAll(`#scatterplot-chart .poly-${presId}`);
      scatterElements.forEach(el => {
        el.style.display = checked ? "block" : "none";
      });
    });

    // Destacar polígono en hover de la leyenda (Tufte interactive highlight)
    item.addEventListener('mouseenter', () => {
      if (visiblePresidents[presId] !== false) {
        const poly = radarChart.querySelector(`#radar-poly-${presId}`);
        if (poly) poly.classList.add('highlighted');
      }
    });
    
    item.addEventListener('mouseleave', () => {
      const poly = radarChart.querySelector(`#radar-poly-${presId}`);
      if (poly) poly.classList.remove('highlighted');
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
// ==========================================================================
// 4. EVIDENCIA: SCATTER PLOT SVG (TUFTE GRID & SCATTER)
// ==========================================================================
function initScatterPlot(casos) {
  const scatterplotChart = document.getElementById('scatterplot-chart');
  if (!scatterplotChart) return;

  // Limpiar contenido previo
  scatterplotChart.innerHTML = '';

  const width = 500;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };

  const mapX = (x) => margin.left + ((x - 1) / (5 - 1)) * (width - margin.left - margin.right);
  const mapY = (y) => (height - margin.bottom) - (y / 5) * (height - margin.bottom - margin.top);

  // 1. Dibujar líneas de grilla y valores de escala
  // Líneas horizontales (Gravedad: 0 a 5)
  for (let y = 0; y <= 5; y++) {
    const cy = mapY(y);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", mapX(1));
    line.setAttribute("y1", cy);
    line.setAttribute("x2", mapX(5));
    line.setAttribute("y2", cy);
    line.setAttribute("class", "scatterplot-grid-line");
    scatterplotChart.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", mapX(1) - 10);
    text.setAttribute("y", cy + 3);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("class", "scatterplot-axis-text");
    text.textContent = y;
    scatterplotChart.appendChild(text);
  }

  // Líneas verticales (Novedad: 1 a 5)
  for (let x = 1; x <= 5; x++) {
    const cx = mapX(x);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cx);
    line.setAttribute("y1", mapY(0));
    line.setAttribute("x2", cx);
    line.setAttribute("y2", mapY(5));
    line.setAttribute("class", "scatterplot-grid-line");
    scatterplotChart.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", cx);
    text.setAttribute("y", mapY(0) + 15);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "scatterplot-axis-text");
    text.textContent = x;
    scatterplotChart.appendChild(text);
  }

  // 2. Dibujar líneas divisoras de cuadrantes (Intermedios: X=3, Y=2.5)
  const midX = mapX(3.0);
  const midY = mapY(2.5);

  const quadVLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  quadVLine.setAttribute("x1", midX);
  quadVLine.setAttribute("y1", mapY(0));
  quadVLine.setAttribute("x2", midX);
  quadVLine.setAttribute("y2", mapY(5));
  quadVLine.setAttribute("class", "scatterplot-quadrant-line");
  scatterplotChart.appendChild(quadVLine);

  const quadHLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  quadHLine.setAttribute("x1", mapX(1));
  quadHLine.setAttribute("y1", midY);
  quadHLine.setAttribute("x2", mapX(5));
  quadHLine.setAttribute("y2", midY);
  quadHLine.setAttribute("class", "scatterplot-quadrant-line");
  scatterplotChart.appendChild(quadHLine);

  // 3. Dibujar etiquetas de los cuadrantes
  const quadrantLabels = [
    { text: "Tensiones Habituales", x: (mapX(1) + midX) / 2, y: (mapY(5) + midY) / 2 + 3 },
    { text: "Quiebres Inéditos", x: (midX + mapX(5)) / 2, y: (mapY(5) + midY) / 2 + 3 },
    { text: "Pacto de Estabilidad", x: (mapX(1) + midX) / 2, y: (midY + mapY(0)) / 2 + 3 },
    { text: "Normalización Estructural", x: (midX + mapX(5)) / 2, y: (midY + mapY(0)) / 2 + 3 }
  ];

  quadrantLabels.forEach(ql => {
    const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textEl.setAttribute("x", ql.x);
    textEl.setAttribute("y", ql.y);
    textEl.setAttribute("text-anchor", "middle");
    textEl.setAttribute("class", "scatterplot-quadrant-text");
    textEl.textContent = ql.text;
    scatterplotChart.appendChild(textEl);
  });

  // 4. Dibujar líneas de los ejes
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", mapX(1));
  xAxis.setAttribute("y1", mapY(0));
  xAxis.setAttribute("x2", mapX(5));
  xAxis.setAttribute("y2", mapY(0));
  xAxis.setAttribute("class", "scatterplot-axis-line");
  scatterplotChart.appendChild(xAxis);

  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", mapX(1));
  yAxis.setAttribute("y1", mapY(0));
  yAxis.setAttribute("x2", mapX(1));
  yAxis.setAttribute("y2", mapY(5));
  yAxis.setAttribute("class", "scatterplot-axis-line");
  scatterplotChart.appendChild(yAxis);

  // Títulos de ejes
  const xTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xTitle.setAttribute("x", (mapX(1) + mapX(5)) / 2);
  xTitle.setAttribute("y", height - 10);
  xTitle.setAttribute("text-anchor", "middle");
  xTitle.setAttribute("class", "scatterplot-axis-title");
  xTitle.textContent = "Novedad de Overton (1–5)";
  scatterplotChart.appendChild(xTitle);

  const yTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yTitle.setAttribute("transform", "rotate(-90)");
  yTitle.setAttribute("x", -(margin.top + (height - margin.bottom - margin.top) / 2));
  yTitle.setAttribute("y", 20);
  yTitle.setAttribute("text-anchor", "middle");
  yTitle.setAttribute("class", "scatterplot-axis-title");
  yTitle.textContent = "Gravedad Constitucional (0–5)";
  scatterplotChart.appendChild(yTitle);

  // 5. Dibujar los puntos (nodos)
  casos.forEach(caso => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", mapX(caso.overton_novedad));
    circle.setAttribute("cy", mapY(caso.overton_gravedad));
    circle.setAttribute("r", 6);
    circle.setAttribute("class", `scatterplot-node poly-${caso.presidente_id}`);
    circle.setAttribute("id", `node-${caso.caso_id}`);
    
    // Configurar visibilidad según el estado de la leyenda
    const isVisible = visiblePresidents[caso.presidente_id] !== false;
    if (!isVisible) {
      circle.style.display = "none";
    }

    // Eventos interactivos
    circle.addEventListener('mouseenter', (e) => {
      showTooltip(e, caso.caso_nombre_corto, `Gravedad: ${caso.overton_gravedad} | Novedad: ${caso.overton_novedad} (${caso.anio_inicio})`);
    });

    circle.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    circle.addEventListener('click', () => {
      const card = document.getElementById(`item-${caso.caso_id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const header = card.querySelector('.timeline-card-header');
        if (header && card.classList.contains('timeline-item') && !card.classList.contains('active-item')) {
          header.click();
        }
      }
    });

    scatterplotChart.appendChild(circle);
  });
}

// ==========================================================================
// 5. FILTRADO REACTIVO VINCULADO Y SIMULADOR
// ==========================================================================
function updateOvertonFilters(maxGravity) {
  // Recorrer todos los casos y actualizar clases de estado en el DOM
  casosData.forEach(caso => {
    const cardEl = document.getElementById(`item-${caso.caso_id}`);
    const nodeEl = document.getElementById(`node-${caso.caso_id}`);
    const isOutside = caso.overton_gravedad > maxGravity;

    if (cardEl) {
      if (isOutside) {
        cardEl.classList.add('outside-window');
      } else {
        cardEl.classList.remove('outside-window');
      }
    }

    if (nodeEl) {
      if (isOutside) {
        nodeEl.classList.add('outside-window');
      } else {
        nodeEl.classList.remove('outside-window');
      }
    }
  });

  // Recalcular y renderizar el Radar Chart dinámicamente con los casos activos
  const activeCasos = casosData.filter(c => c.overton_gravedad <= maxGravity);
  initRadarChart(activeCasos);
}

// ==========================================================================
// 6. INTERACCIONES ADICIONALES (PROGRESS, SLIDER)
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

  // 2. Simulador de Ventana de Overton acoplado reactivamente
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
    const handleSliderInput = (val) => {
      const leftPos = Math.max(0, val - 15);
      if (highlight) {
        highlight.style.left = `${leftPos}%`;
        highlight.style.width = '30%';
      }

      zones.forEach(z => {
        if (z) z.classList.remove('active-zone');
      });

      let maxGravity = 5;
      if (val <= 25) {
        if (zones[0]) zones[0].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Impensable.</strong> Las ideas y prácticas están fuera de lo aceptable. El abuso institucional o la corrupción sistemática de gravedad superior a 0 reciben el repudio absoluto de toda la sociedad.";
        maxGravity = 0; // Solo César Gaviria (GAV_91_01 con gravedad 0)
      } else if (val > 25 && val <= 50) {
        if (zones[1]) zones[1].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Radical.</strong> La ventana se estira. Ciertas facciones políticas sugieren que el abuso o desvío constitucional es tolerable para sostener gobernabilidad (gravedad de 2 o menor).";
        maxGravity = 2;
      } else if (val > 50 && val <= 75) {
        if (zones[2]) zones[2].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Aceptable / Discutible.</strong> La esfera pública debate ampliamente sobre la licitud y consecuencias de conductas complejas (gravedad de 4 o menor).";
        maxGravity = 4;
      } else {
        if (zones[3]) zones[3].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Política Pública / Normalización.</strong> La conducta se incorpora al estándar institucional corriente. Se toleran desvíos constitucionales extremos de gravedad 5.";
        maxGravity = 5;
      }

      updateOvertonFilters(maxGravity);
    };

    slider.addEventListener('input', (e) => {
      handleSliderInput(parseInt(e.target.value));
    });

    // Sincronizar estado inicial al cargar
    handleSliderInput(parseInt(slider.value));
  }
}

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', initApp);
