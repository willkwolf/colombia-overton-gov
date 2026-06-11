# Colombia Overton Gov

Dataset estructurado y pipeline de compilación para analizar el impacto institucional y la tensión democrática sobre la Constitución de 1991 en Colombia (periodo 2002–2026). 

El proyecto utiliza el lente analítico de la **Ventana de Overton** para mapear cómo acciones de poder y escándalos normalizan prácticas que anteriormente eran consideradas intolerables dentro del pacto social de la Constitución del 91.

---

## 1. Propósito del Proyecto

El objetivo de este archivo es construir un recurso empírico y pedagógico que sirva de insumo para:
* **Elevar la calidad del debate público:** Salir de la discusión partidista o de "hinchadas" presidenciales y enfocar el análisis en patrones históricos de afectación a la Constitución.
* **Construcción de ética ciudadana:** Proveer herramientas basadas en datos para comprender la degradación de la esfera pública (Habermas) cuando la corrupción o la violencia institucional se normalizan.
* **Memoria histórica y archivo:** Mantener un registro estructurado de eventos de daño democrático bajo criterios de rigor científico y transparencia metodológica.

---

## 2. Metodología y Modelo de Datos

El dataset se fundamenta en la **separación analítica de variables** para garantizar la reproducibilidad y el uso por parte de terceros (investigadores, periodistas y científicos de datos):
1. **Campos Fácticos ("Hechos Duros"):** Datos objetivos basados en fallos judiciales, informes de organismos multilaterales (ONU, CIDH) y periodismo investigativo de alta fidelidad. Las columnas cuantitativas y lógicas (`monto_millones_cop`, `victimas`, `tiene_condenas_firmes`) contienen exclusivamente valores limpios (`FLOAT`, `INTEGER`, `BOOLEAN`) para ser consumidos directamente en Python/Pandas o R sin necesidad de limpieza por expresiones regulares.
2. **Campos Analíticos ("Lente Conceptual"):** Variables de interpretación cualitativa (`nivel_responsabilidad`, `overton_gravedad`, `overton_novedad`) que explicitan el marco de investigación de la Ventana de Overton sin mezclar o contaminar los hechos cuantitativos.

Las anotaciones y detalles cualitativos se almacenan en columnas independientes de notas (ej. `monto_detalles`, `victimas_detalles`, `condenas_detalles`).

---

## 3. Arquitectura del Repositorio y Mantenimiento (SSOT)

El proyecto está diseñado bajo el principio de **Único Origen de Verdad (Single Source of Truth - SSOT)** para que el mantenimiento futuro sea simple y no requiera duplicación de archivos:

```
colombia-overton-gov/
├── data/
│   ├── casos_fuente.csv      <-- Único archivo editable por el analista
│   └── articulos.json        <-- Catálogo de la Constitución de 1991
├── scripts/
│   └── build_database.py     <-- Validador y compilador de datos
└── dist/
    ├── data.db               <-- Base de datos relacional SQLite normalizada
    ├── data_clean.json       <-- JSON estructurado que alimenta el Scrollytelling
    └── data_clean.csv        <-- CSV unificado y limpio para analistas externos
```

### Lógica interna para añadir nuevos casos:
1. **Editar únicamente** el archivo `data/casos_fuente.csv`. Cada nueva fila debe representar un caso de daño institucional que cumpla con:
   - Afectación directa a artículos de la Constitución del 91.
   - Vinculación de responsabilidad (mínimo estructural o fuerte) con el nivel central o ejecutivo.
   - Potencial para desplazar la Ventana de Overton (Gravedad $\ge$ 4 y/o Novedad $\ge$ 3).
2. **Ejecutar el pipeline de compilación:**
   ```bash
   python scripts/build_database.py
   ```
   El script realizará validaciones sintácticas y lógicas (patrón del ID del caso, vocabularios controlados, tipación estricta de números y booleanos) y regenerará automáticamente la base de datos relacional SQLite (`dist/data.db`) y los archivos planos de distribución en `/dist`.

---

## 4. Propuesta de Visualización (Scrollytelling)

El frontend de la aplicación web está concebido como una experiencia de lectura inmersiva controlada por scroll (Scrollytelling), estructurada en capas narrativas:

1. **Introducción Conceptual:** Explicación dinámica de la Constitución del 91 como pacto social y la Ventana de Overton como herramienta de medida.
2. **Gráfico de Dispersión Interactivo (Scatter Plot):** Eje X (Overton Novedad) vs. Eje Y (Overton Gravedad) de los casos. Permite filtrar por presidente y por ámbito de afectación.
3. **Diagrama de Radar de Daño Constitucional:** Muestra el promedio acumulado de gravedad por dimensión (democracia, seguridad, igualdad, derechos sociales) comparando las distintas administraciones.
4. **Línea de Tiempo Narrada (Scroll principal):** A medida que el usuario hace scroll, se recorren cronológicamente los casos. La pantalla se divide en un panel de texto con la narrativa analítica y un panel visual que actualiza gráficos, resalta los artículos de la Constitución afectados y destaca a los actores clave involucrados en tiempo real empleando la data provista por `dist/data_clean.json`.
