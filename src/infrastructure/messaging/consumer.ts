import { randomUUID } from 'node:crypto';
import { InboxConsumer, EventHandler } from '@facturero/outbox-relay';
import { config } from '../config';
import { sequelize } from '../persistence/sequelize';

interface IdentificationTypeEvent {
  id: string;
  countryCode: string;
  code: string;
  name?: string | null;
  regex?: string | null;
}

interface OrgUpdatedEvent {
  organizationId: string;
  legalName?: string;
  countryCode?: string;
}

export const identificationTypeHandler: EventHandler = {
  eventType: 'tax.identification_type.upserted',
  async handle(payload: unknown): Promise<void> {
    const p = payload as IdentificationTypeEvent;
    await sequelize.transaction(async (tx) => {
      await sequelize.query(
        `INSERT INTO identification_types (id, country_code, code, name, regex, created_at, updated_at)
         VALUES (:id, :countryCode, :code, :name, :regex, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           country_code = VALUES(country_code),
           code = VALUES(code),
           name = VALUES(name),
           regex = VALUES(regex),
           updated_at = NOW()`,
        {
          replacements: {
            id: p.id,
            countryCode: p.countryCode,
            code: p.code,
            name: p.name ?? null,
            regex: p.regex ?? null,
          },
          transaction: tx,
        },
      );
    });
  },
};

export const orgUpdatedHandler: EventHandler = {
  eventType: 'organization.org.updated',
  async handle(payload: unknown): Promise<void> {
    const p = payload as OrgUpdatedEvent;
    const countryCode = p.countryCode ?? 'EC';

    await sequelize.transaction(async (tx) => {
      const [existing] = await sequelize.query(
        `SELECT id FROM customers WHERE organization_id = :orgId AND is_system = TRUE AND identification = '9999999999999' LIMIT 1`,
        { replacements: { orgId: p.organizationId }, transaction: tx },
      );
      if ((existing as unknown[]).length > 0) return;

      const [idTypes] = await sequelize.query(
        `SELECT id FROM identification_types WHERE country_code = :cc AND code = 'CONSUMIDOR_FINAL' LIMIT 1`,
        { replacements: { cc: countryCode }, transaction: tx },
      );
      const idTypeRows = idTypes as { id: string }[];
      const identificationTypeId = idTypeRows.length > 0 ? idTypeRows[0].id : null;

      await sequelize.query(
        `INSERT INTO customers (id, organization_id, country_code, identification_type_id, identification, business_name, trade_name, email, phone, type, status, is_system, image_file_id, metadata, created_at, updated_at)
         VALUES (:id, :organizationId, :countryCode, :identificationTypeId, :identification, :businessName, NULL, NULL, NULL, 'person', 'active', TRUE, NULL, NULL, NOW(), NOW())`,
        {
          replacements: {
            id: randomUUID(),
            organizationId: p.organizationId,
            countryCode,
            identificationTypeId,
            identification: '9999999999999',
            businessName: 'CONSUMIDOR FINAL',
          },
          transaction: tx,
        },
      );
    });
  },
};

export async function startConsumers(): Promise<void> {
  if (!config.RABBITMQ_URL) {
    console.log('[customer-service] RABBITMQ_URL no configurado, consumidores desactivados.');
    return;
  }

  try {
    const idTypeConsumer = new InboxConsumer({
      sequelize,
      rabbitmqUrl: config.RABBITMQ_URL,
      exchange: 'crm.events',
      queue: 'customer-service.identification-types',
      bindings: ['tax.identification_type.*'],
      handlers: [identificationTypeHandler],
    });
    await idTypeConsumer.start();

    const orgConsumer = new InboxConsumer({
      sequelize,
      rabbitmqUrl: config.RABBITMQ_URL,
      exchange: 'crm.events',
      queue: 'customer-service.org-created',
      bindings: ['organization.org.updated'],
      handlers: [orgUpdatedHandler],
    });
    await orgConsumer.start();

    console.log('[customer-service] Consumidores de RabbitMQ iniciados.');
  } catch (err) {
    console.error('[customer-service] Error al conectar con RabbitMQ:', err);
  }
}
