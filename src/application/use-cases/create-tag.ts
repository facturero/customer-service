import { Tag } from '../../domain/entities';
import { TagAlreadyExistsError } from '../../domain/errors';
import { Repositories } from '../../domain/repositories';
import { CreateTagInput, TagDTO } from '../dtos';

export class CreateTagUseCase {
  constructor(private readonly repos: Repositories) {}

  async execute(input: CreateTagInput): Promise<TagDTO> {
    const existing = await this.repos.tags.findByName(input.organizationId, input.name);
    if (existing) throw new TagAlreadyExistsError();

    const tag = Tag.create({
      organizationId: input.organizationId,
      name: input.name,
      color: input.color ?? null,
    });

    await this.repos.tags.save(tag);

    return {
      id: tag.id,
      organizationId: tag.organizationId,
      name: tag.name,
      color: tag.color,
    };
  }
}
