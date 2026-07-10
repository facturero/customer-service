# Consumidor Final — cliente del sistema

> Add-on al diseño existente de customer-service. Los contratos base (`openapi.yaml`, `asyncapi.yaml`) y el código ya están construidos; este documento describe la **funcionalidad de Consumidor Final** que hay que agregar sobre ese servicio, sin romper lo existente.

## Contexto

En Ecuador (y en la mayoría de países LATAM), la mayoría de las ventas al público general no llevan cliente identificado. El SRI acepta el "Consumidor Final" como receptor genérico de la factura, con RUC `9999999999999` (13 nueves) y el tipo de identificación `CONSUMIDOR_FINAL`. **Toda organización necesita este cliente** para poder facturar ventas al detal desde el día uno.

**Objetivo:** cada organización tiene automáticamente un cliente `"Consumidor Final"` como registro **del sistema** (`is_system: true`), no eliminable por defecto, con edición **restringida a admins de la organización**.

## Reglas de negocio

1. **Uno por organización.** Un solo Consumidor Final por `organization_id` (invariante).
2. **Se crea automáticamente** cuando la organización completa su perfil fiscal por primera vez — al recibir `organization.org.updated` con `country_code` presente (antes no se puede: el tipo de identificación depende del país).
3. **No eliminable.** `POST /customers/:id/disable` sobre el Consumidor Final → `422 CANNOT_DISABLE_SYSTEM_CUSTOMER`. Aplica a todos, incluidos admins.
4. **Editable solo por admin de organización.** `PATCH /customers/:id` requiere permiso `customer:manage-system` (no solo `customer:update`). Los cambios de admin están permitidos por si la organización quiere personalizar (ej. cambiar el nombre a "Público general") o corregir un email de contacto. Los cambios en `identification` y `identificationTypeId` **siguen bloqueados** aunque sea admin — esos son los que hacen que la factura sea aceptada por el SRI.
5. **Se identifica por `is_system: true`** en la tabla `customers`. El endpoint `GET /customers/system/consumidor-final` (nuevo) lo devuelve directamente para que el front lo consuma sin buscar.
6. **No aparece en listados por defecto.** `GET /customers` sin filtro no lo incluye (evita ruido); `GET /customers?includeSystem=true` sí.

## Cambios en el modelo de datos

### Migración (nueva)

```sql
ALTER TABLE customers
  ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE
    COMMENT 'Cliente del sistema (Consumidor Final). No se puede desactivar.';

-- Un solo cliente de sistema por organización.
-- Este constraint solo se satisface cuando is_system = true;
-- MySQL 8.0+ soporta índices únicos parciales vía expresión.
CREATE UNIQUE INDEX uq_customer_system
  ON customers ((CASE WHEN is_system THEN organization_id END));
```

> Si el motor no soporta índices parciales, se enforce por lógica en el use case (`FindSystemCustomer` → si ya existe, no crear otro).

## Cambios en el dominio

### Entidad `Customer`

Añadir:

```ts
class Customer {
  // ... campos existentes
  readonly isSystem: boolean;   // true = Consumidor Final

  canBeDisabled(): boolean {
    return !this.isSystem;
  }

  canEditIdentification(permissions: string[]): boolean {
    // Ni siquiera los admins pueden cambiar el RUC del Consumidor Final.
    return !this.isSystem;
  }

  canEditOtherFields(permissions: string[]): boolean {
    if (!this.isSystem) return permissions.includes('customer:update');
    return permissions.includes('customer:manage-system');
  }
}
```

### Errores nuevos

```ts
export class CannotDisableSystemCustomerError extends AppError {
  readonly code = 'CANNOT_DISABLE_SYSTEM_CUSTOMER';
  readonly httpStatus = 422;
  constructor() { super('No se puede desactivar el cliente del sistema.'); }
}

export class CannotEditSystemFieldsError extends AppError {
  readonly code = 'CANNOT_EDIT_SYSTEM_FIELDS';
  readonly httpStatus = 422;
  constructor() { super('No se puede cambiar la identificación del cliente del sistema.'); }
}

export class SystemCustomerAlreadyExistsError extends AppError {
  readonly code = 'SYSTEM_CUSTOMER_EXISTS';
  readonly httpStatus = 409;
  constructor() { super('Esta organización ya tiene un Consumidor Final.'); }
}
```

## Cambios en use cases

### 1. Nuevo: `EnsureSystemCustomerUseCase`

Ejecutado por el consumer de `organization.org.updated`. Idempotente.

```ts
class EnsureSystemCustomerUseCase {
  async execute(input: { organizationId: string; countryCode: string }): Promise<void> {
    return this.uow.execute(async (repos) => {
      // Idempotencia: si ya existe, salir sin ruido.
      const existing = await repos.customers.findSystemCustomer(input.organizationId);
      if (existing) return;

      // Buscar el tipo de identificación "consumidor final" del país.
      // En Ecuador: code 'CONSUMIDOR_FINAL'. En otros países se define su equivalente.
      const idType = await repos.identificationTypes.findByCountryAndCode(
        input.countryCode,
        SYSTEM_CUSTOMER_ID_TYPE[input.countryCode], // p.ej. 'CONSUMIDOR_FINAL' en EC
      );
      if (!idType) {
        // No hay tipo de identificación del sistema para este país aún.
        // Se reintenta cuando llegue tax.identification_type.upserted (ver más abajo).
        return;
      }

      const customer = Customer.create({
        organizationId: input.organizationId,
        countryCode: input.countryCode,
        identificationTypeId: idType.id,
        identification: SYSTEM_CUSTOMER_IDENTIFICATION[input.countryCode], // '9999999999999' en EC
        businessName: 'Consumidor Final',
        type: 'person',
        isSystem: true,
      });
      await repos.customers.save(customer);

      await repos.outbox.add({
        type: 'customer.customer.created',
        // ... payload estándar
      });
    });
  }
}
```

**Constantes por país** (van en `domain/system-customer-defaults.ts` o similar):

```ts
export const SYSTEM_CUSTOMER_ID_TYPE: Record<string, string> = {
  EC: 'CONSUMIDOR_FINAL',
  PE: 'DNI',              // provisional; ajustar al equivalente real
  CO: 'CEDULA',
  MX: 'RFC_GENERICO',     // XAXX010101000
};

export const SYSTEM_CUSTOMER_IDENTIFICATION: Record<string, string> = {
  EC: '9999999999999',
  PE: '00000000',
  CO: '222222222222',
  MX: 'XAXX010101000',
};
```

### 2. Modificar: `DisableCustomerUseCase`

Al principio del ejecutable:

```ts
if (customer.isSystem) {
  throw new CannotDisableSystemCustomerError();
}
```

### 3. Modificar: `UpdateCustomerUseCase`

- Si `customer.isSystem` y el requester **no** tiene `customer:manage-system` → `ForbiddenError`.
- Si `customer.isSystem` y el input intenta cambiar `identificationTypeId` o `identification` → `CannotEditSystemFieldsError`.
- El resto de campos (businessName, email, phone, metadata) puede editarlos el admin.

## Cambios en HTTP

### Nuevo endpoint

```
GET /customers/system/consumidor-final
```

Devuelve el Consumidor Final de la organización activa. Permite al front obtenerlo sin buscar. Responde `404` si aún no existe (caso raro: perfil fiscal recién completado y evento en vuelo).

**Permiso:** `customer:read`.

**Respuesta:** mismo schema `CustomerDetail` que `GET /customers/:id`.

### Modificar endpoints existentes

- **`GET /customers`** — añadir query param `includeSystem` (default `false`). Sin él, el listado normal **no** incluye al Consumidor Final.
- **`PATCH /customers/:id`** — internamente valida `customer:manage-system` cuando `is_system=true`; bloquea cambios a `identification`/`identificationTypeId`. Retorna:
  - `422 CANNOT_EDIT_SYSTEM_FIELDS` si intenta cambiar identificación.
  - `403 FORBIDDEN` si no tiene `customer:manage-system`.
- **`POST /customers/:id/disable`** — `422 CANNOT_DISABLE_SYSTEM_CUSTOMER` si es el del sistema.

### DTO

Añadir `isSystem: boolean` en el `CustomerSummary` y `CustomerDetail`. El front lo usa para:
- Ocultar el botón "Eliminar".
- Marcar visualmente (ej. badge "Sistema").
- Deshabilitar el campo de identificación en el formulario de edición.

## Cambios en la capa de eventos

### Consumer nuevo: `organization.org.updated`

customer-service pasa a **consumir** `organization.org.updated` (organization-service ya lo publica al completar perfil fiscal).

**AsyncAPI (add-on al asyncapi.yaml):**

```yaml
channels:
  orgUpdated:
    address: organization.org.updated
    description: (Consumido) organization completó/actualizó el perfil fiscal. Dispara EnsureSystemCustomer.
    servers: [{ $ref: '#/servers/rabbitmq' }]
    bindings:
      amqp: { is: routingKey, exchange: { name: crm.events, type: topic, durable: true, vhost: / } }
    messages:
      orgUpdated: { $ref: '#/components/messages/OrgUpdated' }

operations:
  consumeOrgUpdated:
    action: receive
    channel: { $ref: '#/channels/orgUpdated' }
    summary: >
      Consume organization.org.updated y ejecuta EnsureSystemCustomer para
      aprovisionar el Consumidor Final la primera vez que la organización recibe país.
```

**Comportamiento del consumer:**
- Idempotente: usa `processed_events` (patrón ya establecido).
- Si `countryCode` viene `null` → no hace nada (aún no se completó el perfil).
- Si ya existe el Consumidor Final → no hace nada (`EnsureSystemCustomerUseCase` es idempotente).
- Si el tipo de identificación aún no está en el read-model (evento `tax.identification_type.upserted` no llegó) → **no falla**, solo termina silenciosamente. Ver punto siguiente.

### Retry cuando llega el tipo de identificación

Un caso de carrera: `organization.org.updated` llega **antes** que `tax.identification_type.upserted` con el tipo del país (poco probable pero posible). Solución:

Extender el consumer de `tax.identification_type.upserted` (que ya existe): cuando llegue el tipo con `code === SYSTEM_CUSTOMER_ID_TYPE[countryCode]`, disparar `EnsureSystemCustomerUseCase` para **todas** las organizaciones de ese país que aún no tienen Consumidor Final.

Alternativa más simple: un job periódico que revisa `organizations sin consumidor final` y llama `EnsureSystemCustomer`. Menos elegante pero más robusto para dev. Recomiendo la primera para producción.

## Permisos nuevos (semilla en auth-service)

Añadir al catálogo de `permissions`:

```
customer:manage-system  →  Editar clientes marcados como sistema (Consumidor Final)
```

Y sembrarlo en el rol **Administrador** de cada plantilla — no en el rol "Vendedor" u otros. Esta parte requiere una migración en auth-service y actualizar el seed de roles.

## Consideraciones

### ¿Por qué `is_system` y no una tabla separada?

Porque el Consumidor Final se comporta como un cliente normal en el 99% de operaciones (aparece en facturas, tiene historial, etc.). Una tabla separada duplicaría el modelo. `is_system: true` es un flag simple que enforces por lógica, no por estructura.

### ¿Por qué no crear el Consumidor Final en el mismo transaction que crea la organización?

Porque **customer-service no crea la organización** — organization-service sí. Cruzar bases o hacer llamadas síncronas rompería la arquitectura. El patrón correcto es evento + consumer idempotente, que es lo que ya usa el sistema.

### ¿Qué pasa si organization cambia el `country_code`?

Escenario raro pero posible (ej. corrección de un dato mal ingresado). Opciones:
- **A (recomendada):** el Consumidor Final se recrea con la identificación del nuevo país. La antigua queda en la BD pero se marca `is_system=false` (para que auditoría siga viéndola). Requiere lógica de "migración" en el consumer.
- **B:** bloquear cambio de país en organization-service si ya hay Consumidor Final. Más simple pero menos flexible.

Decisión pendiente. Recomiendo **B** hasta que aparezca el caso de uso real.

## Frontend

En la lista de clientes:
- Filtro por defecto oculta al Consumidor Final.
- Toggle "Mostrar clientes del sistema" (visible solo para admins) llama `GET /customers?includeSystem=true`.
- Badge visual "Sistema" en la fila del Consumidor Final.

En el formulario de edición:
- Si `customer.isSystem`, los campos `identification` e `identificationTypeId` están **disabled** con tooltip explicando por qué.
- El botón "Eliminar" no aparece.
- Solo se muestra el formulario si el usuario tiene permiso `customer:manage-system`; si no, redirige a la vista de solo lectura.

En el selector de cliente al crear factura (billing):
- El Consumidor Final aparece **siempre al inicio** (encima del divider) para acceso rápido.
- Selección directa con un botón "Consumidor Final" en la barra.

## Checklist de implementación

### Backend

- [ ] Migración: `ADD COLUMN is_system` en `customers`
- [ ] Migración: índice único parcial (o validación en use case)
- [ ] Entidad `Customer`: campo `isSystem` + método `canBeDisabled`
- [ ] Errores: `CannotDisableSystemCustomerError`, `CannotEditSystemFieldsError`, `SystemCustomerAlreadyExistsError`
- [ ] Use case: `EnsureSystemCustomerUseCase` (idempotente)
- [ ] Modificar `DisableCustomerUseCase`: bloquear si `isSystem`
- [ ] Modificar `UpdateCustomerUseCase`: chequeo de permiso `customer:manage-system` + bloqueo de identificación
- [ ] Constantes por país: `SYSTEM_CUSTOMER_ID_TYPE`, `SYSTEM_CUSTOMER_IDENTIFICATION`
- [ ] Consumer nuevo: `organization.org.updated` → `EnsureSystemCustomer`
- [ ] Extender consumer de `tax.identification_type.upserted` para retry
- [ ] Endpoint: `GET /customers/system/consumidor-final`
- [ ] Modificar `GET /customers`: query param `includeSystem`
- [ ] DTOs: agregar `isSystem` en `CustomerSummary` y `CustomerDetail`
- [ ] Tests: crear Consumidor Final vía evento; intentar desactivar → 422; intentar editar identificación → 422; sin permiso `manage-system` → 403

### Auth

- [ ] Permiso nuevo `customer:manage-system` en el catálogo (migración/seed)
- [ ] Asignar `customer:manage-system` al rol Administrador (seed)

### Contratos

- [ ] Actualizar `openapi.yaml`: campo `isSystem`, endpoint `/system/consumidor-final`, query `includeSystem`, códigos de error nuevos
- [ ] Actualizar `asyncapi.yaml`: consumer `organization.org.updated`

### Frontend

- [ ] Selector de cliente en factura: Consumidor Final destacado
- [ ] Lista de clientes: filtro `includeSystem` (visible solo para admin)
- [ ] Formulario de edición: campos deshabilitados + tooltip; sin botón eliminar
- [ ] Badge "Sistema" visual
