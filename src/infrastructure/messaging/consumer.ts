import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import { config } from '../config';
import { IdentificationTypeModel, ProcessedEventModel } from '../persistence/models';
import { sequelize } from '../persistence/sequelize';

interface IdentificationTypeEvent {
  id: string;
  countryCode: string;
  code: string;
  name?: string | null;
  regex?: string | null;
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
    const queue = 'customer-service.identification-types';

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, 'tax.identification_type.*');

    await channel.consume(queue, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const eventId = msg.properties.messageId || msg.properties.correlationId;
        if (eventId) {
          const exists = await ProcessedEventModel.findByPk(eventId);
          if (exists) {
            channel.ack(msg);
            return;
          }
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
      } catch (err) {
        console.error('[customer-service] Error procesando evento tax.identification_type.upserted:', err);
        channel.nack(msg, false, true);
      }
    });

    console.log('[customer-service] Consumidor de tax.identification_type.* iniciado.');
  } catch (err) {
    console.error('[customer-service] Error al conectar con RabbitMQ:', err);
  }
}
