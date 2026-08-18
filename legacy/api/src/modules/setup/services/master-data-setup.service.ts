import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SnowflakeService } from 'src/common/services/snowflake.service';
import { LoggerService } from 'src/common/services/logger.service';
import { MASTER_DATA } from 'src/common/constants/master-data.constant';

@Injectable()
export class MasterDataSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Popula TODOS os dados mestres para uma empresa
   */
  async setupCompanyMasterData(company_id: string): Promise<void> {
    this.logger.log(
      `Iniciando setup de master data para empresa ${company_id}`,
      MasterDataSetupService.name,
    );

    try {
      // IDENTITY
      await this.setupCustomRoles(company_id);

      // HR
      await this.setupEmploymentContractTypes(company_id);

      // OPERATIONS
      await this.setupProjectionTypes(company_id);
      await this.setupAudioTypes(company_id);
      await this.setupSessionLanguages(company_id);
      await this.setupSessionStatus(company_id);
      await this.setupSeatStatus(company_id);
      await this.setupSeatTypes(company_id);

      // FINANCE
      await this.setupAccountTypes(company_id);
      await this.setupAccountNatures(company_id);
      await this.setupSettlementBases(company_id);
      await this.setupDistributorSettlementStatus(company_id);
      await this.setupJournalEntryStatus(company_id);
      await this.setupJournalEntryTypes(company_id);

      // CATALOG
      await this.setupAgeRatings(company_id);
      await this.setupMovieCategories(company_id);
      await this.setupCastTypes(company_id);
      await this.setupMediaTypes(company_id);

      // SALES
      await this.setupPaymentMethods(company_id);
      await this.setupSaleTypes(company_id);
      await this.setupSaleStatus(company_id);
      await this.setupTicketTypes(company_id);

      // TAX
      await this.setupRevenueTypes(company_id);

      await this.setupSupplierTypes(company_id);

      this.logger.log(
        `Setup completo: ${company_id} (categorias criadas)`,
        MasterDataSetupService.name,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao fazer setup: ${error instanceof Error ? error.message : String(error)}`,
        MasterDataSetupService.name,
      );
      throw error;
    }
  }

  // ============ IDENTITY ============

  private async setupCustomRoles(company_id: string): Promise<void> {
    for (const role of MASTER_DATA.identity.custom_roles) {
      await this.prisma.custom_roles.upsert({
        where: { company_id_name: { company_id, name: role.name } },
        update: {},
        create: {
          id: this.snowflake.generate(),
          company_id,
          name: role.name,
          description: role.description,
          hierarchy_level: role.hierarchy_level,
          is_system_role: role.is_system_role,
        },
      });
    }
    this.logger.log('Custom Roles', MasterDataSetupService.name);
  }

  // ============ HR ============

  private async setupEmploymentContractTypes(
    company_id: string,
  ): Promise<void> {
    for (const type of MASTER_DATA.hr.employment_contract_types) {
      await this.prisma.employment_contract_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
        },
      });
    }
    this.logger.log('Tipos de Contrato', MasterDataSetupService.name);
  }

  // ============ OPERATIONS ============

  private async setupProjectionTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.operations.projection_types) {
      await this.prisma.projection_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
          additional_value: type.additional_value,
        },
      });
    }
    this.logger.log('Tipos de Projeção)', MasterDataSetupService.name);
  }

  private async setupAudioTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.operations.audio_types) {
      await this.prisma.audio_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
          additional_value: type.additional_value,
        },
      });
    }
    this.logger.log('Tipos de Áudio', MasterDataSetupService.name);
  }

  private async setupSessionLanguages(company_id: string): Promise<void> {
    for (const lang of MASTER_DATA.operations.session_languages) {
      await this.prisma.session_languages.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: lang.name,
          description: lang.description,
          abbreviation: lang.abbreviation,
        },
      });
    }
    this.logger.log('Idiomas de Sessão', MasterDataSetupService.name);
  }

  private async setupSessionStatus(company_id: string): Promise<void> {
    for (const status of MASTER_DATA.operations.session_status) {
      await this.prisma.session_status.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: status.name,
          description: status.description,
          allows_modification: status.allows_modification,
        },
      });
    }
    this.logger.log('Status de Sessão', MasterDataSetupService.name);
  }

  private async setupSeatStatus(company_id: string): Promise<void> {
    for (const status of MASTER_DATA.operations.seat_status) {
      await this.prisma.seat_status.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: status.name,
          description: status.description,
          allows_modification: status.allows_modification,
          is_default: status.is_default,
        },
      });
    }
    this.logger.log('Status de Assento', MasterDataSetupService.name);
  }

  private async setupSeatTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.operations.seat_types) {
      await this.prisma.seat_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
          additional_value: type.additional_value,
        },
      });
    }
    this.logger.log('Tipos de Assento', MasterDataSetupService.name);
  }

  // ============ FINANCE ============

  private async setupAccountTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.finance.account_types) {
      await this.prisma.account_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
        },
      });
    }
    this.logger.log('Tipos de Conta', MasterDataSetupService.name);
  }

  private async setupAccountNatures(company_id: string): Promise<void> {
    for (const nature of MASTER_DATA.finance.account_natures) {
      await this.prisma.account_natures.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: nature.name,
          description: nature.description,
        },
      });
    }
    this.logger.log('Naturezas de Conta', MasterDataSetupService.name);
  }

  private async setupSettlementBases(company_id: string): Promise<void> {
    for (const base of MASTER_DATA.finance.settlement_bases) {
      await this.prisma.settlement_bases.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: base.name,
          description: base.description,
        },
      });
    }
    this.logger.log('Bases de Settlement', MasterDataSetupService.name);
  }

  private async setupDistributorSettlementStatus(
    company_id: string,
  ): Promise<void> {
    for (const status of MASTER_DATA.finance.distributor_settlement_status) {
      await this.prisma.distributor_settlement_status.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: status.name,
          description: status.description,
          allows_modification: status.allows_modification,
        },
      });
    }
    this.logger.log(
      'Status de Settlement de Distribuidor',
      MasterDataSetupService.name,
    );
  }

  private async setupJournalEntryStatus(company_id: string): Promise<void> {
    for (const status of MASTER_DATA.finance.journal_entry_status) {
      await this.prisma.journal_entry_status.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: status.name,
          description: status.description,
          allows_modification: status.allows_modification,
        },
      });
    }
    this.logger.log(
      'Status de Lançamento Contábil',
      MasterDataSetupService.name,
    );
  }

  private async setupJournalEntryTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.finance.journal_entry_types) {
      await this.prisma.journal_entry_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
          nature: type.nature,
        },
      });
    }
    this.logger.log(
      'Tipos de Lançamento Contábil',
      MasterDataSetupService.name,
    );
  }

  // ============ CATALOG ============

  private async setupAgeRatings(company_id: string): Promise<void> {
    for (const rating of MASTER_DATA.catalog.age_ratings) {
      await this.prisma.age_ratings.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          code: rating.code,
          name: rating.name,
          minimum_age: rating.minimum_age,
          description: rating.description,
        },
      });
    }
    this.logger.log('Classificações Etárias', MasterDataSetupService.name);
  }

  private async setupMovieCategories(company_id: string): Promise<void> {
    for (const category of MASTER_DATA.catalog.movie_categories) {
      await this.prisma.movie_categories.upsert({
        where: {
          company_id_slug: {
            company_id,
            slug: category.slug,
          },
        },
        update: {},
        create: {
          id: this.snowflake.generate(),
          company_id,
          name: category.name,
          description: category.description,
          slug: category.slug,
        },
      });
    }
    this.logger.log('Categorias de Filme', MasterDataSetupService.name);
  }

  private async setupCastTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.catalog.cast_types) {
      await this.prisma.cast_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
        },
      });
    }
    this.logger.log('Tipos de Elenco', MasterDataSetupService.name);
  }

  private async setupMediaTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.catalog.media_types) {
      await this.prisma.media_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
        },
      });
    }
    this.logger.log('Tipos de Mídia)', MasterDataSetupService.name);
  }

  // ============ SALES ============

  private async setupPaymentMethods(company_id: string): Promise<void> {
    for (const method of MASTER_DATA.sales.payment_methods) {
      await this.prisma.payment_methods.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: method.name,
          description: method.description,
          operator_fee: method.operator_fee,
          settlement_days: method.settlement_days,
        },
      });
    }
    this.logger.log('Métodos de Pagamento', MasterDataSetupService.name);
  }

  private async setupSaleTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.sales.sale_types) {
      await this.prisma.sale_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
          convenience_fee: type.convenience_fee,
        },
      });
    }
    this.logger.log('Tipos de Venda', MasterDataSetupService.name);
  }

  private async setupSaleStatus(company_id: string): Promise<void> {
    for (const status of MASTER_DATA.sales.sale_status) {
      await this.prisma.sale_status.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: status.name,
          description: status.description,
          allows_modification: status.allows_modification,
        },
      });
    }
    this.logger.log('Status de Venda', MasterDataSetupService.name);
  }

  private async setupTicketTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.sales.ticket_types) {
      await this.prisma.ticket_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
          discount_percentage: type.discount_percentage,
        },
      });
    }
    this.logger.log('Tipos de Ingresso', MasterDataSetupService.name);
  }

  private async setupSupplierTypes(company_id: string): Promise<void> {
    await this.prisma.supplier_types.createMany({
      data: MASTER_DATA.inventory.supplier_types.map((type) => ({
        id: this.snowflake.generate(),
        company_id,
        name: type.name,
        description: type.description,
      })),
      skipDuplicates: true,
    });

    this.logger.log('Tipos de Fornecedor', MasterDataSetupService.name);
  }

  // ============ TAX ============

  private async setupRevenueTypes(company_id: string): Promise<void> {
    for (const type of MASTER_DATA.tax.revenue_types) {
      await this.prisma.revenue_types.create({
        data: {
          id: this.snowflake.generate(),
          company_id,
          name: type.name,
          description: type.description,
          applies_iss: type.applies_iss,
          applies_pis_cofins: type.applies_pis_cofins,
        },
      });
    }
    this.logger.log('Tipos de Receita', MasterDataSetupService.name);
  }
}
