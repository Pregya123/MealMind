
export type ScreenType = 'HOME' | 'INVENTORY' | 'MEAL_LIST' | 'RECIPE_DETAIL' | 'ZERO_WASTE' | 'ERROR';

export interface UserPreferences {
  food_type: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan' | 'Eggetarian';
  diet_goals: string[];
  spice_level: 'Mild' | 'Medium' | 'Spicy' | 'Fiery';
  allergens: string[];
  baby_mode: boolean;
  baby_age?: string;
  pet_mode: boolean;
  pet_details?: string;
  preferred_cuisines: string[];
}

export interface InventoryItem {
  name: string;
  category: 'Produce' | 'Protein' | 'Dairy' | 'Pantry' | 'Frozen' | 'Leftover' | 'Bakery';
  days_remaining: number;
  quantity_estimate: string;
  storage_advice: string;
}

export interface ZeroWasteTip {
  item: string;
  tip: string;
}

export interface RecipeCard {
  recipe_id: string;
  recipe_name: string;
  food_type: string;
  diet_category: string;
  estimated_calories: string;
  ingredients_used: string[];
  allergen_warning?: string;
}

export interface RecipeDetail {
  recipe_name: string;
  servings: string;
  preparation_time: string;
  ingredients: { item: string; measurement: string }[];
  steps: string[];
  calorie_estimate: string;
  diet_suitability: string[];
  allergen_warning?: string;
  is_baby_safe: boolean;
  is_pet_safe: boolean;
  image_prompt: string;
}

export interface AppData {
  screen: ScreenType;
  data: any;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
