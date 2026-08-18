import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthorizationGuard } from 'src/common/guards/authorization.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RequirePermission } from 'src/common/decorators/require-permission.decorator';
import {
  EmployeeReadThrottle,
  EmployeeWriteThrottle,
} from 'src/common/decorators/auth-throttle.decorator';
import { CampaignsService } from '../services/campaigns.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';

@ApiTags('Campaigns')
@ApiBearerAuth()
@EmployeeReadThrottle()
@Controller({ path: 'campaigns', version: '1' })
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @EmployeeWriteThrottle()
  @RequirePermission('campaigns', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Criar campanha promocional',
    description:
      'Cria uma nova campanha promocional para a empresa do usuário autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Campanha criada com sucesso.',
  })
  async create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Get()
  @RequirePermission('campaigns', 'read')
  @ApiOperation({
    summary: 'Listar campanhas',
    description: 'Lista todas as campanhas da empresa do usuário.',
  })
  async findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  @RequirePermission('campaigns', 'read')
  @ApiOperation({
    summary: 'Buscar campanha por ID',
  })
  async findOne(@Param('id', ParseEntityIdPipe) id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post(':id/activate')
  @EmployeeWriteThrottle()
  @RequirePermission('campaigns', 'update')
  @ApiOperation({
    summary: 'Ativar campanha',
  })
  async activate(@Param('id', ParseEntityIdPipe) id: string) {
    return this.campaignsService.activate(id);
  }

  @Post(':id/pause')
  @EmployeeWriteThrottle()
  @RequirePermission('campaigns', 'update')
  @ApiOperation({
    summary: 'Pausar campanha',
  })
  async pause(@Param('id', ParseEntityIdPipe) id: string) {
    return this.campaignsService.pause(id);
  }
}
