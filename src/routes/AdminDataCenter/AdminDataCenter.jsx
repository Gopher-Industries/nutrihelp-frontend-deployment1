import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import {
  LayoutDashboard, ChefHat, Users, Database, BookOpen,
  MessageSquare, Trash2, Download, Upload, RefreshCw,
  Check, X, Eye, EyeOff, Search, Loader2, Plus, Pencil,
  Star, AlertCircle,
} from "lucide-react";
import { UserContext } from "../../context/user.context";
import {
  fetchAllUserRecipes,
  fetchAdminUserRoles,
  updateAdminUserRole,
  fetchMealCatalog,
  fetchReferenceData,
  fetchMealIngredientsMap,
  fetchRecipeLibraryAdmin,
  fetchRecipeLibraryImportQueue,
  importRecipeLibraryDishRows,
  approveRecipeLibraryImportQueueRows,
  publishRecipeLibraryCatalog,
  unpublishRecipeLibraryCatalog,
  deleteRecipeLibraryItem,
  recoverRecipeLibraryItem,
  permanentlyDeleteRecipeLibraryItem,
  downloadRecipeLibraryImportTemplate,
  updateUserRecipeVisibility,
  fetchPendingCommunityRecipes,
  approveCommunityRecipe,
  rejectCommunityRecipe,
  createMealCatalogEntry,
  updateMealCatalogEntry,
  deleteMealCatalogEntry,
  createMealIngredient,
  updateMealIngredient,
  deleteMealIngredient,
} from "../../services/adminDataApi";
import { fetchRecipeReviewFeed, deleteRecipeReviewByAdmin } from "../../services/recipeReviewApi";
import "./AdminDataCenter.css";

const TABS = [
  { id: "kpi",       label: "KPI Dashboard",     meta: "Overview",         Icon: LayoutDashboard },
  { id: "recipes",   label: "Recipes",            meta: "User-Created",     Icon: ChefHat         },
  { id: "roles",     label: "User Roles",         meta: "Access Control",   Icon: Users           },
  { id: "refdata",   label: "Reference Data",     meta: "Catalog & Lookup", Icon: Database        },
  { id: "library",   label: "Recipe Library",     meta: "Import & Publish", Icon: BookOpen        },
  { id: "community", label: "Community Review",   meta: "Approvals",        Icon: MessageSquare   },
  { id: "trash",     label: "Trash",              meta: "Deleted Items",    Icon: Trash2          },
];

// ── Helpers ────────────────────────────────────────────────────────────

function StatusBadge({ tone = "neutral", children }) {
  return <span className={`recipe-status-badge ${tone}`}>{children}</span>;
}

function Stars({ value = 0 }) {
  const full = Math.round(value);
  return (
    <span className="admin-stars">
      {"★".repeat(full)}{"☆".repeat(5 - full)}
    </span>
  );
}

function Spinner() {
  return <Loader2 size={16} className="admin-spinner" />;
}

function LoadingOverlay() {
  return (
    <div className="admin-loading-overlay">
      <Loader2 size={20} className="admin-spinner" />
      Loading…
    </div>
  );
}

function useFilteredRows(rows, filters) {
  return rows.filter((row) =>
    Object.entries(filters).every(([key, val]) => {
      if (!val) return true;
      const cell = String(row[key] ?? "").toLowerCase();
      return cell.includes(val.toLowerCase());
    })
  );
}

function normalizeHeader(h) {
  return String(h)
    .toLowerCase()
    .replace(/[\s\-\.]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseXlsxRows(buffer) {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
  const columnMap = {
    dish_name: "dish_name",
    meal_type: "meal_type",
    cuisine_hint: "cuisine_hint",
    cooking_method_hint: "cooking_method_hint",
    admin_notes: "admin_notes",
    recipe_name: "recipe_name",
    description: "description",
    difficulty: "difficulty",
    spice_level: "spice_level",
    prep_time_minutes: "prep_time_minutes",
    cook_time_minutes: "cook_time_minutes",
    servings: "servings",
    serving_size: "serving_size",
    calories: "calories",
    protein: "protein",
    fat: "fat",
    carbohydrates: "carbohydrates",
    fiber: "fiber",
    sugar: "sugar",
    sodium: "sodium",
    ingredients: "ingredients",
    instructions: "instructions",
    dietary_tags: "dietary_tags",
    allergens: "allergens",
    image_url: "image_url",
  };
  return raw.map((row) => {
    const normalized = {};
    Object.entries(row).forEach(([k, v]) => {
      normalized[normalizeHeader(k)] = v;
    });
    const mapped = {};
    Object.entries(columnMap).forEach(([field, norm]) => {
      if (normalized[norm] !== undefined) mapped[field] = normalized[norm];
    });
    return mapped;
  });
}

function exportToXlsx(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename);
}

function importQueueTone(status) {
  if (status === "imported") return "good";
  if (status === "enriching") return "info";
  if (status === "pending") return "warning";
  if (status === "failed") return "danger";
  return "neutral";
}

function importQueueProgress(status) {
  if (status === "imported") return 100;
  if (status === "enriching") return 55;
  if (status === "pending") return 10;
  if (status === "failed") return 0;
  return 0;
}

// ── Tab 1: KPI Dashboard ───────────────────────────────────────────────

function KpiDashboard({ userRecipes, userRoles, libraryRecipes, pendingCommunity }) {
  const cards = [
    {
      label: "Total Users",
      value: userRoles.length,
      icon: <Users size={20} />,
      tone: "blue",
    },
    {
      label: "Total Recipes",
      value: userRecipes.length,
      icon: <ChefHat size={20} />,
      tone: "green",
    },
    {
      label: "Published Library",
      value: libraryRecipes.filter((r) => r.status === "published" || r.is_published).length,
      icon: <BookOpen size={20} />,
      tone: "purple",
    },
    {
      label: "Pending Reviews",
      value: pendingCommunity.length,
      icon: <MessageSquare size={20} />,
      tone: "amber",
    },
  ];

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">KPI Dashboard</h1>
        <p className="admin-page-desc">Live snapshot across all data domains.</p>
      </div>
      <div className="admin-kpi-grid">
        {cards.map((c) => (
          <div key={c.label} className="admin-kpi-card">
            <div className={`admin-kpi-icon ${c.tone}`}>{c.icon}</div>
            <div className="admin-kpi-number">{c.value}</div>
            <div className="admin-kpi-label">{c.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Tab 2: User Recipes ────────────────────────────────────────────────

function UserRecipesTab({ rows, onVisibilityChange }) {
  const [filters, setFilters] = useState({
    id: "", recipe_name: "", user_id: "", cuisine: "",
    prep_time: "", servings: "", visibility: "",
  });
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState({});

  const filtered = useFilteredRows(rows, filters);

  function toggleAll(e) {
    setSelected(e.target.checked ? new Set(filtered.map((r) => r.id)) : new Set());
  }

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleVisibility(recipeId, visibility) {
    setSaving((p) => ({ ...p, [recipeId]: true }));
    try {
      await onVisibilityChange(recipeId, visibility);
      toast.success("Visibility updated");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving((p) => ({ ...p, [recipeId]: false }));
    }
  }

  function handleExport() {
    const exportRows = (selected.size > 0 ? filtered.filter((r) => selected.has(r.id)) : filtered)
      .map(({ id, recipe_name, user_id, cuisine, prep_time, servings, visibility, created_at }) => ({
        id, recipe_name, user_id, cuisine, prep_time, servings, visibility, created_at,
      }));
    exportToXlsx(exportRows, "user-recipes.xlsx");
  }

  const setFilter = (key) => (e) => setFilters((p) => ({ ...p, [key]: e.target.value }));

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">User-Created Recipes</h1>
        <p className="admin-page-desc">{rows.length} total recipes across all users.</p>
      </div>
      <div className="admin-toolbar">
        {selected.size > 0 && (
          <span className="recipe-status-badge info">{selected.size} selected</span>
        )}
        <div className="admin-toolbar-right">
          <button className="admin-btn admin-btn-secondary" onClick={handleExport}>
            <Download size={14} /> Export XLSX
          </button>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" className="admin-checkbox" onChange={toggleAll} checked={filtered.length > 0 && selected.size === filtered.length} /></th>
              <th>Recipe ID</th>
              <th>Recipe Name</th>
              <th>User ID</th>
              <th>Cuisine</th>
              <th>Prep Time</th>
              <th>Servings</th>
              <th>Visibility</th>
              <th>Created At</th>
              <th>Image</th>
            </tr>
            <tr className="excel-filter-row">
              <th />
              <th><input value={filters.id} onChange={setFilter("id")} placeholder="Filter…" /></th>
              <th><input value={filters.recipe_name} onChange={setFilter("recipe_name")} placeholder="Filter…" /></th>
              <th><input value={filters.user_id} onChange={setFilter("user_id")} placeholder="Filter…" /></th>
              <th><input value={filters.cuisine} onChange={setFilter("cuisine")} placeholder="Filter…" /></th>
              <th><input value={filters.prep_time} onChange={setFilter("prep_time")} placeholder="Filter…" /></th>
              <th><input value={filters.servings} onChange={setFilter("servings")} placeholder="Filter…" /></th>
              <th>
                <select value={filters.visibility} onChange={setFilter("visibility")}>
                  <option value="">All</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="community">Community</option>
                </select>
              </th>
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="admin-empty">No recipes found.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><input type="checkbox" className="admin-checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} /></td>
                <td style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "#64748b" }}>{r.id}</td>
                <td>
                  <div className="admin-recipe-cell">
                    {r.image_url && <img src={r.image_url} alt="" className="admin-thumb" />}
                    <span className="admin-recipe-name">{r.recipe_name || "—"}</span>
                  </div>
                </td>
                <td style={{ fontSize: "0.76rem", color: "#64748b" }}>{r.user_id}</td>
                <td>{r.cuisine || "—"}</td>
                <td>{r.prep_time ? `${r.prep_time} min` : "—"}</td>
                <td>{r.servings ?? "—"}</td>
                <td>
                  {saving[r.id] ? (
                    <Spinner />
                  ) : (
                    <select
                      className="admin-inline-select"
                      value={r.visibility || "private"}
                      onChange={(e) => handleVisibility(r.id, e.target.value)}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                      <option value="community">Community</option>
                    </select>
                  )}
                </td>
                <td style={{ fontSize: "0.76rem", color: "#64748b" }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                </td>
                <td>
                  {r.image_url
                    ? <StatusBadge tone="good">Yes</StatusBadge>
                    : <StatusBadge tone="neutral">No</StatusBadge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Tab 3: User Roles ──────────────────────────────────────────────────

function UserRolesTab({ rows, onRoleChange }) {
  const [filters, setFilters] = useState({ id: "", display_name: "", email: "", role: "" });
  const [pendingRoles, setPendingRoles] = useState({});
  const [saving, setSaving] = useState({});

  const filtered = useFilteredRows(rows, filters);
  const setFilter = (key) => (e) => setFilters((p) => ({ ...p, [key]: e.target.value }));

  async function saveRole(userId) {
    const role = pendingRoles[userId];
    if (!role) return;
    setSaving((p) => ({ ...p, [userId]: true }));
    try {
      await onRoleChange(userId, role);
      toast.success("Role updated");
      setPendingRoles((p) => { const n = { ...p }; delete n[userId]; return n; });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving((p) => ({ ...p, [userId]: false }));
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">User Roles</h1>
        <p className="admin-page-desc">Manage roles and access for {rows.length} users.</p>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Display Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Account Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
            <tr className="excel-filter-row">
              <th><input value={filters.id} onChange={setFilter("id")} placeholder="Filter…" /></th>
              <th><input value={filters.display_name} onChange={setFilter("display_name")} placeholder="Filter…" /></th>
              <th><input value={filters.email} onChange={setFilter("email")} placeholder="Filter…" /></th>
              <th>
                <select value={filters.role} onChange={setFilter("role")}>
                  <option value="">All</option>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="moderator">moderator</option>
                </select>
              </th>
              <th /><th /><th />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="admin-empty">No users found.</td></tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id}>
                <td style={{ fontFamily: "monospace", fontSize: "0.76rem", color: "#64748b" }}>{u.id}</td>
                <td style={{ fontWeight: 500 }}>{u.display_name || u.name || "—"}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    className="admin-inline-select"
                    value={pendingRoles[u.id] ?? u.role ?? "user"}
                    onChange={(e) => setPendingRoles((p) => ({ ...p, [u.id]: e.target.value }))}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="moderator">moderator</option>
                  </select>
                </td>
                <td>
                  <StatusBadge tone={u.is_active || u.status === "active" ? "good" : "danger"}>
                    {u.status || (u.is_active ? "active" : "inactive")}
                  </StatusBadge>
                </td>
                <td style={{ fontSize: "0.76rem", color: "#64748b" }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                </td>
                <td>
                  {pendingRoles[u.id] && pendingRoles[u.id] !== u.role && (
                    <button
                      className="admin-btn admin-btn-primary"
                      style={{ padding: "4px 10px", fontSize: "0.76rem" }}
                      onClick={() => saveRole(u.id)}
                      disabled={saving[u.id]}
                    >
                      {saving[u.id] ? <Spinner /> : <><Check size={12} /> Save</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Tab 4: Reference Data ──────────────────────────────────────────────

function MealCatalogModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState(entry || { name: "", meal_type: "", cuisine: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="admin-modal-title">{entry?.id ? "Edit Meal" : "Add Meal"}</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[["name", "Name *"], ["meal_type", "Meal Type"], ["cuisine", "Cuisine"], ["description", "Description"]].map(([k, lbl]) => (
            <div className="admin-form-group" key={k}>
              <label className="admin-form-label">{lbl}</label>
              {k === "description"
                ? <textarea className="admin-form-textarea" value={form[k] || ""} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} />
                : <input className="admin-form-input" value={form[k] || ""} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} required={k === "name"} />
              }
            </div>
          ))}
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? <Spinner /> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IngredientModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState(entry || { name: "", unit: "", calories_per_unit: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="admin-modal-title">{entry?.id ? "Edit Ingredient" : "Add Ingredient"}</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[["name", "Name *"], ["unit", "Unit"], ["calories_per_unit", "Calories/Unit"]].map(([k, lbl]) => (
            <div className="admin-form-group" key={k}>
              <label className="admin-form-label">{lbl}</label>
              <input className="admin-form-input" value={form[k] || ""} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} required={k === "name"} />
            </div>
          ))}
          <div className="admin-modal-actions">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? <Spinner /> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReferenceDataTab({ refData, catalog, ingredients, onCatalogCreate, onCatalogUpdate, onCatalogDelete, onIngredientCreate, onIngredientUpdate, onIngredientDelete }) {
  const [catalogModal, setCatalogModal] = useState(null);
  const [ingredientModal, setIngredientModal] = useState(null);

  const refSections = refData ? Object.entries(refData) : [];

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Reference Data</h1>
        <p className="admin-page-desc">Lookup lists, meal catalog, and ingredients.</p>
      </div>

      {refSections.length > 0 && (
        <>
          <h3 className="admin-section-title">Lookup Lists</h3>
          <div className="admin-ref-grid">
            {refSections.map(([key, items]) => (
              <div key={key} className="admin-ref-panel">
                <div className="admin-ref-panel-header">{key.replace(/_/g, " ")}</div>
                <ul className="admin-ref-list">
                  {Array.isArray(items) && items.map((item, i) => (
                    <li key={i}>{typeof item === "object" ? item.name || item.label || JSON.stringify(item) : item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <hr className="admin-section-divider" />
        </>
      )}

      <div className="admin-toolbar">
        <h3 className="admin-section-title" style={{ margin: 0 }}>Meal Catalog</h3>
        <div className="admin-toolbar-right">
          <button className="admin-btn admin-btn-primary" onClick={() => setCatalogModal({})}>
            <Plus size={14} /> Add Meal
          </button>
        </div>
      </div>
      <div className="admin-table-wrap" style={{ marginBottom: 28 }}>
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Meal Type</th><th>Cuisine</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(!catalog || catalog.length === 0) && (
              <tr><td colSpan={4} className="admin-empty">No meal catalog entries.</td></tr>
            )}
            {(catalog || []).map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 500 }}>{item.name}</td>
                <td>{item.meal_type || "—"}</td>
                <td>{item.cuisine || "—"}</td>
                <td>
                  <div className="admin-crud-row-actions">
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "4px 8px" }}
                      onClick={() => setCatalogModal(item)}>
                      <Pencil size={12} />
                    </button>
                    <button className="admin-btn admin-btn-danger" style={{ padding: "4px 8px" }}
                      onClick={() => { if (window.confirm("Delete this meal?")) onCatalogDelete(item.id); }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-toolbar">
        <h3 className="admin-section-title" style={{ margin: 0 }}>Ingredients</h3>
        <div className="admin-toolbar-right">
          <button className="admin-btn admin-btn-primary" onClick={() => setIngredientModal({})}>
            <Plus size={14} /> Add Ingredient
          </button>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Unit</th><th>Calories/Unit</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(!ingredients || ingredients.length === 0) && (
              <tr><td colSpan={4} className="admin-empty">No ingredients.</td></tr>
            )}
            {(ingredients || []).map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 500 }}>{item.name}</td>
                <td>{item.unit || "—"}</td>
                <td>{item.calories_per_unit ?? "—"}</td>
                <td>
                  <div className="admin-crud-row-actions">
                    <button className="admin-btn admin-btn-secondary" style={{ padding: "4px 8px" }}
                      onClick={() => setIngredientModal(item)}>
                      <Pencil size={12} />
                    </button>
                    <button className="admin-btn admin-btn-danger" style={{ padding: "4px 8px" }}
                      onClick={() => { if (window.confirm("Delete ingredient?")) onIngredientDelete(item.id); }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {catalogModal !== null && (
        <MealCatalogModal
          entry={catalogModal}
          onClose={() => setCatalogModal(null)}
          onSave={async (data) => {
            if (data.id) await onCatalogUpdate(data.id, data);
            else await onCatalogCreate(data);
          }}
        />
      )}
      {ingredientModal !== null && (
        <IngredientModal
          entry={ingredientModal}
          onClose={() => setIngredientModal(null)}
          onSave={async (data) => {
            if (data.id) await onIngredientUpdate(data.id, data);
            else await onIngredientCreate(data);
          }}
        />
      )}
    </>
  );
}

// ── Tab 5: Recipe Library ──────────────────────────────────────────────

function ImportQueueRow({ item, selected, onToggle, onApprove }) {
  const progress = importQueueProgress(item.enrichment_status || item.status);
  const tone = importQueueTone(item.enrichment_status || item.status);
  const isAnimating = (item.enrichment_status || item.status) === "enriching";

  return (
    <tr>
      <td><input type="checkbox" className="admin-checkbox" checked={selected} onChange={() => onToggle(item.id)} /></td>
      <td style={{ fontWeight: 500 }}>{item.dish_name || item.name}</td>
      <td>{item.meal_type || "—"}</td>
      <td>{item.cuisine_hint || "—"}</td>
      <td>
        <div className="import-status-panel">
          <StatusBadge tone={tone}>{item.enrichment_status || item.status || "pending"}</StatusBadge>
          <div className="import-status-bar-track">
            <div
              className={`import-status-bar-fill${isAnimating ? " animating" : ""}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </td>
      <td style={{ fontSize: "0.76rem", color: "#64748b" }}>
        {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
      </td>
      <td>
        {(item.enrichment_status || item.status) === "pending" && (
          <button className="admin-btn admin-btn-success" style={{ padding: "4px 10px", fontSize: "0.76rem" }}
            onClick={() => onApprove(item.id)}>
            <Check size={12} /> Approve
          </button>
        )}
      </td>
    </tr>
  );
}

function RecipeLibraryTab({ queue, library, onRefreshQueue, onRefreshLibrary }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [actionBusy, setActionBusy] = useState({});

  function toggleQueueRow(id) {
    setSelectedQueue((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const rows = parseXlsxRows(new Uint8Array(buf));
      if (rows.length === 0) { toast.error("No rows found in file"); return; }
      await importRecipeLibraryDishRows(rows);
      toast.success(`Imported ${rows.length} rows`);
      onRefreshQueue();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleBulkApprove() {
    if (selectedQueue.size === 0) { toast.error("Select rows to approve"); return; }
    setBulkApproving(true);
    try {
      await approveRecipeLibraryImportQueueRows([...selectedQueue]);
      toast.success("Approved");
      setSelectedQueue(new Set());
      onRefreshQueue();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBulkApproving(false);
    }
  }

  async function handleSingleApprove(id) {
    setActionBusy((p) => ({ ...p, [id]: true }));
    try {
      await approveRecipeLibraryImportQueueRows([id]);
      toast.success("Approved");
      onRefreshQueue();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionBusy((p) => ({ ...p, [id]: false }));
    }
  }

  async function handlePublish(id) {
    setActionBusy((p) => ({ ...p, [`pub_${id}`]: true }));
    try {
      await publishRecipeLibraryCatalog(id);
      toast.success("Published");
      onRefreshLibrary();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionBusy((p) => ({ ...p, [`pub_${id}`]: false }));
    }
  }

  async function handleUnpublish(id) {
    setActionBusy((p) => ({ ...p, [`upub_${id}`]: true }));
    try {
      await unpublishRecipeLibraryCatalog(id);
      toast.success("Unpublished");
      onRefreshLibrary();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionBusy((p) => ({ ...p, [`upub_${id}`]: false }));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Move to trash?")) return;
    try {
      await deleteRecipeLibraryItem(id);
      toast.success("Moved to trash");
      onRefreshLibrary();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDownloadTemplate() {
    try {
      await downloadRecipeLibraryImportTemplate();
    } catch {
      // fallback: generate a minimal template locally
      const cols = [
        "dish_name","meal_type","cuisine_hint","cooking_method_hint","admin_notes",
        "recipe_name","description","difficulty","spice_level","prep_time_minutes",
        "cook_time_minutes","servings","serving_size","calories","protein","fat",
        "carbohydrates","fiber","sugar","sodium","ingredients","instructions",
        "dietary_tags","allergens","image_url",
      ];
      const ws = XLSX.utils.aoa_to_sheet([cols]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "recipe-library-import-template.xlsx");
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Recipe Library</h1>
        <p className="admin-page-desc">Import dishes, manage the AI enrichment queue, and publish.</p>
      </div>

      <div className="admin-toolbar" style={{ marginBottom: 20 }}>
        <label className="admin-btn admin-btn-primary" style={{ cursor: "pointer" }}>
          {uploading ? <><Spinner /> Importing…</> : <><Upload size={14} /> Upload XLSX</>}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploading} />
        </label>
        <button className="admin-btn admin-btn-secondary" onClick={handleDownloadTemplate}>
          <Download size={14} /> Template
        </button>
        <button className="admin-btn admin-btn-secondary" onClick={onRefreshQueue}>
          <RefreshCw size={14} /> Refresh Queue
        </button>
        {selectedQueue.size > 0 && (
          <button className="admin-btn admin-btn-success" onClick={handleBulkApprove} disabled={bulkApproving}>
            {bulkApproving ? <Spinner /> : <><Check size={14} /> Bulk Approve ({selectedQueue.size})</>}
          </button>
        )}
      </div>

      <h3 className="admin-section-title">Import Queue</h3>
      <div className="admin-table-wrap" style={{ marginBottom: 28 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th><input type="checkbox" className="admin-checkbox"
                onChange={(e) => setSelectedQueue(e.target.checked ? new Set(queue.map((r) => r.id)) : new Set())}
                checked={queue.length > 0 && selectedQueue.size === queue.length} /></th>
              <th>Dish Name</th>
              <th>Meal Type</th>
              <th>Cuisine</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.length === 0 && (
              <tr><td colSpan={7} className="admin-empty">Queue is empty.</td></tr>
            )}
            {queue.map((item) => (
              <ImportQueueRow
                key={item.id}
                item={item}
                selected={selectedQueue.has(item.id)}
                onToggle={toggleQueueRow}
                onApprove={handleSingleApprove}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-toolbar">
        <h3 className="admin-section-title" style={{ margin: 0 }}>Published Library</h3>
        <div className="admin-toolbar-right">
          <button className="admin-btn admin-btn-secondary" onClick={onRefreshLibrary}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Meal Type</th><th>Cuisine</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {library.length === 0 && (
              <tr><td colSpan={5} className="admin-empty">No library recipes.</td></tr>
            )}
            {library.map((r) => {
              const published = r.status === "published" || r.is_published;
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.name || r.recipe_name}</td>
                  <td>{r.meal_type || "—"}</td>
                  <td>{r.cuisine || "—"}</td>
                  <td>
                    <StatusBadge tone={published ? "good" : "neutral"}>
                      {published ? "published" : "draft"}
                    </StatusBadge>
                  </td>
                  <td>
                    <div className="admin-crud-row-actions">
                      {published ? (
                        <button className="admin-btn admin-btn-secondary" style={{ padding: "4px 8px" }}
                          disabled={actionBusy[`upub_${r.id}`]}
                          onClick={() => handleUnpublish(r.id)}>
                          {actionBusy[`upub_${r.id}`] ? <Spinner /> : <><EyeOff size={12} /> Unpublish</>}
                        </button>
                      ) : (
                        <button className="admin-btn admin-btn-success" style={{ padding: "4px 8px" }}
                          disabled={actionBusy[`pub_${r.id}`]}
                          onClick={() => handlePublish(r.id)}>
                          {actionBusy[`pub_${r.id}`] ? <Spinner /> : <><Eye size={12} /> Publish</>}
                        </button>
                      )}
                      <button className="admin-btn admin-btn-danger" style={{ padding: "4px 8px" }}
                        onClick={() => handleDelete(r.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Tab 6: Community Review ────────────────────────────────────────────

function CommunityReviewTab({ pending, onRefreshPending }) {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("");
  const [pendingFilter, setPendingFilter] = useState("");
  const [actionBusy, setActionBusy] = useState({});

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    setReviewsLoading(true);
    try {
      const data = await fetchRecipeReviewFeed();
      setReviews(Array.isArray(data) ? data : []);
    } catch { setReviews([]); }
    finally { setReviewsLoading(false); }
  }

  async function handleApprove(id) {
    setActionBusy((p) => ({ ...p, [id]: "approve" }));
    try {
      await approveCommunityRecipe(id);
      toast.success("Approved");
      onRefreshPending();
    } catch (e) { toast.error(e.message); }
    finally { setActionBusy((p) => ({ ...p, [id]: null })); }
  }

  async function handleReject(id) {
    setActionBusy((p) => ({ ...p, [id]: "reject" }));
    try {
      await rejectCommunityRecipe(id);
      toast.success("Rejected");
      onRefreshPending();
    } catch (e) { toast.error(e.message); }
    finally { setActionBusy((p) => ({ ...p, [id]: null })); }
  }

  async function handleDeleteReview(reviewId) {
    if (!window.confirm("Delete this review?")) return;
    try {
      await deleteRecipeReviewByAdmin(reviewId);
      toast.success("Review deleted");
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (e) { toast.error(e.message); }
  }

  const filteredPending = pending.filter((r) =>
    !pendingFilter || (r.recipe_name || r.name || "").toLowerCase().includes(pendingFilter.toLowerCase())
  );

  const filteredReviews = reviews.filter((r) =>
    !reviewFilter || (r.recipe_name || r.comment || "").toLowerCase().includes(reviewFilter.toLowerCase())
  );

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Community Review</h1>
        <p className="admin-page-desc">Approve community recipes and moderate ratings.</p>
      </div>

      <h3 className="admin-section-title">Pending Community Recipes</h3>
      <div className="admin-filter-panel" style={{ marginBottom: 12 }}>
        <input className="admin-filter-input" placeholder="Search by name…"
          value={pendingFilter} onChange={(e) => setPendingFilter(e.target.value)} />
        <button className="admin-btn admin-btn-secondary" onClick={onRefreshPending}>
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="admin-table-wrap" style={{ marginBottom: 28 }}>
        <table className="admin-table">
          <thead>
            <tr><th>Recipe</th><th>Submitted By</th><th>Cuisine</th><th>Submitted</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filteredPending.length === 0 && (
              <tr><td colSpan={5} className="admin-empty">No pending recipes.</td></tr>
            )}
            {filteredPending.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="admin-recipe-cell">
                    {r.image_url && <img src={r.image_url} alt="" className="admin-thumb" />}
                    <span className="admin-recipe-name">{r.recipe_name || r.name}</span>
                  </div>
                </td>
                <td>{r.submitted_by || r.user_id || "—"}</td>
                <td>{r.cuisine || "—"}</td>
                <td style={{ fontSize: "0.76rem", color: "#64748b" }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                </td>
                <td>
                  <div className="admin-crud-row-actions">
                    <button className="admin-btn admin-btn-success" style={{ padding: "4px 10px" }}
                      disabled={actionBusy[r.id] === "approve"}
                      onClick={() => handleApprove(r.id)}>
                      {actionBusy[r.id] === "approve" ? <Spinner /> : <><Check size={12} /> Approve</>}
                    </button>
                    <button className="admin-btn admin-btn-danger" style={{ padding: "4px 10px" }}
                      disabled={actionBusy[r.id] === "reject"}
                      onClick={() => handleReject(r.id)}>
                      {actionBusy[r.id] === "reject" ? <Spinner /> : <><X size={12} /> Reject</>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="admin-section-title">Recipe Reviews &amp; Ratings</h3>
      <div className="admin-filter-panel" style={{ marginBottom: 12 }}>
        <input className="admin-filter-input" placeholder="Search reviews…"
          value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)} />
        <button className="admin-btn admin-btn-secondary" onClick={loadReviews}>
          <RefreshCw size={14} />
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Recipe</th><th>User</th><th>Rating</th><th>Comment</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {reviewsLoading && (
              <tr><td colSpan={6}><LoadingOverlay /></td></tr>
            )}
            {!reviewsLoading && filteredReviews.length === 0 && (
              <tr><td colSpan={6} className="admin-empty">No reviews found.</td></tr>
            )}
            {!reviewsLoading && filteredReviews.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 500 }}>{r.recipe_name || r.recipe_id || "—"}</td>
                <td>{r.user_name || r.user_id || "—"}</td>
                <td><Stars value={r.rating} /></td>
                <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.comment || "—"}
                </td>
                <td style={{ fontSize: "0.76rem", color: "#64748b" }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                </td>
                <td>
                  <button className="admin-btn admin-btn-danger" style={{ padding: "4px 8px" }}
                    onClick={() => handleDeleteReview(r.id)}>
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Tab 7: Trash ───────────────────────────────────────────────────────

function TrashTab() {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRecipeLibraryAdmin();
      const trashed = (Array.isArray(data) ? data : []).filter((r) => r.deleted_at || r.is_deleted || r.status === "deleted");
      setTrashItems(trashed);
    } catch { setTrashItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRecover(id) {
    setActionBusy((p) => ({ ...p, [`rec_${id}`]: true }));
    try {
      await recoverRecipeLibraryItem(id);
      toast.success("Recovered");
      setTrashItems((prev) => prev.filter((r) => r.id !== id));
    } catch (e) { toast.error(e.message); }
    finally { setActionBusy((p) => ({ ...p, [`rec_${id}`]: false })); }
  }

  async function handlePermanentDelete(id) {
    if (!window.confirm("Permanently delete? This cannot be undone.")) return;
    setActionBusy((p) => ({ ...p, [`del_${id}`]: true }));
    try {
      await permanentlyDeleteRecipeLibraryItem(id);
      toast.success("Permanently deleted");
      setTrashItems((prev) => prev.filter((r) => r.id !== id));
    } catch (e) { toast.error(e.message); }
    finally { setActionBusy((p) => ({ ...p, [`del_${id}`]: false })); }
  }

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-title">Trash</h1>
        <p className="admin-page-desc">Soft-deleted library items. Recover or permanently remove.</p>
      </div>
      <div className="admin-toolbar">
        <button className="admin-btn admin-btn-secondary" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {loading ? (
        <LoadingOverlay />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Meal Type</th><th>Deleted At</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {trashItems.length === 0 && (
                <tr><td colSpan={4} className="admin-empty">Trash is empty.</td></tr>
              )}
              {trashItems.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.name || r.recipe_name}</td>
                  <td>{r.meal_type || "—"}</td>
                  <td style={{ fontSize: "0.76rem", color: "#64748b" }}>
                    {r.deleted_at ? new Date(r.deleted_at).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <div className="admin-crud-row-actions">
                      <button className="admin-btn admin-btn-success" style={{ padding: "4px 10px" }}
                        disabled={actionBusy[`rec_${r.id}`]}
                        onClick={() => handleRecover(r.id)}>
                        {actionBusy[`rec_${r.id}`] ? <Spinner /> : <><RefreshCw size={12} /> Recover</>}
                      </button>
                      <button className="admin-btn admin-btn-danger" style={{ padding: "4px 10px" }}
                        disabled={actionBusy[`del_${r.id}`]}
                        onClick={() => handlePermanentDelete(r.id)}>
                        {actionBusy[`del_${r.id}`] ? <Spinner /> : <><Trash2 size={12} /> Delete</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Access Denied ──────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12, color: "#64748b" }}>
      <AlertCircle size={40} color="#ef4444" />
      <h2 style={{ margin: 0, color: "#0f172a" }}>Access Denied</h2>
      <p style={{ margin: 0 }}>You must be an administrator to view this page.</p>
    </div>
  );
}

// ── Root Component ─────────────────────────────────────────────────────

export default function AdminDataCenter() {
  const { currentUser, authReady } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState("kpi");

  // Shared data loaded once and shared across tabs
  const [userRecipes, setUserRecipes] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [refData, setRefData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [library, setLibrary] = useState([]);
  const [queue, setQueue] = useState([]);
  const [pendingCommunity, setPendingCommunity] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin =
    process.env.NODE_ENV !== "production" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? true
      : authReady && currentUser && String(currentUser.role || "").toLowerCase() === "admin";

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        fetchAllUserRecipes(),
        fetchAdminUserRoles(),
        fetchReferenceData(),
        fetchMealCatalog(),
        fetchMealIngredientsMap(),
        fetchRecipeLibraryAdmin(),
        fetchRecipeLibraryImportQueue(),
        fetchPendingCommunityRecipes(),
      ]);

      if (results[0].status === "fulfilled") setUserRecipes(Array.isArray(results[0].value) ? results[0].value : []);
      if (results[1].status === "fulfilled") setUserRoles(Array.isArray(results[1].value) ? results[1].value : []);
      if (results[2].status === "fulfilled") setRefData(results[2].value || null);
      if (results[3].status === "fulfilled") setCatalog(Array.isArray(results[3].value) ? results[3].value : []);
      if (results[4].status === "fulfilled") setIngredients(Array.isArray(results[4].value) ? results[4].value : []);
      if (results[5].status === "fulfilled") setLibrary(Array.isArray(results[5].value) ? results[5].value : []);
      if (results[6].status === "fulfilled") setQueue(Array.isArray(results[6].value) ? results[6].value : []);
      if (results[7].status === "fulfilled") setPendingCommunity(Array.isArray(results[7].value) ? results[7].value : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin, loadAll]);

  if (!authReady) return null;
  if (!isAdmin) return <AccessDenied />;

  async function refreshLibrary() {
    const [lib, q] = await Promise.allSettled([fetchRecipeLibraryAdmin(), fetchRecipeLibraryImportQueue()]);
    if (lib.status === "fulfilled") setLibrary(Array.isArray(lib.value) ? lib.value : []);
    if (q.status === "fulfilled") setQueue(Array.isArray(q.value) ? q.value : []);
  }

  async function refreshQueue() {
    try {
      const q = await fetchRecipeLibraryImportQueue();
      setQueue(Array.isArray(q) ? q : []);
    } catch { /**/ }
  }

  async function refreshPending() {
    try {
      const p = await fetchPendingCommunityRecipes();
      setPendingCommunity(Array.isArray(p) ? p : []);
    } catch { /**/ }
  }

  const pendingCount = pendingCommunity.length;

  return (
    <div className="admin-shell">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">NutriHelp Admin</div>
          <div className="admin-sidebar-sub">Data Center</div>
        </div>
        <nav className="admin-sidebar-nav">
          {TABS.map(({ id, label, meta, Icon }) => (
            <button
              key={id}
              className={`admin-side-item${activeTab === id ? " active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <div className="admin-side-icon">
                <Icon size={16} />
              </div>
              <div>
                <div className="admin-side-label">{label}</div>
                <div className="admin-side-meta">{meta}</div>
              </div>
              {id === "community" && pendingCount > 0 && (
                <span className="admin-side-badge">{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        {loading ? (
          <LoadingOverlay />
        ) : (
          <>
            {activeTab === "kpi" && (
              <KpiDashboard
                userRecipes={userRecipes}
                userRoles={userRoles}
                libraryRecipes={library}
                pendingCommunity={pendingCommunity}
              />
            )}

            {activeTab === "recipes" && (
              <UserRecipesTab
                rows={userRecipes}
                onVisibilityChange={async (id, vis) => {
                  await updateUserRecipeVisibility(id, vis);
                  setUserRecipes((prev) => prev.map((r) => r.id === id ? { ...r, visibility: vis } : r));
                }}
              />
            )}

            {activeTab === "roles" && (
              <UserRolesTab
                rows={userRoles}
                onRoleChange={async (userId, role) => {
                  await updateAdminUserRole(userId, role);
                  setUserRoles((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
                }}
              />
            )}

            {activeTab === "refdata" && (
              <ReferenceDataTab
                refData={refData}
                catalog={catalog}
                ingredients={ingredients}
                onCatalogCreate={async (data) => {
                  const item = await createMealCatalogEntry(data);
                  setCatalog((p) => [...p, item]);
                  toast.success("Meal added");
                }}
                onCatalogUpdate={async (id, data) => {
                  const item = await updateMealCatalogEntry(id, data);
                  setCatalog((p) => p.map((c) => c.id === id ? { ...c, ...item } : c));
                  toast.success("Meal updated");
                }}
                onCatalogDelete={async (id) => {
                  await deleteMealCatalogEntry(id);
                  setCatalog((p) => p.filter((c) => c.id !== id));
                  toast.success("Meal deleted");
                }}
                onIngredientCreate={async (data) => {
                  const item = await createMealIngredient(data);
                  setIngredients((p) => [...p, item]);
                  toast.success("Ingredient added");
                }}
                onIngredientUpdate={async (id, data) => {
                  const item = await updateMealIngredient(id, data);
                  setIngredients((p) => p.map((i) => i.id === id ? { ...i, ...item } : i));
                  toast.success("Ingredient updated");
                }}
                onIngredientDelete={async (id) => {
                  await deleteMealIngredient(id);
                  setIngredients((p) => p.filter((i) => i.id !== id));
                  toast.success("Ingredient deleted");
                }}
              />
            )}

            {activeTab === "library" && (
              <RecipeLibraryTab
                queue={queue}
                library={library}
                onRefreshQueue={refreshQueue}
                onRefreshLibrary={refreshLibrary}
              />
            )}

            {activeTab === "community" && (
              <CommunityReviewTab
                pending={pendingCommunity}
                onRefreshPending={refreshPending}
              />
            )}

            {activeTab === "trash" && <TrashTab />}
          </>
        )}
      </main>
    </div>
  );
}
