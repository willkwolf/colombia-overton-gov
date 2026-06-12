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
    
    // Inicializar Scrollytelling
    setupScrollytelling(casosData);
    
    // Configurar listeners interactivos (Progress Bar, etc.)
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
// 3. LÓGICA DE SCROLLYTELLING (INTERSECTION OBSERVER)
// ==========================================================================
function setupScrollytelling(casos) {
  const sidebarYear = document.getElementById('status-year');
  const sidebarThresholdVal = document.getElementById('status-threshold-val');
  const sidebarMeterFill = document.getElementById('status-meter-fill');
  const sidebarStageBadge = document.getElementById('status-stage-badge');
  const sidebarStageDesc = document.getElementById('status-stage-desc');
  const sidebarReflection = document.getElementById('status-inercia-reflexion');

  // Precalcular la gravedad máxima acumulada hasta cada caso (dependencia de la trayectoria)
  let runningMax = 0;
  const casesWithThreshold = casos.map(caso => {
    if (caso.overton_gravedad > runningMax) {
      runningMax = caso.overton_gravedad;
    }
    return {
      caso: caso,
      threshold: runningMax
    };
  });

  const observerOptions = {
    root: null,
    rootMargin: '-25% 0px -45% 0px', // Gatillo centrado en viewport
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const caseId = entry.target.id.replace('item-', '');
        const caseIndex = casos.findIndex(c => c.caso_id === caseId);
        
        if (caseIndex !== -1) {
          // Desmarcar tarjetas previas
          document.querySelectorAll('.timeline-item').forEach(el => {
            el.classList.remove('active-scrolly-card');
          });
          
          // Resaltar tarjeta actual
          entry.target.classList.add('active-scrolly-card');
          
          // Actualizar panel lateral
          const data = casesWithThreshold[caseIndex];
          updateSidebar(data);
        }
      }
    });
  }, observerOptions);

  // Observar cada caso de la línea de tiempo
  casos.forEach(caso => {
    const el = document.getElementById(`item-${caso.caso_id}`);
    if (el) {
      observer.observe(el);
    }
  });

  function updateSidebar(data) {
    const caso = data.caso;
    const thresh = data.threshold;

    // 1. Año activo
    if (sidebarYear) sidebarYear.textContent = caso.anio_inicio;

    // 2. Umbral y medidor
    if (sidebarThresholdVal) sidebarThresholdVal.textContent = thresh;
    if (sidebarMeterFill) {
      sidebarMeterFill.style.height = `${(thresh / 5) * 100}%`;
    }

    // 3. Etapa de normalización y descripciones
    let stage = "";
    let desc = "";
    let reflection = "";

    if (thresh === 0) {
      stage = "IMPENSABLE";
      desc = "El debate se mantiene en rangos democráticos normales. El poder público opera bajo el principio de autocontrol.";
      reflection = "Atractor democrático original. Las desviaciones constitucionales son repudiadas unánimemente.";
      if (sidebarStageBadge) {
        sidebarStageBadge.style.backgroundColor = "rgba(15, 118, 110, 0.1)";
        sidebarStageBadge.style.color = "#0f766e";
      }
    } else if (thresh > 0 && thresh <= 2) {
      stage = "RADICAL";
      desc = "La ventana se estira. Ciertas facciones políticas sugieren que el desvío constitucional moderado es tolerable bajo justificaciones de orden.";
      reflection = `Desviación leve normalizada. El caso de ${caso.presidente_nombre} en ${caso.anio_inicio} (${caso.caso_nombre_corto}) establece un precedente de tolerancia institucional.`;
      if (sidebarStageBadge) {
        sidebarStageBadge.style.backgroundColor = "rgba(133, 77, 14, 0.1)";
        sidebarStageBadge.style.color = "#854d0e";
      }
    } else if (thresh > 2 && thresh <= 4) {
      stage = "ACEPTABLE / DISCUTIBLE";
      desc = "La esfera pública debate sobre la conveniencia de desvíos graves para salvaguardar gobernabilidad o seguridad nacional.";
      reflection = `Erosión intermedia en marcha. La acumulación histórica normaliza desvíos severos de gravedad ${caso.overton_gravedad}/5 en el caso ${caso.caso_nombre_corto}.`;
      if (sidebarStageBadge) {
        sidebarStageBadge.style.backgroundColor = "rgba(154, 52, 18, 0.1)";
        sidebarStageBadge.style.color = "#9a3412";
      }
    } else {
      stage = "NORMALIZADO";
      desc = "La conducta extrema se incorpora al quehacer corriente. Se asimilan violaciones a pilares fundamentales como el costo inevitable de la política.";
      reflection = `Bucle de inercia cerrado (cierre institucional). Con el caso de ${caso.caso_nombre_corto} de gravedad 5/5, la ventana se ha ensanchado al límite. El sistema normaliza lo antes impensable.`;
      if (sidebarStageBadge) {
        sidebarStageBadge.style.backgroundColor = "rgba(153, 27, 27, 0.1)";
        sidebarStageBadge.style.color = "#991b1b";
      }
    }

    if (sidebarStageBadge) sidebarStageBadge.textContent = stage;
    if (sidebarStageDesc) sidebarStageDesc.innerHTML = desc;
    if (sidebarReflection) sidebarReflection.innerHTML = `<strong>Inercia Acumulada:</strong> ${reflection}`;
  }
}

// ==========================================================================
// 4. INTERACCIONES ADICIONALES (PROGRESS BAR)
// ==========================================================================
function setupInteractions() {
  // Barra de Progreso de Lectura
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
