import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SNOWFLAKE_REGEX = /^\d{15,22}$/;

@Injectable()
export class ParseEntityIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException('ID invalido');
    }

    const normalized = value.trim();

    if (UUID_REGEX.test(normalized)) {
      return normalized;
    }

    if (SNOWFLAKE_REGEX.test(normalized)) {
      try {
        const parsed = BigInt(normalized);
        if (parsed > 0n) {
          return normalized;
        }
      } catch {
        throw new BadRequestException(
          'ID invalido: esperado UUID ou Snowflake numerico',
        );
      }
    }

    throw new BadRequestException(
      'ID invalido: esperado UUID ou Snowflake numerico',
    );
  }
}

const innerEntityIdPipe = new ParseEntityIdPipe();

@Injectable()
export class ParseOptionalEntityIdPipe implements PipeTransform<
  string | string[] | undefined,
  string | undefined
> {
  transform(value: string | string[] | undefined): string | undefined {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw === undefined || raw === null) {
      return undefined;
    }
    const trimmed = String(raw).trim();
    if (trimmed.length === 0) {
      return undefined;
    }
    return innerEntityIdPipe.transform(trimmed);
  }
}
