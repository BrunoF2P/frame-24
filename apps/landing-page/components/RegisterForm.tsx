"use client";

import { useFormStatus } from "react-dom";
import { registerCompany } from "@/app/actions/register";
import Input from "@/components/Input";
import { ChangeEvent, useActionState, useState } from "react";
import axios from "axios";

const DEFAULT_POST_LOGIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3004";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full px-6 py-3 rounded-lg font-bold transition-all ${
        pending
          ? "bg-red-800 opacity-70 cursor-not-allowed"
          : "bg-red-700 hover:bg-red-600 text-white"
      }`}
    >
      {pending ? "Cadastrando..." : "Criar Conta"}
    </button>
  );
}

export default function RegisterForm() {
  const [state, formAction] = useActionState(registerCompany, {
    success: false,
    message: "",
  });

  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);

  const [formData, setFormData] = useState({
    cnpj: "",
    corporate_name: "",
    trade_name: "",
    company_zip_code: "",
    company_state: "",
    company_city: "",
    company_neighborhood: "",
    company_street_address: "",
    company_address_number: "",
    company_address_complement: "",
    company_phone: "",
    company_email: "",
    full_name: "",
    email: "",
    mobile: "",
    password: "",
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCNPJChange = async (event: ChangeEvent<HTMLInputElement>) => {
    handleInputChange(event);

    const cnpj = event.target.value.replace(/\D/g, "");

    if (cnpj.length === 14) {
      setLoadingCNPJ(true);
      try {
        const response = await axios.get(
          `https://publica.cnpj.ws/cnpj/${cnpj}`,
        );

        if (response.data.status === "ERROR") {
          alert("CNPJ não encontrado!");
        } else {
          setFormData((prev) => ({
            ...prev,
            corporate_name: response.data.razao_social || "",
            trade_name: response.data.estabelecimento.nome_fantasia || "",
            company_email: response.data.estabelecimento.email || "",
            company_phone:
              response.data.estabelecimento.telefone ||
              response.data.estabelecimento.telefone1 ||
              "",
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CNPJ:", error);
        alert("Erro ao buscar dados do CNPJ");
      } finally {
        setLoadingCNPJ(false);
      }
    }
  };

  const handleCEPChange = async (event: ChangeEvent<HTMLInputElement>) => {
    handleInputChange(event);

    const cep = event.target.value.replace(/\D/g, "");

    if (cep.length === 8) {
      setLoadingCEP(true);
      try {
        const response = await axios.get(
          `https://viacep.com.br/ws/${cep}/json/`,
        );

        if (response.data.erro) {
          alert("CEP não encontrado!");
        } else {
          setFormData((prev) => ({
            ...prev,
            company_street_address: response.data.logouro || "",
            company_neighborhood: response.data.bairro || "",
            company_city: response.data.localidade || "",
            company_state: response.data.uf || "",
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        alert("Erro ao buscar endereço");
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const getError = (field: string): string[] | undefined => {
    if (!state.errors) return undefined;
    const error = state.errors[field];
    if (Array.isArray(error)) return error;
    return undefined;
  };

  if (state.success) {
    return (
      <div className="w-full max-w-3xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-8">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-gray-300 text-lg mb-2 font-semibold">
            Cadastro realizado!
          </p>
          <p className="text-gray-400 mb-6">
            Sua conta foi criada com sucesso! Você já pode fazer login.
          </p>
          <a
            href={`/auth/login?callbackUrl=${encodeURIComponent(DEFAULT_POST_LOGIN_URL)}`}
            className="inline-block px-6 py-3 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold transition"
          >
            Fazer Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-8">
      <h1 className="text-2xl font-bold text-white mb-6 text-center">
        Cadastre sua Empresa
      </h1>

      <form action={formAction} className="space-y-6">
        <div className="grid lg:grid-cols-2 lg:gap-8">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-200">
              🏢 Dados da Empresa
            </h2>

            <div className="relative">
              <Input
                label="CNPJ *"
                name="cnpj"
                value={formData.cnpj}
                maxLength={18}
                placeholder="00.000.000/0000-00"
                required
                error={getError("cnpj")}
                onChange={handleCNPJChange}
              />
              {loadingCNPJ && (
                <div className="absolute right-3 top-9 text-gray-400 text-sm">
                  Buscando...
                </div>
              )}
            </div>

            <Input
              label="Razão Social *"
              name="corporate_name"
              value={formData.corporate_name}
              required
              error={getError("corporate_name")}
              onChange={handleInputChange}
            />
            <Input
              label="Nome Fantasia"
              name="trade_name"
              value={formData.trade_name}
              error={getError("trade_name")}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-4 border-t border-gray-700 pt-6 lg:border-t-0 lg:pt-0">
            <h2 className="text-lg font-semibold text-gray-200">
              👤 Administrador
            </h2>
            <Input
              label="Nome Completo *"
              name="full_name"
              value={formData.full_name}
              required
              error={getError("full_name")}
              onChange={handleInputChange}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email *"
                name="email"
                value={formData.email}
                type="email"
                required
                error={getError("email")}
                onChange={handleInputChange}
              />
              <Input
                label="Celular *"
                name="mobile"
                value={formData.mobile}
                maxLength={15}
                required
                error={getError("mobile")}
                onChange={handleInputChange}
              />
            </div>
            <Input
              label="Senha *"
              name="password"
              value={formData.password}
              type="password"
              required
              error={getError("password")}
              onChange={handleInputChange}
            />
            <p className="text-xs text-gray-400">
              💡 Senha deve conter maiúscula, minúscula e número
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-gray-700 pt-6">
          <h2 className="text-lg font-semibold text-gray-200">📍 Endereço</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="CEP *"
                name="company_zip_code"
                value={formData.company_zip_code}
                maxLength={9}
                placeholder="00000-000"
                required
                error={getError("company_zip_code")}
                onChange={handleCEPChange}
              />
              {loadingCEP && (
                <div className="absolute right-3 top-9 text-gray-400 text-sm">
                  Buscando...
                </div>
              )}
            </div>
            <Input
              label="Estado *"
              name="company_state"
              value={formData.company_state}
              maxLength={2}
              placeholder="SP"
              required
              error={getError("company_state")}
              onChange={handleInputChange}
            />
          </div>

          <Input
            label="Cidade *"
            name="company_city"
            value={formData.company_city}
            required
            error={getError("company_city")}
            onChange={handleInputChange}
          />
          <Input
            label="Bairro *"
            name="company_neighborhood"
            value={formData.company_neighborhood}
            required
            error={getError("company_neighborhood")}
            onChange={handleInputChange}
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Logradouro *"
                name="company_street_address"
                value={formData.company_street_address}
                required
                error={getError("company_street_address")}
                onChange={handleInputChange}
              />
            </div>
            <Input
              label="Número *"
              name="company_address_number"
              value={formData.company_address_number}
              required
              error={getError("company_address_number")}
              onChange={handleInputChange}
            />
          </div>

          <Input
            label="Complemento"
            name="company_address_complement"
            value={formData.company_address_complement}
            error={getError("company_address_complement")}
            onChange={handleInputChange}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefone"
              name="company_phone"
              value={formData.company_phone}
              placeholder="(11) 3333-4444"
              error={getError("company_phone")}
              onChange={handleInputChange}
            />
            <Input
              label="Email"
              name="company_email"
              value={formData.company_email}
              type="email"
              error={getError("company_email")}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {state.message && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {state.message}
          </div>
        )}
        <SubmitButton />
      </form>
    </div>
  );
}
