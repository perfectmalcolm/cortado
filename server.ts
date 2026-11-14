import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const recipeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    drinkName: { type: Type.STRING, description: 'Creative, enticing specialty coffee drink name (max 80 chars).' },
    tagline: { type: Type.STRING, description: 'Crisp 1-line flavor and texture summary.' },
    baristaNote: {
      type: Type.STRING,
      description:
        'Trendy, warm, knowledgeable barista guidance explaining why these beans, roast extraction temperature, and milk pairing fit the user palate without unwanted bitterness or sourness.',
    },
    beanOrigin: { type: Type.STRING, description: 'Recommended origin, varietal, and processing method (e.g., Brazil Cerrado Natural or Colombia Huila Washed).' },
    roastProfile: { type: Type.STRING, description: 'Roast level and why its development curve matches the user taste.' },
    milkPairing: { type: Type.STRING, description: 'Milk or plant-based milk pairing, ideal steaming/frothing temp, and texture.' },
    brewMethod: { type: Type.STRING, description: 'Recommended brewing method (e.g., Moka Pot, V60 Pour-Over, AeroPress, Espresso, French Press).' },
    vesselStyle: { type: Type.STRING, description: 'Ideal serving cup or glassware (e.g., Pre-warmed 6oz stoneware Gibraltar glass).' },
    doseGrams: { type: Type.NUMBER, description: 'Coffee dose in grams (e.g., 18).' },
    waterOrYieldMl: { type: Type.NUMBER, description: 'Brew water or espresso yield in ml (e.g., 90 for strong concentrate or 280 for filter).' },
    milkMl: { type: Type.NUMBER, description: 'Milk volume in ml (0 if black coffee).' },
    waterTempC: { type: Type.NUMBER, description: 'Target brew water temperature in Celsius (e.g., 91).' },
    grindSetting: { type: Type.STRING, description: 'Grind coarseness (e.g., Medium-fine, table salt texture).' },
    totalBrewMinutesLabel: { type: Type.STRING, description: 'Total time string such as "3m 30s".' },
    tastingNotes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 to 5 concise tasting notes (e.g., ["Dark Cocoa", "Toasted Hazelnut", "Brown Sugar"]).',
    },
    palateProfile: {
      type: Type.OBJECT,
      properties: {
        sweetness: { type: Type.NUMBER, description: '1-10 scale.' },
        body: { type: Type.NUMBER, description: '1-10 scale.' },
        acidity: { type: Type.NUMBER, description: '1-10 scale.' },
        roastDepth: { type: Type.NUMBER, description: '1-10 scale.' },
      },
      required: ['sweetness', 'body', 'acidity', 'roastDepth'],
    },
    brewSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          title: { type: Type.STRING, description: 'Concise step title like "Pour 1: Blooming" or "Main Extraction".' },
          instruction: { type: Type.STRING, description: 'Clear actionable instruction for this timed phase.' },
          durationSeconds: { type: Type.INTEGER, description: 'Duration of this step in seconds (10 to 300).' },
          targetWaterGrams: { type: Type.NUMBER, description: 'Optional cumulative water weight in grams if applicable.' },
        },
        required: ['stepNumber', 'title', 'instruction', 'durationSeconds'],
      },
      description: '3 to 6 sequential, timed steps tailored specifically to the brew method.',
    },
    shoppingList: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: 'Must be one of: "Coffee Beans", "Milk & Accents", "Brewing Equipment".' },
          item: { type: Type.STRING },
          quantity: { type: Type.STRING },
          note: { type: Type.STRING },
        },
        required: ['category', 'item', 'quantity', 'note'],
      },
      description: '4 to 8 grocery and equipment items needed to craft this drink at home.',
    },
    visualPromptSpec: {
      type: Type.STRING,
      description: 'Detailed visual description of the finished beverage, crema/foam art, vessel, and warm cafe surface for image generation.',
    },
  },
  required: [
    'drinkName',
    'tagline',
    'baristaNote',
    'beanOrigin',
    'roastProfile',
    'milkPairing',
    'brewMethod',
    'vesselStyle',
    'doseGrams',
    'waterOrYieldMl',
    'milkMl',
    'waterTempC',
    'grindSetting',
    'totalBrewMinutesLabel',
    'tastingNotes',
    'palateProfile',
    'brewSteps',
    'shoppingList',
    'visualPromptSpec',
  ],
};

const BARISTA_SYSTEM_INSTRUCTION = `You are Mateo, a trendy, warm, deeply knowledgeable specialty coffee head barista and roaster at Cortado Atelier.
You guide guests with effortless precision through choosing single-origin or blended coffee beans, roast profiles, extraction parameters, and milk or plant-based milk alternatives based on their flavor cravings.
Key craft rules:
- Match extraction temperature and grind size carefully: for dark roasts or anti-bitterness requests, recommend slightly lower brew water temps (88-91°C) and shorter contact times so chocolate/nutty sweetness shines without ashiness or sourness.
- For oat or plant-based milks, recommend Barista Edition oat milk steamed to 58-62°C (never over 65°C) to preserve natural malty sweetness and glossy microfoam.
- Ensure every brewStep has realistic, practical durationSeconds (summing roughly to totalBrewMinutesLabel) so the interactive Brew Timer guides the user smoothly from bloom/prep through pour/extraction and milk finishing.
- Ensure shoppingList categorizes items strictly into "Coffee Beans", "Milk & Accents", and "Brewing Equipment".
- Keep tone charismatic, approachable, and genuinely expert—never robotic.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/barista/craft', async (req: Request, res: Response) => {
    try {
      const {
        cravingPrompt = '',
        flavorNotes = [],
        roastLevel = 'Barista Choice',
        milkAlternative = 'Barista Choice',
        brewMethod = 'Barista Choice',
        temperatureStyle = 'Hot',
      } = req.body ?? {};

      const ai = getAiClient();
      const userPrompt = `Craft a tailored specialty coffee recipe for this guest:
- Guest craving & notes: ${cravingPrompt || 'Balanced, café-quality specialty coffee crafted to their profile.'}
- Flavor profile tags: ${Array.isArray(flavorNotes) && flavorNotes.length > 0 ? flavorNotes.join(', ') : 'Balanced sweetness and depth'}
- Roast preference: ${roastLevel}
- Milk / alternative preference: ${milkAlternative}
- Preferred brew method: ${brewMethod}
- Serving style: ${temperatureStyle}

Return a complete, dialed-in specialty recipe with timed brew steps and a categorized shopping list.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction: BARISTA_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: recipeResponseSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'The barista model returned an empty recipe. Please try again.' });
        return;
      }

      const recipe = JSON.parse(rawText);
      res.json({ recipe });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to craft coffee recipe.';
      console.error('Craft API error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/barista/chat', async (req: Request, res: Response) => {
    try {
      const { message = '', currentRecipe = null, history = [] } = req.body ?? {};
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'A message for the barista is required.' });
        return;
      }

      const ai = getAiClient();
      const chatSchema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: 'Conversational, helpful response from Mateo the barista answering the question or explaining the recipe adjustment.',
          },
          shouldUpdateRecipe: {
            type: Type.BOOLEAN,
            description: 'True if the user requested a change to the drink, beans, milk, brew method, temperature, or sweetness.',
          },
          updatedRecipe: recipeResponseSchema,
        },
        required: ['reply', 'shouldUpdateRecipe'],
      };

      const historySummary = Array.isArray(history)
        ? history
            .slice(-6)
            .map((h: { role?: string; text?: string }) => `${h.role === 'user' ? 'Guest' : 'Barista'}: ${h.text ?? ''}`)
            .join('\n')
        : '';

      const prompt = `Current active recipe JSON:
${JSON.stringify(currentRecipe)}

Recent conversation:
${historySummary}

Guest's new message: "${message}"

If the guest is asking a question (e.g., about grind size, milk frothing, or flavor chemistry), answer warmly and set shouldUpdateRecipe to false (still omit or leave updatedRecipe unchanged).
If the guest asks to modify the drink (e.g., "Make it iced", "Swap to AeroPress", "Less bitter", "Use almond milk"), set shouldUpdateRecipe to true and provide the complete updatedRecipe with recalculated brewSteps and shoppingList.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: BARISTA_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: chatSchema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Barista response was empty. Please try again.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reach the barista.';
      console.error('Barista chat error:', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/barista/visualize', async (req: Request, res: Response) => {
    try {
      const { recipe } = req.body ?? {};
      if (!recipe || !recipe.drinkName) {
        res.status(400).json({ error: 'Recipe details are required to visualize the brew.' });
        return;
      }

      const ai = getAiClient();
      const visualPrompt = `Editorial specialty coffee studio photograph of a freshly crafted "${recipe.drinkName}".
Served in: ${recipe.vesselStyle || 'a handcrafted matte ceramic cup'}.
Beverage details: ${recipe.visualPromptSpec || `${recipe.brewMethod} with ${recipe.milkPairing}`}.
Tasting character: ${Array.isArray(recipe.tastingNotes) ? recipe.tastingNotes.join(', ') : 'rich espresso and silky milk'}.
Setting: Warm walnut and pale limestone cafe counter with soft natural morning window light, gentle steam, shallow depth of field, Leica 35mm food photography, realistic condensation or glossy microfoam latte art, no text or watermarks.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: visualPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '4:3',
          },
        },
      });

      let imageUrl: string | null = null;
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) {
        res.status(502).json({ error: 'No brew image was generated. Please try again.' });
        return;
      }

      res.json({ imageUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate coffee portrait.';
      console.error('Visualize brew error:', err);
      res.status(500).json({ error: message });
    }
  });

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cortado Atelier server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
