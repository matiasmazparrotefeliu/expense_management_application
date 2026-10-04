# OpenCode Rules & Guardrails - Expense Management Application

## 1. Arquitectura y Estructura del Proyecto
- **Monorepo**:
  - `backend/src/`: Código fuente de la API (FastAPI)[cite: 1].
  - `frontend/src/`: Código fuente de la interfaz web (React + Vite + TypeScript)[cite: 2, 3].
- **Patrón Backend**: Separación estricta por responsabilidades:
  - `api/`: Routers y endpoints HTTP[cite: 1].
  - `auth/`: Lógica de autenticación JWT y gestión de permisos[cite: 1].
  - `core/`: Configuración del sistema y constantes[cite: 1].
  - `db/`: Sesión de base de datos y configuración ORM[cite: 1].
  - `enums/`: Enums de Python/SQLAlchemy (`OperationType`)[cite: 1].
  - `models/`: Modelos ORM de SQLAlchemy (`User`, `Account`, `Category`, `Operation`)[cite: 1].
  - `schemas/`: Schemas de validación Pydantic v2[cite: 1].
  - `services/`: Lógica de negocio (ej. `OperationService`)[cite: 1].
- **Patrón Frontend**:
  - Organizado en `features/`, `components/`, `hooks/`, `api/`, `types/` y `utils/`[cite: 2].

---

## 2. Reglas del Backend (Python / FastAPI / SQLAlchemy / Pydantic)
- **Modelos y Persistencia**:
  - Respetar los nombres y tipos del modelo SQLAlchemy existente (`Account`, `Category`, `Operation`, `User`).
  - La tabla de operaciones es `operations` y la de cuentas es `accounts`.
- **Validación de Datos y Tipado**:
  - Todo monto (`amount`) en operaciones debe ser un valor positivo estricto (`amount > 0`).
  - Las operaciones derivan su efecto financiero (crédito/débito) a través de `OperationType` (`income`, `expense`, `transfer`).
  - El código numérico de moneda (`currency`) debe ser un string de exactamente 3 caracteres (ISO 4217, ej. `ARS`, `USD`).
  - Los balances (`balance`) de las cuentas nunca deben ser menores a 0 (`balance >= 0`).
- **Control de Acceso y Aislamiento**:
  - Cada consulta a `Account` u `Operation` DEBE estar estrictamente filtrada por el `user_id` extraído del token JWT actual (`get_current_user`).

---

## 3. Reglas del Frontend (React / TypeScript / Tailwind CSS)
- **TypeScript**:
  - Configuración estricta (`strict: true`)[cite: 2].
  - Definir tipos e interfaces en `src/types/` sincronizados con los schemas Pydantic del backend.
- **Styling**:
  - Utilizar Tailwind CSS para el diseño UI[cite: 2].
- **Estado y Peticiones API**:
  - Utilizar el cliente de `api/` con Axios/Fetch centralizado[cite: 2].
  - Manejo de formularios con `react-hook-form` y validaciones tipadas.

---

## 4. Guardarraíles de Seguridad y Calidad
1. **No Hardcodeing**: Variables de entorno manejadas vía `.env` (`pydantic-settings` en backend y `import.meta.env` / `VITE_` en frontend)[cite: 2, 3].
2. **Encriptación**: Las contraseñas de los usuarios deben hashearse obligatoriamente antes de guardarse en la tabla `users`.
3. **Mantenimiento de Integridad**: Respetar las restricciones `RESTRICT` en `Category` para evitar eliminar categorías asociadas a operaciones existentes.

---

## 4. Guardarraíles de Ejecución, Pruebas y Control de Cambios

1. **Permisos de Tests**: NUNCA crear, editar ni eliminar ningún archivo de tests (`_tests_`, `tests/`, `*.test.ts`, etc.) sin autorización y confirmación explícita previa del usuario.
2. **Permisos de Ejecución**: NUNCA ejecutar comandos de `docker`, `docker-compose`, ni suites de tests (`pytest`, `vitest`, `npm test`, etc.) sin autorización previa explícita.
3. **Documentación de Cambios**: Cada modificación o nueva funcionalidad DEBE quedar documentada de forma clara (explicando qué se cambió y por qué en el resumen de la respuesta o en el docstring/comentario correspondiente).
4. **Alcance Acotado (Scope Control)**: Los cambios deben estar ESTRICTAMENTE LIMITADOS a lo que el usuario pide de forma explícita. Queda prohibido realizar refactorizaciones no solicitadas, reestructuraciones de archivos ajenos o cambios fuera del alcance del prompt.
5. **Consistencia e Integridad**: Respetar rigurosamente las convenciones de código, patrones de diseño, arquitectura y lógica preexistente en el proyecto (`src/api`, `src/services`, `src/models`, etc.)[cite: 1, 2].

---

## 5. Guardarraíles de Seguridad y Datos

1. **No Hardcoding**: Variables de entorno manejadas exclusivamente vía `.env` (`pydantic-settings` en backend y `import.meta.env` / `VITE_` en frontend)[cite: 2, 3].
2. **Encriptación**: Las contraseñas de los usuarios deben hashearse obligatoriamente antes de guardarse en la tabla `users`.
3. **Mantenimiento de Integridad**: Respetar las restricciones `RESTRICT` en `Category` para evitar eliminar categorías asociadas a operaciones existentes.

---

## 6. Buenas Prácticas de Desarrollo y Clean Architecture

### Principios Generales de Clean Architecture
- **Independencia de Frameworks e Infraestructura**: La lógica de negocio (Casos de Uso / Servicios) debe estar desacoplada de los detalles de entrega (FastAPI, React) y persistencia (SQLAlchemy, Drivers BD).
- **Inversión de Dependencias (DIP)**: Los módulos de alto nivel (negocio) no deben depender de módulos de bajo nivel (detalles/infraestructura); ambos deben depender de abstracciones/interfaces.
- **Flujo de Dependencias Unidireccional**: Las dependencias deben apuntar siempre hacia adentro (UI / API -> Servicios / Casos de Uso -> Modelos de Dominio / Entidades).

---

### Buenas Prácticas en Backend (Python / FastAPI / SQLAlchemy / Pydantic)
- **Separación de Responsabilidades**:
  - `api/`: Solo manejo de peticiones HTTP, parseo de parámetros, códigos de estado HTTP y respuestas[cite: 1].
  - `services/`: Contiene la lógica de negocio pura y la orquestación de operaciones (ej. cálculo de balances, validaciones financieras).
  - `schemas/`: Modelos Pydantic dedicados exclusivamente a la transferencia de datos (DTOs de Request/Response)[cite: 1].
  - `models/`: Definición estricta de la persistencia ORM de SQLAlchemy[cite: 1].
- **Manejo de Excepciones**: No usar bloques `try/except` genéricos ni silenciar errores con `pass`. Lanza excepciones de dominio específicas en la capa de servicio y mapéalas a respuestas HTTP en los endpoints de FastAPI.
- **Tipado e Inmutabilidad**: Usar *type hints* estrictos en todas las funciones y métodos. Preferir objetos inmutables o esquemas de lectura explícitos para respuestas.
- **Operaciones Atómicas**: Toda transacción que involucre múltiples cambios en base de datos (como registrar una `Operation` y actualizar el `balance` de `Account`) debe ejecutarse dentro de un bloque de transacción atómico (`db.commit()` / `rollback()`).

---

### Buenas Prácticas en Frontend (React / TypeScript / Vite)
- **Desacoplamiento de UI y Lógica**:
  - Los componentes de UI (`components/`) deben ser lo más puros y tontos (*presentational*) posible[cite: 2].
  - La lógica de estado, llamadas a la API y efectos deben aislarse en Custom Hooks (`hooks/`) o Servicios (`services/` / `api/`)[cite: 2].
- **Tipado Estricto**: Prohibido el uso de `any`. Definir e importar los tipos en `types/` asegurando la sincronización de contratos con las respuestas Pydantic del backend[cite: 2].
- **Manejo de Estado Remoto y Caching**: Centralizar la captura de datos, manejo de estados de carga (`isLoading`), errores y revalidaciones usando herramientas como `@tanstack/react-query` o hooks personalizados centralizados en la capa de API[cite: 2].
- **Principios de Componentización**: Mantener componentes pequeños, cohesivos y legibles (un solo propósito por componente). Reutilizar primitives de UI.