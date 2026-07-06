import { ContactNotFoundError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';

export class DeleteContactUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(organizationId: string, id: string): Promise<void> {
    const contact = await this.repos.contacts.findById(id);
    if (!contact) throw new ContactNotFoundError();

    const customer = await this.repos.customers.findById(contact.customerId);
    if (!customer || !customer.belongsToOrganization(organizationId)) {
      throw new ContactNotFoundError();
    }

    await this.repos.contacts.delete(id);
  }
}
