// Variables de estado global
let casosData = [];

// Elementos del DOM
const timelineContainer = document.getElementById('timeline-container');
const tooltip = document.getElementById('tooltip');

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
    
    // Inicializar y Renderizar Scatter Plot SVG (Macro: Gravedad vs Novedad)
    initScatterPlot(casosData);

    // Inicializar y Renderizar Timeline Shift Chart SVG (Temporal: Año vs Gravedad)
    initTimelineChart(casosData);
    
    // Configurar listeners interactivos (Slider, Progress Bar)
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

  casos.forEach((caso) => {
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
// 3. EVIDENCIA: MAPA DE TENSIÓN (SCATTER PLOT GRAVEDAD VS NOVEDAD)
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

  // 1. Dibujar líneas de grilla y escala
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

  // 2. Líneas divisoras de cuadrantes (X=3, Y=2.5)
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

  // 3. Etiquetas de los cuadrantes
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

  // 4. Dibujar líneas de ejes
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

  // 5. Dibujar los puntos (nodos) con resolución de colisiones (beeswarm)
  const scatterNodes = casos.map(caso => ({
    caso: caso,
    x: mapX(caso.overton_novedad),
    y: mapY(caso.overton_gravedad),
    x0: mapX(caso.overton_novedad),
    y0: mapY(caso.overton_gravedad)
  }));

  resolveCollisions(scatterNodes, 6);

  scatterNodes.forEach(node => {
    const cx = Math.max(margin.left + 6, Math.min(width - margin.right - 6, node.x));
    const cy = Math.max(margin.top + 6, Math.min(height - margin.bottom - 6, node.y));

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", 6);
    circle.setAttribute("class", `scatterplot-node poly-${node.caso.presidente_id}`);
    circle.setAttribute("id", `node-${node.caso.caso_id}`);

    // Eventos interactivos
    circle.addEventListener('mouseenter', (e) => {
      showTooltip(e, node.caso.caso_nombre_corto, `Gravedad: ${node.caso.overton_gravedad} | Novedad: ${node.caso.overton_novedad} (${node.caso.anio_inicio})`);
    });

    circle.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    circle.addEventListener('click', () => {
      const card = document.getElementById(`item-${node.caso.caso_id}`);
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
// 4. EVIDENCIA: DERIVA HISTÓRICA (TEMPORAL AÑO VS GRAVEDAD)
// ==========================================================================
function initTimelineChart(casos) {
  const timelineChart = document.getElementById('timeline-chart');
  if (!timelineChart) return;

  // Limpiar contenido previo
  timelineChart.innerHTML = '';

  const width = 500;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 50, left: 60 };

  const mapX = (year) => margin.left + ((year - 1991) / (2026 - 1991)) * (width - margin.left - margin.right);
  const mapY = (gravity) => (height - margin.bottom) - (gravity / 5) * (height - margin.bottom - margin.top);

  // Pre-calcular posiciones colisionadas (beeswarm timeline layout)
  const timelineNodes = casos.map(caso => ({
    caso: caso,
    x: mapX(caso.anio_inicio),
    y: mapY(caso.overton_gravedad),
    x0: mapX(caso.anio_inicio),
    y0: mapY(caso.overton_gravedad)
  }));
  resolveCollisions(timelineNodes, 6);

  // 1. Dibujar líneas de grilla y escala de gravedad (Y: 0 a 5)
  for (let y = 0; y <= 5; y++) {
    const cy = mapY(y);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", mapX(1991));
    line.setAttribute("y1", cy);
    line.setAttribute("x2", mapX(2026));
    line.setAttribute("y2", cy);
    line.setAttribute("class", "timeline-chart-grid-line");
    timelineChart.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", mapX(1991) - 10);
    text.setAttribute("y", cy + 3);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("class", "timeline-chart-axis-text");
    text.textContent = y;
    timelineChart.appendChild(text);
  }

  // Líneas verticales e indicadores de año (X: 1991 a 2026)
  const years = [1991, 1995, 2000, 2005, 2010, 2015, 2020, 2026];
  years.forEach(year => {
    const cx = mapX(year);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cx);
    line.setAttribute("y1", mapY(0));
    line.setAttribute("x2", cx);
    line.setAttribute("y2", mapY(5));
    line.setAttribute("class", "timeline-chart-grid-line");
    timelineChart.appendChild(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", cx);
    text.setAttribute("y", mapY(0) + 15);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("class", "timeline-chart-axis-text");
    text.textContent = year;
    timelineChart.appendChild(text);
  });

  // 2. Franja Translúcida de la Ventana de Overton (Acceptable Window Band)
  // Comienza con el tamaño completo por defecto
  const maxGravityInit = 5;
  const bandY = mapY(maxGravityInit);
  const bandHeight = mapY(0) - bandY;

  const bandRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bandRect.setAttribute("x", mapX(1991));
  bandRect.setAttribute("y", bandY);
  bandRect.setAttribute("width", mapX(2026) - mapX(1991));
  bandRect.setAttribute("height", bandHeight);
  bandRect.setAttribute("class", "overton-window-band");
  bandRect.setAttribute("id", "overton-window-band");
  timelineChart.appendChild(bandRect);

  // 3. Dibujar línea de tendencia cronológica (Dashed Trend Line) con coordenadas colisionadas
  const pointsStr = timelineNodes.map(n => {
    const cx = Math.max(margin.left + 6, Math.min(width - margin.right - 6, n.x));
    const cy = Math.max(margin.top + 6, Math.min(height - margin.bottom - 6, n.y));
    return `${cx},${cy}`;
  }).join(' ');
  const trendLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  trendLine.setAttribute("points", pointsStr);
  trendLine.setAttribute("class", "timeline-chart-trend-line");
  timelineChart.appendChild(trendLine);

  // 4. Dibujar líneas de ejes
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", mapX(1991));
  xAxis.setAttribute("y1", mapY(0));
  xAxis.setAttribute("x2", mapX(2026));
  xAxis.setAttribute("y2", mapY(0));
  xAxis.setAttribute("class", "timeline-chart-axis-line");
  timelineChart.appendChild(xAxis);

  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", mapX(1991));
  yAxis.setAttribute("y1", mapY(0));
  yAxis.setAttribute("x2", mapX(1991));
  yAxis.setAttribute("y2", mapY(5));
  yAxis.setAttribute("class", "timeline-chart-axis-line");
  timelineChart.appendChild(yAxis);

  // Títulos de ejes
  const xTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xTitle.setAttribute("x", (mapX(1991) + mapX(2026)) / 2);
  xTitle.setAttribute("y", height - 10);
  xTitle.setAttribute("text-anchor", "middle");
  xTitle.setAttribute("class", "timeline-chart-axis-title");
  xTitle.textContent = "Año de Ocurrencia / Inicio";
  timelineChart.appendChild(xTitle);

  const yTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yTitle.setAttribute("transform", "rotate(-90)");
  yTitle.setAttribute("x", -(margin.top + (height - margin.bottom - margin.top) / 2));
  yTitle.setAttribute("y", 20);
  yTitle.setAttribute("text-anchor", "middle");
  yTitle.setAttribute("class", "timeline-chart-axis-title");
  yTitle.textContent = "Gravedad Constitucional (0–5)";
  timelineChart.appendChild(yTitle);

  // 5. Dibujar los puntos (nodos)
  timelineNodes.forEach(node => {
    const cx = Math.max(margin.left + 6, Math.min(width - margin.right - 6, node.x));
    const cy = Math.max(margin.top + 6, Math.min(height - margin.bottom - 6, node.y));

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", 6);
    circle.setAttribute("class", `timeline-chart-node poly-${node.caso.presidente_id}`);
    circle.setAttribute("id", `time-node-${node.caso.caso_id}`);

    // Eventos interactivos
    circle.addEventListener('mouseenter', (e) => {
      showTooltip(e, node.caso.caso_nombre_corto, `Gravedad: ${node.caso.overton_gravedad} | Año: ${node.caso.anio_inicio}`);
    });

    circle.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    circle.addEventListener('click', () => {
      const card = document.getElementById(`item-${node.caso.caso_id}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const header = card.querySelector('.timeline-card-header');
        if (header && card.classList.contains('timeline-item') && !card.classList.contains('active-item')) {
          header.click();
        }
      }
    });

    timelineChart.appendChild(circle);
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
    const timeNodeEl = document.getElementById(`time-node-${caso.caso_id}`);
    
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

    if (timeNodeEl) {
      if (isOutside) {
        timeNodeEl.classList.add('outside-window');
      } else {
        timeNodeEl.classList.remove('outside-window');
      }
    }
  });

  // Ajustar la altura y posición Y de la banda translúcida de Overton en el gráfico temporal
  const band = document.getElementById('overton-window-band');
  if (band) {
    const margin = { top: 40, bottom: 50 };
    const chartHeight = 400;
    const mapY = (y) => (chartHeight - margin.bottom) - (y / 5) * (chartHeight - margin.bottom - margin.top);
    
    const yVal = mapY(maxGravity);
    const bandHeight = mapY(0) - yVal;
    
    band.setAttribute('y', yVal);
    band.setAttribute('height', bandHeight);
  }
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
      // Corrección del bug visual del deslizador (evita desborde del highlight de 30% de ancho)
      const leftPos = Math.min(70, Math.max(0, val - 15));
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
        stateDesc.innerHTML = "<strong>Etapa: Impensable.</strong> Las ideas y prácticas están fuera de lo aceptable en una democracia. El abuso o desvío constitucional de gravedad superior a 0 recibe el repudio absoluto de la opinión pública.";
        maxGravity = 0; // Solo César Gaviria (GAV_91_01 con gravedad 0)
      } else if (val > 25 && val <= 50) {
        if (zones[1]) zones[1].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Radical.</strong> La ventana se estira. Ciertas facciones políticas sugieren que el abuso o desvío constitucional moderado (gravedad 2 o menor) es tolerable bajo justificaciones de orden.";
        maxGravity = 2;
      } else if (val > 50 && val <= 75) {
        if (zones[2]) zones[2].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Aceptable / Discutible.</strong> La esfera pública debate ampliamente sobre la licitud y conveniencia de desvíos graves (gravedad 4 o menor) para salvaguardar gobernabilidad.";
        maxGravity = 4;
      } else {
        if (zones[3]) zones[3].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Política Pública / Normalización.</strong> La conducta se incorpora al quehacer institucional corriente. Se asimilan desvíos constitucionales extremos de gravedad 5 como el costo de hacer política.";
        maxGravity = 5;
      }

      updateOvertonFilters(maxGravity);
    };

    slider.addEventListener('input', (e) => {
      handleSliderInput(parseInt(e.target.value));
    });

    // Sincronizar estado inicial al cargar (100)
    handleSliderInput(parseInt(slider.value));
  }
}

// Helper to resolve overlapping nodes using basic force relaxation (beeswarm layout)
function resolveCollisions(nodes, radius, iterations = 80) {
  const forceStrength = 0.15;
  const collideStrength = 0.45;

  for (let iter = 0; iter < iterations; iter++) {
    // Pull nodes to original position
    nodes.forEach(node => {
      node.x += (node.x0 - node.x) * forceStrength;
      node.y += (node.y0 - node.y) * forceStrength;
    });

    // Resolve collisions
    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j];
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distSq = dx * dx + dy * dy;
        const minDist = radius * 2 + 1.5; // Radius * 2 plus 1.5px safety buffer
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const overlap = minDist - dist;
          const pushX = (dx / dist) * overlap * collideStrength;
          const pushY = (dy / dist) * overlap * collideStrength;

          nodeA.x -= pushX;
          nodeA.y -= pushY;
          nodeB.x += pushX;
          nodeB.y += pushY;
        }
      }
    }
  }
}

// Global Tooltip functions
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

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', initApp);
