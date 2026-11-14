export interface CraftPreferences {
  cravingPrompt: string;
  flavorNotes: string[];
  roastLevel: string;
  milkAlternative: string;
  brewMethod: string;
  temperatureStyle: 'Hot' | 'Iced';
}

export interface BrewStep {
  stepNumber: number;
  title: string;
  instruction: string;
  durationSeconds: number;
  targetWaterGrams?: number;
}

export interface ShoppingItem {
  category: 'Coffee Beans' | 'Milk & Accents' | 'Brewing Equipment';
  item: string;
  quantity: string;
  note: string;
}

export interface PalateProfile {
  sweetness: number; // 1-10
  body: number; // 1-10
  acidity: number; // 1-10
  roastDepth: number; // 1-10
}

export interface CoffeeRecipe {
  drinkName: string;
  tagline: string;
  baristaNote: string;
  beanOrigin: string;
  roastProfile: string;
  milkPairing: string;
  brewMethod: string;
  vesselStyle: string;
  doseGrams: number;
  waterOrYieldMl: number;
  milkMl: number;
  waterTempC: number;
  grindSetting: string;
  totalBrewMinutesLabel: string;
  tastingNotes: string[];
  palateProfile: PalateProfile;
  brewSteps: BrewStep[];
  shoppingList: ShoppingItem[];
  visualPromptSpec: string;
}

export interface SavedRecipeRecord {
  id: string;
  userId: string;
  recipe: CoffeeRecipe;
  cravingSummary: string;
  isFavorite: boolean;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface BaristaChatMessage {
  id: string;
  role: 'user' | 'barista';
  text: string;
  updatedRecipe?: CoffeeRecipe;
}
