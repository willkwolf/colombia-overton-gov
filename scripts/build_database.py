import os
import re
import csv
import json
import sqlite3

# Rutas de archivos
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_FUENTE = os.path.join(BASE_DIR, 'data', 'casos_fuente.csv')
ARTICULOS_JSON = os.path.join(BASE_DIR, 'data', 'articulos.json')
DIST_DIR = os.path.join(BASE_DIR, 'dist')
SQLITE_DB = os.path.join(DIST_DIR, 'data.db')
JSON_CLEAN = os.path.join(DIST_DIR, 'data_clean.json')
CSV_CLEAN = os.path.join(DIST_DIR, 'data_clean.csv')

# Vocabularios controlados
PRESIDENTES_VALIDOS = ["Álvaro Uribe", "Juan Manuel Santos", "Iván Duque", "Gustavo Petro", "Estado Colombiano", "César Gaviria", "Ernesto Samper", "Andrés Pastrana", "estructural"]
AMBITOS_VALIDOS = [
    "Democracia / poder público",
    "Libertad / privacidad",
    "Seguridad / derecho a la vida",
    "Igualdad / política agraria",
    "Corrupción electoral",
    "Corrupción / derechos sociales",
    "Seguridad / libertades públicas",
    "Seguridad / DD. HH.",
    "Corrupción / democracia",
    "Democracia / institución",
    "Corrupción electoral / Democracia",
    "Seguridad / política de paz",
    "Seguridad / derechos sociales"
]
RESPONSABILIDAD_VALIDA = [
    "directa",
    "directa_beneficio",
    "politica_fuerte",
    "politica_fuerte_en_debate",
    "estructural_con_intentos_correccion",
    "institucional_hito",
    "estructural"
]

# Datos estáticos de presidentes
DATOS_PRESIDENTES = {
    "Álvaro Uribe": {"id": "URIBE", "periodo": "2002–2010"},
    "Juan Manuel Santos": {"id": "SANTOS", "periodo": "2010–2018"},
    "Iván Duque": {"id": "DUQUE", "periodo": "2018–2022"},
    "Gustavo Petro": {"id": "PETRO", "periodo": "2022–2026"},
    "Estado Colombiano": {"id": "ESTADO", "periodo": "2002–2026"},
    "César Gaviria": {"id": "GAVIRIA", "periodo": "1990–1994"},
    "Ernesto Samper": {"id": "SAMPER", "periodo": "1994–1998"},
    "Andrés Pastrana": {"id": "PASTRANA", "periodo": "1998–2002"},
    "estructural": {"id": "ESTRUCTURAL", "periodo": "1990–2002"}
}


def clean_int(value):
    if not value or value.strip() == "":
        return None
    try:
        return int(float(value.strip()))
    except ValueError:
        raise ValueError(f"No se pudo convertir '{value}' a entero.")


def clean_float(value):
    if not value or value.strip() == "":
        return None
    try:
        return float(value.strip())
    except ValueError:
        raise ValueError(f"No se pudo convertir '{value}' a decimal.")


def clean_bool(value):
    val = value.strip().lower()
    if val in ("true", "1", "sí", "si"):
        return True
    elif val in ("false", "0", "no"):
        return False
    raise ValueError(f"No se pudo determinar el booleano para '{value}'. Debe ser true o false.")


def parse_comma_separated(value):
    if not value or value.strip() == "":
        return []
    # Remover comillas adicionales y separar por coma
    items = [item.strip() for item in value.split(',')]
    return [item for item in items if item]


def validate_caso(row, row_idx):
    caso_id = row.get('caso_id', '').strip()
    
    # 1. Validar ID
    if not re.match(r'^[A-Z]{3}_[A-Z0-9]+_\d{2}$', caso_id):
        raise ValueError(f"Fila {row_idx}: 'caso_id' '{caso_id}' no sigue el patrón AAA_TEMA_nn")
    
    # 2. Validar Presidente
    pres = row.get('presidente', '').strip()
    if pres not in PRESIDENTES_VALIDOS:
        raise ValueError(f"Fila {row_idx} ({caso_id}): Presidente '{pres}' no es válido. Opciones: {PRESIDENTES_VALIDOS}")
        
    # 3. Validar Ámbito
    ambito = row.get('ambito_principal', '').strip()
    if ambito not in AMBITOS_VALIDOS:
        raise ValueError(f"Fila {row_idx} ({caso_id}): Ámbito '{ambito}' no es válido. Opciones: {AMBITOS_VALIDOS}")
        
    # 4. Validar Responsabilidad
    resp = row.get('nivel_responsabilidad', '').strip()
    if resp not in RESPONSABILIDAD_VALIDA:
        raise ValueError(f"Fila {row_idx} ({caso_id}): Responsabilidad '{resp}' no es válida. Opciones: {RESPONSABILIDAD_VALIDA}")

    # 5. Validar Enteros
    anio_inicio = clean_int(row.get('anio_inicio'))
    anio_fin = clean_int(row.get('anio_fin'))
    overton_gravedad = clean_int(row.get('overton_gravedad'))
    overton_novedad = clean_int(row.get('overton_novedad'))
    
    if not (0 <= overton_gravedad <= 5):
        raise ValueError(f"Fila {row_idx} ({caso_id}): 'overton_gravedad' ({overton_gravedad}) debe ser entre 0 y 5")
    if not (1 <= overton_novedad <= 5):
        raise ValueError(f"Fila {row_idx} ({caso_id}): 'overton_novedad' ({overton_novedad}) debe ser entre 1 y 5")
        
    # 6. Validar Booleanos y otros numéricos
    clean_bool(row.get('tiene_condenas_firmes'))
    clean_float(row.get('monto_millones_cop'))
    clean_int(row.get('victimas'))
    
    # 7. Validar Artículos Constitucionales
    arts = parse_comma_separated(row.get('articulos_constitucionales', ''))
    for art in arts:
        try:
            int(art)
        except ValueError:
            raise ValueError(f"Fila {row_idx} ({caso_id}): Artículo constitucional '{art}' no es un número válido.")
            
    print(f"Caso {caso_id} validado correctamente.")


def build_pipeline():
    print("--- INICIANDO COMPILACION DE DATOS ---")
    
    # Asegurar que existe la carpeta dist
    if not os.path.exists(DIST_DIR):
        os.makedirs(DIST_DIR)
        print(f"Carpeta creada: {DIST_DIR}")
        
    # 1. Leer artículos constitucionales de referencia
    if not os.path.exists(ARTICULOS_JSON):
        raise FileNotFoundError(f"No se encontró el archivo de referencia de artículos en {ARTICULOS_JSON}")
        
    with open(ARTICULOS_JSON, 'r', encoding='utf-8') as f:
        articulos_ref = json.load(f)
    print(f"Cargados {len(articulos_ref)} articulos constitucionales del catalogo.")

    # 2. Leer y validar Casos Fuente
    if not os.path.exists(CSV_FUENTE):
        raise FileNotFoundError(f"No se encontró el archivo fuente de datos en {CSV_FUENTE}")

    casos_procesados = []
    actores_set = set()
    
    with open(CSV_FUENTE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader, start=2): # 1 es el header
            validate_caso(row, idx)
            
            # Formatear celdas limpias
            caso_id = row['caso_id'].strip()
            pres = row['presidente'].strip()
            pres_id = DATOS_PRESIDENTES[pres]['id']
            
            arts = [int(a) for a in parse_comma_separated(row.get('articulos_constitucionales', ''))]
            actores = parse_comma_separated(row.get('actores_clave', ''))
            for actor in actores:
                actores_set.add(actor)
                
            # Parse sources: [Name](URL)|[Name2](URL2)
            fuentes_parsed = []
            fuentes_raw = row.get('fuentes', '').strip()
            if fuentes_raw:
                parts = fuentes_raw.split('|')
                for part in parts:
                    match = re.match(r'^\[(.*?)\]\((.*?)\)$', part.strip())
                    if match:
                        fuentes_parsed.append({
                            "nombre": match.group(1),
                            "url": match.group(2)
                        })

            caso_dict = {
                "caso_id": caso_id,
                "presidente_id": pres_id,
                "presidente_nombre": pres,
                "periodo_gobierno": row['periodo_gobierno'].strip(),
                "caso_nombre_corto": row['caso_nombre_corto'].strip(),
                "caso_nombre_corto_en": row.get('caso_nombre_corto_en', '').strip(),
                "caso_descripcion_resumida": row['caso_descripcion_resumida'].strip(),
                "caso_descripcion_resumida_en": row.get('caso_descripcion_resumida_en', '').strip(),
                "anio_inicio": clean_int(row.get('anio_inicio')),
                "anio_fin": clean_int(row.get('anio_fin')),
                "ambito_principal": row['ambito_principal'].strip(),
                "tipo_afectacion": row['tipo_afectacion'].strip(),
                "nivel_responsabilidad": row['nivel_responsabilidad'].strip(),
                "evidencia_responsabilidad": row['evidencia_responsabilidad'].strip(),
                "evidencia_responsabilidad_en": row.get('evidencia_responsabilidad_en', '').strip(),
                "monto_millones_cop": clean_float(row.get('monto_millones_cop')),
                "monto_detalles": row.get('monto_detalles', '').strip(),
                "victimas": clean_int(row.get('victimas')),
                "victimas_detalles": row.get('victimas_detalles', '').strip(),
                "tiene_condenas_firmes": clean_bool(row.get('tiene_condenas_firmes')),
                "condenas_detalles": row.get('condenas_detalles', '').strip(),
                "articulos_constitucionales": arts,
                "actores_clave": actores,
                "fuentes": fuentes_parsed,
                "overton_gravedad": clean_int(row.get('overton_gravedad')),
                "overton_novedad": clean_int(row.get('overton_novedad'))
            }
            casos_procesados.append(caso_dict)

    print(f"Procesados {len(casos_procesados)} casos con exito.")

    # 3. Compilar Base de Datos SQLite (Normalizada)
    if os.path.exists(SQLITE_DB):
        os.remove(SQLITE_DB) # Reiniciar la DB en cada build
        print("Base de datos SQLite previa eliminada.")
        
    conn = sqlite3.connect(SQLITE_DB)
    cursor = conn.cursor()
    
    # Habilitar llaves foráneas
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # Crear Tablas
    cursor.execute("""
    CREATE TABLE presidentes (
        presidente_id VARCHAR(10) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        periodo VARCHAR(50) NOT NULL
    );
    """)
    
    cursor.execute("""
    CREATE TABLE articulos (
        articulo_id INTEGER PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        descripcion TEXT NOT NULL
    );
    """)
    
    cursor.execute("""
    CREATE TABLE actores (
        actor_nombre VARCHAR(150) PRIMARY KEY
    );
    """)
    
    cursor.execute("""
    CREATE TABLE casos (
        caso_id VARCHAR(50) PRIMARY KEY,
        presidente_id VARCHAR(10),
        caso_nombre_corto VARCHAR(200) NOT NULL,
        caso_nombre_corto_en VARCHAR(200),
        caso_descripcion_resumida TEXT NOT NULL,
        caso_descripcion_resumida_en TEXT,
        anio_inicio INTEGER NOT NULL,
        anio_fin INTEGER NOT NULL,
        ambito_principal VARCHAR(100) NOT NULL,
        tipo_afectacion VARCHAR(200) NOT NULL,
        nivel_responsabilidad VARCHAR(100) NOT NULL,
        evidencia_responsabilidad TEXT NOT NULL,
        evidencia_responsabilidad_en TEXT,
        monto_millones_cop REAL,
        monto_detalles TEXT,
        victimas INTEGER,
        victimas_detalles TEXT,
        tiene_condenas_firmes INTEGER NOT NULL, -- 0 o 1
        condenas_detalles TEXT,
        overton_gravedad INTEGER NOT NULL,
        overton_novedad INTEGER NOT NULL,
        FOREIGN KEY (presidente_id) REFERENCES presidentes(presidente_id)
    );
    """)
    
    cursor.execute("""
    CREATE TABLE caso_fuentes (
        caso_id VARCHAR(50),
        nombre VARCHAR(250) NOT NULL,
        url TEXT NOT NULL,
        PRIMARY KEY (caso_id, nombre),
        FOREIGN KEY (caso_id) REFERENCES casos(caso_id) ON DELETE CASCADE
    );
    """)
    
    cursor.execute("""
    CREATE TABLE caso_articulos (
        caso_id VARCHAR(50),
        articulo_id INTEGER,
        PRIMARY KEY (caso_id, articulo_id),
        FOREIGN KEY (caso_id) REFERENCES casos(caso_id) ON DELETE CASCADE,
        FOREIGN KEY (articulo_id) REFERENCES articulos(articulo_id) ON DELETE CASCADE
    );
    """)
    
    cursor.execute("""
    CREATE TABLE caso_actores (
        caso_id VARCHAR(50),
        actor_nombre VARCHAR(150),
        PRIMARY KEY (caso_id, actor_nombre),
        FOREIGN KEY (caso_id) REFERENCES casos(caso_id) ON DELETE CASCADE,
        FOREIGN KEY (actor_nombre) REFERENCES actores(actor_nombre) ON DELETE CASCADE
    );
    """)
    
    # Poblar Catálogos
    for pres_name, info in DATOS_PRESIDENTES.items():
        cursor.execute("INSERT INTO presidentes VALUES (?, ?, ?)", (info['id'], pres_name, info['periodo']))
        
    for art_num, info in articulos_ref.items():
        cursor.execute("INSERT INTO articulos VALUES (?, ?, ?, ?)", 
                       (int(art_num), info['titulo'], info['categoria'], info['descripcion']))
                       
    for actor in sorted(actores_set):
        cursor.execute("INSERT INTO actores VALUES (?)", (actor,))
        
    # Poblar Casos e intermedias
    for c in casos_procesados:
        cursor.execute("""
        INSERT INTO casos VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            c['caso_id'], c['presidente_id'], c['caso_nombre_corto'], c['caso_nombre_corto_en'],
            c['caso_descripcion_resumida'], c['caso_descripcion_resumida_en'],
            c['anio_inicio'], c['anio_fin'], c['ambito_principal'], c['tipo_afectacion'],
            c['nivel_responsabilidad'], c['evidencia_responsabilidad'], c['evidencia_responsabilidad_en'],
            c['monto_millones_cop'], c['monto_detalles'], c['victimas'], c['victimas_detalles'],
            1 if c['tiene_condenas_firmes'] else 0, c['condenas_detalles'],
            c['overton_gravedad'], c['overton_novedad']
        ))
        
        for src in c['fuentes']:
            cursor.execute("INSERT INTO caso_fuentes VALUES (?, ?, ?)", (c['caso_id'], src['nombre'], src['url']))
        
        for art_id in c['articulos_constitucionales']:
            # Verificar si el artículo existe en el catálogo constitucional, si no, agregarlo de forma genérica
            cursor.execute("SELECT 1 FROM articulos WHERE articulo_id = ?", (art_id,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO articulos VALUES (?, ?, ?, ?)", 
                               (art_id, f"Artículo {art_id}", "Otros artículos", "No documentado detalladamente."))
            cursor.execute("INSERT INTO caso_articulos VALUES (?, ?)", (c['caso_id'], art_id))
            
        for actor in c['actores_clave']:
            cursor.execute("INSERT INTO caso_actores VALUES (?, ?)", (c['caso_id'], actor))
            
    conn.commit()
    conn.close()
    print(f"Base de datos SQLite creada en: {SQLITE_DB}")

    # 4. Generar JSON enriquecido denormalizado para el Scrollytelling
    json_output = []
    for c in casos_procesados:
        # Resolver metadatos de los artículos constitucionales implicados
        articulos_enriquecidos = []
        for art_id in c['articulos_constitucionales']:
            art_str = str(art_id)
            if art_str in articulos_ref:
                art_info = {
                    "articulo_id": art_id,
                    "titulo": articulos_ref[art_str]['titulo'],
                    "categoria": articulos_ref[art_str]['categoria'],
                    "descripcion": articulos_ref[art_str]['descripcion']
                }
            else:
                art_info = {
                    "articulo_id": art_id,
                    "titulo": f"Artículo {art_id}",
                    "categoria": "Otros artículos",
                    "descripcion": "Artículo constitucional afectado en el marco del caso."
                }
            articulos_enriquecidos.append(art_info)
            
        caso_json = c.copy()
        caso_json['articulos_detalles'] = articulos_enriquecidos
        json_output.append(caso_json)
        
    with open(JSON_CLEAN, 'w', encoding='utf-8') as f:
        json.dump(json_output, f, indent=2, ensure_ascii=False)
    print(f"JSON enriquecido para frontend creado en: {JSON_CLEAN}")

    # 5. Generar CSV limpio para analistas (Tipos puros con listas delimitadas simples)
    with open(CSV_CLEAN, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            "caso_id", "presidente", "periodo_gobierno", 
            "caso_nombre_corto", "caso_nombre_corto_en", 
            "caso_descripcion_resumida", "caso_descripcion_resumida_en",
            "anio_inicio", "anio_fin", "ambito_principal", "tipo_afectacion", "nivel_responsabilidad",
            "evidencia_responsabilidad", "evidencia_responsabilidad_en",
            "monto_millones_cop", "monto_detalles", "victimas", "victimas_detalles",
            "tiene_condenas_firmes", "condenas_detalles", "articulos_constitucionales", "actores_clave",
            "fuentes", "overton_gravedad", "overton_novedad"
        ])
        
        for c in casos_procesados:
            fuentes_reconstructed = "|".join(f"[{s['nombre']}]({s['url']})" for s in c['fuentes'])
            writer.writerow([
                c['caso_id'],
                c['presidente_nombre'],
                c['periodo_gobierno'],
                c['caso_nombre_corto'],
                c['caso_nombre_corto_en'],
                c['caso_descripcion_resumida'],
                c['caso_descripcion_resumida_en'],
                c['anio_inicio'],
                c['anio_fin'],
                c['ambito_principal'],
                c['tipo_afectacion'],
                c['nivel_responsabilidad'],
                c['evidencia_responsabilidad'],
                c['evidencia_responsabilidad_en'],
                c['monto_millones_cop'] if c['monto_millones_cop'] is not None else "",
                c['monto_detalles'],
                c['victimas'] if c['victimas'] is not None else "",
                c['victimas_detalles'],
                "true" if c['tiene_condenas_firmes'] else "false",
                c['condenas_detalles'],
                ";".join(str(a) for a in c['articulos_constitucionales']),  # Cambiamos separador a punto y coma para evitar conflictos con comas
                ";".join(c['actores_clave']),
                fuentes_reconstructed,
                c['overton_gravedad'],
                c['overton_novedad']
            ])
            
    print(f"CSV limpio para analistas creado en: {CSV_CLEAN}")
    print("--- COMPILACION FINALIZADA CON EXITO ---")


if __name__ == '__main__':
    build_pipeline()
