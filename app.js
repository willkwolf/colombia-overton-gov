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
    
    // Inicializar Simulador de la Esfera Pública (sliders de Libertad)
    setupOvertonSimulator();
    
    // Inicializar Glosario Interactivo
    setupGlossary();
    
    // Inicializar Resaltado de Sección de Navegación y Badge de Estado
    setupActiveNavLink();
    
    // Inicializar Compartición y Copiado al Portapapeles
    setupClipboardSharing();
    
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
        
        <!-- Cabecera de la Tarjeta (Tappable y Accesible por Teclado) -->
        <div class="timeline-card-header" role="button" tabindex="0" aria-expanded="false" aria-controls="content-${caso.caso_id}">
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
                ${caso.monto_detalles ? `<p style="margin-bottom: 6px;"><strong>Monto:</strong> ${caso.monto_detalles}</p>` : ''}
                ${caso.victimas_detalles ? `<p style="margin-bottom: 6px;"><strong>Impacto social / Víctimas:</strong> ${caso.victimas_detalles}</p>` : ''}
                ${caso.condenas_detalles ? `<p><strong>Resolución judicial:</strong> ${caso.condenas_detalles}</p>` : ''}
              </div>
            ` : ''}

            <div class="timeline-subnote" style="border-left-color: var(--accent-info); background-color: rgba(14, 165, 233, 0.02)">
              <strong>Evidencia de respaldo:</strong> ${caso.evidencia_responsabilidad}
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

    // Lógica del Clic/Tap para colapsar y expandir (Accordion con soporte de Accesibilidad)
    const header = item.querySelector('.timeline-card-header');
    const content = item.querySelector('.timeline-card-content');
    
    const toggleAccordion = () => {
      const isExpanded = item.classList.contains('active-item');
      
      // Cerrar todos los demás acordeones
      const allItems = timelineContainer.querySelectorAll('.timeline-item');
      allItems.forEach(i => {
        if (i !== item) {
          i.classList.remove('active-item');
          i.querySelector('.timeline-card-content').style.maxHeight = null;
          i.querySelector('.timeline-card-header').setAttribute('aria-expanded', 'false');
        }
      });
      
      // Expandir o contraer el actual
      if (!isExpanded) {
        item.classList.add('active-item');
        content.style.maxHeight = content.scrollHeight + "px";
        header.setAttribute('aria-expanded', 'true');
      } else {
        item.classList.remove('active-item');
        content.style.maxHeight = null;
        header.setAttribute('aria-expanded', 'false');
      }
    };

    header.addEventListener('click', toggleAccordion);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); // Evitar el scroll predeterminado al presionar la barra espaciadora
        toggleAccordion();
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

  // Registrar el máximo umbral de inercia alcanzado para el efecto irreversible de vidrio roto
  let maxThresholdReached = 0;

  // Calcular el índice de inercia acumulada (dependencia de la trayectoria)
  // en una escala de 0 a 5 basada en la acumulación de precedentes graves (gravedad >= 4)
  let graveCount = 0;
  const casesWithThreshold = casos.map(caso => {
    if (caso.overton_gravedad >= 4) {
      graveCount++;
    }
    
    let threshold = 0;
    if (graveCount <= 1) threshold = 0;
    else if (graveCount <= 3) threshold = 1;
    else if (graveCount <= 6) threshold = 2;
    else if (graveCount <= 10) threshold = 3;
    else if (graveCount <= 14) threshold = 4;
    else threshold = 5;

    return {
      caso: caso,
      threshold: threshold
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
          
          // Desbloquear secuencialmente la tarjeta actual y todas las anteriores para que sigan legibles
          for (let i = 0; i <= caseIndex; i++) {
            const prevEl = document.getElementById(`item-${casos[i].caso_id}`);
            if (prevEl) {
              prevEl.classList.add('unlocked');
            }
          }
          
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

    // 2. Umbral y medidor (irreversibles)
    if (thresh > maxThresholdReached) {
      maxThresholdReached = thresh;
    }
    if (sidebarThresholdVal) sidebarThresholdVal.textContent = maxThresholdReached;
    if (sidebarMeterFill) {
      const percent = (maxThresholdReached / 5) * 100;
      sidebarMeterFill.style.height = `${percent}%`;
      sidebarMeterFill.style.width = `${percent}%`;
    }

    // 2.5. Actualizar fragmentos de vidrio (irreversibles, solo visibles en móvil)
    updateGlassShards(maxThresholdReached);

    // 3. Etapa de normalización y descripciones
    let stage = "";
    let desc = "";
    let reflection = "";

    if (thresh === 0) {
      stage = "IMPENSABLE";
      desc = "El debate se mantiene en rangos democráticos normales. El poder público opera bajo el principio de autocontrol.";
      reflection = "Punto de partida y consenso constitucional de 1991. Las desviaciones del pacto original son repudiadas unánimemente.";
      if (sidebarStageBadge) {
        sidebarStageBadge.style.backgroundColor = "rgba(15, 118, 110, 0.1)";
        sidebarStageBadge.style.color = "#0f766e";
      }
    } else if (thresh > 0 && thresh <= 2) {
      stage = "RADICAL";
      desc = "La ventana se estira. Ciertas facciones políticas sugieren que el desvío constitucional moderado es tolerable bajo justificaciones de orden.";
      reflection = `Comienza la tolerancia. El caso de ${caso.presidente_nombre} en ${caso.anio_inicio} (${caso.caso_nombre_corto}) establece un precedente de permisividad institucional.`;
      if (sidebarStageBadge) {
        sidebarStageBadge.style.backgroundColor = "rgba(133, 77, 14, 0.1)";
        sidebarStageBadge.style.color = "#854d0e";
      }
    } else if (thresh > 2 && thresh <= 4) {
      stage = "ACEPTABLE / DISCUTIBLE";
      desc = "La esfera pública debate sobre la conveniencia de desvíos graves para salvaguardar gobernabilidad o seguridad nacional.";
      reflection = `Desgaste intermedio en marcha. La acumulación de precedentes normaliza desvíos severos de gravedad ${caso.overton_gravedad}/5 en el caso ${caso.caso_nombre_corto}.`;
      if (sidebarStageBadge) {
        sidebarStageBadge.style.backgroundColor = "rgba(154, 52, 18, 0.1)";
        sidebarStageBadge.style.color = "#9a3412";
      }
    } else {
      stage = "NORMALIZADO";
      desc = "La conducta extrema se incorpora al quehacer corriente. Se asimilan violaciones a pilares fundamentales como el costo inevitable de la política.";
      reflection = `Bucle de inercia cerrado. Con el caso de ${caso.caso_nombre_corto} de gravedad 5/5, la ventana de lo tolerable se ha ensanchado al límite. Se normaliza lo antes impensable.`;
      if (sidebarStageBadge) {
        sidebarStageBadge.style.backgroundColor = "rgba(153, 27, 27, 0.1)";
        sidebarStageBadge.style.color = "#991b1b";
      }
    }

    if (sidebarStageBadge) sidebarStageBadge.textContent = stage;
    if (sidebarStageDesc) sidebarStageDesc.innerHTML = desc;
    if (sidebarReflection) sidebarReflection.innerHTML = `<strong>Inercia Acumulada:</strong> ${reflection}`;

  }

  function updateGlassShards(maxThresh) {
    for (let i = 1; i <= 5; i++) {
      const shardEl = document.querySelector(`.shard-${i}`);
      if (shardEl) {
        if (i <= maxThresh) {
          shardEl.classList.add('shattered');
        }
      }
    }
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

// ==========================================================================
// 5. SIMULADOR DE LA ESFERA PÚBLICA (SLIDERS DE LIBERTAD)
// ==========================================================================
function setupOvertonSimulator() {
  const sliderDe = document.getElementById('slider-libertad-de');
  const sliderPara = document.getElementById('slider-libertad-para');
  const systemStateBadge = document.getElementById('system-state-badge');
  const overtonLabel = document.getElementById('overton-state-label');
  const overtonDesc = document.getElementById('overton-state-desc');
  const resultCard = document.getElementById('result-card');
  const windowLens = document.getElementById('window-lens');
  const activeDescDe = document.getElementById('active-desc-de');
  const activeDescPara = document.getElementById('active-desc-para');

  const seg1 = document.getElementById('segment-1');
  const seg2 = document.getElementById('segment-2');
  const seg3 = document.getElementById('segment-3');

  if (!sliderDe || !sliderPara) return;

  // Diccionario de textos descriptivos cohesivos y constitucionales
  const descDeMap = {
    3: "El Estado respeta y salvaguarda tu privacidad, libre opinión y protesta sin interferencias.",
    2: "Se toleran abusos y vigilancia parcial bajo justificaciones de orden público o seguridad nacional.",
    1: "El espionaje político y la persecución estatal se normalizan como herramientas de control rutinario."
  };

  const descParaMap = {
    3: "El Estado garantiza el acceso universal a servicios esenciales (salud, educación) de alta calidad.",
    2: "Los servicios públicos fundamentales son deficientes y quedan expuestos al clientelismo menor.",
    1: "Desvío crónico de fondos de servicios esenciales para financiar la compra de votos y favores políticos."
  };

  // Configurar comportamiento interactivo de botones (tabs)
  const setupTabGroup = (groupId, inputId) => {
    const group = document.getElementById(groupId);
    if (!group) return;
    const buttons = group.querySelectorAll('.tab-btn');
    const input = document.getElementById(inputId);
    if (!buttons.length || !input) return;

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        buttons.forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-checked', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-checked', 'true');
        input.value = button.dataset.value;
        input.dispatchEvent(new Event('input'));
      });
    });
  };

  setupTabGroup('group-libertad-de', 'slider-libertad-de');
  setupTabGroup('group-libertad-para', 'slider-libertad-para');

  // Controlar atenuación de opacidad de los segmentos fuera de la ventana
  const updateSegmentsOpacity = (activeNum) => {
    if (seg1) seg1.classList.toggle('out-of-window', activeNum !== 1);
    if (seg2) seg2.classList.toggle('out-of-window', activeNum !== 2);
    if (seg3) seg3.classList.toggle('out-of-window', activeNum !== 3);
  };

  function updateSimulator() {
    const valDe = parseInt(sliderDe.value);
    const valPara = parseInt(sliderPara.value);

    // Actualizar descripciones activas bajo los botones
    if (activeDescDe) activeDescDe.textContent = descDeMap[valDe];
    if (activeDescPara) activeDescPara.textContent = descParaMap[valPara];

    // Determinar el estado del sistema y desplazar la ventana deslizante
    if (valDe === 3 && valPara === 3) {
      // Estado 1: Democrática -> Ventana en segmento 1 (Disenso Racional)
      if (systemStateBadge) {
        systemStateBadge.textContent = "DEMOCRÁTICA";
        systemStateBadge.className = "system-badge badge-democracia";
      }
      if (overtonLabel) {
        overtonLabel.textContent = "Impensable";
        overtonLabel.className = "label-democracia";
      }
      if (overtonDesc) {
        overtonDesc.textContent = "Los abusos de poder son rechazados unánimemente. Hay debate racional y libertades plenas.";
      }
      if (windowLens) {
        windowLens.className = "window-lens pos-1 state-democracia";
      }
      if (resultCard) {
        resultCard.className = "simulator-narrative-container state-democracia";
      }
      updateSegmentsOpacity(1);
    } else if (valDe === 1 || valPara === 1) {
      // Estado 3: Degradada -> Ventana en segmento 3 (Pacto de Impunidad)
      if (systemStateBadge) {
        systemStateBadge.textContent = "DEGRADADA";
        systemStateBadge.className = "system-badge badge-degradada";
      }
      if (overtonLabel) {
        overtonLabel.textContent = "Normalizado / Aceptable";
        overtonLabel.className = "label-degradada";
      }
      if (windowLens) {
        windowLens.className = "window-lens pos-3 state-degradada";
      }
      if (resultCard) {
        resultCard.className = "simulator-narrative-container state-degradada";
      }
      
      let descText = "";
      if (valDe === 1 && valPara === 1) {
        descText = "Se normaliza el espionaje político y el desvío crónico de fondos para la compra de favores.";
      } else if (valDe === 1) {
        descText = "Se normaliza el espionaje y la persecución política como costo inevitable del orden público.";
      } else {
        descText = "Se normaliza el desvío de dinero de servicios esenciales, dejando al ciudadano sin oportunidades.";
      }
      if (overtonDesc) overtonDesc.textContent = descText;
      updateSegmentsOpacity(3);
    } else {
      // Estado 2: Tensionada -> Ventana en segmento 2 (Democracia Vigilada)
      if (systemStateBadge) {
        systemStateBadge.textContent = "TENSIONADA";
        systemStateBadge.className = "system-badge badge-tensionada";
      }
      if (overtonLabel) {
        overtonLabel.textContent = "Radical / Discutible";
        overtonLabel.className = "label-tensionada";
      }
      if (overtonDesc) {
        overtonDesc.textContent = "Se empiezan a tolerar desvíos menores (espionaje parcial, descuido de servicios) bajo promesas de seguridad o urgencia.";
      }
      if (windowLens) {
        windowLens.className = "window-lens pos-2 state-tensionada";
      }
      if (resultCard) {
        resultCard.className = "simulator-narrative-container state-tensionada";
      }
      updateSegmentsOpacity(2);
    }

    // Actualizar links de compartir del simulador en tiempo real
    const stateName = systemStateBadge ? systemStateBadge.textContent : "";
    const overtonDescText = overtonDesc ? overtonDesc.textContent : "";
    updateSimulatorShareLinks(stateName, overtonDescText);
  }

  sliderDe.addEventListener('input', updateSimulator);
  sliderPara.addEventListener('input', updateSimulator);
  
  // Inicializar estado
  updateSimulator();
}

// Variables de estado global de navegación y glosario
let activeSectionId = '';
let activeGlossaryTerm = null;

// ==========================================================================
// 6. GLOSARIO INTERACTIVO (ACCESIBILIDAD Y REDUCCIÓN DE FRICCIÓN COGNITIVA)
// ==========================================================================
function setupGlossary() {
  const terms = document.querySelectorAll('.glossary-term');
  const glossaryData = {
    "ventana-overton": {
      title: "La Ventana de Overton",
      desc: "Teoría política que describe el rango de ideas, conductas o políticas que son consideradas aceptables por la sociedad en un momento dado. Lo que queda fuera se considera inaceptable o impensable."
    },
    "isaiah-berlin": {
      title: "Isaiah Berlin y la Libertad",
      desc: "Filósofo que distinguió entre libertad negativa ('libertad de' abusos o interferencias) y libertad positiva ('libertad para' tener las condiciones materiales y sociales de decidir)."
    },
    "estado-social-derecho": {
      title: "Estado Social de Derecho",
      desc: "Modelo que exige que el Estado garantice no solo libertades individuales y la ley, sino también condiciones de vida dignas (educación, salud, trabajo) para toda la población."
    },
    "dependencia-trayectoria": {
      title: "Dependencia de la Trayectoria",
      desc: "Concepto (Path Dependence) que explica cómo las decisiones pasadas y las costumbres heredadas crean caminos o 'rieles' que limitan y determinan el rumbo del presente."
    },
    "sistema-adaptativo-complejo": {
      title: "Sistema Adaptativo Complejo",
      desc: "Un sistema formado por múltiples agentes independientes que interactúan entre sí, aprenden y se adaptan constantemente, de modo que el comportamiento colectivo no se puede controlar desde un solo punto."
    },
    "esfera-publica": {
      title: "Esfera Pública / Debate Público",
      desc: "Concepto de Jürgen Habermas que define el espacio de debate racional donde la ciudadanía discute asuntos de interés general basándose en la verdad y el bien común, libre de la fuerza del poder estatal."
    },
    "atractor-democratico": {
      title: "Atractor Democrático",
      desc: "El punto de equilibrio hacia el cual tiende un sistema político sano, caracterizado por la resolución pacífica de conflictos y el cumplimiento colectivo de las reglas constitucionales."
    }
  };

  terms.forEach(term => {
    const termKey = term.getAttribute('data-term');
    const data = glossaryData[termKey];
    if (!data) return;

    // Hacer el elemento accesible por teclado
    term.setAttribute('tabindex', '0');
    term.setAttribute('role', 'button');
    term.setAttribute('aria-haspopup', 'true');

    const show = (e) => {
      e.stopPropagation();
      activeGlossaryTerm = term;
      
      // Mostrar y posicionar tooltip
      tooltip.innerHTML = `
        <strong>${data.title}</strong>
        <span style="color: var(--text-primary); font-size: 0.85rem; font-family: var(--font-body); font-weight: 300;">${data.desc}</span>
      `;
      tooltip.style.opacity = "1";
      tooltip.setAttribute("aria-hidden", "false");
      
      // Posicionamiento centrado arriba del elemento
      const rect = term.getBoundingClientRect();
      // Esperar un tick para que el navegador dibuje el tooltip y así obtener su offsetWidth real
      setTimeout(() => {
        const tooltipWidth = tooltip.offsetWidth || 260;
        const tooltipHeight = tooltip.offsetHeight || 100;
        
        const leftPos = rect.left + window.scrollX + (rect.width - tooltipWidth) / 2;
        const topPos = rect.top + window.scrollY - tooltipHeight - 12;
        
        tooltip.style.left = `${Math.max(12, Math.min(leftPos, window.innerWidth - tooltipWidth - 12))}px`;
        tooltip.style.top = `${topPos}px`;
      }, 0);
    };

    const hide = () => {
      if (activeGlossaryTerm === term) {
        tooltip.style.opacity = "0";
        tooltip.setAttribute("aria-hidden", "true");
        activeGlossaryTerm = null;
      }
    };

    // Eventos Desktop
    term.addEventListener('mouseenter', show);
    term.addEventListener('mouseleave', hide);

    // Eventos Táctiles y Click (con stopPropagation para evitar que el click fuera lo cierre al instante)
    term.addEventListener('click', (e) => {
      if (activeGlossaryTerm === term) {
        hide();
      } else {
        show(e);
      }
    });

    // Accesibilidad por teclado
    term.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (activeGlossaryTerm === term) {
          hide();
        } else {
          show(e);
        }
      }
    });
    
    term.addEventListener('focus', show);
    term.addEventListener('blur', hide);
  });

  // Cerrar tooltip al hacer click fuera en el documento
  document.addEventListener('click', () => {
    if (activeGlossaryTerm) {
      tooltip.style.opacity = "0";
      tooltip.setAttribute("aria-hidden", "true");
      activeGlossaryTerm = null;
    }
  });

  // También en eventos touch para móviles
  document.addEventListener('touchstart', () => {
    if (activeGlossaryTerm) {
      tooltip.style.opacity = "0";
      tooltip.setAttribute("aria-hidden", "true");
      activeGlossaryTerm = null;
    }
  });
}

// ==========================================================================
// 7. RESALTADO DE NAVEGACIÓN Y BADGE CONTEXTUAL DE ESTADO (NAVBAR INDICATOR)
// ==========================================================================
function setupActiveNavLink() {
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  
  const observerOptions = {
    root: null,
    rootMargin: '-30% 0px -60% 0px', // Gatillo centrado en viewport
    threshold: 0
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active-nav-link');
          } else {
            link.classList.remove('active-nav-link');
          }
        });

      }
    });
  }, observerOptions);
  
  sections.forEach(section => observer.observe(section));
}

// ==========================================================================
// 8. FUNCIONALIDADES DE COMPARTIR Y COPIAR AL PORTAPAPELES
// ==========================================================================
function updateSimulatorShareLinks(stateName, overtonDescText) {
  // Construir una URL limpia sin hashes de anclas
  const pageUrl = window.location.href.split('#')[0];
  
  let textMsg = "";
  if (stateName === "DEMOCRÁTICA") {
    textMsg = `Mi percepción sobre la esfera pública en Colombia se alinea con un Disenso Racional: las garantías y el debate crítico son aún viables. Mide tu percepción aquí:`;
  } else if (stateName === "TENSIONADA") {
    textMsg = `Mi percepción sobre la esfera pública en Colombia es de una Democracia Vigilada: las libertades y derechos empiezan a verse restringidos. Mide tu percepción aquí:`;
  } else {
    // DEGRADADA (Pacto de Impunidad)
    let detail = "el desvío de recursos y el espionaje político ya están normalizados";
    if (overtonDescText.includes("persecución política")) {
      detail = "el espionaje y la persecución política ya están normalizados";
    } else if (overtonDescText.includes("desvío de dinero")) {
      detail = "el desvío de recursos vitales de los ciudadanos ya está normalizado";
    }
    textMsg = `Siento que la esfera pública en Colombia ha derivado en un Pacto de Impunidad: donde ${detail}. Mide tu percepción aquí:`;
  }
  
  const encodedText = encodeURIComponent(textMsg);
  const encodedUrl = encodeURIComponent(pageUrl);
  
  const xBtn = document.getElementById('share-sim-x');
  const fbBtn = document.getElementById('share-sim-fb');
  const liBtn = document.getElementById('share-sim-li');
  const waBtn = document.getElementById('share-sim-wa');
  
  if (xBtn) xBtn.href = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  if (fbBtn) fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  if (liBtn) liBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  if (waBtn) waBtn.href = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
}

function setupClipboardSharing() {
  const pageUrl = window.location.href.split('#')[0];
  
  const copySimBtn = document.getElementById('share-sim-copy');
  const copyProjBtn = document.getElementById('share-proj-copy');
  
  const tooltipSim = document.getElementById('copy-tooltip-sim');
  const tooltipProj = document.getElementById('copy-tooltip-proj');
  
  function copyText(tooltip) {
    navigator.clipboard.writeText(pageUrl).then(() => {
      if (tooltip) {
        tooltip.classList.add('show');
        setTimeout(() => {
          tooltip.classList.remove('show');
        }, 2000);
      }
    }).catch(err => {
      console.error('Error al copiar enlace: ', err);
    });
  }
  
  if (copySimBtn) {
    copySimBtn.addEventListener('click', () => copyText(tooltipSim));
  }
  if (copyProjBtn) {
    copyProjBtn.addEventListener('click', () => copyText(tooltipProj));
  }
}


// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', initApp);
