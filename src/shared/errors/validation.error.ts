import { AppError } from './app.error';

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super('Validation failed', 400, 'VALIDATION_ERROR', details);
  }
}
