import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { randomUUID } from 'node:crypto';
import { config } from '../config';
import { CustomerModel, IdentificationTypeModel, ProcessedEventModel } from '../persistence/models';
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

async function handleOrgUpdated(msg: ConsumeMessage, channel: amqp.Channel): Promise<void> {
  const eventId = msg.properties.headers?.eventId as string | undefined;

  if (eventId) {
    const exists = await ProcessedEventModel.findByPk(eventId);
    if (exists) { channel.ack(msg); return; }
  }

  const payload: OrgUpdatedEvent = JSON.parse(msg.content.toString());
  const countryCode = payload.countryCode || 'EC';

  await sequelize.transaction(async (tx) => {
    const [existing] = await sequelize.query(
      `SELECT id FROM customers WHERE organization_id = :orgId AND is_system = TRUE AND identification = '9999999999999' LIMIT 1`,
      { replacements: { orgId: payload.organizationId }, transaction: tx },
    );
    if ((existing as unknown[]).length > 0) { channel.ack(msg); return; }

    const [idTypes] = await sequelize.query(
      `SELECT id FROM identification_types WHERE country_code = :cc AND code = 'CONSUMIDOR_FINAL' LIMIT 1`,
      { replacements: { cc: countryCode }, transaction: tx },
    );
    const idTypeRows = idTypes as { id: string }[];
    const identificationTypeId = idTypeRows.length > 0 ? idTypeRows[0].id : null;

    await CustomerModel.create({
      id: randomUUID(),
      organization_id: payload.organizationId,
      country_code: countryCode,
      identification_type_id: identificationTypeId,
      identification: '9999999999999',
      business_name: 'CONSUMIDOR FINAL',
      trade_name: null,
      email: null,
      phone: null,
      type: 'person',
      status: 'active',
      is_system: true,
      image_file_id: null,
      metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction: tx });

    if (eventId) {
      await ProcessedEventModel.findOrCreate({
        where: { event_id: eventId },
        defaults: { event_id: eventId, processed_at: new Date() },
        transaction: tx,
      });
    }
  });

  channel.ack(msg);
  console.log(`[customer-service] Consumidor Final creado para org ${payload.organizationId}`);
}

async function handleIdentificationType(msg: ConsumeMessage, channel: amqp.Channel): Promise<void> {
  const eventId = msg.properties.messageId || msg.properties.correlationId;
  if (eventId) {
    const exists = await ProcessedEventModel.findByPk(eventId);
    if (exists) { channel.ack(msg); return; }
  }

  const payload: IdentificationTypeEvent = JSON.parse(msg.content.toString());
  await sequelize.transaction(async (tx) => {
    await IdentificationTypeModel.upsert(
      {
        id: payload.id,
        country_code: payload.countryCode,
        code: payload.code,
        name: payload.name ?? null,
        regex: payload.regex ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction: tx },
    );

    if (eventId) {
      await ProcessedEventModel.findOrCreate({
        where: { event_id: eventId },
        defaults: { event_id: eventId, processed_at: new Date() },
        transaction: tx,
      });
    }
  });

  channel.ack(msg);
}

export async function startConsumers(): Promise<void> {
  if (!config.RABBITMQ_URL) {
    console.log('[customer-service] RABBITMQ_URL no configurado, consumidores desactivados.');
    return;
  }

  try {
    const connection = await amqp.connect(config.RABBITMQ_URL);
    const channel = await connection.createChannel();
    const exchange = 'crm.events';
    await channel.assertExchange(exchange, 'topic', { durable: true });

    const idTypeQueue = 'customer-service.identification-types';
    await channel.assertQueue(idTypeQueue, { durable: true });
    await channel.bindQueue(idTypeQueue, exchange, 'tax.identification_type.*');
    await channel.consume(idTypeQueue, (msg) => {
      if (!msg) return;
      handleIdentificationType(msg, channel).catch((err) => {
        console.error('[customer-service] Error procesando tax.identification_type:', err);
        channel.nack(msg, false, true);
      });
    });

    const orgQueue = 'customer-service.org-created';
    await channel.assertQueue(orgQueue, { durable: true });
    await channel.bindQueue(orgQueue, exchange, 'organization.org.updated');
    await channel.consume(orgQueue, (msg) => {
      if (!msg) return;
      handleOrgUpdated(msg, channel).catch((err) => {
        console.error('[customer-service] Error procesando organization.org.updated:', err);
        channel.nack(msg, false, true);
      });
    });

    console.log('[customer-service] Consumidores de RabbitMQ iniciados.');
  } catch (err) {
    console.error('[customer-service] Error al conectar con RabbitMQ:', err);
  }
}
