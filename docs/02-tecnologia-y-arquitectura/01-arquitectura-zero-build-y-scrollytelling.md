---
title: "Arquitectura Zero-Build y Mecánica de Scrollytelling"
document_id: "DOC-TEC-001"
dominio: "Dominio II: Tecnología y Arquitectura de Datos"
version: "1.0.0"
estado: "[VIGENTE]"
proposito: "Documentar la filosofía técnica Zero-Build del frontend y la implementación del motor reactivo de Scrollytelling que gobierna la experiencia de usuario."
audiencia: "Desarrolladores web, arquitectos de software frontend y diseñadores de interacción."
alcance: "Código fuente de `index.html`, `app.js` y `styles.css`."
limites: "Cero dependencias de empaquetadores en tiempo de ejecución (Webpack, Vite, Rollup)."
---

# 1. Arquitectura Zero-Build y Mecánica de Scrollytelling

> *«La mejor dependencia es la que no existe. Un artefacto digital concebido para la memoria histórica debe poder ejecutarse sin alteraciones dentro de 30 años en cualquier navegador estándar.»*

---

## 1.1. Filosofía Técnica Zero-Build

En contraposición a las tendencias del desarrollo web contemporáneo que introducen pesadas cadenas de compilación, transpilación y empaquetado (Node modules, Webpack, Vite), **Colombia Overton Gov** se construye bajo el estándar de **Zero-Build Vanilla**:

```mermaid
flowchart LR
    subgraph EcosistemaNativo["Estándares Web Nativos (En Producción)"]
        HTML["HTML5 Semántico<br/><i>(index.html)</i>"]
        CSS["CSS3 con Variables Nativas<br/><i>(styles.css)</i>"]
        JS["JavaScript ES6+ Vanilla<br/><i>(app.js)</i>"]
        Data["JSON Estructurado<br/><i>(dist/data_clean.json)</i>"]
    end

    HTML --- CSS --- JS --- Data
    EcosistemaNativo --> Browser["Navegador Moderno<br/><i>(Ejecución Directa y Duradera)</i>"]
```

### Ventajas Operativas y Epistémicas:
1. **Inmunidad a la Obsolescencia de Herramientas:** No existen riesgos de que una versión deprecada de un bundler o plugin de Node impida reconstruir el sitio web en el futuro.
2. **Auditoría Transparente:** Cualquier usuario o revisor puede inspeccionar el código fuente directamente en el navegador con la herramienta *Ver código fuente* (`Ctrl+U`), sin capas de código ofuscado o minificado incomprensible.
3. **Rendimiento Máximo:** Cero overhead de frameworks reactivos pesados. La aplicación carga en milisegundos y consume una fracción mínima de memoria RAM.

---

## 1.2. Mecánica del Motor de Scrollytelling

La experiencia interactiva central se basa en una narrativa visual guiada por el desplazamiento vertical (scroll). El motor está orquestado en [`app.js`](../../app.js) a través de la API nativa del navegador **`IntersectionObserver`**:

```mermaid
sequenceDiagram
    participant U as Usuario (Scroll)
    participant IO as IntersectionObserver
    participant C as Tarjeta de Caso (Timeline)
    participant Sticky as Panel Sticky ("Lente de la Deriva")
    participant Termometro as Termómetro de Overton

    U->>IO: Se desplaza verticalmente por la línea de tiempo
    IO->>C: Detecta entrada al viewport (threshold: 0.3)
    C->>C: Aplica clase `.is-active` (ilumina y desbloquea tarjeta)
    C->>Sticky: Emite evento / sincroniza estado del caso visible
    Sticky->>Sticky: Actualiza Año de Observación y Badges
    Sticky->>Termometro: Recalcula gravedad acumulada máxima (0 a 5)
    Sticky->>Sticky: Inyecta reflexión contextual de Path Dependence
```

---

## 1.3. El Panel Sticky y el Termómetro de Overton

El panel lateral fijo (*«Lente de la Deriva»*) cumple una función pedagógica isomórfica: **hace visible al lector el coste invisible de la inercia institucional acumulada**:

1. **Año de Observación:** Sincronizado con el caso enfocado en la pantalla.
2. **Umbral de Aceptabilidad (Máxima Gravedad Acumulada):**
   - No mide únicamente la gravedad aislada del caso actual, sino el **techo histórico de transgresión** que la sociedad ya ha asimilado previamente.
   - El termómetro asciende de forma acumulativa, reflejando cómo cada escándalo tolerado pavimenta el camino para el siguiente.
3. **Escala de Normalización (Badges):**
   - `0`: **Impensable** (Pacto constitucional intacto).
   - `1 a 2`: **Radical** (Primeras desviaciones toleradas).
   - `3 a 4`: **Aceptable / Discutible** (Justificación coyuntural de transgresiones graves).
   - `5`: **Normalizado** (Asimilación de violaciones fundamentales como costo ordinario de la gobernabilidad).
4. **Inercia Acumulada:** Bloque narrativo dinámico que verbaliza las restricciones estructurales que heredará la siguiente administración.

---

## 1.4. Arquitectura de Despliegue en GitHub Pages

El repositorio se despliega de forma estática en **GitHub Pages** mediante el flujo automatizado [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml).

- Las actualizaciones sobre los datos fuente (`data/casos_fuente.csv`) disparan la compilación automática de la base de datos y la regeneración instantánea del sitio web público.
