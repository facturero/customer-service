import { IdentificationTypeReadModelRepository } from '../../domain/repositories';
import { IdentificationTypeDTO } from '../dtos';

export class ListIdentificationTypesUseCase {
  constructor(private readonly idTypeRepo: IdentificationTypeReadModelRepository) {}

  async execute(countryCode: string): Promise<IdentificationTypeDTO[]> {
    const types = await this.idTypeRepo.listByCountry(countryCode);
    return types.map((t) => ({
      id: t.id,
      countryCode: t.countryCode,
      code: t.code,
      name: t.name,
      regex: t.regex,
    }));
  }
}
