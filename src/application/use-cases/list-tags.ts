import { TagRepository } from '../../domain/repositories';
import { TagDTO } from '../dtos';

export class ListTagsUseCase {
  constructor(private readonly tagRepo: TagRepository) {}

  async execute(organizationId: string): Promise<TagDTO[]> {
    const tags = await this.tagRepo.listByOrganization(organizationId);
    return tags.map((t) => ({
      id: t.id,
      organizationId: t.organizationId,
      name: t.name,
      color: t.color,
    }));
  }
}
