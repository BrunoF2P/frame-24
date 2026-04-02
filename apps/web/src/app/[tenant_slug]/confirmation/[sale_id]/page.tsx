"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  ShoppingBag,
  Home,
} from "lucide-react";

type TicketItem = {
  id: string;
  seat?: string;
  ticket_number?: string;
  ticket_types?: {
    name?: string;
  };
};

type ProductItem = {
  id: string;
  name: string;
};

type SaleData = {
  sale_number?: string;
  net_amount?: number | string;
  showtime_details?: {
    start_time: string;
    cinema_complexes?: { name?: string };
    rooms?: { name?: string };
  };
  movie_details?: {
    title?: string;
    poster_url?: string;
  };
  products_details?: ProductItem[];
  tickets?: TicketItem[];
  concession_sales?: Array<{
    concession_sale_items: Array<{
      id: string;
      item_type?: string;
      item_id?: string;
      quantity?: number;
    }>;
  }>;
};

export default function ConfirmationPage({
  params,
}: {
  params: Promise<{ tenant_slug: string; sale_id: string }>;
}) {
  const { tenant_slug, sale_id } = use(params);
  const router = useRouter();
  const [sale, setSale] = useState<SaleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const response = await api.get(`/public/sales/${sale_id}`);
        setSale(response.data);
      } catch {
        setSale(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [sale_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Venda não encontrada</h1>
        <button
          onClick={() => router.push(`/${tenant_slug}`)}
          className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const showtime = sale.showtime_details;
  const movie = sale.movie_details;
  const products = sale.products_details || [];
  const tickets = sale.tickets || [];
  const concessionSales = sale.concession_sales || [];

  // Agrupar produtos
  const productItems: Array<{ id: string; quantity?: number; name: string }> = [];
  concessionSales.forEach((cs) => {
    cs.concession_sale_items.forEach((item) => {
      if (item.item_type === "PRODUCT") {
        const product = products.find((p) => p.id === item.item_id);
        if (product) {
          productItems.push({
            ...item,
            name: product.name,
          });
        }
      }
    });
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <div className="max-w-2xl mx-auto p-6">
        {/* Success Header */}
        <div className="text-center mb-12 mt-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Compra realizada com sucesso!
          </h1>
          <p className="text-zinc-400">Seu pedido foi confirmado.</p>
          <p className="text-sm text-zinc-500 mt-2">
            Pedido #{sale.sale_number}
          </p>
        </div>

        {/* Movie Card */}
        {movie && showtime && (
          <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 mb-6">
            <div className="flex">
              <div className="w-32 h-48 bg-zinc-800 relative">
                {movie.poster_url ? (
                  <Image
                    src={movie.poster_url}
                    alt={movie.title || "Poster"}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    Sem imagem
                  </div>
                )}
              </div>
              <div className="flex-1 p-6">
                <h2 className="text-xl font-bold mb-4">{movie.title}</h2>
                <div className="space-y-2 text-sm text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span>
                      {format(new Date(showtime.start_time), "dd 'de' MMMM", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span>
                      {format(new Date(showtime.start_time), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-500" />
                    <span>
                      {showtime.cinema_complexes?.name} - {showtime.rooms?.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tickets */}
        {tickets.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold">Ingressos</h3>
            </div>
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50"
                >
                  <div className="flex items-center gap-4">
                    {/* QR Code */}
                    <div className="bg-white p-1 rounded">
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${ticket.ticket_number}`}
                        alt="QR Code"
                        width={64}
                        height={64}
                        className="w-16 h-16"
                      />
                    </div>
                    <div>
                      <div className="font-medium">Assento {ticket.seat}</div>
                      <div className="text-xs text-zinc-500">
                        {ticket.ticket_types?.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-zinc-400">
                      {ticket.ticket_number}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {productItems.length > 0 && (
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Produtos</h3>
            </div>
            <div className="space-y-3">
              {productItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-xs font-bold">
                      {item.quantity}x
                    </div>
                    <span>{item.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total Pago</span>
            <span className="text-green-500">
              R$ {Number(sale.net_amount).toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push(`/${tenant_slug}`)}
            className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-8 py-3 rounded-full font-semibold transition-colors"
          >
            <Home className="w-4 h-4" />
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
}
