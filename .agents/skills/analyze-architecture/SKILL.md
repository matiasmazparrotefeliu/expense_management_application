---
name: analyze-architecture
description: Analiza, mapea y explica la estructura y arquitectura de un repositorio existente para facilitar la incorporación a una base de código desconocida antes de desarrollar features, refactorizar o resolver bugs.
---

# Skill: Codebase Architecture & Domain Analyzer

Esta skill se activa cuando el usuario solicita comprender un proyecto existente, incorporarse a una base de código desconocida o planificar un cambio (feature, refactor, bugfix) sobre un sistema existente.

## 🔴 Reglas Críticas de Seguridad y Operación (STRICT EXECUTION BOUNDARIES)

1. **SOLO LECTURA Y ANÁLISIS:** Está **estrictamente prohibido** ejecutar pruebas (`pytest`, `npm test`, `go test`, etc.), construir/iniciar contenedores (`docker`, `docker-compose`), instalar dependencias o ejecutar cualquier script o comando bash/terminal sin la **aprobación previa y explícita del usuario**.
2. **MODO DE EXPLORACIÓN NO DESTRUCTIVO:** Limítate a leer la estructura de archivos, inspeccionar código fuente, examinar dependencias y revisar documentación (`README`, diagramas, esquemas).
3. **SIN MODIFICACIONES:** No edites, crees ni borres código hasta que el análisis haya finalizado y el usuario apruebe una estrategia de implementación.

---

## Workflow de Análisis (Paso a Paso)

Sigue esta secuencia lógica para construir la explicación:

### Paso 1: Mapeo de Alto Nivel y Stack Tecnológico
1. Examina la raíz del proyecto para identificar el lenguaje, frameworks y herramientas principales:
   - Archivos de configuración de dependencias (`package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `pom.xml`, etc.).
   - Archivos de entorno y despliegue (`Dockerfile`, `docker-compose.yml`, `.env.example`, `Makefile`).
2. Identifica la estructura general de carpetas (`src/`, `app/`, `cmd/`, `internal/`, `domain/`, etc.).

### Paso 2: Identificación del Patrón Arquitectónico
Analiza la distribución del código para detectar la arquitectura dominante:
- **Arquitectura Hexagonal / DDD / Clean Architecture:** Busca separación entre Dominio/Entidades, Casos de Uso/Aplicación y Adaptadores/Infraestructura (API handlers, repositorios de DB).
- **MVC / Capas Convencionales:** Identifica Controladores, Servicios, Modelos y Rutas.
- **Monolito Modular / Microservicios:** Verifica si los dominios están aislados dentro del repositorio.

### Paso 3: Flujo de Datos y Puntos de Entrada
1. **Entry Points:** Identifica dónde arranca la aplicación (p. ej., `main.py`, `index.ts`, `server.go`, workers de colas o tareas programadas).
2. **Entradas/Salidas:** Mapea cómo entran las peticiones (endpoints REST, GraphQL, gRPC, eventos) y cómo se conectan a la lógica de negocio y persistencia (PostgreSQL, Redis, APIs externas).

### Paso 4: Diagnóstico para la Tarea Solicitada
Si el usuario mencionó una tarea específica (nuevo feature, bug, refactor):
1. Ubica el módulo o archivo exacto involucrado en el cambio.
2. Identifica el impacto potencial (componentes acoplados, contratos de interfaz, tablas de base de datos).
3. Diseña una estrategia paso a paso para realizar el cambio manteniendo la consistencia de la arquitectura.

---

## Formato de Respuesta / Deliverable

Estructura el informe en Markdown claro y conciso:

1. **Resumen Ejecutivo:** ¿Qué hace este proyecto y cuál es su stack principal?
2. **Mapa de Estructura de Directorios:** Un árbol visual conciso resaltando las carpetas clave y su propósito.
3. **Patrón Arquitectónico Identificado:** Explicación de cómo se organizan las capas y las reglas de dependencia entre ellas.
4. **Flujo de Entidades y Datos Principales:** Breve recorrido desde que llega un evento/petición hasta que se procesa y persiste.
5. **Plan de Acción / Hoja de Ruta (si aplica):** Dónde realizar los cambios solicitados y qué precauciones tomar.
6. **Preguntas de Confirmación:** Sugiere al usuario cuáles deberían ser los siguientes pasos antes de escribir código.