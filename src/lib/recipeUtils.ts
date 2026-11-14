import type { CoffeeRecipe } from '../types/coffee';

export function formatSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatShareRecipeText(recipe: CoffeeRecipe): string {
  const notes = recipe.tastingNotes.length > 0 ? recipe.tastingNotes.join(' · ') : 'Rich & Balanced';
  const stepsText = recipe.brewSteps
    .map(
      (s) =>
        `  ${s.stepNumber}. ${s.title} (${formatSeconds(s.durationSeconds)}): ${s.instruction}`,
    )
    .join('\n');

  const milkLine =
    recipe.milkMl > 0 ? `🥛 Milk Pairing: ${recipe.milkPairing} (${recipe.milkMl}ml)` : `🥛 Milk Pairing: ${recipe.milkPairing}`;

  return [
    `☕ *${recipe.drinkName}* — _${recipe.tagline}_`,
    `✨ Tasting Notes: ${notes}`,
    ``,
    `🫘 Beans: ${recipe.beanOrigin}`,
    `🔥 Roast: ${recipe.roastProfile}`,
    milkLine,
    `⚙️ Method: ${recipe.brewMethod} · ${recipe.vesselStyle}`,
    `📐 Specs: ${recipe.doseGrams}g coffee → ${recipe.waterOrYieldMl}ml @ ${recipe.waterTempC}°C (${recipe.grindSetting})`,
    ``,
    `⏱️ Brew Steps (${recipe.totalBrewMinutesLabel}):`,
    stepsText,
    ``,
    `💬 Barista Note: "${recipe.baristaNote}"`,
    `— Crafted at Cortado Atelier`,
  ].join('\n');
}

export function formatShoppingListText(recipe: CoffeeRecipe, checkedItems: Record<string, boolean> = {}): string {
  const categories: Array<'Coffee Beans' | 'Milk & Accents' | 'Brewing Equipment'> = [
    'Coffee Beans',
    'Milk & Accents',
    'Brewing Equipment',
  ];

  const sections = categories
    .map((cat) => {
      const items = recipe.shoppingList.filter((i) => i.category === cat);
      if (items.length === 0) return null;
      const lines = items.map((i) => {
        const key = `${i.category}:${i.item}`;
        const mark = checkedItems[key] ? '[x]' : '[ ]';
        return `${mark} ${i.item} (${i.quantity})${i.note ? ` — ${i.note}` : ''}`;
      });
      return `${cat.toUpperCase()}\n${lines.join('\n')}`;
    })
    .filter(Boolean);

  return [`GROCERY & GEAR LIST — ${recipe.drinkName}`, `Method: ${recipe.brewMethod}`, ``, ...sections].join('\n\n');
}

export function playSoftChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.52);
  } catch {
    // Ignore audio context restrictions
  }
}
