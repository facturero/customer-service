import { CustomerRepository } from '../../domain/repositories';
import { ListCustomersInput, CustomerDTO } from '../dtos';

export class ListCustomersUseCase {
  constructor(private readonly customerRepo: CustomerRepository) {}

  async execute(input: ListCustomersInput): Promise<CustomerDTO[]> {
    // Paginación acotada: sin params se devuelve hasta 500 (nunca ilimitado, que
    // era el bug); con ?page=&pageSize= se pagina. La respuesta sigue siendo un
    // array para no romper el frontend (que hoy pagina en cliente).
    const pageSize = Math.min(Math.max(input.pageSize ?? 500, 1), 500);
    const page = Math.max(input.page ?? 1, 1);
    const customers = await this.customerRepo.list(input.organizationId, {
      search: input.search,
      status: input.status,
      tagId: input.tagId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
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
