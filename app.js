// Variables de estado global
let casosData = [];

// Elementos del DOM
const barChart = document.getElementById('gravity-bar-chart');
const catChart = document.getElementById('category-bar-chart');
const tooltip = document.getElementById('tooltip');

// Elementos del Modal Legal
const legalModal = document.getElementById('legal-modal');
const legalTrigger = document.getElementById('legal-trigger');
const closeModalBtn = document.getElementById('close-modal');

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
    
    // Renderizar Gráficos Comparativos
    renderComparativeCharts(casosData);
    
    // Configurar otros listeners interactivos (Simulador, Modal)
    setupInteractions();
    
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    // En caso de que falle por falta de compilación local previa
    if (barChart) {
      barChart.innerHTML = `
        <div style="color: var(--accent-gravity); padding: 20px; border: 1px solid var(--border); border-radius: 4px;">
          <strong>Error al cargar los datos comparativos.</strong> Asegúrate de ejecutar <code>python scripts/build_database.py</code> para compilar la carpeta <code>dist/</code> antes de correr el proyecto de forma local.
        </div>
      `;
    }
  }
}

// ==========================================================================
// 2. RENDERIZADO DE GRÁFICOS COMPARATIVOS (TUFTE-STYLE)
// ==========================================================================
function renderComparativeCharts(casos) {
  if (!barChart || !catChart) return;
  
  // Datos estáticos de presidentes para mapeo de colores
  const colorKeys = {
    "URIBE": "URIBE",
    "SANTOS": "SANTOS",
    "DUQUE": "DUQUE",
    "PETRO": "PETRO",
    "ESTADO": "ESTADO"
  };

  // 1. Calcular promedio de gravedad por presidente
  const presAverages = {};
  
  casos.forEach(c => {
    const pres = c.presidente_nombre;
    const key = c.presidente_id;
    if (!presAverages[key]) {
      presAverages[key] = { nombre: pres, suma: 0, count: 0 };
    }
    presAverages[key].suma += c.overton_gravedad;
    presAverages[key].count += 1;
  });

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

  // Animación al ver las barras (Intersection Observer)
  const chartsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
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
// 3. INTERACCIONES ADICIONALES (PROGRESS, SLIDER, MODAL)
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
      
      // Mover el highlight (rango visual del slider de 0 a 100)
      const leftPos = Math.max(0, val - 15);
      if (highlight) {
        highlight.style.left = `${leftPos}%`;
        highlight.style.width = '30%';
      }

      // Resetear zonas activas
      zones.forEach(z => {
        if (z) z.classList.remove('active-zone');
      });

      // Clasificar el valor en la etapa correspondiente
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

  // 3. Modal Legal (Descargo de Responsabilidad)
  if (legalTrigger && legalModal) {
    legalTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  }

  if (closeModalBtn && legalModal) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  // Cerrar al hacer clic fuera de la tarjeta del modal
  window.addEventListener('click', (e) => {
    if (e.target === legalModal) {
      closeModal();
    }
  });

  // Cerrar con tecla ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && legalModal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });
}

function openModal() {
  if (!legalModal) return;
  legalModal.style.display = "flex";
  // Pequeño retardo para habilitar transición CSS de opacidad
  setTimeout(() => {
    legalModal.classList.add('active');
    legalModal.setAttribute('aria-hidden', 'false');
  }, 10);
  document.body.style.overflow = "hidden"; // Desactivar scroll de fondo
}

function closeModal() {
  if (!legalModal) return;
  legalModal.classList.remove('active');
  legalModal.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    legalModal.style.display = "none";
  }, 300); // Mismo tiempo que la transición de CSS
  document.body.style.overflow = ""; // Restaurar scroll
}

// Inicializar al cargar la página
window.addEventListener('DOMContentLoaded', initApp);
