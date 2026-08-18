"use client";

import { useEffect, useState } from "react";
import {
  StockService,
  ProductStock,
  StockMovement,
  Product,
} from "@/services/stock-service";
import {
  Package,
  AlertTriangle,
  Truck,
  ArrowUpDown,
  Loader2,
  TrendingDown,
  BarChart3,
} from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const movementTypeLabels: Record<string, string> = {
  in: "Entrada",
  out: "Saída",
  adjustment: "Ajuste",
  transfer: "Transferência",
  return: "Devolução",
  loss: "Perda",
};

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<ProductStock[]>([]);
  const [lowStock, setLowStock] = useState<ProductStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, stockData, lowStockData, movementsData, suppliersData] =
        await Promise.all([
          StockService.getProducts(),
          StockService.getProductStock(),
          StockService.getLowStockProducts(),
          StockService.getStockMovements({}),
          StockService.getSuppliers(),
        ]);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setStock(Array.isArray(stockData) ? stockData : []);
      setLowStock(Array.isArray(lowStockData) ? lowStockData : []);
      setMovements(Array.isArray(movementsData) ? movementsData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalItemsInStock = stock.reduce((acc, s) => acc + s.current_quantity, 0);
  const activeSuppliers = suppliers.filter(
    (s) => (s as Record<string, unknown>).active === true,
  ).length;

  const productsWithStock = products.map((p) => {
    const stockInfo = stock.find((s) => s.product_id === p.id);
    return { ...p, stockInfo };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Package className="w-6 h-6 text-accent-red" />
          Estoque
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando dados de estoque...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                <Package className="w-4 h-4" />
                Total de Produtos
              </div>
              <p className="text-xl font-bold text-foreground">{products.length}</p>
            </div>
            <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                <BarChart3 className="w-4 h-4" />
                Itens em Estoque
              </div>
              <p className="text-xl font-bold text-foreground">{totalItemsInStock}</p>
            </div>
            <div className="bg-zinc-900/50 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-1">
                <Truck className="w-4 h-4" />
                Fornecedores Ativos
              </div>
              <p className="text-xl font-bold text-foreground">{activeSuppliers}</p>
            </div>
          </div>

          {lowStock.length > 0 && (
            <div className="bg-zinc-900/50 border border-amber-900/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-3">
                <AlertTriangle className="w-4 h-4" />
                Alertas de Estoque Baixo ({lowStock.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStock.slice(0, 6).map((item) => {
                  const product = products.find((p) => p.id === item.product_id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 bg-zinc-950 border border-amber-900/30 rounded-md px-3 py-2"
                    >
                      <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-200 truncate">
                          {product?.name ?? item.product_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-amber-400">
                          {item.current_quantity} / {item.minimum_quantity} mín.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-zinc-900/50 border border-border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                Produtos em Estoque
              </h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Produto</th>
                  <th className="px-6 py-3 font-medium">Código</th>
                  <th className="px-6 py-3 font-medium text-right">Qtd. Atual</th>
                  <th className="px-6 py-3 font-medium text-right">Estoque Mín.</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productsWithStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : (
                  productsWithStock.map((p) => {
                    const isLow = p.stockInfo?.is_low_stock;
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-zinc-200 flex items-center gap-2">
                          <Package className="w-4 h-4 text-zinc-500 shrink-0" />
                          {p.name}
                        </td>
                        <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                          {p.product_code}
                        </td>
                        <td className="px-6 py-4 text-right text-zinc-300">
                          {p.stockInfo?.current_quantity ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-right text-zinc-400">
                          {p.stockInfo?.minimum_quantity ?? p.minimum_stock ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-amber-500/10 border-amber-500/20 text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              Baixo
                            </span>
                          ) : p.stockInfo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-green-500/10 border-green-500/20 text-green-500">
                              Normal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border bg-zinc-800 border-zinc-700 text-zinc-500">
                              Sem dados
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-zinc-900/50 border border-border rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-zinc-400" />
                Movimentações Recentes
              </h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium text-right">Quantidade</th>
                  <th className="px-6 py-3 font-medium text-right">Anterior</th>
                  <th className="px-6 py-3 font-medium text-right">Atual</th>
                  <th className="px-6 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      Nenhuma movimentação registrada
                    </td>
                  </tr>
                ) : (
                  movements.slice(0, 15).map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                            m.movement_type === "in"
                              ? "bg-green-500/10 border-green-500/20 text-green-500"
                              : m.movement_type === "out"
                                ? "bg-red-500/10 border-red-500/20 text-red-500"
                                : "bg-zinc-800 border-zinc-700 text-zinc-400"
                          }`}
                        >
                          {movementTypeLabels[m.movement_type] ?? m.movement_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300">
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-400">
                        {m.previous_quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300">
                        {m.current_quantity}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 text-xs">
                        {formatDate(m.movement_date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-zinc-900/50 border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold mb-3">
              <Truck className="w-4 h-4" />
              Entregas Recentes de Fornecedores
            </div>
            <p className="text-zinc-500 text-sm">
              Nenhuma entrega registrada. As entregas aparecerão aqui quando forem registradas movimentações de entrada via fornecedor.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
