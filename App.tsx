
import React, { useState } from 'react';
import { AppStatus, AppData, ScreenType, UserPreferences, InventoryItem, ZeroWasteTip } from './types';
import { getAppResponse, generateRecipeImage } from './geminiService';

const DIET_OPTIONS = ['Balanced', 'Keto', 'Mediterranean', 'High Protein', 'Low Carb', 'Diabetic Friendly', 'Paleo'];
const CUISINE_OPTIONS = ['Indian', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Middle Eastern', 'French', 'Thai'];
const SPICE_OPTIONS = ['Mild', 'Medium', 'Spicy', 'Fiery'];

const getPlaceholderStyle = (seed: string) => {
  const styles = [
    'bg-gradient-to-br from-orange-400 to-rose-400',
    'bg-gradient-to-br from-violet-500 to-purple-500',
    'bg-gradient-to-br from-emerald-400 to-teal-500',
    'bg-gradient-to-br from-blue-400 to-indigo-500',
    'bg-gradient-to-br from-amber-400 to-orange-500',
    'bg-gradient-to-br from-pink-500 to-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return styles[Math.abs(hash) % styles.length];
};

const App: React.FC = () => {
  const [inventoryInput, setInventoryInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [currentAppData, setCurrentAppData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<UserPreferences>({
    food_type: 'Vegetarian',
    diet_goals: [],
    spice_level: 'Medium',
    allergens: [],
    baby_mode: false,
    pet_mode: false,
    preferred_cuisines: []
  });

  const handleGenerateImage = async (prompt: string) => {
    setGeneratingImage(true);
    try {
      const img = await generateRecipeImage(prompt);
      setRecipeImage(img);
    } catch (e) {
      console.error("Image gen failed", e);
    } finally {
      setGeneratingImage(false);
    }
  };

  const navigateTo = async (input: string, screen: ScreenType, autoGenerate: boolean = false) => {
    setStatus(AppStatus.LOADING);
    setRecipeImage(null);
    try {
      const result = await getAppResponse(input, preferences, screen);
      setCurrentAppData(result);
      setStatus(AppStatus.SUCCESS);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (autoGenerate && screen === 'RECIPE_DETAIL' && result.data.image_prompt) {
        handleGenerateImage(result.data.image_prompt);
      }
    } catch (err: any) {
      setError(err.message || "MealMind is recalibrating. Please try again.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleInitialSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inventoryInput.trim()) {
      navigateTo(inventoryInput, 'HOME');
    }
  };

  const toggleDietGoal = (goal: string) => {
    if (preferences.diet_goals.includes(goal)) {
        setPreferences({ ...preferences, diet_goals: preferences.diet_goals.filter(g => g !== goal) });
    } else {
        setPreferences({ ...preferences, diet_goals: [...preferences.diet_goals, goal] });
    }
  };

  const toggleCuisine = (cuisine: string) => {
    if (preferences.preferred_cuisines.includes(cuisine)) {
        setPreferences({ ...preferences, preferred_cuisines: preferences.preferred_cuisines.filter(c => c !== cuisine) });
    } else {
        setPreferences({ ...preferences, preferred_cuisines: [...preferences.preferred_cuisines, cuisine] });
    }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setCurrentAppData(null);
    setInventoryInput('');
    setRecipeImage(null);
  };

  const renderHome = (data: any) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
      {/* 1. Header Section - Compact */}
      <div className="bg-stone-900 text-white px-5 py-5 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-1.5">
           <div className="flex justify-between items-start">
             <div>
               <h2 className="text-xl font-serif font-bold">MealMind Home</h2>
               <div className="flex gap-2 mt-1">
                  {preferences.baby_mode && <span className="bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded text-[9px] font-bold border border-blue-500/30 backdrop-blur-sm">Baby Mode</span>}
                  {preferences.pet_mode && <span className="bg-orange-500/20 text-orange-200 px-2 py-0.5 rounded text-[9px] font-bold border border-orange-500/30 backdrop-blur-sm">Pet Mode</span>}
              </div>
             </div>
             <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-xl">🥗</div>
           </div>
           <p className="text-stone-400 text-xs leading-tight max-w-xl">{data.greeting} {data.welcome_overview}</p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-violet-600 rounded-full blur-[80px] opacity-15 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      </div>
      
      {/* 2. Stats Row - Horizontal and Clean */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { val: data.summary_counts.items_expiring, label: 'Expiring', icon: '⏰', color: 'text-rose-600', bg: 'bg-rose-50', screen: 'INVENTORY' as ScreenType },
          { val: data.summary_counts.total_items, label: 'Pantry', icon: '📦', color: 'text-stone-700', bg: 'bg-white', screen: 'INVENTORY' as ScreenType },
          { val: data.summary_counts.possible_meals, label: 'Recipes', icon: '🥘', color: 'text-amber-600', bg: 'bg-amber-50', screen: 'MEAL_LIST' as ScreenType }
        ].map(stat => (
          <button 
            key={stat.label} 
            onClick={() => navigateTo(inventoryInput, stat.screen)} 
            className={`flex-1 min-w-[95px] ${stat.bg} border border-stone-100 px-3 py-3 rounded-2xl flex flex-col items-center gap-1 shadow-sm active:scale-95 transition-all`}
          >
            <span className={`text-xl font-black ${stat.color}`}>{stat.val}</span>
            <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wide">{stat.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Action Grid - Modern tile design */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => navigateTo(inventoryInput, 'MEAL_LIST')} 
          className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 active:bg-orange-50 transition-colors h-32 flex flex-col justify-between"
        >
           <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-lg">🍳</div>
           <div>
             <h3 className="font-bold text-stone-800 text-sm">Explore Menu</h3>
             <p className="text-[9px] text-stone-400">Match inventory</p>
           </div>
        </button>

        <button 
          onClick={() => navigateTo(inventoryInput, 'ZERO_WASTE')} 
          className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 active:bg-emerald-50 transition-colors h-32 flex flex-col justify-between"
        >
           <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-lg">♻️</div>
           <div>
             <h3 className="font-bold text-stone-800 text-sm">Zero Waste</h3>
             <p className="text-[9px] text-stone-400">Storage hacks</p>
           </div>
        </button>

        <button 
          onClick={() => navigateTo(inventoryInput, 'INVENTORY')} 
          className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 active:bg-violet-50 transition-colors h-32 flex flex-col justify-between"
        >
           <div className="w-9 h-9 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center text-lg">🥣</div>
           <div>
             <h3 className="font-bold text-stone-800 text-sm">My Pantry</h3>
             <p className="text-[9px] text-stone-400">Track freshness</p>
           </div>
        </button>

        <button 
          onClick={handleReset} 
          className="bg-stone-50 p-4 rounded-2xl shadow-inner border border-stone-100 active:bg-stone-100 transition-colors h-32 flex flex-col justify-between"
        >
           <div className="w-9 h-9 bg-white text-stone-400 rounded-lg flex items-center justify-center text-lg">↺</div>
           <div>
             <h3 className="font-bold text-stone-600 text-sm">Reset Kitchen</h3>
             <p className="text-[9px] text-stone-400">Clear all data</p>
           </div>
        </button>
      </div>

      {/* 4. Daily Tip Section - Space Filler */}
      {data.daily_tip && (
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-4 rounded-2xl shadow-lg text-white relative overflow-hidden">
            <div className="relative z-10 flex gap-3 items-start">
                <span className="text-2xl">💡</span>
                <div>
                    <h3 className="font-bold text-[10px] opacity-80 uppercase tracking-wide mb-0.5">Chef's Daily Insight</h3>
                    <p className="text-xs font-medium leading-normal">{data.daily_tip}</p>
                </div>
            </div>
            <div className="absolute -bottom-2 -right-2 text-6xl opacity-10">🌿</div>
        </div>
      )}
    </div>
  );

  const renderInventory = (data: any) => {
    const items = (data.items || []) as InventoryItem[];
    const sortedItems = [...items].sort((a, b) => a.days_remaining - b.days_remaining);

    const getUrgencyColor = (days: number) => {
      if (days <= 2) return 'bg-rose-100 text-rose-700 border-rose-200';
      if (days <= 4) return 'bg-amber-100 text-amber-700 border-amber-200';
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    };

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-24 pt-2">
        <div className="flex items-center justify-between px-1">
           <h2 className="text-xl font-serif font-bold text-stone-800">Freshness Tracker</h2>
           <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
             {items.length} Items
           </span>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-10 text-stone-400 italic text-sm">No items found.</div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map((item, idx) => {
              const urgencyStyle = getUrgencyColor(item.days_remaining);
              return (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                       <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">{item.category}</span>
                       <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${urgencyStyle}`}>
                         {item.days_remaining <= 2 ? 'URGENT' : item.days_remaining <= 4 ? 'SOON' : 'SAFE'}
                       </span>
                    </div>
                    <h3 className="text-base font-bold text-stone-800 leading-tight">{item.name}</h3>
                    <p className="text-[10px] text-stone-500 mt-1 line-clamp-1 italic">
                       {item.storage_advice}
                    </p>
                  </div>
                  <div className="text-center bg-stone-50 px-3 py-2 rounded-xl min-w-[65px]">
                      <span className="block text-xl font-black text-stone-700 leading-none">{item.days_remaining}</span>
                      <span className="block text-[8px] text-stone-400 font-bold uppercase mt-1">Days</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderMealList = (data: any) => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 pb-24 pt-2">
      <h2 className="text-xl font-serif font-bold text-stone-800 px-1">Suggested Meals</h2>
      <div className="space-y-3">
        {data.recipes.map((recipe: any) => {
            const isVeg = recipe.food_type === 'Vegetarian' || recipe.food_type === 'Vegan';
            return (
              <div 
                key={recipe.recipe_id} 
                onClick={() => navigateTo(recipe.recipe_id, 'RECIPE_DETAIL')}
                className="bg-white rounded-2xl p-3 shadow-sm border border-stone-100 active:border-violet-200 transition-all cursor-pointer flex gap-4 items-center group"
              >
                <div className={`w-16 h-16 rounded-xl flex-shrink-0 ${getPlaceholderStyle(recipe.recipe_name)} text-white flex items-center justify-center text-2xl shadow-inner`}>
                    {isVeg ? '🥗' : '🥘'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                            {recipe.food_type}
                        </span>
                        <span className="text-[9px] font-bold text-stone-400 flex items-center gap-1">
                            🔥 {recipe.estimated_calories}
                        </span>
                    </div>
                    <h3 className="font-bold text-sm text-stone-800 truncate mb-0.5">
                        {recipe.recipe_name}
                    </h3>
                    <p className="text-[9px] text-stone-400 truncate">
                        Uses: {recipe.ingredients_used?.join(', ')}
                    </p>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );

  const renderRecipeDetail = (data: any) => (
    <div className="bg-white min-h-full pb-24 animate-in slide-in-from-bottom-4 duration-300">
      <div className="w-full h-48 bg-stone-100 relative overflow-hidden rounded-b-3xl">
        {recipeImage ? (
          <img src={recipeImage} alt={data.recipe_name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full ${getPlaceholderStyle(data.recipe_name)} flex flex-col items-center justify-center text-white p-6 text-center`}>
              <span className="text-3xl mb-1 opacity-80">📸</span>
              <button 
                onClick={() => handleGenerateImage(data.image_prompt)}
                disabled={generatingImage}
                className="bg-white/20 backdrop-blur-md border border-white/40 text-white px-4 py-1.5 rounded-full text-[10px] font-bold active:bg-white/30 transition-all"
              >
                {generatingImage ? 'Generating...' : 'View Dish'}
              </button>
          </div>
        )}
        <button onClick={() => navigateTo(inventoryInput, 'MEAL_LIST')} className="absolute top-4 left-4 bg-white/90 backdrop-blur text-stone-800 p-2 rounded-full shadow-lg active:scale-95 transition-transform">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
        </button>
      </div>

      <div className="px-5 py-5">
        <h2 className="text-xl font-serif font-bold text-stone-900 leading-tight mb-2">{data.recipe_name}</h2>
        <div className="flex flex-wrap gap-2 mb-5">
           {data.is_baby_safe && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-bold border border-blue-100">Baby Safe</span>}
           {data.is_pet_safe && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[9px] font-bold border border-orange-100">Pet Safe</span>}
           <span className="bg-stone-50 text-stone-500 px-2 py-0.5 rounded text-[9px] font-bold border border-stone-100">{data.preparation_time} Prep</span>
        </div>

        <div className="space-y-6">
            <div>
                <h3 className="font-bold text-stone-900 text-sm mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px]">1</span>
                    Ingredients
                </h3>
                <div className="space-y-2">
                    {data.ingredients.map((ing: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1.5 border-b border-stone-50">
                        <span className="text-stone-600 font-medium">{ing.item}</span>
                        <span className="text-stone-900 font-bold">{ing.measurement}</span>
                    </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="font-bold text-stone-900 text-sm mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">2</span>
                    Steps
                </h3>
                <div className="space-y-3">
                    {data.steps.map((step: string, i: number) => (
                    <div key={i} className="flex gap-3">
                        <span className="text-indigo-400 font-bold text-[10px] pt-0.5">{i+1}.</span>
                        <p className="text-xs text-stone-600 leading-relaxed">{step}</p>
                    </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-['Plus_Jakarta_Sans'] flex flex-col">
       
       {status === AppStatus.IDLE && (
         <div className="flex-1 flex flex-col px-5 py-8 max-w-md mx-auto w-full">
             <div className="text-center mb-6">
                 <div className="inline-block p-3 rounded-2xl bg-white shadow-md mb-3">
                    <span className="text-3xl">🥘</span>
                 </div>
                 <h1 className="text-2xl font-serif font-bold text-stone-900">MealMind</h1>
                 <p className="text-stone-400 text-[10px] uppercase font-bold tracking-widest mt-1">Smart Kitchen Dashboard</p>
             </div>

             <form onSubmit={handleInitialSubmit} className="space-y-6 flex-1">
                <div className="bg-white rounded-3xl shadow-lg p-5 border border-stone-100">
                    <label className="block text-[9px] font-bold uppercase text-stone-400 mb-2 tracking-wider">Inventory Entry</label>
                    <textarea 
                    className="w-full h-28 bg-stone-50 rounded-xl border border-stone-100 focus:border-violet-400 p-3 text-sm text-stone-800 placeholder-stone-300 resize-none outline-none transition-all"
                    placeholder="e.g. eggs, chicken, spinach, stale bread..."
                    value={inventoryInput}
                    onChange={(e) => setInventoryInput(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setPreferences({...preferences, baby_mode: !preferences.baby_mode, pet_mode: false})} className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${preferences.baby_mode ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-transparent text-stone-400 shadow-sm'}`}>
                        <span className="text-xl">👶</span>
                        <div className="text-left"><span className="block text-[10px] font-bold uppercase">Baby</span></div>
                    </button>
                    <button type="button" onClick={() => setPreferences({...preferences, pet_mode: !preferences.pet_mode, baby_mode: false})} className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${preferences.pet_mode ? 'bg-orange-50 border-orange-400 text-orange-700' : 'bg-white border-transparent text-stone-400 shadow-sm'}`}>
                        <span className="text-xl">🐾</span>
                        <div className="text-left"><span className="block text-[10px] font-bold uppercase">Pet</span></div>
                    </button>
                </div>

                {preferences.baby_mode && (
                    <input type="text" placeholder="Baby age (e.g. 8 months)" value={preferences.baby_age || ''} onChange={(e) => setPreferences({...preferences, baby_age: e.target.value})} className="w-full bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-blue-400 animate-in slide-in-from-top-1"/>
                )}
                {preferences.pet_mode && (
                    <input type="text" placeholder="Pet details (e.g. Adult Dog)" value={preferences.pet_details || ''} onChange={(e) => setPreferences({...preferences, pet_details: e.target.value})} className="w-full bg-orange-50/50 border border-orange-100 rounded-xl px-4 py-3 text-xs outline-none focus:border-orange-400 animate-in slide-in-from-top-1"/>
                )}

                <div className="space-y-4 pt-2">
                    <div>
                        <label className="block text-[9px] font-bold uppercase text-stone-400 mb-2">Health Goals</label>
                        <div className="flex flex-wrap gap-1.5">
                            {DIET_OPTIONS.slice(0, 4).map(goal => (
                                <button key={goal} type="button" onClick={() => toggleDietGoal(goal)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${preferences.diet_goals.includes(goal) ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-stone-100 text-stone-400'}`}>
                                    {goal}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold uppercase text-stone-400 mb-2">Cuisine</label>
                        <div className="flex flex-wrap gap-1.5">
                            {CUISINE_OPTIONS.slice(0, 5).map(c => (
                                <button key={c} type="button" onClick={() => toggleCuisine(c)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${preferences.preferred_cuisines.includes(c) ? 'bg-violet-50 border-violet-400 text-violet-700' : 'bg-white border-stone-100 text-stone-400'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={!inventoryInput.trim()} className="w-full bg-stone-900 text-white h-14 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-30 mt-auto">
                    Start Intelligence ✨
                </button>
             </form>
         </div>
       )}

       <div className="flex-1 overflow-y-auto px-5 max-w-md mx-auto w-full">
            {status === AppStatus.LOADING && (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 animate-pulse">
                   <div className="w-10 h-10 border-4 border-stone-100 border-t-violet-500 rounded-full animate-spin"></div>
                   <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Syncing Pantry...</p>
                </div>
            )}

            {status === AppStatus.SUCCESS && currentAppData && (
                <div className="pb-24">
                  {currentAppData.screen === 'HOME' && renderHome(currentAppData.data)}
                  {currentAppData.screen === 'INVENTORY' && renderInventory(currentAppData.data)}
                  {currentAppData.screen === 'MEAL_LIST' && renderMealList(currentAppData.data)}
                  {currentAppData.screen === 'RECIPE_DETAIL' && renderRecipeDetail(currentAppData.data)}
                  {currentAppData.screen === 'ZERO_WASTE' && (
                    <div className="space-y-5 pt-2 pb-24">
                       <h2 className="text-xl font-serif font-bold text-stone-800">Zero Waste Lab</h2>
                       <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-md">
                           <h3 className="font-bold text-xs mb-1 uppercase opacity-80">Sustainability Tip</h3>
                           <p className="text-xs leading-normal">Reduce waste by prioritizing these items today.</p>
                       </div>
                       <div className="space-y-3">
                            {(currentAppData.data.transformations || []).map((t: ZeroWasteTip, i: number) => (
                                <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex gap-3">
                                    <span className="text-emerald-500 font-bold text-xs">{i+1}.</span>
                                    <div className="text-xs">
                                        <span className="font-bold text-stone-800">{t.item}: </span>
                                        <span className="text-stone-500">{t.tip}</span>
                                    </div>
                                </div>
                            ))}
                       </div>
                    </div>
                  )}
                </div>
            )}
       </div>

      {status === AppStatus.SUCCESS && currentAppData && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[85%] max-w-sm">
          <nav className="bg-stone-900/90 backdrop-blur-lg text-white px-5 py-3 rounded-3xl shadow-2xl flex items-center justify-between border border-white/5">
             <button onClick={() => navigateTo(inventoryInput, 'HOME')} className={`p-2 transition-colors ${currentAppData.screen === 'HOME' ? 'text-violet-400' : 'text-stone-500'}`}>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
             </button>
             <button onClick={() => navigateTo(inventoryInput, 'INVENTORY')} className={`p-2 transition-colors ${currentAppData.screen === 'INVENTORY' ? 'text-violet-400' : 'text-stone-500'}`}>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
             </button>
             <button onClick={() => navigateTo(inventoryInput, 'MEAL_LIST')} className={`p-2 transition-colors ${['MEAL_LIST', 'RECIPE_DETAIL'].includes(currentAppData.screen) ? 'text-violet-400' : 'text-stone-500'}`}>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
             </button>
             <div className="w-px h-5 bg-white/10 mx-1"></div>
             <button onClick={handleReset} className="p-2 text-rose-500">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
             </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default App;
