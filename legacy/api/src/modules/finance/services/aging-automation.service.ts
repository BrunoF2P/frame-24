import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AgingAutomationService {
  private readonly logger = new Logger(AgingAutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atualiza status de títulos vencidos
   * Executa diariamente às 00:05
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateOverdueStatus() {
    this.logger.log('Iniciando atualização de status de títulos vencidos...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Atualizar contas a receber vencidas
      const receivablesUpdated =
        await this.prisma.accounts_receivable.updateMany({
          where: {
            status: { in: ['pending', 'partially_paid'] },
            due_date: { lt: today },
          },
          data: {
            status: 'overdue',
          },
        });

      // Atualizar contas a pagar vencidas
      const payablesUpdated = await this.prisma.accounts_payable.updateMany({
        where: {
          status: { in: ['pending', 'partially_paid'] },
          due_date: { lt: today },
        },
        data: {
          status: 'overdue',
        },
      });

      this.logger.log(
        `Status atualizado: ${receivablesUpdated.count} recebíveis, ${payablesUpdated.count} pagáveis`,
      );
    } catch (error) {
      this.logger.error('Erro ao atualizar status de títulos vencidos', error);
    }
  }

  /**
   * Calcula juros e multas para títulos vencidos
   * Executa diariamente às 01:00
   *
   * Regras padrão (podem ser configuradas por empresa):
   * - Multa: 2% sobre o valor original (aplicada uma vez no primeiro dia de atraso)
   * - Juros: 0.033% ao dia (1% ao mês)
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async calculatePenalties() {
    this.logger.log('Iniciando cálculo de juros e multas...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Buscar títulos a receber vencidos
      const overdueReceivables = await this.prisma.accounts_receivable.findMany(
        {
          where: {
            status: { in: ['overdue', 'partially_paid'] },
            due_date: { lt: today },
            remaining_amount: { gt: 0 },
          },
        },
      );

      let receivablesUpdated = 0;

      for (const title of overdueReceivables) {
        const dueDate = new Date(title.due_date);
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysOverdue <= 0) continue;

        const originalAmount = Number(title.original_amount);
        let penaltyAmount = Number(title.penalty_amount);
        let interestAmount = Number(title.interest_amount);

        // Aplicar multa de 2% no primeiro dia de atraso (se ainda não foi aplicada)
        if (penaltyAmount === 0 && daysOverdue >= 1) {
          penaltyAmount = originalAmount * 0.02;
        }

        // Calcular juros: 0.033% ao dia sobre o valor original
        const dailyInterestRate = 0.00033;
        interestAmount = originalAmount * dailyInterestRate * daysOverdue;

        // Atualizar título
        await this.prisma.accounts_receivable.update({
          where: { id: title.id },
          data: {
            penalty_amount: penaltyAmount,
            interest_amount: interestAmount,
          },
        });

        receivablesUpdated++;
      }

      // Buscar títulos a pagar vencidos
      const overduePayables = await this.prisma.accounts_payable.findMany({
        where: {
          status: { in: ['overdue', 'partially_paid'] },
          due_date: { lt: today },
          remaining_amount: { gt: 0 },
        },
      });

      let payablesUpdated = 0;

      for (const title of overduePayables) {
        const dueDate = new Date(title.due_date);
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysOverdue <= 0) continue;

        const originalAmount = Number(title.original_amount);
        let penaltyAmount = Number(title.penalty_amount);
        let interestAmount = Number(title.interest_amount);

        // Aplicar multa de 2% no primeiro dia de atraso
        if (penaltyAmount === 0 && daysOverdue >= 1) {
          penaltyAmount = originalAmount * 0.02;
        }

        // Calcular juros: 0.033% ao dia
        const dailyInterestRate = 0.00033;
        interestAmount = originalAmount * dailyInterestRate * daysOverdue;

        await this.prisma.accounts_payable.update({
          where: { id: title.id },
          data: {
            penalty_amount: penaltyAmount,
            interest_amount: interestAmount,
          },
        });

        payablesUpdated++;
      }

      this.logger.log(
        `Juros/multas calculados: ${receivablesUpdated} recebíveis, ${payablesUpdated} pagáveis`,
      );
    } catch (error) {
      this.logger.error('Erro ao calcular juros e multas', error);
    }
  }

  /**
   * Método manual para forçar atualização (útil para testes)
   */
  async forceUpdate() {
    await this.updateOverdueStatus();
    await this.calculatePenalties();
  }
}
