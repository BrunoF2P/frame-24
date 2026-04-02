import { apiConfig } from "./api-config";
import {
  MovieCategoriesApi,
  MoviesApi,
  CreateMovieDto,
  UpdateMovieDto,
} from "@repo/api-types";

const moviesApi = new MoviesApi(apiConfig);
const movieCategoriesApi = new MovieCategoriesApi(apiConfig);

export const CatalogService = {
  async getMovies() {
    // A chamada deve ser findAllV1 e passar um objeto vazio {} se necessário
    const response = await moviesApi.moviesControllerFindAllV1();
    return (response.data ?? []) as unknown[];
  },

  async getMovieById(id: string) {
    const response = await moviesApi.moviesControllerFindOneV1({ id });
    return response.data as unknown;
  },

  async getAgeRatings() {
    const response = await moviesApi.moviesControllerGetAgeRatingsV1();
    return (response.data ?? []) as unknown[];
  },

  async getCategories() {
    const response = await movieCategoriesApi.movieCategoriesControllerFindAllV1();
    return (response.data ?? []) as unknown[];
  },

  async createMovie(data: CreateMovieDto) {
    return await moviesApi.moviesControllerCreateV1({ createMovieDto: data });
  },

  async updateMovie(id: string, data: UpdateMovieDto) {
    return await moviesApi.moviesControllerUpdateV1({
      id,
      updateMovieDto: data,
    });
  },

  async deleteMovie(id: string) {
    return await moviesApi.moviesControllerDeleteV1({ id });
  },
};
