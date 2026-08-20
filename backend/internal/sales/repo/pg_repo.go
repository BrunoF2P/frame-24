package repo

import (
	"context"
	"errors"
	"fmt"

	"frame-24/internal/platform/db"
	"frame-24/internal/platform/money"
	"frame-24/internal/sales/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

func (r *PostgresRepository) CreateSale(
	ctx context.Context,
	tx pgx.Tx,
	sale *domain.Sale,
	items []domain.SaleItem,
	tickets []domain.Ticket,
	payments []domain.Payment,
) error {
	// 1. Inserir registro mestre da Venda
	querySale := `
		INSERT INTO sales.sales (
			id, tenant_id, complex_id, pos_terminal_id, operator_id, customer_id,
			status, subtotal_tickets, subtotal_concession, discount_amount, total_amount, notes, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`
	_, err := tx.Exec(ctx, querySale,
		sale.ID, sale.TenantID, sale.ComplexID, sale.POSTerminalID, sale.OperatorID, sale.CustomerID,
		sale.Status, int64(sale.SubtotalTickets), int64(sale.SubtotalConcession), int64(sale.DiscountAmount), int64(sale.TotalAmount),
		sale.Notes, sale.CreatedAt, sale.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("falha ao inserir venda: %w", err)
	}

	// 2. Inserir itens da bomboniere (se houver)
	if len(items) > 0 {
		queryItem := `
			INSERT INTO sales.sale_items (
				id, tenant_id, sale_id, item_type, product_id, combo_id, unit_id, quantity, unit_price, total_price, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		`
		batch := &pgx.Batch{}
		for _, item := range items {
			batch.Queue(queryItem,
				item.ID, item.TenantID, sale.ID, item.ItemType, item.ProductID, item.ComboID,
				item.UnitID, item.Quantity, int64(item.UnitPrice), int64(item.TotalPrice), item.CreatedAt,
			)
		}
		br := tx.SendBatch(ctx, batch)
		defer br.Close()
		for range items {
			if _, err := br.Exec(); err != nil {
				return fmt.Errorf("falha ao inserir item da venda: %w", err)
			}
		}
		_ = br.Close()
	}

	// 3. Inserir ingressos (se houver)
	if len(tickets) > 0 {
		queryTicket := `
			INSERT INTO sales.tickets (
				id, tenant_id, sale_id, showtime_id, seat_id, ticket_type, price, document_number, qr_code_hash, status, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		`
		batch := &pgx.Batch{}
		for _, ticket := range tickets {
			batch.Queue(queryTicket,
				ticket.ID, ticket.TenantID, sale.ID, ticket.ShowtimeID, ticket.SeatID,
				ticket.TicketType, int64(ticket.Price), ticket.DocumentNumber, ticket.QRCodeHash,
				ticket.Status, ticket.CreatedAt, ticket.UpdatedAt,
			)
		}
		br := tx.SendBatch(ctx, batch)
		defer br.Close()
		for range tickets {
			if _, err := br.Exec(); err != nil {
				var pgErr *pgconn.PgError
				if errors.As(err, &pgErr) && pgErr.Code == "23505" {
					return domain.ErrSeatAlreadySold
				}
				return fmt.Errorf("falha ao emitir ingresso: %w", err)
			}
		}
		_ = br.Close()
	}

	// 4. Inserir pagamentos
	if len(payments) > 0 {
		queryPayment := `
			INSERT INTO sales.payments (
				id, tenant_id, sale_id, payment_method, amount, status, external_reference, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`
		batch := &pgx.Batch{}
		for _, payment := range payments {
			batch.Queue(queryPayment,
				payment.ID, payment.TenantID, sale.ID, payment.PaymentMethod,
				int64(payment.Amount), payment.Status, payment.ExternalReference, payment.CreatedAt,
			)
		}
		br := tx.SendBatch(ctx, batch)
		defer br.Close()
		for range payments {
			if _, err := br.Exec(); err != nil {
				return fmt.Errorf("falha ao registrar pagamento: %w", err)
			}
		}
		_ = br.Close()
	}

	return nil
}

func (r *PostgresRepository) GetSaleByID(ctx context.Context, tenantID, saleID uuid.UUID) (*domain.Sale, error) {
	var s domain.Sale
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		querySale := `
			SELECT id, tenant_id, complex_id, pos_terminal_id, operator_id, customer_id,
			       status, subtotal_tickets, subtotal_concession, discount_amount, total_amount, notes, created_at, updated_at
			FROM sales.sales
			WHERE id = $1
		`
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, querySale, saleID)
		} else {
			exec = r.pool.QueryRow(ctx, querySale, saleID)
		}
		var subtotalTickets, subtotalConcession, discountAmount, totalAmount int64
		err := exec.Scan(
			&s.ID, &s.TenantID, &s.ComplexID, &s.POSTerminalID, &s.OperatorID, &s.CustomerID,
			&s.Status, &subtotalTickets, &subtotalConcession, &discountAmount, &totalAmount,
			&s.Notes, &s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return err
		}
		s.SubtotalTickets = money.Cents(subtotalTickets)
		s.SubtotalConcession = money.Cents(subtotalConcession)
		s.DiscountAmount = money.Cents(discountAmount)
		s.TotalAmount = money.Cents(totalAmount)

		// Carregar itens
		queryItems := `
			SELECT id, tenant_id, sale_id, item_type, product_id, combo_id, unit_id, quantity, unit_price, total_price, created_at
			FROM sales.sale_items
			WHERE sale_id = $1
		`
		var itemRows pgx.Rows
		if tx != nil {
			itemRows, err = tx.Query(ctx, queryItems, saleID)
		} else {
			itemRows, err = r.pool.Query(ctx, queryItems, saleID)
		}
		if err != nil {
			return err
		}
		defer itemRows.Close()
		for itemRows.Next() {
			var it domain.SaleItem
			var unitPrice, totalPrice int64
			if err := itemRows.Scan(&it.ID, &it.TenantID, &it.SaleID, &it.ItemType, &it.ProductID, &it.ComboID, &it.UnitID, &it.Quantity, &unitPrice, &totalPrice, &it.CreatedAt); err != nil {
				return err
			}
			it.UnitPrice = money.Cents(unitPrice)
			it.TotalPrice = money.Cents(totalPrice)
			s.Items = append(s.Items, it)
		}

		// Carregar tickets
		queryTickets := `
			SELECT id, tenant_id, sale_id, showtime_id, seat_id, ticket_type, price, document_number, qr_code_hash, status, used_at, created_at, updated_at
			FROM sales.tickets
			WHERE sale_id = $1
		`
		var ticketRows pgx.Rows
		if tx != nil {
			ticketRows, err = tx.Query(ctx, queryTickets, saleID)
		} else {
			ticketRows, err = r.pool.Query(ctx, queryTickets, saleID)
		}
		if err != nil {
			return err
		}
		defer ticketRows.Close()
		for ticketRows.Next() {
			var tk domain.Ticket
			var price int64
			if err := ticketRows.Scan(&tk.ID, &tk.TenantID, &tk.SaleID, &tk.ShowtimeID, &tk.SeatID, &tk.TicketType, &price, &tk.DocumentNumber, &tk.QRCodeHash, &tk.Status, &tk.UsedAt, &tk.CreatedAt, &tk.UpdatedAt); err != nil {
				return err
			}
			tk.Price = money.Cents(price)
			s.Tickets = append(s.Tickets, tk)
		}

		// Carregar pagamentos
		queryPayments := `
			SELECT id, tenant_id, sale_id, payment_method, amount, status, external_reference, created_at
			FROM sales.payments
			WHERE sale_id = $1
		`
		var paymentRows pgx.Rows
		if tx != nil {
			paymentRows, err = tx.Query(ctx, queryPayments, saleID)
		} else {
			paymentRows, err = r.pool.Query(ctx, queryPayments, saleID)
		}
		if err != nil {
			return err
		}
		defer paymentRows.Close()
		for paymentRows.Next() {
			var pm domain.Payment
			var amount int64
			if err := paymentRows.Scan(&pm.ID, &pm.TenantID, &pm.SaleID, &pm.PaymentMethod, &amount, &pm.Status, &pm.ExternalReference, &pm.CreatedAt); err != nil {
				return err
			}
			pm.Amount = money.Cents(amount)
			s.Payments = append(s.Payments, pm)
		}

		return nil
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrSaleNotFound
		}
		return nil, fmt.Errorf("falha ao buscar venda: %w", err)
	}

	return &s, nil
}

func (r *PostgresRepository) GetSoldSeatIDsForShowtime(ctx context.Context, tenantID, showtimeID uuid.UUID) ([]uuid.UUID, error) {
	query := `
		SELECT seat_id
		FROM sales.tickets
		WHERE showtime_id = $1 AND status = 'active'
	`
	var seatIDs []uuid.UUID
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if tx != nil {
			rows, err = tx.Query(ctx, query, showtimeID)
		} else {
			rows, err = r.pool.Query(ctx, query, showtimeID)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var id uuid.UUID
			if err := rows.Scan(&id); err != nil {
				return err
			}
			seatIDs = append(seatIDs, id)
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("falha ao consultar assentos vendidos: %w", err)
	}

	return seatIDs, nil
}

func (r *PostgresRepository) CountSoldTicketsByShowtime(ctx context.Context, tenantID, showtimeID uuid.UUID) (int, int, error) {
	query := `
		SELECT
			COUNT(*) AS total_sold,
			COUNT(*) FILTER (WHERE ticket_type IN ('meia_estudante', 'meia_idoso', 'meia_pcd', 'meia_jovem_baixa_renda')) AS half_price_sold
		FROM sales.tickets
		WHERE showtime_id = $1 AND status = 'active'
	`
	var totalSold, halfSold int
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, query, showtimeID)
		} else {
			exec = r.pool.QueryRow(ctx, query, showtimeID)
		}
		return exec.Scan(&totalSold, &halfSold)
	})

	if err != nil {
		return 0, 0, fmt.Errorf("falha ao apurar ingressos da sessao: %w", err)
	}

	return totalSold, halfSold, nil
}

func (r *PostgresRepository) LockShowtimeAndCountHalfTickets(ctx context.Context, tx pgx.Tx, tenantID, showtimeID uuid.UUID) (int, money.Cents, int, error) {
	// 1. Lock exclusivo FOR UPDATE na sessão para serializar compras concorrentes
	queryLock := `
		SELECT r.capacity, s.base_ticket_price
		FROM operations.showtimes s
		JOIN operations.rooms r ON r.id = s.room_id
		WHERE s.id = $1
		FOR UPDATE OF s
	`
	var capacity int
	var baseTicketPrice int64
	err := tx.QueryRow(ctx, queryLock, showtimeID).Scan(&capacity, &baseTicketPrice)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, 0, 0, fmt.Errorf("sessao nao encontrada para lock")
		}
		return 0, 0, 0, fmt.Errorf("falha ao adquirir lock exclusivo na sessao: %w", err)
	}

	// 2. Contar meias ativas dentro da transação bloqueada
	queryCountHalf := `
		SELECT COUNT(*)
		FROM sales.tickets
		WHERE showtime_id = $1 AND status = 'active'
		  AND ticket_type IN ('meia_estudante', 'meia_idoso', 'meia_pcd', 'meia_jovem_baixa_renda')
	`
	var currentHalfSold int
	err = tx.QueryRow(ctx, queryCountHalf, showtimeID).Scan(&currentHalfSold)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("falha ao apurar meias vendidas na transacao: %w", err)
	}

	return capacity, money.Cents(baseTicketPrice), currentHalfSold, nil
}

func (r *PostgresRepository) GetTicketByHash(ctx context.Context, tenantID uuid.UUID, qrCodeHash string) (*domain.Ticket, error) {
	query := `
		SELECT id, tenant_id, sale_id, showtime_id, seat_id, ticket_type, price, document_number, qr_code_hash, status, used_at, created_at, updated_at
		FROM sales.tickets
		WHERE qr_code_hash = $1
	`
	var tk domain.Ticket
	err := db.RunInTenantTx(ctx, r.pool, tenantID, func(tx pgx.Tx) error {
		var exec pgx.Row
		if tx != nil {
			exec = tx.QueryRow(ctx, query, qrCodeHash)
		} else {
			exec = r.pool.QueryRow(ctx, query, qrCodeHash)
		}
		var price int64
		if err := exec.Scan(&tk.ID, &tk.TenantID, &tk.SaleID, &tk.ShowtimeID, &tk.SeatID, &tk.TicketType, &price, &tk.DocumentNumber, &tk.QRCodeHash, &tk.Status, &tk.UsedAt, &tk.CreatedAt, &tk.UpdatedAt); err != nil {
			return err
		}
		tk.Price = money.Cents(price)
		return nil
	})

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrTicketNotFound
		}
		return nil, fmt.Errorf("falha ao buscar ingresso por hash: %w", err)
	}

	return &tk, nil
}
