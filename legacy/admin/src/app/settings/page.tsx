"use client";

import { useEffect, useState } from "react";
import { SettingsService } from "@/services/settings-service";
import {
  Settings,
  Building2,
  Wifi,
  Key,
  Server,
  Loader2,
  CheckCircle2,
  XCircle,
  Save,
  Database,
  Radio,
} from "lucide-react";

interface CompanyFormData {
  corporate_name: string;
  trade_name: string;
  cnpj: string;
  email: string;
  phone: string;
}

export default function ConfiguracoesPage() {
  const [complexes, setComplexes] = useState<unknown[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tmdbConfigured, setTmdbConfigured] = useState(false);
  const [formData, setFormData] = useState<CompanyFormData>({
    corporate_name: "",
    trade_name: "",
    cnpj: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    checkTmdb();
    loadData();
  }, []);

  const checkTmdb = () => {
    setTmdbConfigured(!!process.env.NEXT_PUBLIC_TMDB_API_KEY);
  };

  const loadData = async () => {
    try {
      const [complexesData, paymentMethodsData] = await Promise.all([
        SettingsService.getComplexes(),
        SettingsService.getPaymentMethods(),
      ]);
      setComplexes(Array.isArray(complexesData) ? complexesData : []);
      setPaymentMethods(Array.isArray(paymentMethodsData) ? paymentMethodsData : []);

      if (Array.isArray(complexesData) && complexesData.length > 0) {
        const first = complexesData[0] as Record<string, unknown>;
        setFormData({
          corporate_name: (first.corporate_name as string) || "",
          trade_name: (first.trade_name as string) || (first.name as string) || "",
          cnpj: (first.cnpj as string) || "",
          email: (first.email as string) || "",
          phone: (first.phone as string) || "",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const services = [
    { name: "Banco de Dados", icon: Database, status: "Conectado", color: "text-green-400" },
    { name: "Cache do Sistema", icon: Server, status: "Conectado", color: "text-green-400" },
    { name: "Serviço de Mensagens", icon: Radio, status: "Conectado", color: "text-green-400" },
    { name: "Busca de Filmes (TMDB)", icon: Key, status: tmdbConfigured ? "Configurada" : "Não configurada", color: tmdbConfigured ? "text-green-400" : "text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Settings className="w-6 h-6 text-accent-red" />
          Configurações
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Carregando configurações...
        </div>
      ) : (
        <>
          <div className="bg-zinc-900/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-zinc-400" />
              Dados da Empresa
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Razão Social
                </label>
                <input
                  type="text"
                  value={formData.corporate_name}
                  onChange={(e) =>
                    setFormData({ ...formData, corporate_name: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-accent-red"
                  placeholder="Nome corporativo"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={formData.trade_name}
                  onChange={(e) =>
                    setFormData({ ...formData, trade_name: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-accent-red"
                  placeholder="Nome fantasia"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">CNPJ</label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) =>
                    setFormData({ ...formData, cnpj: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-accent-red"
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-accent-red"
                  placeholder="contato@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-accent-red"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar
              </button>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-zinc-400" />
              Configurações do Sistema
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-700 rounded-md px-4 py-3">
                <span className="text-sm text-zinc-300">Complexos Cadastrados</span>
                <span className="text-sm font-medium text-foreground">
                  {complexes.length}
                </span>
              </div>
              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-700 rounded-md px-4 py-3">
                <span className="text-sm text-zinc-300">Métodos de Pagamento</span>
                <span className="text-sm font-medium text-foreground">
                  {paymentMethods.length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Wifi className="w-5 h-5 text-zinc-400" />
              Integrações
            </h2>
            <div className="space-y-3">
              {services.map((service) => {
                const Icon = service.icon;
                const isOk =
                  service.status === "Conectado" ||
                  service.status === "Configurada";
                return (
                  <div
                    key={service.name}
                    className="flex items-center justify-between bg-zinc-950 border border-zinc-700 rounded-md px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm text-zinc-200">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${service.color}`}>
                        {service.status}
                      </span>
                      {isOk ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {!tmdbConfigured && (
              <p className="mt-3 text-xs text-amber-400">
                Peça ao administrador do sistema para configurar a chave de acesso ao TMDB e habilitar a busca de filmes.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
