import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { ParseEntityIdPipe } from 'src/common/pipes/parse-entity-id.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { PublicService } from '../services/public.service';
import { PublicReadThrottle } from 'src/common/decorators/auth-throttle.decorator';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { StorefrontResponseDto } from '../dto/storefront-response.dto';

@ApiTags('Public')
@Controller({ path: 'public', version: '1' })
@PublicReadThrottle()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  private buildWeakEtag(payload: unknown): string {
    const raw = JSON.stringify(payload);
    const digest = createHash('sha1').update(raw).digest('base64url');
    return `W/"${digest}"`;
  }

  @Get('companies')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar empresas públicas',
    description:
      'Retorna lista de todas as empresas ativas disponíveis para compra de ingressos',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de compras retornado com sucesso',
  })
  async getCompanies() {
    return this.publicService.getCompanies();
  }

  @Get('companies/:tenant_slug')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar empresa por tenant slug',
    description: 'Retorna informações públicas de uma empresa específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Empresa encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa não encontrada',
  })
  async getCompanyBySlug(@Param('tenant_slug') tenantSlug: string) {
    return this.publicService.getCompanyBySlug(tenantSlug);
  }

  @Get('companies/:tenant_slug/complexes')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar complexos de cinema de uma empresa',
    description: 'Retorna todos os complexos ativos de uma empresa específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de complexos retornada com sucesso',
  })
  async getComplexes(@Param('tenant_slug') tenantSlug: string) {
    const company = await this.publicService.getCompanyBySlug(tenantSlug);
    return this.publicService.getComplexesByCompany(company.id);
  }

  @Get('companies/:tenant_slug/movies')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar filmes em exibição',
    description: 'Retorna todos os filmes ativos em exibição de uma empresa',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de filmes retornada com sucesso',
  })
  async getMovies(@Param('tenant_slug') tenantSlug: string) {
    const company = await this.publicService.getCompanyBySlug(tenantSlug);
    return this.publicService.getMoviesByCompany(company.id);
  }

  @Get('companies/:tenant_slug/showtimes')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar sessões disponíveis',
    description:
      'Retorna sessões disponíveis de uma empresa, com filtros opcionais',
  })
  @ApiQuery({
    name: 'complex_id',
    required: false,
    description: 'ID do complexo',
  })
  @ApiQuery({ name: 'movie_id', required: false, description: 'ID do filme' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Data das sessões (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página para paginação (padrão: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página (padrão: 50, máximo: 100)',
    example: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de sessões retornada com sucesso',
  })
  async getShowtimes(
    @Param('tenant_slug') tenantSlug: string,
    @Query('complex_id') complexId?: string,
    @Query('movie_id') movieId?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const company = await this.publicService.getCompanyBySlug(tenantSlug);

    const parsedPage =
      page && Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
    const parsedLimit =
      limit && Number.isFinite(Number(limit))
        ? Math.min(100, Math.max(1, Number(limit)))
        : 50;

    return this.publicService.getShowtimesByCompany(company.id, {
      complexId,
      movieId,
      date: date ? new Date(date) : undefined,
      page: parsedPage,
      limit: parsedLimit,
    });
  }

  @Get('showtimes/:id/seats')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter mapa de assentos de uma sessão',
    description:
      'Retorna o mapa completo de assentos com status (disponível, reservado, vendido)',
  })
  @ApiResponse({
    status: 200,
    description: 'Mapa de assentos retornado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Sessão não encontrada',
  })
  async getSeatsMap(@Param('id', ParseEntityIdPipe) id: string) {
    return this.publicService.getShowtimeSeatsMap(id);
  }

  @Get('companies/:tenant_slug/products')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar produtos de concessão',
    description: 'Retorna produtos de concessão disponíveis para venda',
  })
  @ApiQuery({
    name: 'complex_id',
    required: false,
    description: 'ID do complexo para preços específicos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de produtos retornada com sucesso',
  })
  async getProducts(
    @Param('tenant_slug') tenantSlug: string,
    @Query('complex_id') complexId?: string,
  ) {
    const company = await this.publicService.getCompanyBySlug(tenantSlug);
    return this.publicService.getProductsByCompany(company.id, complexId);
  }

  @Get('companies/:tenant_slug/ticket-types')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar tipos de ingresso',
    description: 'Retorna os tipos de ingresso disponíveis para uma empresa',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tipos de ingresso retornada com sucesso',
  })
  async getTicketTypes(@Param('tenant_slug') tenantSlug: string) {
    const company = await this.publicService.getCompanyBySlug(tenantSlug);
    return this.publicService.getTicketTypes(company.id);
  }

  @Get('companies/:tenant_slug/payment-methods')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar métodos de pagamento',
    description: 'Retorna os métodos de pagamento ativos para uma empresa',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de métodos de pagamento retornada com sucesso',
  })
  async getPaymentMethods(@Param('tenant_slug') tenantSlug: string) {
    const company = await this.publicService.getCompanyBySlug(tenantSlug);
    return this.publicService.getPaymentMethods(company.id);
  }

  @Get('companies/:tenant_slug/storefront')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter dados agregados da vitrine pública',
    description:
      'Retorna em uma única requisição os dados mais usados na experiência pública (empresa, complexos, filmes, produtos, tipos de ingresso e métodos de pagamento). Opcionalmente inclui sessões filtradas.',
  })
  @ApiQuery({
    name: 'include_showtimes',
    required: false,
    description: 'Se true, inclui sessões no payload',
    example: 'false',
  })
  @ApiQuery({
    name: 'complex_id',
    required: false,
    description:
      'Filtro opcional de complexo para sessões e preços de produtos',
  })
  @ApiQuery({
    name: 'movie_id',
    required: false,
    description: 'Filtro opcional de filme para sessões',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Data opcional para filtrar sessões (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'showtimes_page',
    required: false,
    description: 'Página das sessões quando include_showtimes=true (padrão: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'showtimes_limit',
    required: false,
    description:
      'Itens por página das sessões quando include_showtimes=true (padrão: 20, máximo: 100)',
    example: 20,
  })
  @ApiOkResponse({
    description: 'Dados agregados da vitrine retornados com sucesso',
    type: StorefrontResponseDto,
  })
  @ApiResponse({
    status: 304,
    description: 'Conteúdo não alterado desde o último ETag enviado',
  })
  async getStorefrontData(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('tenant_slug') tenantSlug: string,
    @Query('include_showtimes') includeShowtimes?: string,
    @Query('complex_id') complexId?: string,
    @Query('movie_id') movieId?: string,
    @Query('date') date?: string,
    @Query('showtimes_page') showtimesPage?: string,
    @Query('showtimes_limit') showtimesLimit?: string,
  ) {
    const parsedShowtimesPage =
      showtimesPage && Number.isFinite(Number(showtimesPage))
        ? Math.max(1, Number(showtimesPage))
        : 1;
    const parsedShowtimesLimit =
      showtimesLimit && Number.isFinite(Number(showtimesLimit))
        ? Math.min(100, Math.max(1, Number(showtimesLimit)))
        : 20;

    const data = await this.publicService.getStorefrontData(tenantSlug, {
      includeShowtimes: includeShowtimes === 'true',
      complexId,
      movieId,
      date: date ? new Date(date) : undefined,
      showtimesPage: parsedShowtimesPage,
      showtimesLimit: parsedShowtimesLimit,
    });

    const payload = {
      company: data.company,
      complexes: data.complexes,
      movies: data.movies,
      products: data.products,
      ticket_types: data.ticket_types,
      payment_methods: data.payment_methods,
      showtimes: data.showtimes ? data.showtimes.items : null,
      showtimes_pagination: data.showtimes
        ? {
            page: data.showtimes.page,
            limit: data.showtimes.limit,
            total: data.showtimes.total,
            total_pages: data.showtimes.total_pages,
          }
        : null,
    };

    const etag = this.buildWeakEtag(payload);
    res.setHeader('ETag', etag);
    res.setHeader(
      'Cache-Control',
      'public, max-age=30, stale-while-revalidate=120',
    );

    const ifNoneMatch = req.headers['if-none-match'];
    if (typeof ifNoneMatch === 'string' && ifNoneMatch === etag) {
      res.status(HttpStatus.NOT_MODIFIED);
      return;
    }

    return {
      success: true,
      meta: {
        generated_at: new Date().toISOString(),
        include_showtimes: includeShowtimes === 'true',
      },
      data: payload,
    };
  }

  @Get('companies/:tenant_slug/sales/:reference')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter detalhes da venda',
    description:
      'Retorna os detalhes completos de uma venda (ingressos, produtos, sessão)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da venda retornados com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Venda não encontrada',
  })
  async getSaleDetails(
    @Param('tenant_slug') tenantSlug: string,
    @Param('reference') reference: string,
  ) {
    const company = await this.publicService.getCompanyBySlug(tenantSlug);
    return this.publicService.getSaleDetails(company.id, reference);
  }

  @Get('movies/:id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter detalhes do filme',
    description: 'Retorna os detalhes completos de um filme',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do filme retornados com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Filme não encontrado',
  })
  async getMovie(@Param('id', ParseEntityIdPipe) id: string) {
    return this.publicService.getMovie(id);
  }
}
