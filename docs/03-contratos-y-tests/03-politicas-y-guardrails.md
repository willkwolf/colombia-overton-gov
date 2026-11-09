---
title: "Políticas del Sistema y Guardrails de Gobernanza"
document_id: "DOC-CON-003"
dominio: "Dominio III: Contratos y Gobernanza de Agentes"
version: "1.0.0"
estado: "[VIGENTE]"
proposito: "Definir las políticas normativas transversales, los límites éticos y los guardrails obligatorios para autores y agentes de IA."
audiencia: "Autores humanos, editores, revisores de código y agentes autónomos de IA."
alcance: "Todo el ciclo de vida documental y de código del repositorio."
limites: "Mandatorio en todas las ramas y contribuciones."
---

# 3. Políticas del Sistema y Guardrails de Gobernanza

> *«La credibilidad de un observatorio sobre la degradación democrática reposa íntegramente en la inviolabilidad de sus estándares éticos y metodológicos.»*

---

## 3.1. Cuatro Políticas del Sistema Infranqueables

```mermaid
flowchart TD
    P1["<b>POLÍTICA 1: Neutralidad Multipartidista Rigurosa</b><br/>Evaluación simétrica y homogénea de todas las administraciones (1990–2026). Prohibición absoluta de sesgo ideológico o militancia electoral."]
    
    P2["<b>POLÍTICA 2: Trazabilidad a Fuentes Primarias Públicas</b><br/>Ningún caso o cifra puede incorporarse sin respaldo en sentencias ejecutoriadas, informes de organismos multilaterales o fuentes oficiales."]
    
    P3["<b>POLÍTICA 3: Desacople Fáctico-Interpretativo</b><br/>Separación taxativa entre hechos brutos y lentes analíticos. Cero adjetivación moralizante en los resúmenes factuales."]
    
    P4["<b>POLÍTICA 4: Preservación Zero-Build</b><br/>Prohibición de introducir frameworks en tiempo de ejecución que hipotequen la durabilidad a largo plazo del artefacto."]

    P1 --- P2 --- P3 --- P4
```

---

## 3.2. Guardrails Específicos para Agentes Autónomos de IA

Los agentes que interactúen con el repositorio tienen **estrictamente prohibido**:

1. **Atenuación o Suavizado de Hallazgos Severos:**  
   El agente no debe rebajar las métricas de gravedad de un caso para «evitar controversia». Si un caso involucra ejecuciones extrajudiciales, compra masiva de votos o desvío de ayuda humanitaria con pruebas judiciales, la calificación de gravedad debe mantenerse firme.
2. **Eliminación o Censura de Casos:**  
   Ningún agente de IA puede suprimir un caso de la base de datos sin una orden expresa y justificada del editor humano.
3. **Adición de Casos sin Sentencia o Fuente Oficial:**  
   Prohibido incorporar rumores de prensa, filtraciones anónimas no judicializadas o controversias de redes sociales que carezcan de formalización institucional.
4. **Aplanamiento Mecánico del Estilo:**  
   Preservar el tono intelectual, sobrio y reflexivo de la narrativa. Prohibido reemplazar el vocabulario de precisión politológica por frases cliché de mercadeo o consignas morales simplistas.

---

## 3.3. Protocolo de Reconciliación ante Conflictos Normativos

Si surge una discrepancia entre la optimización técnica de una interfaz y un principio de rigor epistemológico:
- **Prevalece siempre la integridad de los datos y el rigor epistémico sobre la estética o la simplificación visual.**
- Toda excepción deliberada debe documentarse mediante un **Registro de Decisión Editorial (E-ADR)** según lo estipulado en la Policy Editorial Maestra POL-ED-001.
