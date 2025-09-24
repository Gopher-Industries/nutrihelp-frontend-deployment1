// config.js
// Render-ready lookups using apiClient.js
// Adjust the import path if this file lives in a different folder.
import api, { fooddata } from "../../apiClient";

const ingredientListDB = {
  ingredient: [{ value: "", label: "", id: 0 }],
  category: [{ value: "", label: "", id: 0 }],
};

const cuisineListDB = [{ value: "", label: "", id: 0 }];

/**
 * Fetch ingredients from API and populate ingredientListDB.
 * - Adds unique ingredient names.
 * - Adds unique categories.
 */
export const getIngredientsList = async () => {
  try {
    const data = await fooddata.ingredients(); // GET /fooddata/ingredients

    // Use sets to avoid duplicates while preserving the first blank row.
    const seenIngredientIds = new Set();
    const seenCategories = new Set();

    // Keep the existing placeholder rows (index 0)
    ingredientListDB.ingredient = [{ value: "", label: "", id: 0 }];
    ingredientListDB.category = [{ value: "", label: "", id: 0 }];

    data.forEach((el) => {
      const id = el.id ?? el.ingredient_id ?? el._id ?? el.name; // fallback keys just in case
      const name = el.name ?? el.ingredient ?? "";
      const category = el.category ?? "Other";

      if (!seenIngredientIds.has(id) && name) {
        ingredientListDB.ingredient.push({ value: name, label: name, id });
        seenIngredientIds.add(id);
      }

      if (!seenCategories.has(category)) {
        ingredientListDB.category.push({ value: category, label: category, id });
        seenCategories.add(category);
      }
    });

    console.log("✅ Ingredients were fetched from API");
  } catch (error) {
    console.error("❌ Failed to fetch ingredients:", error?.message || error);
  }
};

/**
 * Fetch cuisines from API and populate cuisineListDB.
 */
export const getCuisineList = async () => {
  try {
    const data = await fooddata.cuisines(); // GET /fooddata/cuisines

    const seenCuisineNames = new Set();
    // Reset and keep placeholder
    cuisineListDB.length = 0;
    cuisineListDB.push({ value: "", label: "", id: 0 });

    data.forEach((el) => {
      const id = el.id ?? el.cuisine_id ?? el._id ?? el.name;
      const name = el.name ?? el.cuisine ?? "";
      if (name && !seenCuisineNames.has(name)) {
        cuisineListDB.push({ value: name, label: name, id });
        seenCuisineNames.add(name);
      }
    });

    console.log("✅ Cuisines were fetched from API");
  } catch (error) {
    console.error("❌ Failed to fetch cuisines:", error?.message || error);
  }
};

/* ---- Legacy manual lists (kept for fallback/local offline use). ---- */
export const cuisineList = [
  { value: "", label: "", id: 0 },
  { value: "Universal", label: "Universal" },
  { value: "French", label: "French" },
  { value: "Chinese", label: "Chinese" },
  { value: "Japanese", label: "Japanese" },
  { value: "Italian", label: "Italian" },
  { value: "Greek", label: "Greek" },
  { value: "Spanish", label: "Spanish" },
  { value: "Lebanese", label: "Lebanese" },
  { value: "Turkey", label: "Turkey" },
  { value: "Thai", label: "Thai" },
  { value: "Indian", label: "Indian" },
  { value: "Mexican", label: "Mexican" },
  { value: "Vietnamese", label: "Vietnamese" },
  { value: "Australian", label: "Australian" },
  { value: "Other", label: "Other" },
];

export const ingredientList = {
  ingredient: [
    { value: "", label: "", id: 0 },
    { value: "Fettuccine", label: "Fettuccine", id: 2 },
    { value: "Olive Oil", label: "Olive Oil", id: 3 },
    { value: "Chicken Thigh Fillets", label: "Chicken Thigh Fillets", id: 4 },
    { value: "Cherry tomatoes", label: "Cherry tomatoes", id: 5 },
    { value: "Pesto Sauce", label: "Pesto Sauce", id: 6 },
    { value: "Baby Rocket", label: "Baby Rocket", id: 7 },
    { value: "Salt", label: "Salt", id: 8 },
  ],
  category: [
    { value: "", label: "", id: 0 },
    { value: "Pantry", label: "Pantry", id: 2 },
    { value: "Pantry", label: "Pantry", id: 3 },
    { value: "Meat & seafood", label: "Meat & seafood", id: 4 },
    { value: "Fruit & vegetables", label: "Fruit & vegetables", id: 5 },
    { value: "Pantry", label: "Pantry", id: 6 },
    { value: "Fruit & vegetables", label: "Fruit & vegetables", id: 7 },
    { value: "Pantry", label: "Pantry", id: 8 },
  ],
};

export { cuisineListDB, ingredientListDB };
