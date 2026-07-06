import { CustomerNotFoundError } from '../../domain/errors';
import { UnitOfWork } from '../ports';

export class DisableCustomerUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(organizationId: string, id: string): Promise<void> {
    return this.uow.execute(async (repos) => {
      const customer = await repos.customers.findById(id);
      if (!customer || !customer.belongsToOrganization(organizationId)) {
        throw new CustomerNotFoundError();
      }

      customer.disable();
      await repos.customers.save(customer);

      await repos.outbox.add({
        type: 'customer.customer.disabled',
        aggregateType: 'customer',
        aggregateId: customer.id,
        payload: {
          customerId: customer.id,
          organizationId: customer.organizationId,
        },
        occurredAt: new Date(),
      });
    });
  }
}
