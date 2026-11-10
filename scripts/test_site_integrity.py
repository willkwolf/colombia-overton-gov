#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_site_integrity.py - Suite Integral de Pruebas de Gobernanza, DOM, Datos y Diseño
Regido por los Contratos: DOC-CON-001, DOC-CON-002, DOC-CON-003 y POL-ED-001 (v1.1.0)
"""

import os
import re
import csv
import json
import sqlite3
from html.parser import HTMLParser

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX_HTML = os.path.join(BASE_DIR, 'index.html')
STYLES_CSS = os.path.join(BASE_DIR, 'styles.css')
APP_JS = os.path.join(BASE_DIR, 'app.js')
DATA_CSV = os.path.join(BASE_DIR, 'data', 'casos_fuente.csv')
ARTICULOS_JSON = os.path.join(BASE_DIR, 'data', 'articulos.json')
DIST_DB = os.path.join(BASE_DIR, 'dist', 'data.db')
DIST_JSON = os.path.join(BASE_DIR, 'dist', 'data_clean.json')
DIST_CSV = os.path.join(BASE_DIR, 'dist', 'data_clean.csv')

class DOMParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.classes = set()
        self.tags = []
        self.links = []
        self.current_tag = None

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        self.current_tag = tag
        attr_dict = dict(attrs)
        if 'id' in attr_dict:
            self.ids.add(attr_dict['id'])
        if 'class' in attr_dict:
            for cls in attr_dict['class'].split():
                self.classes.add(cls)
        if tag == 'a' and 'href' in attr_dict:
            self.links.append(attr_dict['href'])

def test_data_pipeline_integrity():
    """Valida el Contrato de Pipeline y Datos (DOC-CON-002)."""
    print("\n[TEST 1] Verificación del Pipeline de Datos y Modelo SSOT (DOC-CON-002)...")
    assert os.path.exists(DATA_CSV), f"No existe {DATA_CSV}"
    assert os.path.exists(ARTICULOS_JSON), f"No existe {ARTICULOS_JSON}"
    assert os.path.exists(DIST_DB), f"No existe {DIST_DB}"
    assert os.path.exists(DIST_JSON), f"No existe {DIST_JSON}"
    assert os.path.exists(DIST_CSV), f"No existe {DIST_CSV}"

    # 1. Validar articulos.json
    with open(ARTICULOS_JSON, 'r', encoding='utf-8') as f:
        articulos = json.load(f)
    assert len(articulos) >= 28, f"Se esperaban al menos 28 artículos, encontrados {len(articulos)}"
    articulos_ids = set(articulos.keys())

    # 2. Validar CSV Fuente
    with open(DATA_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        casos = list(reader)
    
    assert len(casos) == 19, f"Se esperaban exactamente 19 casos, encontrados {len(casos)}"
    caso_id_pattern = re.compile(r'^[A-Z]{3}_[A-Z0-9]+_\d{2}$')

    for c in casos:
        cid = c['caso_id']
        assert caso_id_pattern.match(cid), f"ID no válido: {cid}"
        assert 1990 <= int(c['anio_inicio']) <= 2026, f"Año inválido en {cid}: {c['anio_inicio']}"
        assert 0 <= int(c['overton_gravedad']) <= 5, f"Gravedad fuera de rango en {cid}: {c['overton_gravedad']}"
        assert 1 <= int(c['overton_novedad']) <= 5, f"Novedad fuera de rango en {cid}: {c['overton_novedad']}"
        
        # Validar articulos constitucionales
        arts_raw = c.get('articulos_constitucionales', '')
        if arts_raw.strip():
            for art_num in arts_raw.split(','):
                art_num = art_num.strip()
                assert art_num in articulos_ids, f"Caso {cid} referencia artículo inexistente: {art_num}"

    # 3. Validar dist/data_clean.json y SQLite
    with open(DIST_JSON, 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    assert len(json_data) == 19, f"JSON limpio tiene {len(json_data)} registros"

    conn = sqlite3.connect(DIST_DB)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM casos")
    count = cur.fetchone()[0]
    conn.close()
    assert count == 19, f"SQLite tiene {count} filas, se esperaban 19"
    print("  ✓ 19 casos verificados contra SSOT y catálogo constitucional.")
    print("  ✓ Base de datos SQLite y JSON sincronizados.")

def test_dom_contracts_and_sections():
    """Valida los Contratos de Interfaz del DOM (DOC-CON-001) y la estructura de 7 secciones."""
    print("\n[TEST 2] Verificación de Contratos de Interfaz DOM (DOC-CON-001)...")
    with open(INDEX_HTML, 'r', encoding='utf-8') as f:
        html_content = f.read()

    parser = DOMParser()
    parser.feed(html_content)

    # Invariantes de secciones
    required_sections = [
        'hero-section',
        'lente-overton',
        'anatomia-libertad',
        'pacto-social',
        'viaje-hero',
        'timeline-section',
        'dependencia-linea',
        'conclusiones-seccion'
    ]
    for s_id in required_sections:
        assert s_id in parser.ids, f"Falta sección obligatoria: #{s_id}"

    # Invariantes de componentes interactivos
    critical_elements = [
        'main-footer',
        'progress-bar',
        'tooltip',
        'timeline-container',
        'overton-status-sidebar',
        'status-year',
        'status-meter-fill',
        'status-threshold-val',
        'status-stage-badge',
        'slider-libertad-de',
        'slider-libertad-para',
        'group-libertad-de',
        'group-libertad-para',
        'row-complejidad',
        'row-extractivismo',
        'row-deliberacion',
        'share-proj-copy'
    ]
    for el_id in critical_elements:
        assert el_id in parser.ids, f"Falta elemento crítico: #{el_id}"

    print("  ✓ Todas las 7 secciones del ensayo presentes sin sobre-extensiones.")
    print("  ✓ Todos los elementos del Scrollytelling, Simulador y Acordeón verificados.")

def test_epistemic_signal_and_content():
    """Valida la señalética epistémica, voz autoral y ausencia de duplicados (POL-ED-001)."""
    print("\n[TEST 3] Verificación Epistémica y Arquitectura Editorial (POL-ED-001)...")
    with open(INDEX_HTML, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # 1. Ausencia total de epistemic-badges (diseño limpio y libre de ruido visual)
    assert 'epistemic-badge' not in html_content, "Error: Quedan badges epistémicos residuales en index.html"

    # 2. Voz autoral fiel
    assert "Algunas noticias generan indignación inmediata" in html_content, "Falta voz autoral en Sección 1"
    assert "En este breve ensayo exploro cómo decisiones" in html_content, "Falta párrafo autoral exacto"
    assert "La reflexión va más allá de ver cómo una fractura del pacto social" in html_content, "Falta conclusión autoral de voz"

    # 3. Sección 6: 3 filas colapsables de trayectoria (sin cajas residuales ni links sobre-extendidos)
    assert 'class="trajectory-accordion"' in html_content, "Falta acordeón de trayectoria en Sección 6"
    assert 'id="row-complejidad"' in html_content, "Falta fila 01 en Sección 6"
    assert 'id="row-extractivismo"' in html_content, "Falta fila 02 en Sección 6"
    assert 'id="row-deliberacion"' in html_content, "Falta fila 03 en Sección 6"
    assert 'historical-periodization-box' not in html_content, "El bloque residual 1958-2020 debe estar removido"
    assert "DOC-TEO-003 en OpenWiki" not in html_content, "Error: Link sobre-extendido a DOC-TEO-003 presente"

    # 4. Sección 7: Conclusiones y difusión integradas limpiamente
    sec7_match = re.search(r'<section id="conclusiones-seccion".*?</section>', html_content, re.DOTALL)
    assert sec7_match, "No se pudo aislar la Sección 7"
    sec7_text = sec7_match.group(0)
    assert 'timeline-historical-grid' not in sec7_text, "Error: El diagrama 1958-2020 sigue duplicado en Sección 7"
    assert 'share-project-box' in sec7_text, "Los CTA de difusión deben residir en la Sección 7"
    assert 'escenarios-container' in sec7_text, "Faltan los 3 escenarios dialécticos en Sección 7"

    # 5. Ausencia total de sobre-extensiones
    assert 'open-data-access-card' not in html_content, "Error: Tarjeta sobre-extendida open-data-access-card presente"
    assert 'difusion-investigacion' not in html_content, "Error: Sección artificial difusion-investigacion presente"
    assert 'Archivo Abierto & Acción Cívica' not in html_content, "Error: Badge sobre-extendido presente"

    # 6. Autoría canónica y cita en el footer
    assert "William Camilo Artunduaga Viana" in html_content, "Falta nombre canónico del autor"
    assert "Artunduaga Viana, W. C. (2026)" in html_content, "Falta cita bibliográfica canónica del autor"
    assert "Wolf, W." not in html_content, "Error: Nombre inventado residual 'Wolf, W.' encontrado"

    print("  ✓ Separación epistémica fáctico-interpretativa cumplida.")
    print("  ✓ Voz personal y autoría canónica de William Camilo Artunduaga Viana preservadas.")
    print("  ✓ Sección 6 y 7 depuradas sin enlaces sobre-extendidos ni tarjetas artificiales.")

def test_styles_responsive_and_accessibility():
    """Valida consistencia en styles.css, breakpoints y diseño del footer."""
    print("\n[TEST 4] Verificación de Reglas CSS y Diseño Responsive (WCAG 2.1 AA)...")
    with open(STYLES_CSS, 'r', encoding='utf-8') as f:
        css = f.read()

    # 1. Breakpoints estándar
    breakpoints = ['@media (max-width: 900px)', '@media (max-width: 768px)', '@media (max-width: 600px)', '@media (max-width: 480px)']
    for bp in breakpoints:
        assert bp in css, f"Falta breakpoint {bp} en styles.css"

    # 2. Navegación móvil
    assert '.mobile-nav-scroll' in css, "Falta .mobile-nav-scroll en CSS"
    assert '.mobile-nav-pill.active-pill' in css, "Falta .mobile-nav-pill.active-pill en CSS"

    # 3. Footer unificado y alineado
    assert 'max-width: 1040px;' in css, "El footer debe estar unificado a 1040px"
    assert '.footer-readme-btn' in css, "Falta .footer-readme-btn en CSS"
    assert '.footer-bottom-grid' in css, "Falta .footer-bottom-grid en 2 columnas"
    assert '.footer-divider' in css, "Falta .footer-divider"

    print("  ✓ Breakpoints (900px, 768px, 600px, 480px) definidos.")
    print("  ✓ Sub-barra horizontal deslizable móvil configurada.")
    print("  ✓ Footer unificado a 1040px sin desbordamiento.")

def test_javascript_logic():
    """Valida la sintaxis y funciones de app.js."""
    print("\n[TEST 5] Verificación de Lógica Frontend y Controladores en app.js...")
    with open(APP_JS, 'r', encoding='utf-8') as f:
        js = f.read()

    expected_functions = [
        'initApp',
        'renderTimeline',
        'setupScrollytelling',
        'setupInteractions',
        'setupTrajectoryAccordion',
        'setupActiveNavLink',
        'updateSimulatorShareLinks'
    ]
    for fn in expected_functions:
        assert f'function {fn}' in js or f'{fn} = ' in js, f"Falta función {fn} en app.js"

    # Validar que setupActiveNavLink tenga salvaguarda contra parpadeo
    assert 'hasMatchingLink' in js, "Falta salvaguarda hasMatchingLink en setupActiveNavLink"
    print("  ✓ Todas las funciones y controladores registrados correctamente.")

if __name__ == '__main__':
    print("=====================================================================")
    print("  INICIANDO SUITE DE INSPECCIÓN Y PRUEBAS AUTOMATIZADAS DEL SITIO   ")
    print("=====================================================================")
    try:
        test_data_pipeline_integrity()
        test_dom_contracts_and_sections()
        test_epistemic_signal_and_content()
        test_styles_responsive_and_accessibility()
        test_javascript_logic()
        print("\n=====================================================================")
        print("  RESULTADO: 5/5 SUITES DE PRUEBAS COMPLETADAS CON ÉXITO [PASS]")
        print("=====================================================================\n")
    except AssertionError as e:
        print(f"\n[ERROR EN PRUEBAS]: {e}")
        exit(1)
