# Reglas Estrictas de Radikal IA (SOP - Standard Operating Procedure)

Este documento establece las normas innegociables para el comportamiento del sistema, la gestión de memoria y la generación de contenidos. Estas reglas deben seguirse independientemente de la ambigüedad en las instrucciones del usuario.

## 1. Gestión de Imágenes y Referencias Visuales

### 1.1 Exclusión de Infografías de Análisis
- **REGLA DE ORO:** Las infografías generadas en las secciones de **"Mi Competencia"** y **"Noticias"** NUNCA deben mostrarse en el "Banco de Imágenes" de la sección "Mi Marca".
- **UBICACIÓN PERMITIDA:** Estas infografías solo pueden residir en su sección de origen (Competencia/Noticias) y en la pestaña general de "Mis Archivos" (Neuronas).
- **PROHIBICIÓN DE REFERENCIA:** Para la generación de nuevos contenidos (en el chat o en la sección de generación), el sistema **NUNCA** debe tomar como referencia visual estas infografías de análisis.

### 1.2 Fuentes de Activos de Marca
- Para generar contenido, el sistema solo puede utilizar como referentes:
    1. Imágenes cargadas directamente en la sección **"Mi Marca"**.
    2. Imágenes extraídas directamente de la **página web** oficial de la marca (Scraping).
    3. Logotipos oficiales guardados en la categoría `logo`.

## 2. Categorización Técnica de Memoria

### 2.1 Categoría `infografia_analisis`
- Todo recurso visual tipo infografía generado automáticamente por análisis de datos debe ser guardado bajo la categoría técnica `infografia_analisis`.
- Esta categoría está explícitamente **bloqueada** para el motor de contexto visual (`AgentOrchestrator`) al momento de proponer o generar imágenes.

### 2.2 Categoría `analisis_imagenes`
- Reservada exclusivamente para análisis de imágenes de marca, productos reales y dirección visual estratégica. Estos sí forman parte del "Banco de Imágenes".

## 3. Regla de Idioma Único (Estrictamente Español)

### 3.1 Comunicación y Salida de Datos
- **REGLA DE ORO:** TODA la salida generada por la IA (chat, informes, ideas de contenido, títulos, descripciones, análisis y estrategias) debe estar **estrictamente en ESPAÑOL**.
- **CONTEXTO EN OTROS IDIOMAS:** Independientemente de si la información de la marca, los activos, las noticias o los manuales de identidad están en inglés u otros idiomas, la respuesta final y el contenido generado para el usuario SIEMPRE debe ser en español.
- **TEXTO EN IMÁGENES:** Cualquier texto, eslogan o título integrado visualmente en las imágenes generadas por la IA debe estar en español (ej. sobreimpresiones de texto, etiquetas, "OFERTA HOT", etc.).

---
## 4. Agentes Específicos para Generación de Imágenes

### 4.1 Exclusividad del Agente NEXO
- **REGLA DE ORO:** El ÚNICO agente autorizado para realizar la generación final de imágenes es **NEXO**.
- **RESTRICCIÓN DE AGENTES:** Los agentes como Sira, Ankor u otros, SIEMPRE deben redirigir al usuario al agente NEXO si este solicita la creación, diseño o generación de activos visuales.
- **ÁMBITO DE APLICACIÓN:** Esta regla se aplica a todos los chats y a la sección de **"Generación de Contenido"**.
- **COMPORTAMIENTO ESPERADO:** Si un usuario pide una imagen a un agente distinto de NEXO, el agente debe proponer el enfoque de diseño (si es pertinente) pero informar que la generación técnica de la imagen se realiza en conjunto con NEXO, ofreciendo un botón de redirección directo a su espacio de trabajo.

---
*Cualquier desviación de estas reglas se considera un fallo crítico del sistema.*
