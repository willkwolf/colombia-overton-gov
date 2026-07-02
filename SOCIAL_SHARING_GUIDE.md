# Guía de Diseño e Integración de Botoneras de Compartir Premium
### Estándar para Esferas Públicas, Visualizaciones de Datos y Artículos Editoriales

Esta guía establece los lineamientos de diseño, objetivos técnicos y "secretos de integración" para incorporar botones de compartir en redes sociales de manera ultra-premium, rápida y sin interferencias visuales. Sirve como directriz para que cualquier agente de desarrollo o diseñador replique este comportamiento en futuros proyectos.

---

## 1. Objetivos Generales

*   **Minimizar la Fricción Cognitiva**: Proveer accesos de compartición en los puntos calientes o de mayor interés intelectual del sitio (ej. tras obtener el resultado de un simulador o al final de una lectura reflexiva).
*   **Preservar la Estética Editorial**: Evitar que los widgets de redes sociales destruyan el sistema de diseño limpio de la aplicación.
*   **Velocidad de Carga y Privacidad**: Bloquear el uso de scripts, frames o librerías externas de redes sociales (que inyectan rastreadores, rompen la privacidad del usuario y ralentizan la web).

---

## 2. Lineamientos de Diseño Visual (Monocromía Estricta)

1.  **Eliminación del Ruido Cromático**:
    *   **Prohibido** usar los colores corporativos oficiales de las plataformas (ej: azul de Facebook, verde de WhatsApp, azul de LinkedIn) dentro del flujo principal de lectura.
    *   Toda la botonera debe regirse bajo la paleta neutra del sitio (escala de grises: carbón, lino, blanco, alabastro).
2.  **Uso de Vectores en Línea (SVG)**:
    *   No usar archivos PNG/JPG ni fuentes tipográficas de iconos (como FontAwesome).
    *   Los iconos de las redes (X, Facebook, LinkedIn, WhatsApp, Portapapeles) deben inyectarse como vectores `<svg>` limpios en línea con propiedad `fill="currentColor"` o `stroke="currentColor"`. Esto permite escalabilidad perfecta y renderizado instantáneo.
3.  **Transición de Estados (Hover)**:
    *   Los botones deben poseer una micro-animación de transición suave (`transition: all 0.25s var(--ease)`).
    *   *Comportamiento Premium sugerido*: Fondo transparente con borde fino por defecto. En hover, el fondo se llena con el color primario de texto (`var(--text-primary)`) y el icono SVG se invierte al color de fondo (`var(--bg)`).
4.  **Adaptabilidad Móvil (Tap Target)**:
    *   En ordenadores, la botonera debe alinearse de forma horizontal y discreta.
    *   En dispositivos móviles, se recomienda apilar los botones en bloques horizontales de ancho completo (`width: 100%`) para maximizar el área de pulsación (tap target de al menos `44px` de altura).

---

## 3. Secretos Técnicos de Integración (Web Intents)

### 3.1 Compartir Mediante Enlaces Directos (Sin Scripts Externos)
Utilizar únicamente URLs nativas de compartición (Web Intents). Esto se procesa directamente por el navegador o la app del teléfono:

*   **X (Twitter)**:
    `https://twitter.com/intent/tweet?text={TEXTO_ENCODED}&url={URL_ENCODED}`
*   **Facebook**:
    `https://www.facebook.com/sharer/sharer.php?u={URL_ENCODED}`
*   **LinkedIn**:
    `https://www.linkedin.com/sharing/share-offsite/?url={URL_ENCODED}`
*   **WhatsApp**:
    `https://api.whatsapp.com/send?text={TEXTO_ENCODED}%20{URL_ENCODED}`

*Nota: Todos los textos y URLs deben estar formateados mediante `encodeURIComponent()` en JavaScript para evitar roturas de caracteres especiales.*

### 3.2 Copiado al Portapapeles Inteligente (Instagram y General)
Dado que redes como Instagram no permiten compartir enlaces directamente desde un anchor web, proveer siempre un botón de **Copiar Enlace** con la siguiente lógica:
1.  Utilizar la API de portapapeles moderna: `navigator.clipboard.writeText(url)`.
2.  **Feedback Visual Inmediato**: Mostrar un micro-tooltip o mensaje flotante animado (*"¡Copiado!"*) en la posición exacta del botón.
3.  **Temporizador Autolimpiable**: Ocultar el mensaje automáticamente a los 2 segundos mediante `setTimeout()` para no saturar el espacio visual.

### 3.3 Copys Dinámicos y en Primera Persona (El Secreto de la Virilidad)
*   **Mensaje Humano y Fluido**: No generar textos automáticos y fríos (ej. *"Simulación #2 completada"*). El copy debe ser elegante y redactado en primera persona para que la persona sienta que es su propia voz la que comparte.
    *   *Ejemplo Recomendado*: `"Mi percepción sobre la esfera pública en Colombia se alinea con una Democracia Vigilada: las libertades y derechos empiezan a verse restringidos. Mide tu percepción aquí:"`
*   **Sincronización en Tiempo Real**: Si la botonera está vinculada a un simulador interactivo, los enlaces de compartir deben reconstruirse dinámicamente mediante JavaScript en cada evento de entrada (`input` o `change`), leyendo los textos explicativos y badges resultantes del DOM.

---

## 4. Resolución de Conflictos Visuales de Lentes y Escalas

Si los botones de compartir acompañan a un simulador que cuenta con una **escala de ventana deslizante** (Overton Window):
*   **Regla de Oro de Capas**: Nunca coloques capas de texto en movimiento directamente sobre la misma coordenada de otras capas de texto estáticas.
*   **Lente Limpio**: La ventana o lupa deslizante debe ser un cristal con borde definido ("con tinta") y con un desenfoque de fondo muy suave (`backdrop-filter: blur(1.5px)`), permitiendo leer el texto que está debajo con un z-index superior.
*   **Etiqueta Externa**: Si el lente requiere una etiqueta descriptiva (ej. "VENTANA DE LO TOLERABLE"), esta debe posicionarse fuera del cristal (ej: flotando en el borde superior: `top: -8px;` con un fondo opaco que oculte la cuadrícula inferior), previniendo cualquier bug de superposición de caracteres.
