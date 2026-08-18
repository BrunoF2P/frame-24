import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Serviço responsável por gerar IDs de funcionários únicos e legíveis.
 *
 * Formato: XXX-YYYY
 * - XXX: Código da empresa (2-3 letras das iniciais do nome)
 * - YYYY: Número sequencial com 4 dígitos
 *
 * Exemplos:
 * - Cinema Estrela → CE-0001, CE-0002...
 * - Cinema Centro → CC-0001, CC-0002...
 *
 * Nota: O código pode se repetir entre empresas diferentes,
 * mas isso não é problema pois o sistema isola por company_id.
 */
@Injectable()
export class EmployeeIdGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gera um employee_id único para a empresa.
   */
  async generate(company_id: string): Promise<string> {
    const companyCode = await this.generateCompanyCode(company_id);
    const nextNumber = await this.getNextSequentialNumber(company_id);

    return `${companyCode}-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Valida se um employee_id está disponível na empresa.
   */
  async isAvailable(employee_id: string, company_id: string): Promise<boolean> {
    const existing = await this.prisma.company_users.findFirst({
      where: { employee_id, company_id },
    });

    return !existing;
  }

  /**
   * Gera o código da empresa (2-3 letras).
   *
   * Estratégias:
   * 1. Iniciais das palavras significativas
   * 2. Parte única do tenant_slug
   * 3. Primeiras letras do nome
   */
  private async generateCompanyCode(company_id: string): Promise<string> {
    const company = await this.prisma.companies.findUnique({
      where: { id: company_id },
      select: {
        corporate_name: true,
        trade_name: true,
        tenant_slug: true,
      },
    });

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    const companyName = company.trade_name || company.corporate_name;

    // Estratégia 1: Iniciais de palavras significativas
    const words = companyName
      .split(' ')
      .filter((w) => w.length > 2)
      .filter(
        (w) => !/^(cinema|shopping|complexo|ltda|sa|me|epp|eireli)$/i.test(w),
      );

    if (words.length >= 2) {
      return words
        .slice(0, 3)
        .map((w) => w[0].toUpperCase())
        .join('')
        .substring(0, 3);
    }

    // Estratégia 2: Parte única do tenant_slug
    const uniquePart = company.tenant_slug
      .replace(/^(cinema|shopping|complexo)-/i, '')
      .replace(/[^a-z]/gi, '')
      .substring(0, 3)
      .toUpperCase();

    if (uniquePart.length >= 2) {
      return uniquePart;
    }

    // Estratégia 3: Primeiras letras do nome
    return companyName
      .replace(/[^a-z]/gi, '')
      .substring(0, 3)
      .toUpperCase();
  }

  /**
   * Obtém o próximo número sequencial da empresa.
   */
  private async getNextSequentialNumber(company_id: string): Promise<number> {
    const count = await this.prisma.company_users.count({
      where: { company_id },
    });

    return count + 1;
  }

  /**
   * Parseia um employee_id.
   *
   * @example
   * parseEmployeeId("CE-0001") // { code: "CE", number: 1 }
   */
  parseEmployeeId(
    employee_id: string,
  ): { code: string; number: number } | null {
    const match = employee_id.match(/^([A-Z]{2,3})-(\d{4})$/);

    if (!match) {
      return null;
    }

    return {
      code: match[1],
      number: parseInt(match[2], 10),
    };
  }

  /**
   * Valida o formato de um employee_id.
   */
  isValidFormat(employee_id: string): boolean {
    return /^[A-Z]{2,3}-\d{4}$/.test(employee_id);
  }
}
