import { CustomerRepository } from '../../domain/repositories';
import { ListCustomersInput, CustomerDTO } from '../dtos';

export class ListCustomersUseCase {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async execute(input: ListCustomersInput): Promise<CustomerDTO[]> {
    const customers = await this.customerRepo.list(input.organizationId, {
      search: input.search,
      status: input.status,
      tagId: input.tagId,
    });

    return customers.map((c) => ({
      id: c.id,
      organizationId: c.organizationId,
      countryCode: c.countryCode,
      identificationTypeId: c.identificationTypeId,
      identification: c.identification,
      businessName: c.businessName,
      tradeName: c.tradeName,
      email: c.email,
      phone: c.phone,
      type: c.type,
      status: c.status,
      isSystem: c.isSystem,
      imageFileId: c.imageFileId,
      metadata: c.metadata,
    }));
  }
}
