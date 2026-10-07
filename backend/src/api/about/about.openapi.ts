import { ApiOkResponse } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { aboutContracts } from './about.contract';

export function AboutResponse(path: keyof typeof aboutContracts) {
  const contract = aboutContracts[path];
  return ApiOkResponse({
    description: 'Public About content. Examples are development fixtures, not a substitute for editorial verification.',
    schema: { ...JSON.parse(JSON.stringify(contract.schema)) as SchemaObject, example: contract.example },
  });
}
