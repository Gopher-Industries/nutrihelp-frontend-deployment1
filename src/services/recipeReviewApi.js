import BaseApi from "./baseApi";

class RecipeReviewApi extends BaseApi {
  async fetchRecipeReviewFeed(filters = {}) {
    const headers = this.getHeaders();
    const params = new URLSearchParams(filters).toString();
    const url = `${this.baseURL}/admin/recipe-reviews${params ? `?${params}` : ""}`;
    const res = await fetch(url, { method: "GET", headers });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || "Failed to fetch review feed");
    return payload?.data ?? payload;
  }

  async deleteRecipeReviewByAdmin(reviewId) {
    const headers = this.getHeaders();
    const res = await fetch(`${this.baseURL}/admin/recipe-reviews/${reviewId}`, {
      method: "DELETE",
      headers,
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || "Failed to delete review");
    return payload?.data ?? payload;
  }
}

const recipeReviewApi = new RecipeReviewApi();

export const fetchRecipeReviewFeed = (filters) => recipeReviewApi.fetchRecipeReviewFeed(filters);
export const deleteRecipeReviewByAdmin = (reviewId) =>
  recipeReviewApi.deleteRecipeReviewByAdmin(reviewId);

export default recipeReviewApi;
