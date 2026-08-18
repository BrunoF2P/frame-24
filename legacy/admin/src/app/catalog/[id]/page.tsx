"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CatalogService } from "@/services/catalog-service";
import { MovieForm } from "@/components/catalog/movie-form";
import { Loader2, AlertCircle } from "lucide-react";

export default function EditMoviePage() {
  const params = useParams();
  const [movie, setMovie] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const movieId = params?.id;

        if (!movieId || typeof movieId !== "string") {
          setErrorMsg("Filme não encontrado.");
          return;
        }

        const data = await CatalogService.getMovieById(movieId);

        if (data) {
          setMovie(data);
        } else {
          setErrorMsg("Filme não encontrado.");
        }
      } catch (error: unknown) {
        console.error("Erro ao buscar filme:", error);
        const msg =
          error && typeof error === "object" && "response" in error
            ? "Não foi possível carregar este filme. Tente novamente."
            : "Erro de conexão. Verifique sua internet e tente novamente.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    };

    if (params) {
      fetchMovie();
    }
  }, [params]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-red" />
      </div>
    );
  }

  if (errorMsg || !movie) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertCircle className="w-10 h-10 text-zinc-500" />
        <p className="text-zinc-400 text-lg">{errorMsg || "Filme não encontrado."}</p>
      </div>
    );
  }

  return <MovieForm initialData={movie} isEditing={true} />;
}
