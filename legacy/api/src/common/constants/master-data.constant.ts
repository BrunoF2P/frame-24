export const MASTER_DATA = {
  identity: {
    custom_roles: [
      {
        name: 'Administrador',
        description: 'Acesso administrativo completo ao tenant.',
        hierarchy_level: 2,
        is_system_role: true,
      },
      {
        name: 'Gerente',
        description: 'Gerenciamento de operações e relatórios.',
        hierarchy_level: 3,
        is_system_role: true,
      },
      {
        name: 'Operador',
        description: 'Operações diárias (vendas, sessões).',
        hierarchy_level: 4,
        is_system_role: true,
      },
      {
        name: 'Visualizador',
        description: 'Apenas visualização de dados.',
        hierarchy_level: 5,
        is_system_role: true,
      },
    ],

    tax_regimes: [
      {
        name: 'Simples Nacional',
        description: 'Regime tributário simplificado',
      },
      {
        name: 'Lucro Presumido',
        description: 'Regime de apuração simplificada do IR e CSLL',
      },
      {
        name: 'Lucro Real',
        description: 'Regime de apuração com base no lucro líquido',
      },
    ],

    pis_cofins_regimes: [
      {
        name: 'Cumulativo',
        description: 'Regime cumulativo (alíquotas 0,65% PIS e 3% COFINS)',
        allows_credit: false,
      },
      {
        name: 'Não Cumulativo',
        description:
          'Regime não cumulativo (alíquotas 1,65% PIS e 7,6% COFINS)',
        allows_credit: true,
      },
    ],
  },

  hr: {
    employment_contract_types: [
      { name: 'CLT', description: 'Consolidação das Leis do Trabalho' },
      { name: 'PJ', description: 'Pessoa Jurídica' },
      { name: 'Temporário', description: 'Contrato Temporário' },
      { name: 'Estágio', description: 'Contrato de Estágio' },
      { name: 'Terceirizado', description: 'Funcionário Terceirizado' },
    ],
  },

  operations: {
    projection_types: [
      { name: '2D', description: 'Projeção 2D padrão', additional_value: 0 },
      { name: '3D', description: 'Projeção 3D', additional_value: 8 },
      { name: 'IMAX', description: 'Projeção IMAX', additional_value: 15 },
      { name: '4DX', description: 'Experiência 4DX', additional_value: 20 },
    ],

    audio_types: [
      {
        name: 'Estéreo',
        description: 'Som estéreo padrão',
        additional_value: 0,
      },
      {
        name: 'Dolby Digital',
        description: 'Som Dolby Digital',
        additional_value: 3,
      },
      {
        name: 'Dolby Atmos',
        description: 'Som Dolby Atmos',
        additional_value: 5,
      },
    ],

    session_languages: [
      {
        name: 'Dublado',
        description: 'Filme dublado em português',
        abbreviation: 'DUB',
      },
      {
        name: 'Legendado',
        description: 'Filme com legendas em português',
        abbreviation: 'LEG',
      },
      {
        name: 'Original',
        description: 'Idioma original sem legendas',
        abbreviation: 'ORIG',
      },
    ],

    session_status: [
      {
        name: 'Programada',
        description: 'Sessão programada',
        allows_modification: true,
      },
      {
        name: 'Aberta para Vendas',
        description: 'Vendas abertas',
        allows_modification: true,
      },
      {
        name: 'Em Exibição',
        description: 'Filme em exibição',
        allows_modification: false,
      },
      {
        name: 'Finalizada',
        description: 'Sessão finalizada',
        allows_modification: false,
      },
      {
        name: 'Cancelada',
        description: 'Sessão cancelada',
        allows_modification: false,
      },
    ],

    seat_status: [
      {
        name: 'Disponível',
        description: 'Assento disponível',
        allows_modification: true,
        is_default: true,
      },
      {
        name: 'Reservado',
        description: 'Assento reservado temporariamente',
        allows_modification: true,
        is_default: false,
      },
      {
        name: 'Vendido',
        description: 'Assento vendido',
        allows_modification: false,
        is_default: false,
      },
      {
        name: 'Bloqueado',
        description: 'Assento bloqueado',
        allows_modification: false,
        is_default: false,
      },
    ],

    seat_types: [
      { name: 'Standard', description: 'Assento padrão', additional_value: 0 },
      { name: 'VIP', description: 'Assento VIP', additional_value: 10 },
      { name: 'Sofá', description: 'Sofá para casal', additional_value: 15 },
    ],
  },

  contracts: {
    contract_types: [
      {
        name: 'Percentual Fixo',
        description: 'Percentuais constantes durante toda a vigência.',
      },
      {
        name: 'Escala Móvel',
        description: 'Percentuais variáveis por semana (sliding scale).',
      },
      {
        name: 'Mínimo Garantido',
        description: 'Inclui valor mínimo garantido ao distribuidor.',
      },
    ],
  },

  finance: {
    account_types: [
      { name: 'Ativo', description: 'Contas de ativo' },
      { name: 'Passivo', description: 'Contas de passivo' },
      { name: 'Receita', description: 'Contas de receita' },
      { name: 'Despesa', description: 'Contas de despesa' },
      { name: 'Patrimônio Líquido', description: 'Contas de patrimônio' },
    ],

    account_natures: [
      { name: 'Devedora', description: 'Natureza devedora' },
      { name: 'Credora', description: 'Natureza credora' },
    ],

    settlement_bases: [
      {
        name: 'Bilheteria Bruta',
        description: 'Receita bruta total da bilheteria.',
      },
      {
        name: 'Bilheteria Líquida',
        description: 'Receita após taxas e impostos.',
      },
      {
        name: 'Receita Líquida',
        description: 'Receita líquida sujeita a repartição.',
      },
    ],

    distributor_settlement_status: [
      {
        name: 'Em Cálculo',
        description: 'Settlement em preparação.',
        allows_modification: true,
      },
      {
        name: 'Aprovado',
        description: 'Aguardando pagamento.',
        allows_modification: false,
      },
      {
        name: 'Pago',
        description: 'Settlement liquidado.',
        allows_modification: false,
      },
    ],

    journal_entry_status: [
      {
        name: 'Rascunho',
        description: 'Lançamento ainda editável.',
        allows_modification: true,
      },
      {
        name: 'Postado',
        description: 'Lançamento contabilizado.',
        allows_modification: false,
      },
    ],

    journal_entry_types: [
      {
        name: 'Receita de Bilheteria',
        description: 'Entradas de vendas de ingressos.',
        nature: 'Receita',
      },
      {
        name: 'Pagamento a Distribuidor',
        description: 'Saída referente a settlements.',
        nature: 'Despesa',
      },
      {
        name: 'Ajuste Contábil',
        description: 'Correções e provisões contábeis.',
        nature: 'Ajuste',
      },
    ],
  },

  catalog: {
    age_ratings: [
      {
        code: 'L',
        name: 'Livre',
        minimum_age: 0,
        description: 'Livre para todos os públicos',
      },
      {
        code: '10',
        name: '10 anos',
        minimum_age: 10,
        description: 'Não recomendado para menores de 10 anos',
      },
      {
        code: '12',
        name: '12 anos',
        minimum_age: 12,
        description: 'Não recomendado para menores de 12 anos',
      },
      {
        code: '14',
        name: '14 anos',
        minimum_age: 14,
        description: 'Não recomendado para menores de 14 anos',
      },
      {
        code: '16',
        name: '16 anos',
        minimum_age: 16,
        description: 'Não recomendado para menores de 16 anos',
      },
      {
        code: '18',
        name: '18 anos',
        minimum_age: 18,
        description: 'Não recomendado para menores de 18 anos',
      },
    ],

    movie_categories: [
      { name: 'Ação', description: 'Filmes de ação', slug: 'acao' },
      { name: 'Comédia', description: 'Filmes de comédia', slug: 'comedia' },
      { name: 'Drama', description: 'Filmes dramáticos', slug: 'drama' },
      { name: 'Terror', description: 'Filmes de terror', slug: 'terror' },
      {
        name: 'Ficção Científica',
        description: 'Filmes de ficção científica',
        slug: 'ficcao-cientifica',
      },
      { name: 'Animação', description: 'Filmes de animação', slug: 'animacao' },
    ],

    cast_types: [
      { name: 'Ator/Atriz', description: 'Elenco principal' },
      { name: 'Diretor', description: 'Direção do filme' },
      { name: 'Roteirista', description: 'Roteiro do filme' },
      { name: 'Produtor', description: 'Produção do filme' },
    ],

    media_types: [
      { name: 'Poster', description: 'Cartaz do filme' },
      { name: 'Banner', description: 'Banner promocional' },
      { name: 'Trailer', description: 'Trailer do filme' },
      { name: 'Foto de Cena', description: 'Fotos de cenas do filme' },
    ],
  },

  sales: {
    payment_methods: [
      {
        name: 'Dinheiro',
        description: 'Pagamento em espécie',
        operator_fee: 0,
        settlement_days: 0,
      },
      {
        name: 'Cartão de Crédito',
        description: 'Pagamento com cartão de crédito',
        operator_fee: 2.5,
        settlement_days: 30,
      },
      {
        name: 'Cartão de Débito',
        description: 'Pagamento com cartão de débito',
        operator_fee: 1.5,
        settlement_days: 1,
      },
      {
        name: 'PIX',
        description: 'Pagamento via PIX',
        operator_fee: 0.5,
        settlement_days: 0,
      },
    ],

    sale_types: [
      {
        name: 'Balcão',
        description: 'Venda presencial no cinema',
        convenience_fee: 0,
      },
      {
        name: 'Online',
        description: 'Venda pelo site/app',
        convenience_fee: 3.5,
      },
      {
        name: 'Totem',
        description: 'Venda em totem de autoatendimento',
        convenience_fee: 1.5,
      },
    ],

    sale_status: [
      {
        name: 'Pendente',
        description: 'Venda iniciada mas não finalizada',
        allows_modification: true,
      },
      {
        name: 'Confirmada',
        description: 'Venda confirmada e paga',
        allows_modification: false,
      },
      {
        name: 'Cancelada',
        description: 'Venda cancelada',
        allows_modification: false,
      },
      {
        name: 'Reembolsada',
        description: 'Venda reembolsada',
        allows_modification: false,
      },
    ],

    ticket_types: [
      {
        name: 'Inteira',
        description: 'Ingresso sem desconto',
        discount_percentage: 0,
      },
      {
        name: 'Meia-entrada',
        description: 'Ingresso com 50% de desconto',
        discount_percentage: 50,
      },
      {
        name: 'Cortesia',
        description: 'Ingresso gratuito',
        discount_percentage: 100,
      },
    ],
  },

  inventory: {
    supplier_types: [
      {
        name: 'Distribuidora de Filmes',
        description: 'Fornecedor de conteúdo cinematográfico',
      },
      {
        name: 'Fornecedor de Alimentos',
        description: 'Pipoca, doces, refrigerantes',
      },
      {
        name: 'Fornecedor de Equipamentos',
        description: 'Projetores, sistemas de som',
      },
      { name: 'Serviços Gerais', description: 'Limpeza, manutenção' },
    ],
  },

  marketing: {
    promotion_types: [
      {
        code: 'PERCENTUAL',
        name: 'Desconto Percentual',
        description: 'Aplica um percentual sobre o subtotal da venda.',
      },
      {
        code: 'VALOR_FIXO',
        name: 'Desconto em Valor Fixo',
        description: 'Abate um valor fixo do subtotal até zerar o pedido.',
      },
      {
        code: 'PRECO_FIXO',
        name: 'Preço Fixo',
        description:
          'Define um preço final específico independentemente do subtotal.',
      },
      {
        code: 'COMBO',
        name: 'Combo Ingresso + Concessão',
        description:
          'Aplica desconto quando há combinação de ingressos e itens de concessão.',
      },
      {
        code: 'CASHBACK',
        name: 'Cashback em Pontos',
        description: 'Concede pontos extras ou crédito para compras futuras.',
      },
    ],
  },

  pos: {
    session_status: [
      {
        name: 'Aberta',
        description: 'Caixa aberto para vendas',
        allows_modification: true,
      },
      {
        name: 'Suspensa',
        description: 'Caixa temporariamente suspenso',
        allows_modification: true,
      },
      {
        name: 'Fechada',
        description: 'Caixa fechado e conferido',
        allows_modification: false,
      },
    ],

    payment_methods: [
      {
        name: 'Dinheiro',
        description: 'Pagamento em espécie',
        requires_change: true,
        auto_settle: true,
        settlement_days: 0,
        active: true,
      },
      {
        name: 'Cartão de Crédito',
        description: 'Pagamento com cartão de crédito',
        requires_change: false,
        auto_settle: true,
        settlement_days: 30,
        active: true,
      },
      {
        name: 'Cartão de Débito',
        description: 'Pagamento com cartão de débito',
        requires_change: false,
        auto_settle: true,
        settlement_days: 1,
        active: true,
      },
      {
        name: 'PIX',
        description: 'Pagamento via PIX',
        requires_change: false,
        auto_settle: true,
        settlement_days: 0,
        active: true,
      },
      {
        name: 'Vale-Alimentação',
        description: 'Vale-alimentação ou refeição',
        requires_change: false,
        auto_settle: false,
        settlement_days: 1,
        active: true,
      },
    ],
  },

  tax: {
    revenue_types: [
      {
        name: 'Bilheteria',
        description: 'Receita de venda de ingressos',
        applies_iss: true,
        applies_pis_cofins: true,
      },
      {
        name: 'Bomboniere',
        description: 'Receita de venda de produtos',
        applies_iss: false,
        applies_pis_cofins: true,
      },
      {
        name: 'Publicidade',
        description: 'Receita de publicidade',
        applies_iss: true,
        applies_pis_cofins: true,
      },
      {
        name: 'Aluguel de Sala',
        description: 'Receita de aluguel',
        applies_iss: true,
        applies_pis_cofins: true,
      },
    ],
  },
} as const;
