import { CustomerNotFoundError, TagNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';

export class RemoveTagUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(organizationId: string, customerId: string, tagId: string): Promise<void> {
    const customer = await this.repos.customers.findById(customerId);
    if (!customer || !customer.belongsToOrganization(organizationId)) {
      throw new CustomerNotFoundError();
    }

    const tag = await this.repos.tags.findById(tagId);
    if (!tag || !tag.belongsToOrganization(organizationId)) {
      throw new TagNotFoundError();
    }

    await this.repos.customerTags.remove(customerId, tagId);

    // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
    // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
    // él se podía cambiar sin dejar rastro en la bitácora.
    await this.repos.outbox.add({
      type: 'customer.tag.removed',
      aggregateType: 'customer_tag',
      aggregateId: customerId,
      payload: {
        organizationId: organizationId,
        customerId,
        tagId,
      },
      occurredAt: new Date(),
    });

  }
}
