interface TagGroup {
  name: string;
  description: string;
  tags: string[];
}

export const TAG_GROUPS: TagGroup[] = [
  {
    name: 'Audit',
    description:
      'Módulo responsável pelo registro e consulta de logs de auditoria do sistema. Permite rastrear ações executadas por usuários e serviços, garantindo transparência, conformidade e segurança operacional. Essencial para monitoramento de eventos críticos, investigações internas e compliance corporativo.',
    tags: ['Audit Logs'],
  },
  {
    name: 'Identity',
    description:
      'Conjunto de endpoints responsáveis pela autorização e gestão de identidade organizacional. O login é realizado via OIDC/Authentik no frontend; a API valida access tokens RS256 e aplica controle de acesso baseado em papéis.',
    tags: ['Auth', 'Companies', 'Roles', 'User Management', 'Permissions'],
  },
  {
    name: 'Operations',
    description:
      'Domínio operacional que centraliza toda a estrutura física e técnica dos cinemas. Inclui o gerenciamento de complexos, salas de exibição, tipos de áudio, projeção e assentos. Este grupo garante a padronização e rastreabilidade das operações de exibição.',
    tags: [
      'Cinema Complexes',
      'Rooms',
      'Seats',
      'Seat Status',
      'Audio Types',
      'Projection Types',
      'Seat Types',
      'Showtimes',
      'Session Status',
      'Session Languages',
    ],
  },
  {
    name: 'Catalog',
    description:
      'Módulo de curadoria e gestão de conteúdo audiovisual e produtos relacionados. Contém endpoints para categorias de filmes, cadastro de obras (Movies) e produtos de venda (Products). Atua como fonte principal de dados para exibição, venda e integração com parceiros de conteúdo.',
    tags: ['Movie Categories', 'Movies', 'Product Categories', 'Products'],
  },
  {
    name: 'Inventory',
    description:
      'Camada de controle logístico e de suprimentos. Reúne endpoints voltados ao cadastro e gestão de fornecedores e insumos utilizados nas operações do cinema. Permite rastrear origem, disponibilidade e relacionamento com parceiros comerciais.',
    tags: ['Suppliers'],
  },
  {
    name: 'Tax',
    description:
      'Módulo fiscal e tributário. Gerencia parâmetros de impostos municipais e federais, incluindo ISS, PIS, COFINS, IRPJ e CSLL. Permite configuração de alíquotas por município e regime tributário, essencial para cálculos fiscais automáticos e apurações mensais.',
    tags: ['Tax'],
  },
  {
    name: 'Contracts',
    description:
      'Módulo de contratos de exibição. Gerencia tipos de contratos e acordos com distribuidoras de filmes, incluindo escalas progressivas (sliding scales) e percentuais de divisão de receita. Essencial para cálculo de repasses e gestão de relacionamento com distribuidoras.',
    tags: ['Contracts'],
  },
  {
    name: 'Sales',
    description:
      'Módulo de vendas e bilheteria. Gerencia vendas de ingressos, produtos de concessão e processamento de pagamentos.',
    tags: ['Sales', 'Tickets'],
  },
  {
    name: 'Stock',
    description:
      'Módulo de controle de estoque. Gerencia movimentações de estoque, níveis de produtos e alertas de estoque baixo.',
    tags: ['Stock Movements', 'Product Stock'],
  },
  {
    name: 'Marketing',
    description:
      'Módulo de marketing e promoções. Gerencia campanhas promocionais, cupons e regras de desconto para vendas.',
    tags: ['Campaigns'],
  },
  {
    name: 'Finance',
    description:
      'Módulo financeiro e contábil. Gerencia plano de contas, lançamentos contábeis, conciliações com distribuidoras e demonstrações de resultados. Inclui gestão de fluxo de caixa, contas a receber/pagar e relatórios financeiros.',
    tags: [
      'Plano de Contas',
      'Lançamentos Contábeis',
      'Conciliações com Distribuidoras',
      'Demonstração de Resultados',
      'Fluxo de Caixa - Contas Bancárias',
      'Fluxo de Caixa - Lançamentos',
      'Fluxo de Caixa - Relatórios',
      'Fluxo de Caixa - Conciliação Bancária',
      'Contas a Receber',
      'Contas a Pagar',
      'Transações',
      'Relatórios Financeiros',
    ],
  },
  {
    name: 'Public',
    description:
      'Endpoints públicos para acesso sem autenticação. Permite listar empresas, complexos, filmes, sessões e produtos disponíveis. Essencial para o site público de compra de ingressos.',
    tags: ['Public'],
  },
  {
    name: 'Customer',
    description:
      'Endpoints para clientes finais. Inclui cadastro/provisioning, perfil do cliente, pontos de fidelidade e histórico de compras. O endpoint de login legado está desativado; autenticação deve ocorrer via OIDC/Authentik.',
    tags: ['Customer Auth', 'Customer'],
  },
];

export function getAllTags(): string[] {
  return TAG_GROUPS.flatMap((group) => group.tags);
}
