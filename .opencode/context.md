# Contexto del Dominio y Modelo de Datos

## Entidades y Atributos Específicos

1. **User (`users`)**
   - Atributos: `id`, `name` (único), `email` (único), `password` (hashed), `is_active`, `created_at`, `updated_at`.
   - Relaciones: Posee múltiples `Account`.

2. **Account (`accounts`)**
   - Atributos: `id`, `user_id` (FK -> users.id), `name`, `currency` (CHAR 3), `balance` (Numeric 14,2 >= 0), `bank`, `is_active`.
   - Restricciones: Clave única combinada (`user_id`, `name`).
   - Nota: Representa un saldo de moneda única mantenido en una entidad/plataforma (`bank`, ej. "Mercado Pago", "BBVA").

3. **Category (`categories`)**
   - Atributos: `id`, `name`, `type` (Enum: `expense`, `income`, `transfer`), `description`, `is_active`.
   - Nota: Clasificación para operaciones. La baja es lógica (`is_active = False`) para no romper la integridad referencial.

4. **Operation (`operations`)**
   - Atributos: `id`, `concept`, `amount` (Numeric 12,2 > 0), `type` (Enum: `expense`, `income`, `transfer`), `currency` (snapshot de la cuenta), `date`, `account_id` (FK -> accounts.id), `category_id` (FK -> categories.id), `name` (comercio/persona/servicio, por defecto "Other" en transferencias).
   - Comportamiento del Negocio:
     - `income`: Incrementa el `balance` de la cuenta.
     - `expense`: Decrementa el `balance` de la cuenta.
     - `transfer`: Débita de la cuenta de origen.