import { describe, expect, it } from 'vitest';
import { Address, Contact, Customer, Tag } from '../domain/entities';
import type { DomainEvent, Repositories } from '../domain/repositories';
import type { UnitOfWork } from '../application/ports';
import { AddAddressUseCase } from '../application/use-cases/add-address';
import { UpdateAddressUseCase } from '../application/use-cases/update-address';
import { DeleteAddressUseCase } from '../application/use-cases/delete-address';
import { AddContactUseCase } from '../application/use-cases/add-contact';
import { UpdateContactUseCase } from '../application/use-cases/update-contact';
import { DeleteContactUseCase } from '../application/use-cases/delete-contact';
import { CreateTagUseCase } from '../application/use-cases/create-tag';
import { AssignTagUseCase } from '../application/use-cases/assign-tag';
import { RemoveTagUseCase } from '../application/use-cases/remove-tag';

/**
 * Direcciones, contactos y etiquetas del cliente: el cambio y su evento de auditoría van en UNA transacción. Antes estos
 * casos de uso recibían los repositorios sin transacción: un fallo entre guardar y publicar dejaba el cambio hecho y la
 * bitácora sin enterarse. Aquí la unidad de trabajo de mentira DESHACE todo si algo falla dentro, como una transacción real.
 */
const ORG = 'org-1';

interface Mundo {
  repos: Repositories;
  uow: UnitOfWork;
  events: DomainEvent[];
  breakOutbox: () => void;
  /** Foto del estado completo: para comprobar que un fallo no deja nada a medias. */
  foto: () => string;
  ids: { customer: string; address: string; contact: string; tagFree: string; tagAssigned: string };
}

function crearMundo(): Mundo {
  const customers = new Map<string, Customer>();
  const addresses = new Map<string, Address>();
  const contacts = new Map<string, Contact>();
  const tags = new Map<string, Tag>();
  const customerTags = new Set<string>(); // `${customerId}:${tagId}`
  let events: DomainEvent[] = [];
  let outboxRoto = false;

  const repos = {
    customers: {
      findById: async (id: string) => customers.get(id) ?? null,
      findByIdentification: async () => null,
      list: async () => [],
      save: async (c: Customer) => void customers.set(c.id, c),
    },
    addresses: {
      findById: async (id: string) => addresses.get(id) ?? null,
      listByCustomer: async (customerId: string) => [...addresses.values()].filter((a) => a.customerId === customerId),
      save: async (a: Address) => void addresses.set(a.id, a),
      delete: async (id: string) => void addresses.delete(id),
    },
    contacts: {
      findById: async (id: string) => contacts.get(id) ?? null,
      listByCustomer: async (customerId: string) => [...contacts.values()].filter((c) => c.customerId === customerId),
      save: async (c: Contact) => void contacts.set(c.id, c),
      delete: async (id: string) => void contacts.delete(id),
    },
    tags: {
      findById: async (id: string) => tags.get(id) ?? null,
      findByName: async (organizationId: string, name: string) =>
        [...tags.values()].find((t) => t.organizationId === organizationId && t.name === name) ?? null,
      listByOrganization: async () => [...tags.values()],
      save: async (t: Tag) => void tags.set(t.id, t),
      delete: async (id: string) => void tags.delete(id),
    },
    customerTags: {
      listByCustomer: async (customerId: string) =>
        [...customerTags].filter((k) => k.startsWith(`${customerId}:`)).map((k) => tags.get(k.split(':')[1])!),
      add: async (customerId: string, tagId: string) => void customerTags.add(`${customerId}:${tagId}`),
      remove: async (customerId: string, tagId: string) => void customerTags.delete(`${customerId}:${tagId}`),
    },
    identificationTypes: { findById: async () => null, listByCountry: async () => [], upsert: async () => {} },
    outbox: {
      add: async (event: DomainEvent) => {
        if (outboxRoto) throw new Error('el outbox no está disponible');
        events.push(event);
      },
    },
  } as unknown as Repositories;

  // Las entidades se guardan por referencia y `update()` las muta en sitio: restaurar solo los mapas no basta, hay que restaurar
  // también el estado de cada entidad (lo que hace una transacción real con las filas).
  const todas = (): object[] => [...customers.values(), ...addresses.values(), ...contacts.values(), ...tags.values()];
  const estadoDe = (e: object) => ({ e, props: { ...(e as { props: object }).props } });

  const uow: UnitOfWork = {
    async execute<T>(work: (r: Repositories) => Promise<T>): Promise<T> {
      const antes = {
        customers: new Map(customers),
        addresses: new Map(addresses),
        contacts: new Map(contacts),
        tags: new Map(tags),
        customerTags: new Set(customerTags),
        events: [...events],
        estados: todas().map(estadoDe),
      };
      try {
        return await work(repos);
      } catch (error) {
        for (const [mapa, previo] of [
          [customers, antes.customers],
          [addresses, antes.addresses],
          [contacts, antes.contacts],
          [tags, antes.tags],
        ] as const) {
          mapa.clear();
          previo.forEach((v, k) => (mapa as Map<string, unknown>).set(k, v));
        }
        customerTags.clear();
        antes.customerTags.forEach((k) => customerTags.add(k));
        events = antes.events;
        for (const { e, props } of antes.estados) (e as { props: object }).props = props;
        throw error;
      }
    },
  };

  const customer = Customer.create({ organizationId: ORG, countryCode: 'EC', businessName: 'ACME', type: 'company' });
  customers.set(customer.id, customer);
  const address = Address.create({ customerId: customer.id, line1: 'Calle 1' });
  addresses.set(address.id, address);
  const contact = Contact.create({ customerId: customer.id, name: 'Ana' });
  contacts.set(contact.id, contact);
  const tagFree = Tag.create({ organizationId: ORG, name: 'VIP' });
  const tagAssigned = Tag.create({ organizationId: ORG, name: 'Mayorista' });
  tags.set(tagFree.id, tagFree);
  tags.set(tagAssigned.id, tagAssigned);
  customerTags.add(`${customer.id}:${tagAssigned.id}`);

  return {
    repos,
    uow,
    get events() {
      return events;
    },
    breakOutbox: () => {
      outboxRoto = true;
    },
    foto: () =>
      JSON.stringify({
        c: [...customers.values()].map((x) => (x as unknown as { props: object }).props),
        a: [...addresses.values()].map((x) => (x as unknown as { props: object }).props),
        k: [...contacts.values()].map((x) => (x as unknown as { props: object }).props),
        t: [...tags.values()].map((x) => (x as unknown as { props: object }).props),
        ct: [...customerTags].sort(),
        ev: events.length,
      }),
    ids: { customer: customer.id, address: address.id, contact: contact.id, tagFree: tagFree.id, tagAssigned: tagAssigned.id },
  } as Mundo;
}

interface Caso {
  nombre: string;
  evento: string;
  ejecutar: (m: Mundo) => Promise<unknown>;
}

const casos: Caso[] = [
  {
    nombre: 'agregar dirección',
    evento: 'customer.address.added',
    ejecutar: (m) => new AddAddressUseCase(m.uow).execute({ organizationId: ORG, customerId: m.ids.customer, line1: 'Av. Nueva' }),
  },
  {
    nombre: 'editar dirección',
    evento: 'customer.address.updated',
    ejecutar: (m) => new UpdateAddressUseCase(m.uow).execute({ organizationId: ORG, id: m.ids.address, line1: 'Av. Editada' }),
  },
  {
    nombre: 'borrar dirección',
    evento: 'customer.address.deleted',
    ejecutar: (m) => new DeleteAddressUseCase(m.uow).execute(ORG, m.ids.address),
  },
  {
    nombre: 'agregar contacto',
    evento: 'customer.contact.added',
    ejecutar: (m) => new AddContactUseCase(m.uow).execute({ organizationId: ORG, customerId: m.ids.customer, name: 'Luis' }),
  },
  {
    nombre: 'editar contacto',
    evento: 'customer.contact.updated',
    ejecutar: (m) => new UpdateContactUseCase(m.uow).execute({ organizationId: ORG, id: m.ids.contact, name: 'Ana María' }),
  },
  {
    nombre: 'borrar contacto',
    evento: 'customer.contact.deleted',
    ejecutar: (m) => new DeleteContactUseCase(m.uow).execute(ORG, m.ids.contact),
  },
  {
    nombre: 'crear etiqueta',
    evento: 'customer.tag.created',
    ejecutar: (m) => new CreateTagUseCase(m.uow).execute({ organizationId: ORG, name: 'Nueva' }),
  },
  {
    nombre: 'asignar etiqueta',
    evento: 'customer.tag.assigned',
    ejecutar: (m) => new AssignTagUseCase(m.uow).execute(ORG, m.ids.customer, m.ids.tagFree),
  },
  {
    nombre: 'quitar etiqueta',
    evento: 'customer.tag.removed',
    ejecutar: (m) => new RemoveTagUseCase(m.uow).execute(ORG, m.ids.customer, m.ids.tagAssigned),
  },
];

describe.each(casos)('$nombre', ({ evento, ejecutar }) => {
  it(`confirma el cambio y publica ${evento}`, async () => {
    const m = crearMundo();
    const antes = m.foto();
    await ejecutar(m);
    expect(m.events.map((e) => e.type)).toEqual([evento]);
    expect(m.foto()).not.toBe(antes);
  });

  it('si el outbox falla, el cambio se deshace por completo (no queda nada a medias)', async () => {
    const m = crearMundo();
    const antes = m.foto();
    m.breakOutbox();
    await expect(ejecutar(m)).rejects.toThrow('outbox');
    expect(m.foto()).toBe(antes);
  });
});
