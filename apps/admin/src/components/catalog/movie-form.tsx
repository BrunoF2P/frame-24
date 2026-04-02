"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogService } from "@/services/catalog-service";
import { SuppliersService } from "@/services/suppliers-service";
import { tmdbService, TMDBMovie } from "@/services/tmdb-service";
import {
  Loader2,
  Save,
  ArrowLeft,
  Search,
  Wand2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface MediaTypeRef {
  name?: string;
}

interface MovieMedia {
  media_type?: string;
  media_types?: MediaTypeRef;
  media_url?: string;
}

interface CategoryLink {
  category_id: string;
}

interface InitialMovieData {
  id?: string;
  original_title?: string;
  brazil_title?: string;
  distributor_id?: string;
  duration_minutes?: number;
  production_year?: number;
  national?: boolean;
  age_rating?: { id?: string };
  age_rating_id?: string;
  synopsis?: string;
  website?: string;
  movie_media?: MovieMedia[];
  category_links?: CategoryLink[];
}

interface Distributor {
  id: string;
  trade_name?: string;
  corporate_name?: string;
}

interface AgeRating {
  id: string;
  code?: string;
  name?: string;
}

interface Category {
  id: string;
  name: string;
}

interface FormDataState {
  original_title: string;
  brazil_title: string;
  distributor_id: string;
  duration_minutes: number;
  production_year: number;
  national: boolean;
  age_rating: string;
  synopsis: string;
  website: string;
  category_ids: string[];
  poster_url: string;
  backdrop_url: string;
  trailer_url: string;
}

interface ApiMediaItem {
  media_type: string;
  media_url: string;
  title: string;
}

type SavePayload = Omit<
  FormDataState,
  "poster_url" | "backdrop_url" | "trailer_url" | "website" | "age_rating" | "synopsis"
> & {
  website?: string;
  age_rating?: string;
  synopsis?: string;
  media: ApiMediaItem[];
};

interface MovieFormProps {
  initialData?: InitialMovieData;
  isEditing?: boolean;
}

export function MovieForm({ initialData, isEditing = false }: MovieFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const inputFieldClass =
    "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-accent-red";

  // Dados auxiliares
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [ageRatings, setAgeRatings] = useState<AgeRating[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Busca TMDB
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TMDBMovie[]>([]);
  const [showTmdbResults, setShowTmdbResults] = useState(false);

  // Estado do formulário
  const [formData, setFormData] = useState<FormDataState>({
    original_title: "",
    brazil_title: "",
    distributor_id: "",
    duration_minutes: 0,
    production_year: new Date().getFullYear(),
    national: false,
    age_rating: "",
    synopsis: "",
    website: "",
    category_ids: [] as string[],
    poster_url: "",
    backdrop_url: "",
    trailer_url: "",
  });

  useEffect(() => {
    // Carregar dados iniciais (Distribuidores, etc)
    const loadDependencies = async () => {
      try {
        const [dist, ratings, cats] = await Promise.all([
          SuppliersService.getDistributors(),
          CatalogService.getAgeRatings(),
          CatalogService.getCategories(),
        ]);
        setDistributors(Array.isArray(dist) ? (dist as Distributor[]) : []);
        setAgeRatings(Array.isArray(ratings) ? (ratings as AgeRating[]) : []);
        setCategories(Array.isArray(cats) ? (cats as Category[]) : []);

        // Se estiver editando, preencher o formulário
        if (initialData) {
          const poster =
            initialData.movie_media?.find(
              (m) =>
                m.media_type === "POSTER" || m.media_types?.name === "Poster",
            )?.media_url || "";
          const backdrop =
            initialData.movie_media?.find(
              (m) =>
                m.media_type === "BACKDROP" ||
                m.media_types?.name === "Backdrop",
            )?.media_url || "";
          const trailer =
            initialData.movie_media?.find(
              (m) =>
                m.media_type === "TRAILER" || m.media_types?.name === "Trailer",
            )?.media_url || "";

          setFormData({
            original_title: initialData.original_title || "",
            brazil_title: initialData.brazil_title || "",
            distributor_id: initialData.distributor_id || "",
            duration_minutes: initialData.duration_minutes || 0,
            production_year:
              initialData.production_year || new Date().getFullYear(),
            national: initialData.national || false,
            age_rating:
              initialData.age_rating?.id || initialData.age_rating_id || "",
            synopsis: initialData.synopsis || "",
            website: initialData.website || "",
            category_ids:
              initialData.category_links?.map((l) => l.category_id) || [],
            poster_url: poster,
            backdrop_url: backdrop,
            trailer_url: trailer,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dependências", error);
      }
    };
    loadDependencies();
  }, [initialData]);

  // Função para buscar no TMDB
  const handleTmdbSearch = async () => {
    if (!tmdbQuery) return;
    setImporting(true);
    try {
      const results = await tmdbService.searchMovie(tmdbQuery);
      setTmdbResults(results);
      setShowTmdbResults(true);
    } finally {
      setImporting(false);
    }
  };

  // Função para aplicar dados do TMDB ao formulário
  const applyTmdbData = async (movie: TMDBMovie) => {
    setImporting(true);
    try {
      const details = await tmdbService.getMovieDetails(movie.id);
      const data = details || movie;

      setFormData((prev) => ({
        ...prev,
        original_title: data.original_title,
        brazil_title: data.title,
        synopsis: data.overview,
        production_year: data.release_date
          ? new Date(data.release_date).getFullYear()
          : prev.production_year,
        duration_minutes: data.runtime || prev.duration_minutes,
        poster_url: tmdbService.getImageUrl(data.poster_path) || "",
        backdrop_url: tmdbService.getImageUrl(data.backdrop_path) || "",
        national: data.original_title === data.title, // Heurística simples
      }));
      setShowTmdbResults(false);
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // IDs fixos (UUIDs reais do seu banco)
    const MEDIA_IDS = {
      POSTER: "8f9507e0-0147-4b9b-997a-10b991ce438a",
      BACKDROP: "3a92e481-2432-466c-afa0-2ca74d830e09",
      TRAILER: "d14386ef-24d4-4aff-ae9c-54f9ec8de98d",
    };

    try {
      // 1. Validações
      if (Number(formData.duration_minutes) < 1) {
        alert("A duração deve ser de pelo menos 1 minuto.");
        return;
      }
      if (!formData.distributor_id) {
        alert("Selecione um distribuidor.");
        return;
      }

      // 2. Montar Payload Base
      const payload: SavePayload = {
        ...formData,
        duration_minutes: Number(formData.duration_minutes),
        production_year: Number(formData.production_year),

        // Conversão para undefined (Zod .optional() prefere undefined a null)
        website: formData.website || undefined,
        age_rating: formData.age_rating || undefined,
        synopsis: formData.synopsis || undefined,

        media: [],
      };

      // Limpeza de campos auxiliares
      // 3. Adicionar Mídias (AQUI ESTAVA O ERRO DE VALIDAÇÃO)
      // O DTO exige: { media_type: string, media_url: string }

      if (formData.poster_url) {
        payload.media.push({
          media_type: MEDIA_IDS.POSTER, // Nome da chave corrigido para bater com o DTO
          media_url: formData.poster_url, // Nome da chave corrigido
          title: "Poster Oficial",
        });
      }
      if (formData.backdrop_url) {
        payload.media.push({
          media_type: MEDIA_IDS.BACKDROP,
          media_url: formData.backdrop_url,
          title: "Fundo",
        });
      }
      if (formData.trailer_url) {
        payload.media.push({
          media_type: MEDIA_IDS.TRAILER,
          media_url: formData.trailer_url,
          title: "Trailer",
        });
      }

      console.log("📤 Payload Corrigido:", payload);

      if (isEditing && initialData?.id) {
        await CatalogService.updateMovie(initialData.id, payload);
      } else {
        await CatalogService.createMovie(payload);
      }

      alert("Filme salvo com sucesso!");
      router.push("/catalog");
      router.refresh();
    } catch (error: unknown) {
      console.error("Erro ao salvar:", error);

      let errorMessage = "Erro desconhecido.";
      const hasResponseMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response
          ?.data?.message !== "undefined";

      if (hasResponseMessage) {
        // Se for array de erros do Zod, junta eles
        const msg = (error as { response?: { data?: { message?: unknown } } })
          .response?.data?.message;
        if (Array.isArray(msg)) {
          errorMessage = msg.join(" | ");
        } else if (typeof msg === "string") {
          errorMessage = msg;
        }
      } else if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
      ) {
        errorMessage = (error as { message: string }).message;
      }

      alert(`Erro: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setFormData((prev) => {
      const exists = prev.category_ids.includes(catId);
      if (exists)
        return {
          ...prev,
          category_ids: prev.category_ids.filter((id) => id !== catId),
        };
      return { ...prev, category_ids: [...prev.category_ids, catId] };
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/catalog"
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditing ? "Editar Filme" : "Novo Filme"}
            </h1>
            <p className="text-sm text-zinc-400">
              Preencha os dados manualmente ou importe da internet.
            </p>
          </div>
        </div>
      </div>

      {/* Busca TMDB (Só mostra se não estiver editando ou para fins de teste) */}
      {!isEditing && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <label className="text-sm font-medium text-zinc-400 mb-2 block">
            Importar dados do TMDB (Automático)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Digite o nome do filme para buscar (ex: Matrix)..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-accent-red outline-none"
                value={tmdbQuery}
                onChange={(e) => setTmdbQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTmdbSearch()}
              />
            </div>
            <button
              type="button"
              onClick={handleTmdbSearch}
              disabled={importing || !tmdbQuery}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              Buscar
            </button>
          </div>

          {/* Resultados da Busca */}
          {showTmdbResults && tmdbResults.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
              {tmdbResults.slice(0, 4).map((movie) => (
                <div
                  key={movie.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-accent-red transition-all group"
                  onClick={() => applyTmdbData(movie)}
                >
                  <div className="aspect-[2/3] relative bg-zinc-900 rounded-md overflow-hidden mb-2">
                    {movie.poster_path ? (
                      <Image
                        src={tmdbService.getImageUrl(movie.poster_path) || ""}
                        alt={movie.title}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-700">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold border border-white px-2 py-1 rounded">
                        Importar
                      </span>
                    </div>
                  </div>
                  <h3
                    className="text-sm font-medium text-zinc-200 truncate"
                    title={movie.title}
                  >
                    {movie.title}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {movie.release_date?.split("-")[0]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna da Esquerda: Capa e Mídia */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900/50 border border-border rounded-xl p-4 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200">
                Poster / Capa
              </h2>

              <div className="aspect-[2/3] bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden relative group">
                {formData.poster_url ? (
                  <>
                    <Image
                      src={formData.poster_url}
                      alt="Capa"
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, poster_url: "" })
                      }
                      className="absolute top-2 right-2 bg-black/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                    <ImageIcon className="w-12 h-12 opacity-20" />
                    <span className="text-xs">Sem imagem</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  URL da Imagem
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:ring-1 focus:ring-accent-red outline-none"
                  value={formData.poster_url}
                  onChange={(e) =>
                    setFormData({ ...formData, poster_url: e.target.value })
                  }
                />
                <p className="text-[10px] text-zinc-500">
                  Cole uma URL de imagem ou use a busca acima.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-border rounded-xl p-4 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-200">
                Outras Mídias
              </h2>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  Backdrop (Fundo)
                </label>
                <input
                  type="url"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-accent-red"
                  value={formData.backdrop_url}
                  onChange={(e) =>
                    setFormData({ ...formData, backdrop_url: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  Trailer (YouTube URL)
                </label>
                <input
                  type="url"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-accent-red"
                  value={formData.trailer_url}
                  onChange={(e) =>
                    setFormData({ ...formData, trailer_url: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Coluna da Direita: Dados Principais */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-zinc-900/50 border border-border rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold text-zinc-200">
                Informações Básicas
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">
                    Título Original *
                  </label>
                  <input
                    required
                    className={inputFieldClass}
                    value={formData.original_title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        original_title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">
                    Título no Brasil
                  </label>
                  <input
                    className={inputFieldClass}
                    value={formData.brazil_title}
                    onChange={(e) =>
                      setFormData({ ...formData, brazil_title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">
                    Distribuidor *
                  </label>
                  <select
                    required
                    className={inputFieldClass}
                    value={formData.distributor_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        distributor_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecione...</option>
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.trade_name || d.corporate_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Duração (min) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1" // Validação para o backend
                      className={inputFieldClass}
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_minutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Ano *
                    </label>
                    <input
                      type="number"
                      required
                      min="1900"
                      max="2100"
                      className={inputFieldClass}
                      value={formData.production_year}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          production_year: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="national"
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-accent-red focus:ring-accent-red"
                  checked={formData.national}
                  onChange={(e) =>
                    setFormData({ ...formData, national: e.target.checked })
                  }
                />
                <label htmlFor="national" className="text-sm text-zinc-300">
                  Produção Nacional
                </label>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-border rounded-xl p-6 space-y-6">
              <h2 className="text-lg font-semibold text-zinc-200">Detalhes</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Classificação Indicativa
                </label>
                <div className="flex flex-wrap gap-2">
                  {ageRatings.map((rating) => (
                    <button
                      type="button"
                      key={rating.id}
                      onClick={() =>
                        setFormData({ ...formData, age_rating: rating.id })
                      }
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${formData.age_rating === rating.id ? "bg-accent-red text-white border-accent-red" : "bg-zinc-950 border-zinc-700 text-zinc-400"}`}
                    >
                      {rating.code || rating.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Categorias
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${formData.category_ids.includes(cat.id) ? "bg-white text-black border-white font-medium" : "bg-zinc-900 border-zinc-700 text-zinc-400"}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Sinopse
                </label>
                <textarea
                  rows={5}
                  className={`${inputFieldClass} resize-none`}
                  value={formData.synopsis}
                  onChange={(e) =>
                    setFormData({ ...formData, synopsis: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href="/catalog"
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-accent-red hover:bg-accent-red-hover text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isEditing ? "Salvar Alterações" : "Criar Filme"}
              </button>
            </div>
          </div>
        </div>
      </form>

    </div>
  );
}
