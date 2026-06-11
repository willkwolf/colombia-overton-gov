// Variables de estado global
let casosData = [];
const activeLines = { x: null, y: null };

// Elementos del DOM
const scrollContent = document.getElementById('scroll-content');
const scatterPlot = document.getElementById('scatter-plot');
const detailPanel = document.getElementById('active-case-detail');
const detailId = document.getElementById('detail-id');
const detailPresident = document.getElementById('detail-president');
const detailTitle = document.getElementById('detail-title');
const detailGravity = document.getElementById('detail-gravity');
const detailNovelty = document.getElementById('detail-novelty');
const detailArticles = document.getElementById('detail-articles');
const detailResponsibility = document.getElementById('detail-responsibility');
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
    
    // Renderizar tarjetas de casos
    renderCaseCards(casosData);
    
    // Renderizar Scatter Plot
    renderScatterPlot(casosData);
    
    // Renderizar Gráficos Comparativos
    renderComparativeCharts(casosData);
    
    // Configurar el Intersection Observer para Scrollytelling
    setupScrollytelling();
    
    // Configurar otros listeners interactivos
    setupInteractions();
    
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    scrollContent.innerHTML = `
      <div class="case-card active-card" style="border-color: var(--accent-gravity)">
        <h3 class="case-title">Error al cargar el archivo de datos</h3>
        <p class="case-desc">
          No se pudieron recuperar los datos dinámicos. Esto es habitual si no has ejecutado el script 
          de compilación localmente antes de abrir el HTML directamente.
        </p>
        <p class="case-subnote">
          Asegúrate de ejecutar: <code>python scripts/build_database.py</code> para generar los archivos compilados en la carpeta <code>dist/</code>.
        </p>
      </div>
    `;
  }
}

// ==========================================================================
// 2. RENDERIZADO DE COMPONENTES
// ==========================================================================

function renderCaseCards(casos) {
  scrollContent.innerHTML = '';
  
  casos.forEach(caso => {
    const card = document.createElement('div');
    card.className = 'case-card';
    card.id = `card-${caso.caso_id}`;
    card.setAttribute('data-id', caso.caso_id);
    
    // Formatear montos y víctimas
    const montoText = caso.monto_millones_cop 
      ? `$${caso.monto_millones_cop.toLocaleString('es-CO')} Millones COP` 
      : 'N/A';
      
    const victimasText = caso.victimas 
      ? caso.victimas.toLocaleString('es-CO') 
      : (caso.victimas === 0 ? '0' : 'No consolidado');

    // Mapear artículos
    const articlesTags = caso.articulos_detalles.map(art => 
      `<span class="art-tag" data-art-id="${art.articulo_id}" title="${art.titulo}: ${art.descripcion}">Art. ${art.articulo_id}</span>`
    ).join(' ');

    // Mapear actores
    const actorsTags = caso.actores_clave.map(actor => 
      `<span class="actor-tag">${actor}</span>`
    ).join(' ');

    card.innerHTML = `
      <div class="case-header">
        <span class="badge">${caso.caso_id}</span>
        <span class="badge-president ${caso.presidente_id}">${caso.presidente_nombre}</span>
      </div>
      <h3 class="case-title">${caso.caso_nombre_corto}</h3>
      <p class="case-desc">${caso.caso_descripcion_resumida}</p>
      
      <div class="case-meta-list">
        <div><strong>Periodo:</strong> ${caso.periodo_gobierno}</div>
        <div><strong>Ámbito:</strong> ${caso.ambito_principal}</div>
        <div><strong>Monto Involucrado:</strong> ${montoText}</div>
        <div><strong>Víctimas Aprox:</strong> ${victimasText}</div>
        <div><strong>Condenas Firmes:</strong> ${caso.tiene_condenas_firmes ? 'Sí' : 'No'}</div>
      </div>

      ${caso.monto_detalles || caso.victimas_detalles || caso.condenas_detalles ? `
        <div class="case-subnote">
          ${caso.monto_detalles ? `• ${caso.monto_detalles}<br>` : ''}
          ${caso.victimas_detalles ? `• ${caso.victimas_detalles}<br>` : ''}
          ${caso.condenas_detalles ? `• Condenas: ${caso.condenas_detalles}` : ''}
        </div>
      ` : ''}

      <div class="case-tags-container">
        <div>
          <div class="tag-label">Artículos Afectados de la Constitución</div>
          <div class="tag-list">${articlesTags}</div>
        </div>
        <div style="margin-top: 12px;">
          <div class="tag-label">Actores Clave Mencionados</div>
          <div class="tag-list">${actorsTags}</div>
        </div>
      </div>
    `;
    scrollContent.appendChild(card);
  });
}

function renderScatterPlot(casos) {
  // Dimensiones internas SVG
  const width = 500;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 50, left: 50 };
  
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  
  // Limpiar SVG
  scatterPlot.innerHTML = '';
  
  // 1. Dibujar Rejillas y Líneas de Guía (1 a 5)
  for (let i = 1; i <= 5; i++) {
    const x = margin.left + ((i - 1) / 4) * plotWidth;
    const y = margin.top + (1 - (i - 1) / 4) * plotHeight;
    
    // Rejilla vertical
    const vLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    vLine.setAttribute("x1", x);
    vLine.setAttribute("y1", margin.top);
    vLine.setAttribute("x2", x);
    vLine.setAttribute("y2", height - margin.bottom);
    vLine.setAttribute("class", "grid-line");
    scatterPlot.appendChild(vLine);
    
    // Rejilla horizontal
    const hLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    hLine.setAttribute("x1", margin.left);
    hLine.setAttribute("y1", y);
    hLine.setAttribute("x2", width - margin.right);
    hLine.setAttribute("y2", y);
    hLine.setAttribute("class", "grid-line");
    scatterPlot.appendChild(hLine);
    
    // Etiquetas de los ejes
    // Eje X (Novedad)
    const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xLabel.setAttribute("x", x);
    xLabel.setAttribute("y", height - margin.bottom + 20);
    xLabel.setAttribute("text-anchor", "middle");
    xLabel.setAttribute("class", "axis-label");
    xLabel.textContent = i;
    scatterPlot.appendChild(xLabel);
    
    // Eje Y (Gravedad)
    const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yLabel.setAttribute("x", margin.left - 15);
    yLabel.setAttribute("y", y + 4);
    yLabel.setAttribute("text-anchor", "end");
    yLabel.setAttribute("class", "axis-label");
    yLabel.textContent = i;
    scatterPlot.appendChild(yLabel);
  }
  
  // 2. Dibujar títulos de ejes
  const xAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  xAxisTitle.setAttribute("x", margin.left + plotWidth / 2);
  xAxisTitle.setAttribute("y", height - margin.bottom + 42);
  xAxisTitle.setAttribute("text-anchor", "middle");
  xAxisTitle.setAttribute("class", "axis-label");
  xAxisTitle.setAttribute("style", "font-weight: 600; font-size: 10px; fill: var(--text-primary);");
  xAxisTitle.textContent = "Novedad de Overton (Desplazamiento)";
  scatterPlot.appendChild(xAxisTitle);

  const yAxisTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
  yAxisTitle.setAttribute("x", -(margin.top + plotHeight / 2));
  yAxisTitle.setAttribute("y", margin.left - 35);
  yAxisTitle.setAttribute("text-anchor", "middle");
  yAxisTitle.setAttribute("transform", "rotate(-90)");
  yAxisTitle.setAttribute("class", "axis-label");
  yAxisTitle.setAttribute("style", "font-weight: 600; font-size: 10px; fill: var(--text-primary);");
  yAxisTitle.textContent = "Gravedad Constitucional (Daño)";
  scatterPlot.appendChild(yAxisTitle);

  // 3. Crear Líneas de Proyección Pegajosas
  const projLineX = document.createElementNS("http://www.w3.org/2000/svg", "line");
  projLineX.setAttribute("class", "projection-line");
  projLineX.setAttribute("id", "proj-line-x");
  scatterPlot.appendChild(projLineX);
  activeLines.x = projLineX;

  const projLineY = document.createElementNS("http://www.w3.org/2000/svg", "line");
  projLineY.setAttribute("class", "projection-line");
  projLineY.setAttribute("id", "proj-line-y");
  scatterPlot.appendChild(projLineY);
  activeLines.y = projLineY;

  // 4. Dibujar Nodos (Casos)
  casos.forEach(caso => {
    // Escalar valores 1-5 al plano SVG
    const cx = margin.left + ((caso.overton_novedad - 1) / 4) * plotWidth;
    const cy = margin.top + (1 - (caso.overton_gravedad - 1) / 4) * plotHeight;
    
    // Crear grupo para efectos
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("id", `node-group-${caso.caso_id}`);
    
    // Círculo de sombra/pulso activo (oculto por defecto)
    const glowCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    glowCircle.setAttribute("cx", cx);
    glowCircle.setAttribute("cy", cy);
    glowCircle.setAttribute("r", 14);
    glowCircle.setAttribute("fill", "none");
    glowCircle.setAttribute("stroke", "currentColor");
    glowCircle.setAttribute("stroke-width", "2");
    glowCircle.setAttribute("class", `node-${caso.presidente_id}`);
    glowCircle.setAttribute("style", "opacity: 0; transition: opacity 0.3s;");
    glowCircle.setAttribute("id", `glow-${caso.caso_id}`);
    group.appendChild(glowCircle);

    // Círculo principal
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", 7);
    circle.setAttribute("class", `scatter-node node-${caso.presidente_id}`);
    circle.setAttribute("data-id", caso.caso_id);
    circle.setAttribute("id", `node-${caso.caso_id}`);
    
    // Evento Click: Scroll Bidireccional
    circle.addEventListener('click', () => {
      const targetCard = document.getElementById(`card-${caso.caso_id}`);
      if (targetCard) {
        // Scroll suave hacia la tarjeta
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Tooltip en Hover (Mouse)
    circle.addEventListener('mouseenter', (e) => {
      showTooltip(e, caso.caso_nombre_corto, caso.presidente_nombre, caso.overton_gravedad, caso.overton_novedad);
      circle.setAttribute("r", 10);
    });
    
    circle.addEventListener('mouseleave', () => {
      hideTooltip();
      if (!cardObserverActiveId || cardObserverActiveId !== caso.caso_id) {
        circle.setAttribute("r", 7);
      }
    });
    
    group.appendChild(circle);
    scatterPlot.appendChild(group);
  });
}

function renderComparativeCharts(casos) {
  // 1. Calcular promedio de gravedad por presidente
  const presAverages = {};
  const presCounts = {};
  
  // Agregar datos
  casos.forEach(c => {
    const pres = c.presidente_nombre;
    const key = c.presidente_id;
    if (!presAverages[key]) {
      presAverages[key] = { nombre: pres, suma: 0, count: 0 };
    }
    presAverages[key].suma += c.overton_gravedad;
    presAverages[key].count += 1;
  });

  const barChart = document.getElementById('gravity-bar-chart');
  barChart.innerHTML = '';

  Object.keys(presAverages).forEach(key => {
    const data = presAverages[key];
    const avg = (data.suma / data.count).toFixed(2);
    // Escalar al 100% (5 es el máximo)
    const percentage = (avg / 5) * 100;

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-info">
        <span class="bar-name">${data.nombre}</span>
        <span class="bar-val">${avg} / 5.0 (${data.count} ${data.count === 1 ? 'caso' : 'casos'})</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill bg-${key}" style="width: 0%;" data-width="${percentage}%"></div>
      </div>
    `;
    barChart.appendChild(row);
  });

  // 2. Contar casos por ámbito constitucional
  const categoryCounts = {};
  casos.forEach(c => {
    const cat = c.ambito_principal;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const catChart = document.getElementById('category-bar-chart');
  catChart.innerHTML = '';
  
  const maxCount = Math.max(...Object.values(categoryCounts));

  Object.keys(categoryCounts).forEach(cat => {
    const count = categoryCounts[cat];
    const percentage = (count / maxCount) * 100;

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-info">
        <span class="bar-name">${cat}</span>
        <span class="bar-val">${count} ${count === 1 ? 'caso' : 'casos'}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill bg-info" style="width: 0%;" data-width="${percentage}%"></div>
      </div>
    `;
    catChart.appendChild(row);
  });

  // Animación retrasada al ver las barras
  const chartsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Llenar las barras
        const fills = entry.target.querySelectorAll('.bar-fill');
        fills.forEach(fill => {
          fill.style.width = fill.getAttribute('data-width');
        });
        chartsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  chartsObserver.observe(document.getElementById('comparative-charts'));
}

// ==========================================================================
// 3. SCROLLYTELLING INTEGRATION
// ==========================================================================
let cardObserverActiveId = null;

function setupScrollytelling() {
  const cards = document.querySelectorAll('.case-card');
  const margin = { top: 40, right: 40, bottom: 50, left: 50 };
  const plotWidth = 500 - margin.left - margin.right;
  const plotHeight = 400 - margin.top - margin.bottom;

  const observerOptions = {
    root: null, // viewport
    rootMargin: '-25% 0px -40% 0px', // Captura el tercio central
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute('data-id');
      
      if (entry.isIntersecting) {
        cardObserverActiveId = id;
        
        // 1. Activar tarjeta en el scroll
        cards.forEach(c => c.classList.remove('active-card'));
        entry.target.classList.add('active-card');
        
        // 2. Destacar en el Scatter Plot
        highlightPlotNode(id);
        
        // 3. Mostrar detalle en el panel sticky
        const caso = casosData.find(c => c.caso_id === id);
        if (caso) {
          updateDetailPanel(caso);
          drawProjections(caso, margin, plotWidth, plotHeight);
        }
      }
    });
  }, observerOptions);

  cards.forEach(card => observer.observe(card));
}

function highlightPlotNode(id) {
  // Resetear todos los círculos a tamaño normal y baja opacidad
  const nodes = document.querySelectorAll('.scatter-node');
  nodes.forEach(n => {
    n.setAttribute("r", 6);
    n.style.opacity = "0.35";
  });
  
  const glowCircles = document.querySelectorAll('[id^="glow-"]');
  glowCircles.forEach(g => g.style.opacity = "0");

  // Destacar el nodo activo
  const activeNode = document.getElementById(`node-${id}`);
  if (activeNode) {
    activeNode.setAttribute("r", 10);
    activeNode.style.opacity = "1";
    activeNode.style.stroke = "var(--text-primary)";
    activeNode.style.strokeWidth = "2px";
  }

  // Activar el glow pulsante
  const activeGlow = document.getElementById(`glow-${id}`);
  if (activeGlow) {
    activeGlow.style.opacity = "0.4";
  }
}

function updateDetailPanel(caso) {
  detailPanel.style.opacity = "0";
  
  setTimeout(() => {
    detailId.textContent = caso.caso_id;
    detailPresident.textContent = caso.presidente_nombre;
    detailPresident.className = `badge-president ${caso.presidente_id}`;
    detailTitle.textContent = caso.caso_nombre_corto;
    detailGravity.textContent = caso.overton_gravedad;
    detailNovelty.textContent = caso.overton_novedad;
    
    // Mapeo amigable de responsabilidad
    const respMap = {
      "directa": "Directa (Promotor central / Beneficio político)",
      "directa_beneficio": "Directa por Beneficio (Financiación campaña)",
      "politica_fuerte": "Política Fuerte (Incentivos / Directivas del gobierno)",
      "politica_fuerte_en_debate": "Política Fuerte (En debate / Negligencia supervisión)",
      "estructural_con_intentos_correccion": "Estructural (Patrón persistente estatal)"
    };
    
    detailResponsibility.textContent = respMap[caso.nivel_responsabilidad] || caso.nivel_responsabilidad;
    
    const artsList = caso.articulos_detalles.map(art => `Art. ${art.articulo_id}`).join(', ');
    detailArticles.textContent = artsList || 'No especificados';
    
    detailPanel.style.opacity = "1";
  }, 150);
}

function drawProjections(caso, margin, plotWidth, plotHeight) {
  if (!activeLines.x || !activeLines.y) return;
  
  const cx = margin.left + ((caso.overton_novedad - 1) / 4) * plotWidth;
  const cy = margin.top + (1 - (caso.overton_gravedad - 1) / 4) * plotHeight;
  
  // Línea Y (hacia eje de Gravedad izquierdo)
  activeLines.y.setAttribute("x1", cx);
  activeLines.y.setAttribute("y1", cy);
  activeLines.y.setAttribute("x2", margin.left);
  activeLines.y.setAttribute("y2", cy);
  activeLines.y.classList.add("active");
  
  // Línea X (hacia eje de Novedad inferior)
  activeLines.x.setAttribute("x1", cx);
  activeLines.x.setAttribute("y1", cy);
  activeLines.x.setAttribute("x2", cx);
  activeLines.x.setAttribute("y2", heightAxisOffset(margin, plotHeight));
  activeLines.x.classList.add("active");
}

function heightAxisOffset(margin, plotHeight) {
  return margin.top + plotHeight;
}

// ==========================================================================
// 4. INTERACCIONES ADICIONALES (TOOLTIPS, SIMULADOR, COPY)
// ==========================================================================

function showTooltip(event, title, president, gravity, novelty) {
  tooltip.innerHTML = `
    <strong>${title}</strong>
    <span style="color: var(--accent-novelty)">${president}</span><br>
    Gravedad: ${gravity}/5 | Novedad: ${novelty}/5
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

function setupInteractions() {
  // 1. Barra de Progreso de Lectura
  window.addEventListener('scroll', () => {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById('progress-bar').style.width = `${scrolled}%`;
    document.getElementById('progress-bar-container').setAttribute('aria-valuenow', Math.round(scrolled));
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
      
      // Mover el highlight (rango visual)
      // Ajustar posición visual del highlight (el slider va de 0 a 100)
      const leftPos = Math.max(0, val - 15);
      highlight.style.left = `${leftPos}%`;
      highlight.style.width = '30%';

      // Resetear zonas activas
      zones.forEach(z => z.classList.remove('active-zone'));

      // Clasificar el valor en la etapa correspondiente
      if (val <= 25) {
        zones[0].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Impensable.</strong> Las ideas y prácticas están fuera de lo aceptable. El abuso institucional o la corrupción sistemática reciben el repudio absoluto de toda la sociedad.";
      } else if (val > 25 && val <= 50) {
        zones[1].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Radical.</strong> La ventana se estira. Ciertas facciones políticas sugieren que el abuso o la compra de congresistas es 'necesaria' para asegurar la gobernabilidad del país.";
      } else if (val > 50 && val <= 75) {
        zones[2].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Aceptable / Discutible.</strong> La esfera pública discute ampliamente la legalidad de la conducta. Los medios debaten sobre quién se beneficia y las cortes evalúan demandas.";
      } else {
        zones[3].classList.add('active-zone');
        stateDesc.innerHTML = "<strong>Etapa: Política Pública / Normalización.</strong> La conducta se incorpora al quehacer político regular. La corrupción en salud o las interceptaciones ilegales se ven como 'el costo inevitable de hacer política'.";
      }
    });
  }

  // 3. Botón de copia SQL
  const copyBtn = document.getElementById('copy-sql-btn');
  const sqlCode = document.getElementById('sql-example');
  if (copyBtn && sqlCode) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(sqlCode.textContent).then(() => {
        copyBtn.textContent = "¡Copiado!";
        setTimeout(() => {
          copyBtn.textContent = "Copiar";
        }, 2000);
      });
    });
  }
}

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', initApp);
