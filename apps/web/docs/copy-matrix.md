# Frame24 — Matriz de Copy (Fluxo Crítico + Perfil)

| Chave | Texto anterior | Novo texto | Contexto | Limite | Status |
|---|---|---|---|---|---|
| `authTitle` | Seus ingressos em uma conta. | Entre para ver seus ingressos e pedidos | Modal de acesso | <= 60 | Aplicado |
| `authDescription` | Login rapido para acompanhar compras... | Acesse sua conta para acompanhar compras em qualquer dispositivo. | Modal de acesso | <= 110 | Aplicado |
| `authBenefitOrders` | Acesso ao historico de pedidos | Acompanhe seu histórico de pedidos | Modal de acesso | <= 38 | Aplicado |
| `authBenefitFastRecovery` | Recuperacao de compra em segundos | Recupere uma compra em segundos | Modal de acesso | <= 38 | Aplicado |
| `authBenefitFastCheckout` | Pagamento e confirmacao no mesmo fluxo | Finalize a compra no mesmo fluxo | Modal de acesso | <= 38 | Aplicado |
| `checkoutSectionTitle` | Menos campos. Mais confiança. | Revise seus dados e finalize o pagamento | Página de checkout | <= 38 | Aplicado |
| `checkoutSectionDescription` | Resumo persistente... | Confirme assentos, dados e pagamento em uma única tela. | Página de checkout | <= 110 | Aplicado |
| `checkoutSnacksTitle` | Adicione sem abrir outra etapa | Retirada de snacks no balcão | Bloco de snacks | <= 38 | Aplicado |
| `checkoutSummaryEyebrow` | Resumo persistente | Resumo do pedido | Sidebar de checkout | <= 28 | Aplicado |
| `checkoutPaymentPix` | PIX instantâneo | Pix | Métodos de pagamento | <= 28 | Aplicado |
| `checkoutPaymentWallet` | Apple / Google Wallet | Apple Pay / Google Pay | Métodos de pagamento | <= 28 | Aplicado |
| `homeBlockbusterTitle` | Veja blockbusters em alta | Filmes em destaque hoje | Home | <= 38 | Aplicado |
| `homeQuickTitle` | Acesse por intenção | Vá direto ao que importa | Home | <= 38 | Aplicado |
| `homeQuickDescription` | Vá direto para sessões... | Acesse sessões de hoje, em cartaz, pré-estreias e cinemas. | Home | <= 110 | Aplicado |
| `homeTrustRefundDescription` | Política clara para remarcação... | Veja as regras de cancelamento e remarcação antes de pagar. | Home | <= 110 | Aplicado |
| `homeTrustDigitalDescription` | QR Code no celular... | Use o QR Code direto no celular para entrar na sessão. | Home | <= 110 | Aplicado |
| `homeCinemasDescription` | ...a vitrine pública começa... | Compare opções da sua cidade e decida mais rápido. | Home | <= 110 | Aplicado |
| `heroSupportingText` | ...compre sem fricção. | Compare cinemas e formatos em um só lugar e compre sem complicação. | Hero | <= 110 | Aplicado |
| `movieDetailSessionsTitle` | Escolha horário... antes de decidir o assento | Escolha horário, cinema e formato | Página de filme | <= 38 | Aplicado |
| `movieDetailSessionsDescription` | Cards por cinema... | Compare horários por cinema e vá direto para o assento. | Página de filme | <= 110 | Aplicado |
| `movieCardPrimaryCta` | Ver horários | Ver horários | Cards de filme | 2-4 palavras | Aplicado |
| `movieCardNextSessionPrefix` | Próxima sessão: | Próxima sessão: | Cards de filme | <= 28 | Aplicado |
| `footerDescription` | Hub premium de cinema por cidade... | Compre ingressos, compare horários e acesse seu histórico em um só lugar. | Rodapé e metadata | <= 110 | Aplicado |
| `profileOverviewDescription` | Gerencie conta... em um só lugar. | Acompanhe pedidos, ingressos, segurança e privacidade da sua conta. | Perfil overview | <= 110 | Aplicado |
| `profileOrdersDescription` | Veja cada pedido, itens e status... | Veja itens do pedido, status e solicitações de reembolso. | Perfil pedidos | <= 110 | Aplicado |
| `profileTicketDescription` | Acesse QR, PDF e reenvio... | Acesse QR Code, PDF e reenvio por e-mail. | Perfil ingressos | <= 110 | Aplicado |
| `profilePrivacyDescription` | Exporte dados e solicite exclusão da conta. | Exporte seus dados e solicite exclusão da conta. | Perfil privacidade | <= 110 | Aplicado |
| `stateErrorTitle` | Essa sessão saiu do eixo. | Algo deu errado | Estado global de erro | <= 38 | Aplicado |
| `stateErrorDescription` | O Frame24 protegeu sua navegação... | Não foi possível carregar esta página agora. Tente novamente. | Estado global de erro | <= 110 | Aplicado |

## Observações
- Padrão adotado: verbo + objeto nos CTAs (`Ver horários`, `Confirmar compra`, `Solicitar reembolso`).
- Glossário aplicado: priorizar `ingresso`, evitar `ticket` no texto de UI.
- Quando faltar dado operacional, ocultar texto ao invés de exibir frase genérica.
