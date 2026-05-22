import BaseApi from "./baseApi";

class AdminDataApi extends BaseApi {
  async _get(path) {
    const headers = this.getHeaders();
    const res = await fetch(`${this.baseURL}${path}`, { method: "GET", headers });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || `GET ${path} failed`);
    return payload?.data ?? payload;
  }

  async _post(path, body) {
    const headers = this.getHeaders();
    const res = await fetch(`${this.baseURL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || `POST ${path} failed`);
    return payload?.data ?? payload;
  }

  async _patch(path, body) {
    const headers = this.getHeaders();
    const res = await fetch(`${this.baseURL}${path}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || `PATCH ${path} failed`);
    return payload?.data ?? payload;
  }

  async _delete(path) {
    const headers = this.getHeaders();
    const res = await fetch(`${this.baseURL}${path}`, { method: "DELETE", headers });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || `DELETE ${path} failed`);
    return payload?.data ?? payload;
  }

  fetchAllUserRecipes() {
    return this._get("/admin/user-recipes");
  }

  fetchAdminUserRoles() {
    return this._get("/admin/user-roles");
  }

  updateAdminUserRole(userId, role) {
    return this._patch(`/admin/user-roles/${userId}`, { role });
  }

  fetchMealCatalog() {
    return this._get("/admin/meal-catalog");
  }

  fetchReferenceData() {
    return this._get("/admin/reference-data");
  }

  fetchMealIngredientsMap() {
    return this._get("/admin/meal-ingredients");
  }

  fetchRecipeLibraryAdmin() {
    return this._get("/admin/recipe-library");
  }

  fetchRecipeLibraryImportQueue() {
    return this._get("/admin/recipe-library/import-queue");
  }

  fetchRecipeLibraryMissingImages() {
    return this._get("/admin/recipe-library/missing-images");
  }

  importRecipeLibraryDishNames(names, mealType, cuisineHint) {
    return this._post("/admin/recipe-library/import/names", { names, mealType, cuisineHint });
  }

  importRecipeLibraryDishRows(rows) {
    return this._post("/admin/recipe-library/import/rows", { rows });
  }

  approveRecipeLibraryImportQueueRows(ids) {
    return this._post("/admin/recipe-library/import-queue/approve", { ids });
  }

  enrichRecipeLibraryBatch(ids) {
    return this._post("/admin/recipe-library/enrich", { ids });
  }

  publishRecipeLibraryCatalog(id) {
    return this._post(`/admin/recipe-library/${id}/publish`, {});
  }

  unpublishRecipeLibraryCatalog(id) {
    return this._post(`/admin/recipe-library/${id}/unpublish`, {});
  }

  deleteRecipeLibraryItem(id) {
    return this._delete(`/admin/recipe-library/${id}`);
  }

  recoverRecipeLibraryItem(id) {
    return this._post(`/admin/recipe-library/${id}/recover`, {});
  }

  permanentlyDeleteRecipeLibraryItem(id) {
    return this._delete(`/admin/recipe-library/${id}/permanent`);
  }

  async downloadRecipeLibraryImportTemplate() {
    const headers = this.getHeaders();
    const res = await fetch(`${this.baseURL}/admin/recipe-library/import-template`, {
      method: "GET",
      headers,
    });
    if (!res.ok) throw new Error("Failed to download template");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "recipe-library-import-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  updateUserRecipeVisibility(recipeId, visibility) {
    return this._patch(`/admin/user-recipes/${recipeId}`, { visibility });
  }

  fetchPendingCommunityRecipes() {
    return this._get("/admin/community-recipes/pending");
  }

  approveCommunityRecipe(id) {
    return this._post(`/admin/community-recipes/${id}/approve`, {});
  }

  rejectCommunityRecipe(id) {
    return this._post(`/admin/community-recipes/${id}/reject`, {});
  }

  createMealCatalogEntry(data) {
    return this._post("/admin/meal-catalog", data);
  }

  updateMealCatalogEntry(id, data) {
    return this._patch(`/admin/meal-catalog/${id}`, data);
  }

  deleteMealCatalogEntry(id) {
    return this._delete(`/admin/meal-catalog/${id}`);
  }

  createMealIngredient(data) {
    return this._post("/admin/meal-ingredients", data);
  }

  updateMealIngredient(id, data) {
    return this._patch(`/admin/meal-ingredients/${id}`, data);
  }

  deleteMealIngredient(id) {
    return this._delete(`/admin/meal-ingredients/${id}`);
  }
}

const adminDataApi = new AdminDataApi();

export const fetchAllUserRecipes = () => adminDataApi.fetchAllUserRecipes();
export const fetchAdminUserRoles = () => adminDataApi.fetchAdminUserRoles();
export const updateAdminUserRole = (userId, role) => adminDataApi.updateAdminUserRole(userId, role);
export const fetchMealCatalog = () => adminDataApi.fetchMealCatalog();
export const fetchReferenceData = () => adminDataApi.fetchReferenceData();
export const fetchMealIngredientsMap = () => adminDataApi.fetchMealIngredientsMap();
export const fetchRecipeLibraryAdmin = () => adminDataApi.fetchRecipeLibraryAdmin();
export const fetchRecipeLibraryImportQueue = () => adminDataApi.fetchRecipeLibraryImportQueue();
export const fetchRecipeLibraryMissingImages = () => adminDataApi.fetchRecipeLibraryMissingImages();
export const importRecipeLibraryDishNames = (names, mealType, cuisineHint) =>
  adminDataApi.importRecipeLibraryDishNames(names, mealType, cuisineHint);
export const importRecipeLibraryDishRows = (rows) => adminDataApi.importRecipeLibraryDishRows(rows);
export const approveRecipeLibraryImportQueueRows = (ids) =>
  adminDataApi.approveRecipeLibraryImportQueueRows(ids);
export const enrichRecipeLibraryBatch = (ids) => adminDataApi.enrichRecipeLibraryBatch(ids);
export const publishRecipeLibraryCatalog = (id) => adminDataApi.publishRecipeLibraryCatalog(id);
export const unpublishRecipeLibraryCatalog = (id) => adminDataApi.unpublishRecipeLibraryCatalog(id);
export const deleteRecipeLibraryItem = (id) => adminDataApi.deleteRecipeLibraryItem(id);
export const recoverRecipeLibraryItem = (id) => adminDataApi.recoverRecipeLibraryItem(id);
export const permanentlyDeleteRecipeLibraryItem = (id) =>
  adminDataApi.permanentlyDeleteRecipeLibraryItem(id);
export const downloadRecipeLibraryImportTemplate = () =>
  adminDataApi.downloadRecipeLibraryImportTemplate();
export const updateUserRecipeVisibility = (recipeId, visibility) =>
  adminDataApi.updateUserRecipeVisibility(recipeId, visibility);
export const fetchPendingCommunityRecipes = () => adminDataApi.fetchPendingCommunityRecipes();
export const approveCommunityRecipe = (id) => adminDataApi.approveCommunityRecipe(id);
export const rejectCommunityRecipe = (id) => adminDataApi.rejectCommunityRecipe(id);
export const createMealCatalogEntry = (data) => adminDataApi.createMealCatalogEntry(data);
export const updateMealCatalogEntry = (id, data) => adminDataApi.updateMealCatalogEntry(id, data);
export const deleteMealCatalogEntry = (id) => adminDataApi.deleteMealCatalogEntry(id);
export const createMealIngredient = (data) => adminDataApi.createMealIngredient(data);
export const updateMealIngredient = (id, data) => adminDataApi.updateMealIngredient(id, data);
export const deleteMealIngredient = (id) => adminDataApi.deleteMealIngredient(id);

export default adminDataApi;
