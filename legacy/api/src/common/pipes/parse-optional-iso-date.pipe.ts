import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Converte query string opcional em `Date` (UTC). Rejeita valores não parseáveis.
 */
@Injectable()
export class ParseOptionalIsoDatePipe implements PipeTransform<
  string | string[] | undefined,
  Date | undefined
> {
  transform(value: string | string[] | undefined): Date | undefined {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw === undefined || raw === null) {
      return undefined;
    }
    const trimmed = String(raw).trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    const ms = Date.parse(trimmed);
    if (Number.isNaN(ms)) {
      throw new BadRequestException(
        `Data inválida: esperado ISO-8601 (ex.: 2026-04-12 ou 2026-04-12T14:30:00Z), recebido "${trimmed}"`,
      );
    }
    return new Date(ms);
  }
}
