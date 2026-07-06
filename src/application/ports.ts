import { Repositories } from '../domain/repositories';

export interface UnitOfWork {
  execute<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}

export interface IdentificationValidator {
  validate(countryCode: string, typeCode: string, value: string): boolean;
}
