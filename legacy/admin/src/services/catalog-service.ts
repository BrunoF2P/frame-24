import { apiClient, ApiPayload } from './api-config';

type MoviePayload = ApiPayload;

export const CatalogService = {
  async getMovies() {
    const response = await apiClient.get('/v1/movies');
    return (response.data ?? []) as unknown[];
  },

  async getMovieById(id: string) {
    const response = await apiClient.get(`/v1/movies/${id}`);
    return response.data as unknown;
  },

  async getAgeRatings() {
    const response = await apiClient.get('/v1/movies/age-ratings');
    return (response.data ?? []) as unknown[];
  },

  async getMediaTypes() {
    const response = await apiClient.get('/v1/movies/media-types');
    return (response.data ?? []) as { id: string; name: string }[];
  },

  async getCastTypes() {
    const response = await apiClient.get('/v1/movies/cast-types');
    return (response.data ?? []) as { id: string; name: string }[];
  },

  async getCategories() {
    const response = await apiClient.get('/v1/movie-categories');
    return (response.data ?? []) as unknown[];
  },

  async createMovie(data: MoviePayload) {
    return await apiClient.post('/v1/movies', data);
  },

  async updateMovie(id: string, data: MoviePayload) {
    return await apiClient.put(`/v1/movies/${id}`, data);
  },

  async deleteMovie(id: string) {
    return await apiClient.delete(`/v1/movies/${id}`);
  },
};
