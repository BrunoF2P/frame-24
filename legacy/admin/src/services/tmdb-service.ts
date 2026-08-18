import axios from "axios";

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime?: number;
  vote_average?: number;
  imdb_id?: string;
}

export const tmdbService = {
  searchMovie: async (query: string): Promise<TMDBMovie[]> => {
    if (!TMDB_API_KEY) return [];

    try {
      const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          query,
          language: "pt-BR",
        },
      });
      return response.data.results;
    } catch (error) {
      console.error("Erro ao buscar no TMDB:", error);
      return [];
    }
  },

  getMovieDetails: async (tmdbId: number): Promise<TMDBMovie | null> => {
    if (!TMDB_API_KEY) return null;

    try {
      const response = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
        params: {
          api_key: TMDB_API_KEY,
          language: "pt-BR",
          append_to_response: "credits,external_ids",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar detalhes no TMDB:", error);
      return null;
    }
  },

  getImageUrl: (path: string | null) => {
    return path ? `${IMAGE_BASE_URL}${path}` : null;
  },
};
