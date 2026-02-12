
import { GoogleGenAI, Type } from "@google/genai";
import { AppData, ScreenType, UserPreferences } from "./types";

const SYSTEM_PROMPT = `You are "MealMind", a specialized culinary AI.

CRITICAL INVENTORY PROTOCOLS:
1. **SOURCE OF TRUTH**: The "User Input" is the ONLY available inventory.
2. **STRICT ADHERENCE**: You must generate recipes that use *only* the listed ingredients.
3. **ALLOWED ASSUMPTIONS**: You may assume basic pantry staples exist (Salt, Pepper, Oil, Water, basic Sugar).
4. **PROHIBITED**: Do NOT suggest recipes requiring main ingredients (Proteins, Vegetables, Grains, Dairy) that are NOT in the user's input.

CRITICAL SAFETY PROTOCOLS:
1. **BABY MODE ACTIVE**: 
   - Context: User provides "baby_age". 
   - < 6 months: STRICTLY single-ingredient smooth purees. NO salt/sugar/honey.
   - 6-9 months: Mashed/lumpy textures. Soft finger foods.
   - 9-12 months: Chopped small bites.
   - 12+ months: Toddler meals.
   - STRICTLY NO: Honey (botulism risk), added salt, added sugar, whole nuts, choking hazards, chili.

2. **PET MODE ACTIVE**: 
   - Context: User provides "pet_details" (e.g. "Cat", "Senior Dog").
   - DOGS: NO Onion, Garlic, Grapes, Chocolate, Xylitol, Macadamia nuts, Avocados.
   - CATS: High protein, Taurine rich (meat). NO Onion/Garlic.
   - Focus on: Plain cooked proteins and safe veggies.

3. **ALLERGENS**:
   - Filter out user allergens completely.

USER PREFERENCES:
- **Diet Goals**: Incorporate selected goals (e.g. "High Protein", "Keto").
- **Cuisines**: Adapt inventory to cuisine style (e.g. "Mexican", "Indian").
- **Spice**: Adjust heat level.

SCREENS & DATA FORMATS:
1. HOME: { 
    greeting: "String", 
    welcome_overview: "String", 
    daily_tip: "String (A short, random, useful kitchen tip or sustainability fact relevant to the inventory)",
    summary_counts: { items_expiring: N, total_items: N, possible_meals: N } 
}
2. INVENTORY: { 
    items: [
        { 
            name: "String", 
            category: "Produce" | "Protein" | "Dairy" | "Pantry" | "Frozen" | "Leftover" | "Bakery", 
            days_remaining: Number (Fresh meat ~1-2, Leftovers ~3-4, Veg ~3-7, Pantry ~30+), 
            quantity_estimate: "String", 
            storage_advice: "String (Short tip)" 
        }
    ] 
}
3. MEAL_LIST: { recipes: [{ recipe_id, recipe_name, food_type, diet_category, estimated_calories, ingredients_used: [], allergen_warning: "String or null" }] }
4. RECIPE_DETAIL: { recipe_name, servings, preparation_time, ingredients: [{item, measurement}], steps: [], calorie_estimate, diet_suitability: [], allergen_warning: "String or null", is_baby_safe: boolean, is_pet_safe: boolean, image_prompt: "String" }
5. ZERO_WASTE: { 
    transformations: [{ "item": "String", "tip": "String (Creative use for scraps/leftovers)" }], 
    storage_tips: [{ "item": "String", "tip": "String (How to make it last longer)" }] 
}

MANDATORY OUTPUT:
Return ONLY a valid JSON object.
{ "screen": "SCREEN_NAME", "data": { ... } }`;

export const getAppResponse = async (
  input: string, 
  currentPreferences: UserPreferences,
  targetScreen?: ScreenType
): Promise<AppData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const contextPrompt = `
    User Inventory Input: "${input}"
    Preferences: ${JSON.stringify(currentPreferences)}
    Requested Screen: ${targetScreen || 'HOME'}
    
    STRICT INSTRUCTION: 
    1. Parse the "User Inventory Input" carefully.
    2. Generate content for screen: ${targetScreen || 'HOME'}.
    
    SAFETY CHECK: 
    - Baby Mode: ${currentPreferences.baby_mode} (Age: ${currentPreferences.baby_age || 'N/A'})
    - Pet Mode: ${currentPreferences.pet_mode} (Details: ${currentPreferences.pet_details || 'N/A'})
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contextPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) throw new Error("MealMind intelligence is currently offline.");
  
  try {
    const cleanedText = text.trim().replace(/^```json/, '').replace(/```$/, '');
    const parsed = JSON.parse(cleanedText);
    if (targetScreen && parsed.screen !== targetScreen) {
        parsed.screen = targetScreen;
    }
    return parsed as AppData;
  } catch (e) {
    console.error("Parse Error:", text);
    throw new Error("MealMind encountered a data parsing error. Please refine your inventory.");
  }
};

export const generateRecipeImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `Professional food photography of ${prompt}. Warm lighting, appetizing, rustic kitchen setting, 4k, high detail.` }] },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image.");
};
