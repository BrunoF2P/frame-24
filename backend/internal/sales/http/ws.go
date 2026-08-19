package http

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		if origin == "" {
			return true
		}
		// Permite localhost em desenvolvimento e conexões de origens conhecidas
		return strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1")
	},
}

// SeatMapEvent representa o payload de atualização de assentos
type SeatMapEvent struct {
	Event      string      `json:"event"` // SEATS_LOCKED | SEATS_RELEASED | SEATS_SOLD
	ShowtimeID uuid.UUID   `json:"showtimeId"`
	SeatIDs    []uuid.UUID `json:"seatIds"`
	ExpiresAt  *time.Time  `json:"expiresAt,omitempty"`
}

type Client struct {
	hub     *SeatMapHub
	conn    *websocket.Conn
	roomKey string
	send    chan []byte
}

type SeatMapHub struct {
	rooms      map[string]map[*Client]bool
	broadcast  chan broadcastMessage
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

type broadcastMessage struct {
	roomKey string
	payload []byte
}

func NewSeatMapHub() *SeatMapHub {
	return &SeatMapHub{
		rooms:      make(map[string]map[*Client]bool),
		broadcast:  make(chan broadcastMessage, 512),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *SeatMapHub) Run(ctxDone <-chan struct{}) {
	for {
		select {
		case <-ctxDone:
			return
		case client := <-h.register:
			h.mu.Lock()
			if h.rooms[client.roomKey] == nil {
				h.rooms[client.roomKey] = make(map[*Client]bool)
			}
			h.rooms[client.roomKey][client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.rooms[client.roomKey]; ok {
				if _, exists := clients[client]; exists {
					delete(clients, client)
					close(client.send)
					if len(clients) == 0 {
						delete(h.rooms, client.roomKey)
					}
				}
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.RLock()
			clients := h.rooms[message.roomKey]
			for client := range clients {
				select {
				case client.send <- message.payload:
				default:
					close(client.send)
					delete(clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *SeatMapHub) BroadcastSeatEvent(tenantID, showtimeID uuid.UUID, eventType string, seatIDs []uuid.UUID, ownerID *string, expiresAt *time.Time) {
	roomKey := tenantID.String() + ":" + showtimeID.String()
	event := SeatMapEvent{
		Event:      eventType,
		ShowtimeID: showtimeID,
		SeatIDs:    seatIDs,
		ExpiresAt:  expiresAt,
	}
	data, err := json.Marshal(event)
	if err != nil {
		slog.Error("falha ao serializar evento websocket de assento", "error", err)
		return
	}

	// Envio não bloqueante para evitar gargalo sob alto tráfego
	select {
	case h.broadcast <- broadcastMessage{roomKey: roomKey, payload: data}:
	default:
		slog.Warn("SeatMapHub broadcast buffer cheio, descartando mensagem de assento", "roomKey", roomKey)
	}
}

func (h *SeatMapHub) ServeWS(w http.ResponseWriter, r *http.Request, tenantID, showtimeID uuid.UUID) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("falha no upgrade de websocket", "error", err)
		return
	}

	roomKey := tenantID.String() + ":" + showtimeID.String()
	client := &Client{
		hub:     h,
		conn:    conn,
		roomKey: roomKey,
		send:    make(chan []byte, 64),
	}

	h.register <- client

	// Leitura (mantém a conexão viva / trata fechamento)
	go func() {
		defer func() {
			h.unregister <- client
			_ = conn.Close()
		}()
		conn.SetReadLimit(512)
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.SetPongHandler(func(string) error {
			_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()

	// Escrita de mensagens
	go func() {
		ticker := time.NewTicker(25 * time.Second)
		defer func() {
			ticker.Stop()
			_ = conn.Close()
		}()
		for {
			select {
			case msg, ok := <-client.send:
				_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if !ok {
					_ = conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
					return
				}
			case <-ticker.C:
				_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()
}
