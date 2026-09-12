---
name: code-review
description: Revisa y limpia el código tras un refactor, fix o nueva funcionalidad, sin ejecutar comandos ni tests automáticos.
---

# Code Review Skill

## ⚠️ REGLA ESTRICTA DE SEGURIDAD Y ALCANCE
- **ALCANCE EXCLUSIVO:** Esta revisión debe aplicar **ÚNICAMENTE a los cambios locales o en staging** (`git diff` y `git diff --cached`). Queda estrictamente prohibido revisar commits pasados o ramas remotas sin solicitud explícita.
- **NO EJECUTAR** ningún tipo de test, contenedor de Docker, scripts de compilación, linters dinámicos ni comandos de terminal **sin la aprobación explícita y previa del usuario**.
- Realiza **únicamente un análisis estático de código** leyendo y comparando los archivos modificados en el entorno local.

---

## Proceso de Revisión (Análisis Estático)

1. **Lectura de Cambios Locales y Stage:**
   - Inspecciona únicamente las modificaciones no confirmadas mediante `git status`, `git diff` (cambios locales) y `git diff --cached` (cambios en stage). Ignora los archivos que ya estén commiteados.

2. **Código Redundante y Limpieza:**
   - Detecta y remueve `console.log`, `print` de depuración, comentarios obsoletos, código comentado e importaciones/variables no utilizadas en los cambios detectados.

3. **Lógica Repetida (DRY):**
   - Identifica duplicación de código e insinúa o aplica abstracciones simples sobre la lógica nueva o modificada.

4. **Convenciones y Calidad:**
   - Verifica convenciones de nombrado, manejo de errores y tipado exclusivamente en el código afectado por estos cambios.

5. **Aprobación de Comandos:**
   - Si se considera necesario ejecutar tests, linters o Docker para validar, **pregunta primero al usuario**.