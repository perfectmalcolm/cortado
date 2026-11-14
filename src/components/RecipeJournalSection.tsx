import { useState } from 'react';
import type { User } from 'firebase/auth';
import { BookOpen, Star, Trash2, ArrowUpRight } from 'lucide-react';
import type { CoffeeRecipe, SavedRecipeRecord } from '../types/coffee';

interface RecipeJournalSectionProps {
  user: User | null;
  authLoading: boolean;
  records: SavedRecipeRecord[];
  journalError: string | null;
  onSignIn: () => void;
  onLoadRecipe: (recipe: CoffeeRecipe, cravingSummary: string) => void;
  onToggleFavorite: (recipeId: string, nextFavorite: boolean) => void;
  onDeleteRecipe: (recipeId: string) => void;
}

export function RecipeJournalSection({
  user,
  authLoading,
  records,
  journalError,
  onSignIn,
  onLoadRecipe,
  onToggleFavorite,
  onDeleteRecipe,
}: RecipeJournalSectionProps) {
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  const visibleRecords =
    filter === 'favorites' ? records.filter((r) => r.isFavorite) : records;

  return (
    <section id="recipe-journal" aria-labelledby="journal-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#141210]/10">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#8C4A27]">
            Personal Tasting Log · Synced with Firebase
          </p>
          <h2 id="journal-heading" className="text-2xl md:text-3xl font-semibold text-[#141210] mt-1">
            Recipe Journal
          </h2>
        </div>

        {user && (
          <div className="flex items-center gap-1 p-1 bg-[#F0ECE6] rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === 'all'
                  ? 'bg-white text-[#141210] shadow-xs'
                  : 'text-[#5A524C] hover:text-[#141210]'
              }`}
            >
              All Saved ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('favorites')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === 'favorites'
                  ? 'bg-white text-[#141210] shadow-xs'
                  : 'text-[#5A524C] hover:text-[#141210]'
              }`}
            >
              Favorites ({records.filter((r) => r.isFavorite).length})
            </button>
          </div>
        )}
      </div>

      {journalError && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-900">
          Could not sync your Recipe Journal: {journalError}
        </div>
      )}

      {!authLoading && !user ? (
        <div className="bg-white border border-[#141210]/10 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-[#8C4A27]">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wide">Cloud Recipe Journal</span>
            </div>
            <h3 className="text-xl font-semibold text-[#141210]">
              Sign in to keep every custom roast & pour recipe
            </h3>
            <p className="text-sm text-[#5A524C] leading-relaxed">
              Connect with Google to save your favorite bean pairings, brew steps, and grocery lists across sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="px-5 py-2.5 rounded-lg bg-[#141210] text-white text-sm font-medium hover:bg-[#2B2623] transition-colors whitespace-nowrap shrink-0"
          >
            Sign in with Google
          </button>
        </div>
      ) : visibleRecords.length === 0 ? (
        <div className="bg-white border border-[#141210]/10 rounded-2xl p-8 text-center">
          <p className="text-base font-medium text-[#141210]">
            {filter === 'favorites' ? 'No favorited brews yet.' : 'Your Recipe Journal is ready for its first pour.'}
          </p>
          <p className="text-sm text-[#5A524C] mt-1">
            Craft a recipe above and click Save to Journal to store it in your personal archive.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleRecords.map((record) => {
            const { recipe } = record;
            const dateStr = new Date(record.createdAtMs).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            return (
              <article
                key={record.id}
                className="bg-white border border-[#141210]/10 rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-[#141210]/25 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-[#5A524C] truncate">
                        {recipe.brewMethod} · {dateStr}
                      </p>
                      <h3 className="text-lg font-semibold text-[#141210] mt-1 leading-snug">
                        {recipe.drinkName}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(record.id, !record.isFavorite)}
                      className={`p-2 rounded-lg border transition-colors shrink-0 ${
                        record.isFavorite
                          ? 'border-[#8C4A27]/30 bg-[#8C4A27]/10 text-[#8C4A27]'
                          : 'border-[#141210]/10 text-[#5A524C] hover:text-[#141210]'
                      }`}
                      aria-label={record.isFavorite ? 'Remove favorite' : 'Favorite recipe'}
                    >
                      <Star className={`w-4 h-4 ${record.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <p className="text-sm text-[#5A524C] line-clamp-2 leading-relaxed">
                    {recipe.tagline || recipe.baristaNote}
                  </p>

                  <div className="text-xs text-[#5A524C] pt-1">
                    {recipe.tastingNotes.slice(0, 3).join(' · ')}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#141210]/8 text-xs">
                    <div>
                      <span className="text-[#5A524C] block">Dose</span>
                      <span className="font-mono-tabular font-semibold text-[#141210]">{recipe.doseGrams}g</span>
                    </div>
                    <div>
                      <span className="text-[#5A524C] block">Temp</span>
                      <span className="font-mono-tabular font-semibold text-[#141210]">{recipe.waterTempC}°C</span>
                    </div>
                    <div>
                      <span className="text-[#5A524C] block">Time</span>
                      <span className="font-mono-tabular font-semibold text-[#141210]">
                        {recipe.totalBrewMinutesLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#141210]/8">
                  <button
                    type="button"
                    onClick={() => onLoadRecipe(recipe, record.cravingSummary)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8C4A27] hover:text-[#6B361B] transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Load into Studio</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRecipe(record.id)}
                    className="p-2 text-[#5A524C] hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    aria-label={`Delete ${recipe.drinkName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
