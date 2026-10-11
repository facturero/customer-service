import { Tag } from '../../domain/entities';
import { TagAlreadyExistsError } from '../../domain/errors';
import { UnitOfWork } from '../ports';
import { CreateTagInput, TagDTO } from '../dtos';

export class CreateTagUseCase {
  constructor(private readonly uow: UnitOfWork) {}

  async execute(input: CreateTagInput): Promise<TagDTO> {
    // Todo en UNA transacción: el cambio y su evento de auditoría se confirman juntos o ninguno. Fuera de ella, un fallo entre
    // ambos pierde el evento (o publica uno de algo que no quedó guardado), y el relé no se entera hasta su siguiente barrido.
    return this.uow.execute(async (repos) => {
      const existing = await repos.tags.findByName(input.organizationId, input.name);
      if (existing) throw new TagAlreadyExistsError();

      const tag = Tag.create({
        organizationId: input.organizationId,
        name: input.name,
        color: input.color ?? null,
      });

      await repos.tags.save(tag);

      // Direcciones, contactos y etiquetas del cliente: hasta ahora solo el alta,
      // edición y baja del CLIENTE emitían evento, así que todo lo que colgaba de
      // él se podía cambiar sin dejar rastro en la bitácora.
      await repos.outbox.add({
        type: 'customer.tag.created',
        aggregateType: 'tag',
        aggregateId: tag.id,
        payload: {
          organizationId: input.organizationId,
          tagId: tag.id,
          name: tag.name,
        },
        occurredAt: new Date(),
      });


      return {
        id: tag.id,
        organizationId: tag.organizationId,
        name: tag.name,
        color: tag.color,
      };
    });
  }
}
