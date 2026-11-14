import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BookmarkPlus,
  Check,
  Coffee,
  Copy,
  Image as ImageIcon,
  Loader2,
  Send,
  ShoppingBag,
  Sparkles,
  Timer,
} from 'lucide-react';
import heroBaristaImg from './assets/images/hero_barista_atelier_1794660309803.jpg';
import beanOriginImg from './assets/images/bean_single_origin_1794660309628.jpg';
import brewPourImg from './assets/images/brew_pour_over_1794660310789.jpg';
import { BrewTimerPanel } from './components/BrewTimerPanel';
import { ShoppingListDrawer } from './components/ShoppingListDrawer';
import { RecipeJournalSection } from './components/RecipeJournalSection';
import {
  deleteRecipeFromJournal,
  saveRecipeToJournal,
  signInWithGoogle,
  signOutUser,
  subscribeAuth,
  subscribeToRecipes,
  toggleFavoriteRecipe,
} from './lib/firebase';
import { formatShareRecipeText } from './lib/recipeUtils';
import type {
  BaristaChatMessage,
  CoffeeRecipe,
  CraftPreferences,
  SavedRecipeRecord,
} from './types/coffee';

const FLAVOR_OPTIONS = [
  'Chocolaty',
  'Nutty',
  'Sweet',
  'Bold',
  'Creamy',
  'Cozy',
  'Caramel',
  'Fruity',
  'Floral',
];

const ROAST_OPTIONS = ['Barista Choice', 'Light', 'Medium', 'Medium-Dark', 'Dark'];
const MILK_OPTIONS = ['Oat Milk (Barista)', 'Whole Milk', 'Almond Milk', 'Soy Milk', 'Coconut Milk', 'Black / No Milk'];
const BREW_METHOD_OPTIONS = ['Barista Choice', 'Moka Pot', 'AeroPress', 'Pour-Over (V60)', 'Espresso', 'French Press'];

const SAMPLE_CRAVING =
  "I really want a morning drink that's super strong but not too bitter. I love rich chocolaty and nutty flavors, but I hate sour or fruity notes. I'm using an oat milk alternative and have some dark roast beans. Give me something cozy!";

const INITIAL_SIGNATURE_RECIPE: CoffeeRecipe = {
  drinkName: 'Velvet Cacao & Toasted Oat Cortado',
  tagline: 'Double-strength dark roast extraction softened with caramelized oat microfoam and zero harsh bitterness.',
  baristaNote:
    'Dark roast beans turn bitter only when over-extracted with boiling water. By pulling a concentrated 1:3 ratio at 89°C instead of 96°C, we lock in dense dark chocolate and roasted hazelnut sugars while leaving ashy tannins behind—then fold in Barista Oat milk steamed to 60°C for a velvety, cozy finish.',
  beanOrigin: 'Brazil Cerrado Mineiro & Sumatra Mandheling Blend (Natural / Wet-Hulled)',
  roastProfile: 'Full Medium-Dark Roast — slow-developed past first crack for cocoa nib and praline sweetness without fruity acidity.',
  milkPairing: 'Barista Edition Oat Milk, steamed to 59°C with fine satin microfoam.',
  brewMethod: 'Moka Pot (Stovetop Concentrate)',
  vesselStyle: 'Pre-warmed 6oz stoneware Gibraltar tumbler',
  doseGrams: 20,
  waterOrYieldMl: 95,
  milkMl: 110,
  waterTempC: 89,
  grindSetting: 'Fine-Medium (table salt)',
  totalBrewMinutesLabel: '3m 45s',
  tastingNotes: ['Dark Chocolate', 'Toasted Hazelnut', 'Malted Oat', 'Brown Sugar'],
  palateProfile: {
    sweetness: 8,
    body: 9,
    acidity: 2,
    roastDepth: 8,
  },
  brewSteps: [
    {
      stepNumber: 1,
      title: 'Preheat & Fill Base',
      instruction: 'Fill the Moka Pot chamber with 89°C hot water up to just below the safety valve so grounds never scorch.',
      durationSeconds: 30,
      targetWaterGrams: 110,
    },
    {
      stepNumber: 2,
      title: 'Dose & Level Basket',
      instruction: 'Fill the filter basket with 20g dark roast coffee, tap gently to level—never tamp—and screw tightly onto base.',
      durationSeconds: 30,
    },
    {
      stepNumber: 3,
      title: 'Slow Stovetop Extraction',
      instruction: 'Brew over medium-low heat with lid open. Pull off heat the instant honey-thick crema turns pale gold.',
      durationSeconds: 120,
    },
    {
      stepNumber: 4,
      title: 'Steam & Fold Oat Milk',
      instruction: 'Warm 110ml Barista Oat milk to 59°C, froth to silky microfoam, and pour slowly into the dark concentrate.',
      durationSeconds: 45,
    },
  ],
  shoppingList: [
    {
      category: 'Coffee Beans',
      item: 'Dark Roast Brazil / Sumatra Whole Beans',
      quantity: '250g bag',
      note: 'Look for cocoa, almond, or roasted walnut notes',
    },
    {
      category: 'Milk & Accents',
      item: 'Barista Edition Oat Milk',
      quantity: '1 carton (1L)',
      note: 'Higher oat oil content steams without splitting',
    },
    {
      category: 'Milk & Accents',
      item: 'Unsweetened Dutch Cocoa Dust (Optional)',
      quantity: '1 small tin',
      note: 'Light dusting over foam for cozy aroma',
    },
    {
      category: 'Brewing Equipment',
      item: '3-Cup Moka Pot & Burr Grinder',
      quantity: '1 setup',
      note: 'Or use AeroPress with metal filter',
    },
    {
      category: 'Brewing Equipment',
      item: 'Handheld Frother or Steam Wand',
      quantity: '1 tool',
      note: 'For silky 60°C oat microfoam',
    },
  ],
  visualPromptSpec:
    'Double-strength dark espresso topped with glossy, velvety oat milk microfoam and delicate cocoa dusting inside a fluted stoneware Gibraltar glass on warm walnut wood.',
};

export default function App() {
  const [preferences, setPreferences] = useState<CraftPreferences>({
    cravingPrompt: '',
    flavorNotes: ['Chocolaty', 'Nutty', 'Cozy'],
    roastLevel: 'Dark',
    milkAlternative: 'Oat Milk (Barista)',
    brewMethod: 'Barista Choice',
    temperatureStyle: 'Hot',
  });

  const [activeRecipe, setActiveRecipe] = useState<CoffeeRecipe>(INITIAL_SIGNATURE_RECIPE);
  const [activeCravingSummary, setActiveCravingSummary] = useState<string>(
    'Atelier Signature — Rich chocolaty & nutty dark roast with oat milk',
  );
  const [isCrafting, setIsCrafting] = useState(false);
  const [craftError, setCraftError] = useState<string | null>(null);

  // Interactive Brew Timer signal
  const [timerStartSignal, setTimerStartSignal] = useState(0);

  // Shopping List Drawer
  const [shoppingOpen, setShoppingOpen] = useState(false);

  // Share Copy state
  const [recipeCopied, setRecipeCopied] = useState(false);

  // Visualize Brew AI Portrait state
  const [brewPortraitUrl, setBrewPortraitUrl] = useState<string | null>(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizeError, setVisualizeError] = useState<string | null>(null);

  // Barista Chat state
  const [chatHistory, setChatHistory] = useState<BaristaChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Firebase Auth & Recipe Journal state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [journalRecords, setJournalRecords] = useState<SavedRecipeRecord[]>([]);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAuth((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setJournalRecords([]);
      return;
    }
    setJournalError(null);
    const unsub = subscribeToRecipes(
      user.uid,
      (records) => setJournalRecords(records),
      (err) => setJournalError(err.message),
    );
    return unsub;
  }, [user]);

  const toggleFlavorNote = (note: string) => {
    setPreferences((prev) => {
      const exists = prev.flavorNotes.includes(note);
      return {
        ...prev,
        flavorNotes: exists
          ? prev.flavorNotes.filter((n) => n !== note)
          : [...prev.flavorNotes, note],
      };
    });
  };

  const handleApplySamplePrompt = () => {
    setPreferences({
      cravingPrompt: SAMPLE_CRAVING,
      flavorNotes: ['Chocolaty', 'Nutty', 'Bold', 'Cozy'],
      roastLevel: 'Dark',
      milkAlternative: 'Oat Milk (Barista)',
      brewMethod: 'Barista Choice',
      temperatureStyle: 'Hot',
    });
  };

  const handleCraftRecipe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsCrafting(true);
    setCraftError(null);
    setBrewPortraitUrl(null);
    setVisualizeError(null);
    setSavedNotice(null);

    try {
      const res = await fetch('/api/barista/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
      const data = await res.json();
      if (!res.ok || !data.recipe) {
        throw new Error(data.error || 'Could not craft coffee recipe.');
      }

      setActiveRecipe(data.recipe);
      const summary =
        preferences.cravingPrompt.trim() ||
        `${preferences.flavorNotes.join(', ')} · ${preferences.roastLevel} · ${preferences.milkAlternative}`;
      setActiveCravingSummary(summary);
      setChatHistory([
        {
          id: `b_${Date.now()}`,
          role: 'barista',
          text: `Dialed in "${data.recipe.drinkName}" for you. Ask me to tweak the strength, swap brew gear, or adjust the milk texture anytime.`,
        },
      ]);
    } catch (err) {
      setCraftError(err instanceof Error ? err.message : 'Unable to reach the barista.');
    } finally {
      setIsCrafting(false);
    }
  };

  const handleSendChat = async (customText?: string) => {
    const textToSend = (customText ?? chatInput).trim();
    if (!textToSend || isChatting) return;

    if (!customText) setChatInput('');
    const userMsg: BaristaChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: textToSend,
    };
    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    setIsChatting(true);

    try {
      const res = await fetch('/api/barista/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          currentRecipe: activeRecipe,
          history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Barista chat failed.');

      if (data.shouldUpdateRecipe && data.updatedRecipe) {
        setActiveRecipe(data.updatedRecipe);
        setBrewPortraitUrl(null);
        setSavedNotice(null);
      }

      setChatHistory((prev) => [
        ...prev,
        {
          id: `b_${Date.now()}`,
          role: 'barista',
          text: data.reply,
          updatedRecipe: data.shouldUpdateRecipe ? data.updatedRecipe : undefined,
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'barista',
          text: err instanceof Error ? err.message : 'Sorry, the espresso bar hit a snag—try again.',
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleStartBrewTimer = () => {
    setTimerStartSignal((n) => n + 1);
    document.getElementById('brew-timer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCopyShareRecipe = async () => {
    const formatted = formatShareRecipeText(activeRecipe);
    await navigator.clipboard.writeText(formatted);
    setRecipeCopied(true);
    window.setTimeout(() => setRecipeCopied(false), 2400);
  };

  const handleVisualizeBrew = async () => {
    setIsVisualizing(true);
    setVisualizeError(null);
    try {
      const res = await fetch('/api/barista/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: activeRecipe }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'Failed to render coffee portrait.');
      }
      setBrewPortraitUrl(data.imageUrl);
    } catch (err) {
      setVisualizeError(err instanceof Error ? err.message : 'Unable to generate image right now.');
    } finally {
      setIsVisualizing(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      setJournalError(err instanceof Error ? err.message : 'Sign-in failed.');
    }
  };

  const handleSaveToJournal = async () => {
    setJournalError(null);
    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await signInWithGoogle();
      } catch (err) {
        setJournalError(err instanceof Error ? err.message : 'Please sign in to save recipes.');
        return;
      }
    }
    setIsSavingJournal(true);
    try {
      await saveRecipeToJournal(currentUser.uid, activeRecipe, activeCravingSummary);
      setSavedNotice('Saved to Journal');
      window.setTimeout(() => setSavedNotice(null), 3000);
    } catch (err) {
      setJournalError(err instanceof Error ? err.message : 'Failed to save recipe.');
    } finally {
      setIsSavingJournal(false);
    }
  };

  const handleLoadFromJournal = (recipe: CoffeeRecipe, cravingSummary: string) => {
    setActiveRecipe(recipe);
    setActiveCravingSummary(cravingSummary);
    setBrewPortraitUrl(null);
    setSavedNotice(null);
    document.getElementById('craft-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleFavorite = async (recipeId: string, nextFavorite: boolean) => {
    if (!user) return;
    try {
      await toggleFavoriteRecipe(user.uid, recipeId, nextFavorite);
    } catch (err) {
      setJournalError(err instanceof Error ? err.message : 'Failed to update favorite.');
    }
  };

  const handleDeleteRecord = async (recipeId: string) => {
    if (!user) return;
    try {
      await deleteRecipeFromJournal(user.uid, recipeId);
    } catch (err) {
      setJournalError(err instanceof Error ? err.message : 'Failed to delete recipe.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#141210]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-xs border-b border-[#141210]/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-semibold tracking-tight text-[#141210] whitespace-nowrap shrink-0"
          >
            Cortado Atelier
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5A524C]">
            <a href="#craft-studio" className="hover:text-[#141210] transition-colors whitespace-nowrap shrink-0">
              Craft Studio
            </a>
            <a href="#brew-timer" className="hover:text-[#141210] transition-colors whitespace-nowrap shrink-0">
              Brew Timer
            </a>
            <a href="#recipe-journal" className="hover:text-[#141210] transition-colors whitespace-nowrap shrink-0">
              Recipe Journal
            </a>
            <a href="#origins" className="hover:text-[#141210] transition-colors whitespace-nowrap shrink-0">
              Origins
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="px-4 py-2 text-xs font-medium text-[#141210] border border-[#141210]/20 rounded-lg hover:bg-white transition-colors whitespace-nowrap shrink-0"
              >
                Sign out · {user.displayName?.split(' ')[0] || 'Guest'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="px-4 py-2 text-xs font-medium text-white bg-[#141210] rounded-lg hover:bg-[#2B2623] transition-colors whitespace-nowrap shrink-0"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 md:py-14 space-y-16">
        {/* Hero Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between bg-white border border-[#141210]/10 rounded-2xl p-8 md:p-10">
            <div className="space-y-5">
              <p className="text-xs font-medium tracking-wide text-[#8C4A27]">
                Specialty Barista Studio · Single-Origin & Plant Milk Craft
              </p>
              <h1 className="text-4xl md:text-5xl font-semibold text-[#141210] tracking-tight leading-[1.08] text-balance">
                Every morning cup, dialed to your palate.
              </h1>
              <p className="text-base text-[#5A524C] leading-relaxed max-w-xl">
                Tell Mateo, our head barista powered by Gemini Flash, what you love—velvety chocolate, roasted nuts, bright citrus, or oat microfoam—and get a precision brew formula, live countdown timer, and grocery list.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-8">
              <a
                href="#craft-studio"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#8C4A27] text-white text-sm font-medium hover:bg-[#743C1E] transition-colors whitespace-nowrap shrink-0"
              >
                <Coffee className="w-4 h-4" />
                <span>Craft Your Pour</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  handleApplySamplePrompt();
                  document.getElementById('craft-studio')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-sm font-medium text-[#141210] underline underline-offset-4 decoration-[#141210]/30 hover:decoration-[#8C4A27] transition-colors whitespace-nowrap shrink-0"
              >
                Load Cozy Dark Oat Sample
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-[#141210]/10 bg-[#EDE6DC] min-h-[300px]">
            <img
              src={heroBaristaImg}
              alt="Specialty coffee bar counter with espresso machine, pour-over carafe, and roasted coffee beans"
              referrerPolicy="no-referrer"
              className="w-full h-full lg:h-full object-cover"
            />
          </div>
        </section>

        {/* Full-Width 4-Column Spec Strip */}
        <section
          aria-label="Current active brew parameters"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white border border-[#141210]/10 rounded-2xl p-6"
        >
          <div>
            <span className="text-xs text-[#5A524C] block">Active Brew</span>
            <span className="text-base font-semibold text-[#141210] mt-0.5 block truncate">
              {activeRecipe.brewMethod}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#5A524C] block">Dose & Yield</span>
            <span className="font-mono-tabular text-base font-semibold text-[#141210] mt-0.5 block">
              {activeRecipe.doseGrams}g → {activeRecipe.waterOrYieldMl}ml
            </span>
          </div>
          <div>
            <span className="text-xs text-[#5A524C] block">Water Temperature</span>
            <span className="font-mono-tabular text-base font-semibold text-[#141210] mt-0.5 block">
              {activeRecipe.waterTempC}°C ({Math.round((activeRecipe.waterTempC * 9) / 5 + 32)}°F)
            </span>
          </div>
          <div>
            <span className="text-xs text-[#5A524C] block">Total Brew Time</span>
            <span className="font-mono-tabular text-base font-semibold text-[#8C4A27] mt-0.5 block">
              {activeRecipe.totalBrewMinutesLabel}
            </span>
          </div>
        </section>

        {/* Craft Studio Workspace */}
        <section id="craft-studio" aria-labelledby="craft-studio-heading" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#141210]/10">
            <div>
              <p className="text-xs font-medium tracking-wide text-[#8C4A27]">
                Barista Consultation · Gemini Flash
              </p>
              <h2 id="craft-studio-heading" className="text-2xl md:text-3xl font-semibold text-[#141210] mt-1">
                Craft Studio
              </h2>
            </div>
            <button
              type="button"
              onClick={handleApplySamplePrompt}
              className="text-xs font-medium text-[#8C4A27] hover:text-[#6B361B] underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Fill Example: Strong, Chocolaty, Oat Milk & Dark Roast
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Taste & Equipment Form */}
            <form
              onSubmit={handleCraftRecipe}
              className="lg:col-span-5 bg-white border border-[#141210]/10 rounded-2xl p-6 space-y-6"
            >
              <div>
                <label htmlFor="craving-input" className="block text-sm font-semibold text-[#141210] mb-2">
                  Describe your coffee craving
                </label>
                <textarea
                  id="craving-input"
                  rows={4}
                  value={preferences.cravingPrompt}
                  onChange={(e) => setPreferences((p) => ({ ...p, cravingPrompt: e.target.value }))}
                  placeholder="e.g., Super strong morning drink, rich chocolaty and nutty flavors, no sourness, using oat milk and dark roast beans..."
                  className="w-full rounded-xl border border-[#141210]/15 bg-[#FAF8F5] px-4 py-3 text-sm text-[#141210] placeholder:text-[#5A524C]/60 focus:outline-none focus:border-[#8C4A27] focus:ring-2 focus:ring-[#8C4A27]/15"
                />
              </div>

              <div>
                <span className="block text-sm font-semibold text-[#141210] mb-2.5">Flavor Notes</span>
                <div className="flex flex-wrap gap-2">
                  {FLAVOR_OPTIONS.map((note) => {
                    const selected = preferences.flavorNotes.includes(note);
                    return (
                      <button
                        key={note}
                        type="button"
                        onClick={() => toggleFlavorNote(note)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                          selected
                            ? 'bg-[#141210] border-[#141210] text-white'
                            : 'bg-[#FAF8F5] border-[#141210]/12 text-[#5A524C] hover:text-[#141210]'
                        }`}
                      >
                        {note}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="roast-select" className="block text-sm font-semibold text-[#141210] mb-2">
                    Roast Profile
                  </label>
                  <select
                    id="roast-select"
                    value={preferences.roastLevel}
                    onChange={(e) => setPreferences((p) => ({ ...p, roastLevel: e.target.value }))}
                    className="w-full rounded-lg border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2.5 text-sm text-[#141210] focus:outline-none focus:border-[#8C4A27]"
                  >
                    {ROAST_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="milk-select" className="block text-sm font-semibold text-[#141210] mb-2">
                    Milk Alternative
                  </label>
                  <select
                    id="milk-select"
                    value={preferences.milkAlternative}
                    onChange={(e) => setPreferences((p) => ({ ...p, milkAlternative: e.target.value }))}
                    className="w-full rounded-lg border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2.5 text-sm text-[#141210] focus:outline-none focus:border-[#8C4A27]"
                  >
                    {MILK_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="method-select" className="block text-sm font-semibold text-[#141210] mb-2">
                    Brew Gear
                  </label>
                  <select
                    id="method-select"
                    value={preferences.brewMethod}
                    onChange={(e) => setPreferences((p) => ({ ...p, brewMethod: e.target.value }))}
                    className="w-full rounded-lg border border-[#141210]/15 bg-[#FAF8F5] px-3 py-2.5 text-sm text-[#141210] focus:outline-none focus:border-[#8C4A27]"
                  >
                    {BREW_METHOD_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-semibold text-[#141210] mb-2">Serving Style</span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-[#F0ECE6] rounded-lg">
                    {(['Hot', 'Iced'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setPreferences((p) => ({ ...p, temperatureStyle: style }))}
                        className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          preferences.temperatureStyle === style
                            ? 'bg-white text-[#141210] shadow-xs'
                            : 'text-[#5A524C] hover:text-[#141210]'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {craftError && (
                <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-900">
                  {craftError}
                </div>
              )}

              <button
                type="submit"
                disabled={isCrafting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#8C4A27] text-white text-sm font-semibold hover:bg-[#743C1E] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
              >
                {isCrafting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Crafting Your Formula...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Craft Custom Coffee Recipe</span>
                  </>
                )}
              </button>
            </form>

            {/* Right Column: Crafted Recipe Showcase + Barista Follow-up */}
            <div className="lg:col-span-7 space-y-6">
              <article className="bg-white border border-[#141210]/10 rounded-2xl p-6 md:p-8 space-y-6">
                {/* Recipe Title & Metadata */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A524C]">
                    <span>{activeRecipe.brewMethod}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeRecipe.vesselStyle}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeRecipe.tastingNotes.join(' / ')}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-semibold text-[#141210] text-balance">
                    {activeRecipe.drinkName}
                  </h3>
                  <p className="text-sm text-[#5A524C] leading-relaxed">{activeRecipe.tagline}</p>
                </div>

                {/* Action Toolbar: All 5 Required Workshop Goals */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 pb-4 border-b border-[#141210]/10">
                  <button
                    type="button"
                    onClick={handleStartBrewTimer}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#141210] text-white text-xs font-semibold hover:bg-[#2B2623] transition-colors whitespace-nowrap shrink-0"
                  >
                    <Timer className="w-4 h-4" />
                    <span>Start Brew Timer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShoppingOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#141210]/18 bg-white text-[#141210] text-xs font-semibold hover:bg-[#FAF8F5] transition-colors whitespace-nowrap shrink-0"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Shopping List</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyShareRecipe}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#141210]/18 bg-white text-[#141210] text-xs font-semibold hover:bg-[#FAF8F5] transition-colors whitespace-nowrap shrink-0"
                  >
                    {recipeCopied ? <Check className="w-4 h-4 text-[#8C4A27]" /> : <Copy className="w-4 h-4" />}
                    <span>{recipeCopied ? 'Copied Recipe!' : 'Copy Recipe'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleVisualizeBrew}
                    disabled={isVisualizing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#8C4A27]/35 bg-[#8C4A27]/[0.06] text-[#8C4A27] text-xs font-semibold hover:bg-[#8C4A27]/12 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                  >
                    {isVisualizing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    <span>{isVisualizing ? 'Rendering...' : 'Visualize Brew'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToJournal}
                    disabled={isSavingJournal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#141210]/18 bg-white text-[#141210] text-xs font-semibold hover:bg-[#FAF8F5] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                  >
                    {isSavingJournal ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : savedNotice ? (
                      <Check className="w-4 h-4 text-[#8C4A27]" />
                    ) : (
                      <BookmarkPlus className="w-4 h-4" />
                    )}
                    <span>{savedNotice || 'Save to Journal'}</span>
                  </button>
                </div>

                {/* Visualize Brew Portrait Frame */}
                {(isVisualizing || brewPortraitUrl || visualizeError) && (
                  <div className="rounded-xl overflow-hidden border border-[#141210]/10 bg-[#FAF8F5]">
                    {isVisualizing ? (
                      <div className="aspect-4/3 flex flex-col items-center justify-center p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#8C4A27] mb-3" />
                        <p className="text-sm font-medium text-[#141210]">
                          Rendering portrait of {activeRecipe.drinkName}...
                        </p>
                        <p className="text-xs text-[#5A524C] mt-1">{activeRecipe.vesselStyle}</p>
                      </div>
                    ) : visualizeError ? (
                      <div className="p-4 text-xs text-red-900 bg-red-50">{visualizeError}</div>
                    ) : brewPortraitUrl ? (
                      <div>
                        <img
                          src={brewPortraitUrl}
                          alt={`AI Coffee Portrait of ${activeRecipe.drinkName} in ${activeRecipe.vesselStyle}`}
                          referrerPolicy="no-referrer"
                          className="w-full aspect-4/3 object-cover"
                        />
                        <div className="px-4 py-2.5 bg-white border-t border-[#141210]/8 flex items-center justify-between text-xs text-[#5A524C]">
                          <span>{activeRecipe.vesselStyle}</span>
                          <span>{activeRecipe.milkPairing}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Barista Note */}
                <div className="bg-[#FAF8F5] rounded-xl p-5 space-y-2 border border-[#141210]/8">
                  <p className="text-xs font-semibold text-[#8C4A27]">Mateo&apos;s Barista Note</p>
                  <p className="text-sm text-[#141210] leading-relaxed">{activeRecipe.baristaNote}</p>
                </div>

                {/* Bean, Roast & Milk Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-[#5A524C]">Bean Selection</span>
                    <p className="text-sm text-[#141210] leading-relaxed">{activeRecipe.beanOrigin}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-[#5A524C]">Roast Profile</span>
                    <p className="text-sm text-[#141210] leading-relaxed">{activeRecipe.roastProfile}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-[#5A524C]">Milk Pairing</span>
                    <p className="text-sm text-[#141210] leading-relaxed">{activeRecipe.milkPairing}</p>
                  </div>
                </div>

                {/* Extraction Specs & Palate Balance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#141210]/10">
                  <div className="space-y-2.5">
                    <span className="text-xs font-semibold text-[#5A524C] block">Extraction Specs</span>
                    <dl className="grid grid-cols-2 gap-y-2 text-sm">
                      <dt className="text-[#5A524C]">Coffee Dose</dt>
                      <dd className="font-mono-tabular font-medium text-right">{activeRecipe.doseGrams}g</dd>
                      <dt className="text-[#5A524C]">Brew Water / Yield</dt>
                      <dd className="font-mono-tabular font-medium text-right">{activeRecipe.waterOrYieldMl}ml</dd>
                      <dt className="text-[#5A524C]">Milk Volume</dt>
                      <dd className="font-mono-tabular font-medium text-right">{activeRecipe.milkMl}ml</dd>
                      <dt className="text-[#5A524C]">Grind Size</dt>
                      <dd className="font-medium text-right truncate">{activeRecipe.grindSetting}</dd>
                    </dl>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-xs font-semibold text-[#5A524C] block">Palate Balance</span>
                    {(
                      [
                        ['Sweetness', activeRecipe.palateProfile.sweetness],
                        ['Body', activeRecipe.palateProfile.body],
                        ['Acidity', activeRecipe.palateProfile.acidity],
                        ['Roast Depth', activeRecipe.palateProfile.roastDepth],
                      ] as const
                    ).map(([label, score]) => (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#5A524C]">{label}</span>
                          <span className="font-mono-tabular font-medium text-[#141210]">{score}/10</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#F0ECE6] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#8C4A27] rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(10, score * 10))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ask Mateo / Quick Tweaks */}
                <div className="pt-5 border-t border-[#141210]/10 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#5A524C]">Tweak This Cup with Mateo</span>
                    <div className="flex flex-wrap gap-1.5">
                      {['Make it Iced', 'Stronger Kick', 'Switch to Pour-Over', 'Sweeter Finish'].map((tweak) => (
                        <button
                          key={tweak}
                          type="button"
                          disabled={isChatting}
                          onClick={() => void handleSendChat(tweak)}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#FAF8F5] border border-[#141210]/12 text-[#5A524C] hover:text-[#141210] hover:border-[#8C4A27]/40 transition-colors whitespace-nowrap shrink-0"
                        >
                          {tweak}
                        </button>
                      ))}
                    </div>
                  </div>

                  {chatHistory.length > 0 && (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {chatHistory.map((msg) => (
                        <div
                          key={msg.id}
                          className={`text-xs leading-relaxed px-3.5 py-2.5 rounded-xl ${
                            msg.role === 'user'
                              ? 'bg-[#141210] text-white ml-8'
                              : 'bg-[#FAF8F5] text-[#141210] border border-[#141210]/8 mr-8'
                          }`}
                        >
                          <span className="font-semibold block mb-0.5">
                            {msg.role === 'user' ? 'You' : 'Mateo · Barista'}
                          </span>
                          {msg.text}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSendChat();
                        }
                      }}
                      placeholder="Ask about grind texture, oat milk brands, or ask to adjust this recipe..."
                      className="flex-1 rounded-lg border border-[#141210]/15 bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#141210] placeholder:text-[#5A524C]/60 focus:outline-none focus:border-[#8C4A27]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendChat()}
                      disabled={isChatting || !chatInput.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#141210] text-white text-sm font-medium hover:bg-[#2B2623] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                    >
                      {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Ask</span>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Goal 1: Interactive Brew Timer */}
        <BrewTimerPanel recipe={activeRecipe} autoStartSignal={timerStartSignal} />

        {/* Goal 3: Firebase Recipe Journal */}
        <RecipeJournalSection
          user={user}
          authLoading={authLoading}
          records={journalRecords}
          journalError={journalError}
          onSignIn={handleSignIn}
          onLoadRecipe={handleLoadFromJournal}
          onToggleFavorite={handleToggleFavorite}
          onDeleteRecipe={handleDeleteRecord}
        />

        {/* Editorial Craft & Origins Showcase */}
        <section id="origins" aria-labelledby="origins-heading" className="space-y-6">
          <div className="pb-4 border-b border-[#141210]/10">
            <p className="text-xs font-medium tracking-wide text-[#8C4A27]">Roast & Extraction Craft</p>
            <h2 id="origins-heading" className="text-2xl md:text-3xl font-semibold text-[#141210] mt-1">
              Bean & Brewing Foundations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <article className="bg-white border border-[#141210]/10 rounded-2xl overflow-hidden flex flex-col">
              <img
                src={beanOriginImg}
                alt="Freshly roasted whole specialty coffee beans pouring from a stoneware cupping spoon"
                referrerPolicy="no-referrer"
                className="w-full aspect-4/3 object-cover"
              />
              <div className="p-6 space-y-2">
                <p className="text-xs text-[#5A524C]">Brazil Cerrado · Guatemala Huehuetenango · Ethiopia Yirgacheffe</p>
                <h3 className="text-xl font-semibold text-[#141210]">Choosing Origin & Roast Depth</h3>
                <p className="text-sm text-[#5A524C] leading-relaxed">
                  Natural-processed Brazilian and Sumatran coffees shine in medium-dark roasts with velvety cocoa and toasted nut warmth, whereas washed high-altitude Ethiopian lots bring jasmine and bergamot clarity to light filter pours.
                </p>
              </div>
            </article>

            <article className="bg-white border border-[#141210]/10 rounded-2xl overflow-hidden flex flex-col">
              <img
                src={brewPourImg}
                alt="Gooseneck kettle pouring hot water over blooming specialty coffee grounds in a ceramic dripper"
                referrerPolicy="no-referrer"
                className="w-full aspect-4/3 object-cover"
              />
              <div className="p-6 space-y-2">
                <p className="text-xs text-[#5A524C]">89°C Dark Extraction · 94°C Light Filter · 60°C Oat Microfoam</p>
                <h3 className="text-xl font-semibold text-[#141210]">Temperature Precision Over Bitterness</h3>
                <p className="text-sm text-[#5A524C] leading-relaxed">
                  Lowering brew water to 88–90°C for dark roasts curbs astringency while preserving body. Steaming oat milk gently below 62°C keeps its natural cereal sweetness intact for effortless microfoam.
                </p>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#141210]/10 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-xs text-[#5A524C]">
          <span className="font-display text-sm font-semibold text-[#141210]">Cortado Atelier</span>
          <div className="flex items-center gap-6">
            <a href="#craft-studio" className="hover:text-[#141210] transition-colors">
              Craft Studio
            </a>
            <a href="#brew-timer" className="hover:text-[#141210] transition-colors">
              Brew Timer
            </a>
            <a href="#recipe-journal" className="hover:text-[#141210] transition-colors">
              Recipe Journal
            </a>
          </div>
        </div>
      </footer>

      {/* Goal 2: Shopping List Drawer */}
      <ShoppingListDrawer
        isOpen={shoppingOpen}
        onClose={() => setShoppingOpen(false)}
        recipe={activeRecipe}
      />
    </div>
  );
}
