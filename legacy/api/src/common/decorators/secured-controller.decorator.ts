import {
  applyDecorators,
  Controller,
  type ControllerOptions,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthorizationGuard } from '../guards/authorization.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

type SecuredControllerPath = string | string[] | ControllerOptions;

export function SecuredController(path: string | string[]): ClassDecorator;
export function SecuredController(options: ControllerOptions): ClassDecorator;
export function SecuredController(path: SecuredControllerPath): ClassDecorator {
  const controllerDecorator =
    typeof path === 'string' || Array.isArray(path)
      ? Controller(path)
      : Controller(path);

  return applyDecorators(
    controllerDecorator,
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard, AuthorizationGuard),
  );
}
