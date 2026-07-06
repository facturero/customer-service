# customer-service — Guía de implementación (para opencode)

> **Objetivo.** Construir `customer-service`: el **core del CRM**. Dueño de **clientes**, **contactos**, **direcciones** y **etiquetas**. Node + TS + Hono + Sequelize, **misma plantilla que `../auth-service/`, `../organization-service/` y `../tax-service/`**.
>
> **Aislamiento por `organization_id`** (servicio de tenant normal). Cada cliente pertenece a una organización; `country_code` (del contexto) determina qué **tipos de identificación** son válidos.
>
> **Dependencias:** organization (los clientes son de una organización) y **tax** (mantiene un **read-model local de `identification_types`** alimentado por `tax.identification_type.upserted`, para validar la identificación del cliente).
>
> **Contrato:** `openapi.yaml` (REST) y `asyncapi.yaml` (eventos) en esta carpeta son la **fuente de verdad**. Impleméntalos tal cual.

## Reglas de oro

1. **Imita `../organization-service/` archivo por archivo** (entidades, `AppError`, repos factory `(tx?)`, `Repositories` + `UnitOfWork`, modelos `timestamps:false`/`underscored:true`, controladores factory + `validateJson`, wiring solo en `main.ts`, Outbox).
2. **Base propia `customer_db`.** Referencias a otros servicios por **ID**. El único dato externo cacheado es el read-model `identification_types` (de tax).
3. **NO verifica JWT.** Confía en las cabeceras del gateway: `X-Organization-Id`, `X-User-Id`, `X-Country-Code`, `X-Permissions`. Todas las rutas (salvo `/health`) exigen `X-Organization-Id`.
4. **Aislamiento por `organization_id` en TODA query.** Un cliente/contacto/dirección/etiqueta de otra organización → `404` (no revela cross-org). Contactos y direcciones se validan contra el `organization_id` de su cliente.
5. **Autorización por permiso** (contra `X-Permissions`): `customer:read`, `customer:create`, `customer:update`, `customer:delete`. Sub-recursos (contactos/direcciones/etiquetas): read → `customer:read`, write → `customer:update`.
6. **Eventos vía Outbox** (misma transacción). Namespace `customer.*`, en pasado. Relay pendiente (infra compartida). **Consume** `tax.identification_type.upserted` (idempotente vía `processed_events`).
7. Tras cada fase: `npm run typecheck` y `npm test` verdes.

## Fase 1 — Bootstrap

Clona la config de `../organization-service/` (tsconfig, .sequelizerc, sequelize.config.cjs, .gitignore, Dockerfile, vitest.config). `package.json` con las mismas deps. `.env.example`:
```
NODE_ENV=development
PORT=3004
DB_HOST=localhost
DB_PORT=3306
DB_USER=customer_user
DB_PASSWORD=secret
DB_NAME=customer_db
CORS_ORIGIN=http://localhost:5173
```
Estructura layer-first: `src/{domain,application/use-cases,infrastructure/persistence,interface/http,shared,__tests__}` + `migrations/`.

- [ ] `npm install && npm run typecheck` OK.

## Fase 2 — Migración

Migración `create-customer-tables.js`:

- **`customers`**: `id` char(36) PK, `organization_id` char(36) NN, `country_code` char(2) NN, `identification_type_id` char(36) null *(ref → read-model local)*, `identification` varchar(30) null, `business_name` varchar(255) NN, `trade_name` varchar(255) null, `email` varchar(255) null, `phone` varchar(30) null, `type` (person|company) NN, `status` (active|inactive) def active, `metadata` json null, timestamps. Único `(organization_id, identification)`.
- **`contacts`**: `id` PK, `customer_id` FK→customers CASCADE, `name` NN, `email`, `phone`, `position`, timestamps.
- **`addresses`**: `id` PK, `customer_id` FK→customers CASCADE, `type` (billing|shipping|other), `line1` NN, `line2`, `city`, `province`, `country_code` char(2), `postal_code`, `is_primary` bool def false, timestamps.
- **`tags`**: `id` PK, `organization_id` char(36) NN, `name` varchar(100) NN, `color` varchar(20). Único `(organization_id, name)`.
- **`customer_tags`**: `customer_id` FK→customers, `tag_id` FK→tags. PK `(customer_id, tag_id)`.
- **`identification_types`** (READ-MODEL de tax): `id` char(36) PK, `country_code` char(2) NN, `code` varchar(20), `name` varchar(100), `regex` varchar(255) null. Único `(country_code, code)`.
- **`outbox_messages`** + **`processed_events`** (Outbox + idempotencia).

> No hace falta seed: el read-model `identification_types` se llena al consumir `tax.identification_type.upserted`. Para probar sin tax, opencode puede dejar un seed opcional de los tipos de EC (RUC/CEDULA/…), marcado como dev.

- [ ] `npm run db:migrate` limpio; `db:migrate:undo` revierte.

## Fase 3 — Dominio (`src/domain/`)

- **`value-objects.ts`**: `CustomerType` (person|company); `Email` opcional (formato). La validación de la **identificación** contra el `regex` del tipo se hace en el caso de uso (necesita el read-model).
- **`entities.ts`**: `Customer` (id, organizationId, countryCode, identificationTypeId|null, identification|null, businessName, tradeName|null, email|null, phone|null, type, status, metadata|null, timestamps; `update(...)`, `disable()`). `Contact`, `Address` (con `isMain`/`is_primary`), `Tag`. Todas con `create`/`fromPersistence`/`toPersistence`.
- **`errors.ts`**: `AppError` + `ValidationError(422)`, `OrganizationContextRequiredError(401)`, `UserContextRequiredError(401)`, `ForbiddenError(403)`, `CustomerNotFoundError(404)`, `ContactNotFoundError(404)`, `AddressNotFoundError(404)`, `TagNotFoundError(404)`, `IdentificationTypeNotFoundError(422)`, `InvalidIdentificationError(422)`, `CustomerAlreadyExistsError(409)` (mismo `identification` en la org).
- **`repositories.ts`**: `CustomerRepository` (findById, findByIdentification(orgId, identification), list(orgId, filtros), save, disable), `ContactRepository` (listByCustomer, findById, save, delete), `AddressRepository` (idem), `TagRepository` (listByOrganization, findById, findByName, save, delete), `CustomerTagRepository` (listByCustomer, add, remove), `IdentificationTypeReadModelRepository` (listByCountry, findById, upsert), `OutboxRepository`. `DomainEvent`. Agregado `Repositories`.

- [ ] `typecheck` OK.

## Fase 4 — Persistencia (`src/infrastructure/persistence/`)

`sequelize.ts` + `models.ts` (asociaciones `Customer.hasMany(Contact/Address)`, `Customer.belongsToMany(Tag)` vía `customer_tags`) + `repositories.ts` (mappers, factories `(tx?)`, `buildRepositories`, `SequelizeUnitOfWork`, `save`=upsert). Listados con filtro **siempre** por `organization_id`.

- [ ] `typecheck` OK.

## Fase 5 — Casos de uso (`src/application/use-cases/`)

**`CreateCustomerUseCase`** — `execute({ organizationId, countryCode, businessName, tradeName?, type, identificationTypeId?, identification?, email?, phone?, metadata? })`:
1. Si viene `identificationTypeId`: valida que exista en el read-model para `countryCode` (`IdentificationTypeNotFoundError`); si el tipo tiene `regex`, valida `identification` contra él (`InvalidIdentificationError`).
2. Si viene `identification`: `findByIdentification(orgId, identification)` → si existe, `CustomerAlreadyExistsError`.
3. Crea `Customer` (id nuevo) → `save`.
4. Emite `customer.customer.created { customerId, organizationId, businessName, type }`.

Resto: `ListCustomersUseCase(orgId, {search?, status?, tagId?})`. `GetCustomerUseCase(orgId, id)` (con contactos/direcciones/tags o por separado — elige la forma del `openapi.yaml`). `UpdateCustomerUseCase` (revalida identificación si cambia; emite `customer.customer.updated`). `DisableCustomerUseCase` (emite `customer.customer.disabled`). CRUD de **contactos** y **direcciones** (validan pertenencia del cliente a la org). **Tags**: `ListTagsUseCase(orgId)`, `CreateTagUseCase(orgId, {name,color})` (único por org), `AssignTagUseCase(orgId, customerId, tagId)`, `RemoveTagUseCase`. `ListIdentificationTypesUseCase(countryCode)` (del read-model, para poblar el front).

> Regla de pertenencia obligatoria: contacto/dirección/tag-assignment se opera solo si su cliente (o el tag) es de la organización del contexto → si no, `404`.

- [ ] Casos de uso implementados.

## Fase 6 — HTTP (`src/interface/http/`)

- **`middlewares.ts`**: `contextMiddleware` (lee `X-Organization-Id`, `X-User-Id`, `X-Country-Code`, `X-Permissions`), `requireOrganization` (401), `requirePermission(perm)` (403), `errorHandler`.
- **`validators.ts`**: Zod + `validateJson`. Schemas para crear/editar cliente, contacto, dirección, tag, asignar tag.
- **`controllers.ts`**: factories; `organizationId` y `countryCode` del contexto (no del body).
- **`routes.ts` + `app.ts`**: monta rutas **exactamente** como `openapi.yaml`. Cada ruta = `requireOrganization` + `requirePermission('customer:...')` + (validador) + controlador. CORS con las `X-*`. `contextMiddleware` global. `onError`/`notFound`.

- [ ] Rutas montadas según `openapi.yaml`.

## Fase 7 — Composition root + consumer

- **`main.ts`**: `sequelize.authenticate()`, `buildRepositories()` + `SequelizeUnitOfWork`, instancia casos de uso, `createApp`, `serve` en `PORT` (3004).
- **Consumer de `tax.identification_type.upserted`** (`src/infrastructure/messaging/`): idempotente (`processed_events`), hace upsert en el read-model `identification_types`. Déjalo tras el flag `RABBITMQ_URL` (como en los demás). Si no hay MQ, el seed dev de EC cubre las pruebas.

- [ ] `npm run build` OK; `GET /health` responde.

## Fase 8 — Tests (`src/__tests__/`)

Vitest con repos fake. Cubrir: `CreateCustomer` valida el tipo de identificación contra el read-model + el regex, rechaza duplicado por `(org, identification)`, emite `customer.customer.created`; pertenencia cross-org → 404; asignar tag de otra org → 404; `DisableCustomer` emite `customer.customer.disabled`.

- [ ] `npm test` verde.

## Definición de "hecho"

1. `db:migrate` crea las 7 tablas.
2. `POST /customers` (con `X-Organization-Id` + `X-Country-Code`) crea el cliente, valida identificación contra el read-model, y escribe `customer.customer.created` en Outbox.
3. Duplicado por `(organization_id, identification)` → `409`; identificación inválida o tipo inexistente → `422`.
4. Reads sin permiso → `403`; sin `X-Organization-Id` → `401`; recurso de otra org → `404`.
5. Contactos, direcciones y etiquetas funcionan y respetan el aislamiento.
6. `PATCH`/`disable` emiten `customer.customer.updated` / `.disabled`.
7. El consumer de `tax.identification_type.upserted` llena el read-model.
8. `npm test` + `npm run build` OK. `openapi.yaml` y `asyncapi.yaml` implementados fielmente.

## Fuera de alcance (no hacer)

- Relay de Outbox (infra compartida; los eventos quedan en la tabla).
- Facturación / saldos del cliente (eso es de billing; customer solo emite eventos que billing consume).
- Importación masiva / dedup avanzado (fase posterior).
