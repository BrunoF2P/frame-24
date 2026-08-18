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

interface CategoryItem {
  id: string;
  name?: string;
  slug?: string;
}

interface CategoryLink {
  category_id?: string;
  category?: CategoryItem;
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
  categories?: CategoryItem[];
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
  const tmdbInputClass = (field: string) =>
    tmdbFilledFields.has(field)
      ? inputFieldClass.replace("border-zinc-700", "border-blue-500/50 bg-blue-950/20")
      : inputFieldClass;

  // Dados auxiliares
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [ageRatings, setAgeRatings] = useState<AgeRating[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mediaTypeIds, setMediaTypeIds] = useState<Record<string, string>>({});

  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TMDBMovie[]>([]);
  const [showTmdbResults, setShowTmdbResults] = useState(false);
  const [tmdbFilledFields, setTmdbFilledFields] = useState<Set<string>>(new Set());

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
      const [dist, ratings, cats, mTypes] = await Promise.all([
        SuppliersService.getDistributors(),
        CatalogService.getAgeRatings(),
        CatalogService.getCategories(),
        CatalogService.getMediaTypes(),
      ]);
      setDistributors(Array.isArray(dist) ? (dist as Distributor[]) : []);
      setAgeRatings(Array.isArray(ratings) ? (ratings as AgeRating[]) : []);
      setCategories(Array.isArray(cats) ? (cats as Category[]) : []);

      const idsMap: Record<string, string> = {};
      for (const mt of mTypes) {
        const key = mt.name?.toLowerCase().trim();
        if (key) idsMap[key] = mt.id;
      }
      setMediaTypeIds(idsMap);

      if (initialData) {
        const poster =
          initialData.movie_media?.find(
            (m) => m.media_types?.name === "Poster",
          )?.media_url || "";
        const backdrop =
          initialData.movie_media?.find(
            (m) => m.media_types?.name === "Backdrop",
          )?.media_url || "";
        const trailer =
          initialData.movie_media?.find(
            (m) => m.media_types?.name === "Trailer",
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
          initialData.categories?.map((c) => c.id) ||
          initialData.category_links?.map((l) => l.category_id || l.category?.id || "")?.filter(Boolean) || [],
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
    console.log("🔎 Iniciando busca no serviço TMDB por:", tmdbQuery);
    
    try {
      const results = await tmdbService.searchMovie(tmdbQuery);
      console.log("✅ Resultados recebidos:", results);
      
      if (!results || results.length === 0) {
         alert("Nenhum filme encontrado com esse nome!");
      }
      
      setTmdbResults(results || []);
      setShowTmdbResults(true);
    } catch (error) {
      console.error("🚨 Erro fatal ao buscar no TMDB:", error);
        alert("Ocorreu um erro na busca. Tente novamente em instantes.");
    } finally {
      setImporting(false);
    }
  };

  const applyTmdbData = async (movie: TMDBMovie) => {
    setImporting(true);
    try {
      const details = await tmdbService.getMovieDetails(movie.id);
      const data = details || movie;

      const filled = new Set<string>();

      setFormData((prev) => {
        const next = { ...prev };

        if (data.original_title) {
          next.original_title = data.original_title;
          filled.add("original_title");
        }
        if (data.title) {
          next.brazil_title = data.title;
          filled.add("brazil_title");
        }
        if (data.overview) {
          next.synopsis = data.overview;
          filled.add("synopsis");
        }
        if (data.release_date) {
          next.production_year = new Date(data.release_date).getFullYear();
          filled.add("production_year");
        }
        if (data.runtime) {
          next.duration_minutes = data.runtime;
          filled.add("duration_minutes");
        }
        if (data.poster_path) {
          next.poster_url = tmdbService.getImageUrl(data.poster_path) || "";
          filled.add("poster_url");
        }
        if (data.backdrop_path) {
          next.backdrop_url = tmdbService.getImageUrl(data.backdrop_path) || "";
          filled.add("backdrop_url");
        }
        if (data.original_title === data.title) {
          next.national = true;
          filled.add("national");
        }

        return next;
      });

      setTmdbFilledFields(filled);
      setShowTmdbResults(false);
    } finally {
      setImporting(false);
    }
  };

  const tmdbBadge = (field: string, label: string) =>
    tmdbFilledFields.has(field) ? (
      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded px-1.5 py-0.5">
        <Wand2 className="w-2.5 h-2.5" /> Auto
      </span>
    ) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

    if (formData.poster_url && mediaTypeIds["poster"]) {
      payload.media.push({
        media_type: mediaTypeIds["poster"],
        media_url: formData.poster_url,
        title: "Poster Oficial",
      });
    }
    if (formData.backdrop_url && mediaTypeIds["backdrop"]) {
      payload.media.push({
        media_type: mediaTypeIds["backdrop"],
        media_url: formData.backdrop_url,
        title: "Fundo",
      });
    }
    if (formData.trailer_url && mediaTypeIds["trailer"]) {
      payload.media.push({
        media_type: mediaTypeIds["trailer"],
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

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-zinc-400">
            Buscar no Banco de Filmes
          </label>
          {tmdbFilledFields.size > 0 && (
            <button
              type="button"
              onClick={() => setTmdbFilledFields(new Set())}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Limpar indicadores de preenchimento automático
            </button>
          )}
        </div>
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
            Buscar no Banco de Filmes
          </button>
        </div>

        {showTmdbResults && tmdbResults.length > 0 && (
          <div className="mt-4 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-500">
                {tmdbResults.length} resultado(s) — Clique para importar
              </span>
              <button
                type="button"
                onClick={() => setShowTmdbResults(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-2 max-h-[400px] overflow-y-auto pr-1">
              {tmdbResults.slice(0, 10).map((movie) => (
                <div
                  key={movie.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-blue-500 transition-all group"
                  onClick={() => applyTmdbData(movie)}
                >
                  <div className="aspect-[2/3] relative bg-zinc-900 rounded-md overflow-hidden mb-2">
                    {movie.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
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
          </div>
        )}
      </div>

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
        <label className="text-xs font-medium text-zinc-400 flex items-center">
          URL da Imagem
          {tmdbBadge("poster_url", "Poster")}
        </label>
                <input
                  type="url"
                  placeholder="https://..."
                  className={`w-full rounded-md border ${tmdbFilledFields.has("poster_url") ? "border-blue-500/50 bg-blue-950/20" : "border-zinc-700 bg-zinc-950"} px-3 py-2 text-xs text-white focus:ring-1 focus:ring-accent-red outline-none`}
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
        <label className="text-xs font-medium text-zinc-400 flex items-center">
        Backdrop (Fundo)
        {tmdbBadge("backdrop_url", "Backdrop")}
      </label>
      <input
        type="url"
        className={`w-full rounded-md border ${tmdbFilledFields.has("backdrop_url") ? "border-blue-500/50 bg-blue-950/20" : "border-zinc-700 bg-zinc-950"} px-3 py-2 text-xs text-white outline-none focus:border-accent-red`}
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
            <label className="text-sm font-medium text-zinc-400 flex items-center">
              Título Original *{tmdbBadge("original_title", "Título Original")}
            </label>
        <input
          required
          className={tmdbInputClass("original_title")}
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
            <label className="text-sm font-medium text-zinc-400 flex items-center">
              Título no Brasil{tmdbBadge("brazil_title", "Título Brasil")}
            </label>
        <input
          className={tmdbInputClass("brazil_title")}
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
              <label className="text-sm font-medium text-zinc-400 flex items-center">
                Duração (min) *{tmdbBadge("duration_minutes", "Duração")}
              </label>
                    <input
                      type="number"
                      required
                      min="1" // Validação para o backend
          className={tmdbInputClass("duration_minutes")}
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
              <label className="text-sm font-medium text-zinc-400 flex items-center">
                Ano *{tmdbBadge("production_year", "Ano")}
              </label>
                    <input
                      type="number"
                      required
                      min="1900"
                      max="2100"
          className={tmdbInputClass("production_year")}
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
            <label htmlFor="national" className="text-sm text-zinc-300 flex items-center">
              Produção Nacional{tmdbBadge("national", "Nacional")}
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
        <label className="text-sm font-medium text-zinc-400 flex items-center">
          Sinopse{tmdbBadge("synopsis", "Sinopse")}
        </label>
                <textarea
                  rows={5}
                  className={`${tmdbInputClass("synopsis")} resize-none`}
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
