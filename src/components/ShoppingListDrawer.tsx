import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import type { CoffeeRecipe } from '../types/coffee';
import { formatShoppingListText } from '../lib/recipeUtils';

interface ShoppingListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: CoffeeRecipe;
}

export function ShoppingListDrawer({ isOpen, onClose, recipe }: ShoppingListDrawerProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const categories: Array<'Coffee Beans' | 'Milk & Accents' | 'Brewing Equipment'> = [
    'Coffee Beans',
    'Milk & Accents',
    'Brewing Equipment',
  ];

  const toggleItem = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = async () => {
    const formatted = formatShoppingListText(recipe, checked);
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#141210]/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shopping-list-title"
    >
      <div className="w-full max-w-lg bg-[#FAF8F5] h-full flex flex-col border-l border-[#141210]/10 shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-6 py-5 bg-white border-b border-[#141210]/10">
          <div>
            <p className="text-xs font-medium text-[#8C4A27]">Grocery & Gear Checklist</p>
            <h2 id="shopping-list-title" className="text-xl font-semibold text-[#141210] mt-0.5">
              {recipe.drinkName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#5A524C] hover:text-[#141210] hover:bg-[#FAF8F5] transition-colors"
            aria-label="Close shopping list"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {categories.map((category) => {
            const items = recipe.shoppingList.filter((i) => i.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5A524C] mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map((item) => {
                    const key = `${item.category}:${item.item}`;
                    const isChecked = Boolean(checked[key]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleItem(key)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-start gap-3 ${
                          isChecked
                            ? 'bg-[#FAF8F5] border-[#141210]/8 opacity-65'
                            : 'bg-white border-[#141210]/10 hover:border-[#8C4A27]/40'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked
                              ? 'bg-[#8C4A27] border-[#8C4A27] text-white'
                              : 'border-[#141210]/25 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`text-sm font-medium ${
                                isChecked ? 'line-through text-[#5A524C]' : 'text-[#141210]'
                              }`}
                            >
                              {item.item}
                            </span>
                            <span className="font-mono-tabular text-xs text-[#8C4A27] shrink-0">
                              {item.quantity}
                            </span>
                          </div>
                          {item.note && (
                            <p className="text-xs text-[#5A524C] mt-1 leading-relaxed">{item.note}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 bg-white border-t border-[#141210]/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setChecked({})}
            className="px-4 py-2.5 text-sm font-medium text-[#5A524C] hover:text-[#141210] transition-colors whitespace-nowrap shrink-0"
          >
            Clear Checks
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#141210] text-white text-sm font-medium hover:bg-[#2B2623] transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied List' : 'Copy Grocery List'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
