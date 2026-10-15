// script.js

document.addEventListener("DOMContentLoaded", async function () {

  // --- 1. Our Plan Database (Genuine post-tariff hike Indian Telecom Tariffs) ---
  // Covers: Jio, Airtel, Vi, BSNL
  // Categories:
  // - 'ott': OTT Bundled Plans & Streaming Gotchas (rendered in PURPLE)
  // - 'sim_active': Secondary SIM / Keep Active (rendered in YELLOW)
  // - 'booster': Data Boosters / Add-ons (rendered in BLUE with Cost Per GB)
  // - 'daily_data': 1GB-2.5GB/day packs
  // - 'voice_sms': Unlimited calls + SMS
  // - 'micro_15': 14/15/21/24/26-day short validity traps
  // - 'annual': 365/395-day long term packs
  // --- 1. Plan data is loaded from data/plans.json (updated by GitHub Action) ---
  let plansData = [];
  let plansUpdatedAt = null;
  async function fetchPlansJson() {
    const res = await fetch('plans.json?ts=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('plans.json HTTP ' + res.status);
    const json = await res.json();
    plansData = json.plans;
    plansUpdatedAt = json.updatedAt;
    localStorage.setItem('trueplan_last_sync', json.updatedAt);
  }

  // --- 2. Setup Provider and Filter Configurations ---
  const providers = [
    { name: 'Jio', color: '#0A2885', text: 'text-white' },
    { name: 'Airtel', color: '#E11900', text: 'text-white' },
    { name: 'Vi', color: '#FFC400', text: 'text-black' },
    { name: 'BSNL', color: '#004B9B', text: 'text-white' }
  ];

  const categories = [
    { id: 'all', label: 'All Plans', icon: 'apps' },
    { id: 'ott', label: 'OTT Bundles (Scams Exposed)', icon: 'smart_display' },
    { id: 'sim_active', label: 'Keep SIM Active (Yellow)', icon: 'sim_card' },
    { id: 'booster', label: 'Data Boosters (Blue)', icon: 'bolt' },
    { id: 'voice_sms', label: 'Voice & SMS (TRAI 2026)', icon: 'record_voice_over' },
    { id: 'micro_15', label: '14-15 Day Micro Packs', icon: 'hourglass_top' },
    { id: 'daily_data', label: 'Daily Data Packs', icon: 'network_check' },
    { id: 'annual', label: 'Annual (365 Days)', icon: 'calendar_month' }
  ];

  let selectedOperator = 'Jio';
  let selectedCategory = 'all';
  let searchQuery = '';

  const providerContainer = document.getElementById('provider-buttons');
  const resultsSection = document.getElementById('results-section');
  const valuableGrid = document.getElementById('valuable-grid');
  const simactiveGrid = document.getElementById('simactive-grid');
  const trapGrid = document.getElementById('trap-grid');
  const boosterGrid = document.getElementById('booster-grid');
  const ottGrid = document.getElementById('ott-grid');
  const activeProviderLabel = document.getElementById('active-provider-label');
  const categoryFilterContainer = document.getElementById('category-filter-buttons');

  const valuableSection = document.getElementById('valuable-section');
  const simactiveSection = document.getElementById('simactive-section');
  const trapSection = document.getElementById('trap-section');
  const boosterSection = document.getElementById('booster-section');
  const ottSection = document.getElementById('ott-section');

  // Inject operator buttons dynamically
  providers.forEach((prov) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-pressed', 'false');
    btn.className = `provider-btn px-9 py-4 rounded-xl font-manrope font-extrabold text-xl shadow-md border-2 border-transparent ${prov.text}`;
    btn.style.backgroundColor = prov.color;
    btn.innerText = prov.name;
    
    btn.addEventListener('click', () => {
      selectedOperator = prov.name;
      updateProviderButtons(btn);
      loadPlans();
    });

    providerContainer.appendChild(btn);
  });

  // Inject Category Filter Pills dynamically
  if (categoryFilterContainer) {
    categories.forEach(cat => {
      const catBtn = document.createElement('button');
      catBtn.type = 'button';
      catBtn.className = `filter-btn ${cat.id === selectedCategory ? 'active' : ''}`;
      catBtn.setAttribute('data-category', cat.id);
      catBtn.innerHTML = `
        <span class="material-symbols-outlined text-base">${cat.icon}</span>
        <span>${cat.label}</span>
      `;
      catBtn.addEventListener('click', () => {
        selectedCategory = cat.id;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        catBtn.classList.add('active');
        loadPlans();
      });
      categoryFilterContainer.appendChild(catBtn);
    });
  }

  function updateProviderButtons(activeBtn) {
    document.querySelectorAll('.provider-btn').forEach(b => {
      b.classList.remove('active');
      b.classList.add('inactive');
      b.setAttribute('aria-pressed', 'false');
    });
    activeBtn.classList.add('active');
    activeBtn.classList.remove('inactive');
    activeBtn.setAttribute('aria-pressed', 'true');
  }

  // --- 3. Render Logic ---
  function loadPlans() {
    // Show the results section
    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('flex');

    // Re-trigger animation cleanly when switching operators or categories
    resultsSection.classList.remove('animate-fade-in');
    void resultsSection.offsetWidth; // Force DOM reflow
    resultsSection.classList.add('animate-fade-in');

    const catObj = categories.find(c => c.id === selectedCategory);
    const catLabel = catObj && selectedCategory !== 'all' ? ` • ${catObj.label}` : '';

    if (activeProviderLabel) {
      activeProviderLabel.textContent = `${selectedOperator} Live Analysis${catLabel}`;
    }

    // Clear previous html in all 5 grids
    valuableGrid.innerHTML = '';
    simactiveGrid.innerHTML = '';
    trapGrid.innerHTML = '';
    boosterGrid.innerHTML = '';
    if (ottGrid) ottGrid.innerHTML = '';

    // Filter plans by selected operator and category
    let opPlans = plansData.filter(p => p.operator === selectedOperator);
    if (selectedCategory !== 'all') {
      opPlans = opPlans.filter(p => p.category === selectedCategory);
    }
    if (searchQuery) {
      opPlans = opPlans.filter(p => 
        p.name.toLowerCase().includes(searchQuery) || 
        p.data.toLowerCase().includes(searchQuery) || 
        p.note.toLowerCase().includes(searchQuery) ||
        p.tag.toLowerCase().includes(searchQuery) ||
        (p.ottApps && p.ottApps.toLowerCase().includes(searchQuery)) ||
        (p.ottScreen && p.ottScreen.toLowerCase().includes(searchQuery)) ||
        (p.ottQuality && p.ottQuality.toLowerCase().includes(searchQuery)) ||
        p.price.toString().includes(searchQuery)
      );
    }

    // Process plan metrics
    opPlans.forEach(plan => {
      if (plan.category === 'booster') {
        plan.costPerGBNum = plan.dataGB ? plan.price / plan.dataGB : 0;
        plan.costPerGB = plan.costPerGBNum.toFixed(2);
      } else {
        plan.costPerDayNum = plan.validity > 0 ? plan.price / plan.validity : 0;
        plan.costPerDay = plan.costPerDayNum.toFixed(2);

        if (plan.validity === 365 || plan.validity === 395) {
          plan.yearlyCost = plan.price;
          plan.rechargesPerYear = '1.0';
        } else if (plan.validity === 30 || plan.validity === 31) {
          plan.yearlyCost = plan.price * 12;
          plan.rechargesPerYear = '12.0';
        } else {
          const recharges = 365 / plan.validity;
          plan.rechargesPerYear = recharges.toFixed(1);
          plan.yearlyCost = Math.round(recharges * plan.price);
        }
      }
    });

    // Counts for section visibility
    let valuableCount = 0;
    let simactiveCount = 0;
    let trapCount = 0;
    let boosterCount = 0;
    let ottCount = 0;

    opPlans.forEach(plan => {
      if (plan.category === 'booster') {
        boosterGrid.innerHTML += generateBoosterCardHTML(plan);
        boosterCount++;
      } else if (plan.category === 'sim_active') {
        simactiveGrid.innerHTML += generateSimActiveCardHTML(plan);
        simactiveCount++;
      } else if (plan.category === 'ott') {
        if (ottGrid) ottGrid.innerHTML += generateOttCardHTML(plan);
        ottCount++;
      } else if (plan.isTrap) {
        trapGrid.innerHTML += generateCardHTML(plan);
        trapCount++;
      } else {
        valuableGrid.innerHTML += generateCardHTML(plan);
        valuableCount++;
      }
    });

    // Visibility toggling based on selected category & plan presence
    if (selectedCategory === 'booster') {
      valuableSection.classList.add('hidden');
      simactiveSection.classList.add('hidden');
      trapSection.classList.add('hidden');
      boosterSection.classList.remove('hidden');
      if (ottSection) ottSection.classList.add('hidden');
    } else if (selectedCategory === 'sim_active') {
      valuableSection.classList.add('hidden');
      simactiveSection.classList.remove('hidden');
      trapSection.classList.add('hidden');
      boosterSection.classList.add('hidden');
      if (ottSection) ottSection.classList.add('hidden');
    } else if (selectedCategory === 'ott') {
      valuableSection.classList.add('hidden');
      simactiveSection.classList.add('hidden');
      trapSection.classList.add('hidden');
      boosterSection.classList.add('hidden');
      if (ottSection) ottSection.classList.remove('hidden');
    } else {
      valuableSection.classList.remove('hidden');
      simactiveSection.classList.remove('hidden');
      trapSection.classList.remove('hidden');
      boosterSection.classList.remove('hidden');
      if (ottSection) ottSection.classList.remove('hidden');
    }

    // Fallbacks if a section has no plans for the active filter
    if (valuableCount === 0 && !valuableSection.classList.contains('hidden')) {
      valuableGrid.innerHTML = `
        <div class="col-span-full p-6 text-center bg-white rounded-xl border border-dashed border-gray-300">
          <p class="text-xs font-semibold text-gray-500">No honest monthly/annual plans in this category for ${selectedOperator}.</p>
        </div>`;
    }
    if (simactiveCount === 0 && !simactiveSection.classList.contains('hidden')) {
      simactiveGrid.innerHTML = `
        <div class="col-span-full p-6 text-center bg-white rounded-xl border border-dashed border-amber-300">
          <p class="text-xs font-semibold text-amber-800">No secondary SIM active plans found for this filter.</p>
        </div>`;
    }
    if (trapCount === 0 && !trapSection.classList.contains('hidden')) {
      trapGrid.innerHTML = `
        <div class="col-span-full p-6 text-center bg-white rounded-xl border border-dashed border-green-300">
          <p class="text-xs font-semibold text-green-700">No trap plans found for this filter! All plans here have honest validity.</p>
        </div>`;
    }
    if (boosterCount === 0 && !boosterSection.classList.contains('hidden')) {
      boosterGrid.innerHTML = `
        <div class="col-span-full p-6 text-center bg-white rounded-xl border border-dashed border-blue-300">
          <p class="text-xs font-semibold text-blue-700">No booster add-ons listed under this specific filter.</p>
        </div>`;
    }
    if (ottCount === 0 && ottSection && !ottSection.classList.contains('hidden')) {
      ottGrid.innerHTML = `
        <div class="col-span-full p-6 text-center bg-white rounded-xl border border-dashed border-purple-300">
          <p class="text-xs font-semibold text-purple-800">No OTT bundled plans found under this specific filter for ${selectedOperator}.</p>
        </div>`;
    }

    // Smoothly scroll down
    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  // --- 4. Card Generators ---

  // Standard Card Generator (Valuable & Traps)
  function generateCardHTML(plan) {
    const isTrap = plan.isTrap;
    const badgeColor = isTrap ? 'bg-red-600' : 'bg-green-700';
    const borderColor = isTrap ? 'border-red-300' : 'border-green-300';
    const highlightBg = isTrap ? 'bg-red-50' : 'bg-green-50';
    const textHighlight = isTrap ? 'text-red-700' : 'text-green-800';
    const hoverBorder = isTrap ? 'hover:border-red-500' : 'hover:border-green-500';
    const tagBg = isTrap ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200';
    
    let trapImpact = '';
    if (isTrap) {
      if (plan.validity <= 15) {
        trapImpact = `⚠️ Forces ~24 to 26 recharges a year! Massive annual drain.`;
      } else if (plan.validity === 28) {
        trapImpact = `⚠️ Forces 1 extra recharge/year (+₹${plan.price} wasted on 13th month)`;
      } else {
        trapImpact = `⚠️ Misaligned with calendar months: requires ${plan.rechargesPerYear} recharges/yr`;
      }
    } else {
      if (plan.validity === 365 || plan.validity === 395) {
        trapImpact = `✅ Pay once a year. Zero monthly recharge stress.`;
      } else if (plan.validity === 30 || plan.validity === 31) {
        trapImpact = `✅ Honest TRAI Billing: Renews same date every month (12 recharges/yr).`;
      } else {
        trapImpact = `✅ Exceptional validity: Keeps SIM active for ₹${plan.costPerDay}/day.`;
      }
    }

    return `
      <article class="flex flex-col bg-white rounded-2xl border-2 ${borderColor} ${hoverBorder} shadow-sm overflow-hidden transform transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
        <div class="${badgeColor} text-white py-2.5 px-4 flex items-center justify-between text-xs font-bold tracking-wider uppercase">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">${isTrap ? 'warning' : 'verified'}</span>
            ${isTrap ? 'TRAP ALERT' : 'HONEST VALUE'}
          </span>
          <span class="font-mono bg-black/25 px-2.5 py-0.5 rounded text-sm font-bold">₹${plan.costPerDay} / day</span>
        </div>
        
        <div class="p-5 flex flex-col grow gap-4">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${plan.text} tracking-wide" style="background-color: ${plan.color}">${plan.operator}</span>
                <span class="plan-tag border ${tagBg}">
                  <span class="material-symbols-outlined text-xs">${plan.tagIcon || 'label'}</span>
                  ${plan.tag}
                </span>
              </div>
              <h3 class="font-extrabold font-manrope text-lg text-gray-900 leading-tight">${plan.name}</h3>
            </div>
            <div class="text-right shrink-0">
              <span class="font-extrabold font-manrope text-3xl leading-none ${textHighlight}">₹${plan.price}</span><br>
              <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Price</span>
            </div>
          </div>

          <p class="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200 italic">
            "${plan.note}"
          </p>
          
          <div class="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-gray-200 text-center">
            <div>
              <span class="block text-[10px] text-gray-500 font-bold tracking-wider mb-0.5">VALIDITY</span>
              <b class="text-gray-900 font-manrope text-base">${plan.validity} Days</b>
            </div>
            <div>
              <span class="block text-[10px] text-gray-500 font-bold tracking-wider mb-0.5">BENEFIT / DATA</span>
              <b class="text-gray-900 font-manrope text-sm leading-tight block truncate" title="${plan.data}">${plan.data}</b>
            </div>
          </div>
          
          <div class="mt-auto ${highlightBg} p-3.5 rounded-xl border ${borderColor} text-sm flex flex-col gap-1.5">
            <div class="flex justify-between font-bold text-gray-800 items-center">
              <span>True Cost / Day:</span>
              <span class="bg-white px-2.5 py-1 rounded-md shadow-sm font-mono border border-gray-200 font-extrabold text-gray-900">₹${plan.costPerDay}</span>
            </div>
            <div class="text-xs text-gray-700 border-t border-black/10 pt-2 flex flex-col gap-0.5">
              <div>Requires <strong>${plan.rechargesPerYear} recharges/yr</strong> (₹${plan.yearlyCost.toLocaleString('en-IN')}/year)</div>
              <div class="font-bold ${textHighlight} text-[11px] mt-1">${trapImpact}</div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // SECONDARY SIM / KEEP ACTIVE Card Generator (YELLOW THEME)
  function generateSimActiveCardHTML(plan) {
    const isHonestAnnual = plan.validity >= 300;
    const cycleText = isHonestAnnual 
      ? `Full year validity (${plan.validity} days) at just ₹${plan.costPerDay}/day`
      : `Recharges per year: ${plan.rechargesPerYear} cycles (₹${plan.yearlyCost.toLocaleString('en-IN')}/year)`;

    return `
      <article class="flex flex-col bg-white rounded-2xl border-2 card-simactive shadow-sm overflow-hidden transform transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
        <div class="bg-amber-500 text-slate-950 py-2.5 px-4 flex items-center justify-between text-xs font-black tracking-wider uppercase">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">sim_card</span>
            SECONDARY SIM SAVER
          </span>
          <span class="font-mono bg-black/15 px-2.5 py-0.5 rounded text-sm font-black text-slate-900">₹${plan.costPerDay} / day</span>
        </div>
        
        <div class="p-5 flex flex-col grow gap-4">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${plan.text} tracking-wide" style="background-color: ${plan.color}">${plan.operator}</span>
                <span class="plan-tag bg-amber-100 text-amber-900 border border-amber-300">
                  <span class="material-symbols-outlined text-xs">battery_charging_full</span>
                  ${plan.tag}
                </span>
              </div>
              <h3 class="font-extrabold font-manrope text-lg text-gray-900 leading-tight">${plan.name}</h3>
            </div>
            <div class="text-right shrink-0">
              <span class="font-extrabold font-manrope text-3xl leading-none text-amber-700">₹${plan.price}</span><br>
              <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Price</span>
            </div>
          </div>

          <p class="text-xs text-amber-950 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200 italic">
            "${plan.note}"
          </p>
          
          <div class="grid grid-cols-2 gap-2 p-3 bg-amber-50/40 rounded-xl border border-amber-200 text-center">
            <div>
              <span class="block text-[10px] text-amber-800 font-bold tracking-wider mb-0.5">ACTIVE VALIDITY</span>
              <b class="text-gray-900 font-manrope text-base">${plan.validity} Days</b>
            </div>
            <div>
              <span class="block text-[10px] text-amber-800 font-bold tracking-wider mb-0.5">BENEFIT / DATA</span>
              <b class="text-gray-900 font-manrope text-sm leading-tight block truncate" title="${plan.data}">${plan.data}</b>
            </div>
          </div>
          
          <div class="mt-auto bg-amber-50/80 p-3.5 rounded-xl border border-amber-300 text-sm flex flex-col gap-1.5">
            <div class="flex justify-between font-bold text-amber-950 items-center">
              <span>Cost to Keep SIM Active:</span>
              <span class="bg-amber-100 px-2.5 py-1 rounded-md shadow-xs font-mono border border-amber-300 font-black text-amber-900">₹${plan.costPerDay} / day</span>
            </div>
            <div class="text-xs text-amber-900 border-t border-amber-200 pt-2 flex flex-col gap-0.5 font-medium">
              <div>${cycleText}</div>
              <div class="text-[11px] font-bold text-amber-800 mt-0.5">⭐ Optimal for OTPs, Bank SMS & Emergency Inbound Calls</div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // DATA BOOSTER Card Generator (BLUE THEME)
  function generateBoosterCardHTML(plan) {
    const validityText = plan.validity > 0 ? `${plan.validity} Days` : 'Base Plan Validity';

    return `
      <article class="flex flex-col bg-white rounded-2xl border-2 card-booster shadow-sm overflow-hidden transform transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
        <div class="bg-blue-600 text-white py-2.5 px-4 flex items-center justify-between text-xs font-bold tracking-wider uppercase">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">bolt</span>
            DATA BOOSTER
          </span>
          <span class="font-mono bg-black/25 px-2.5 py-0.5 rounded text-sm font-bold text-white">₹${plan.costPerGB} / GB</span>
        </div>
        
        <div class="p-5 flex flex-col grow gap-4">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${plan.text} tracking-wide" style="background-color: ${plan.color}">${plan.operator}</span>
                <span class="plan-tag bg-blue-100 text-blue-900 border border-blue-200">
                  <span class="material-symbols-outlined text-xs">${plan.tagIcon || 'bolt'}</span>
                  ${plan.tag}
                </span>
              </div>
              <h3 class="font-extrabold font-manrope text-lg text-gray-900 leading-tight">${plan.name}</h3>
            </div>
            <div class="text-right shrink-0">
              <span class="font-extrabold font-manrope text-3xl leading-none text-blue-700">₹${plan.price}</span><br>
              <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Top-up Price</span>
            </div>
          </div>

          <p class="text-xs text-blue-950 bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 italic">
            "${plan.note}"
          </p>
          
          <div class="grid grid-cols-2 gap-2 p-3 bg-blue-50/40 rounded-xl border border-blue-200 text-center">
            <div>
              <span class="block text-[10px] text-blue-800 font-bold tracking-wider mb-0.5">DATA VOLUME</span>
              <b class="text-gray-900 font-manrope text-base">${plan.data}</b>
            </div>
            <div>
              <span class="block text-[10px] text-blue-800 font-bold tracking-wider mb-0.5">PACK VALIDITY</span>
              <b class="text-gray-900 font-manrope text-sm leading-tight block truncate">${validityText}</b>
            </div>
          </div>
          
          <div class="mt-auto bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 text-sm flex flex-col gap-1.5">
            <div class="flex justify-between font-bold text-blue-950 items-center">
              <span>True Cost / GB:</span>
              <span class="bg-blue-100 px-2.5 py-1 rounded-md shadow-xs font-mono border border-blue-300 font-bold text-blue-900">₹${plan.costPerGB} / GB</span>
            </div>
            <div class="text-xs text-blue-800 border-t border-blue-200 pt-2 flex items-center gap-1 font-medium">
              <span class="material-symbols-outlined text-sm">info</span>
              <span>Requires an active voice/base SIM plan for activation</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // OTT BUNDLED PLAN Card Generator (PURPLE THEME)
  function generateOttCardHTML(plan) {
    const cycleText = plan.validity >= 300 
      ? `Full year validity (${plan.validity} days) at ₹${plan.costPerDay}/day`
      : `Requires ${plan.rechargesPerYear} recharges/yr (₹${plan.yearlyCost.toLocaleString('en-IN')}/year)`;

    const isMobileOnly = !plan.ottCastAllowed;
    const deviceBadge = isMobileOnly
      ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-950 border border-amber-300 font-extrabold text-[11px]"><span class="material-symbols-outlined text-xs text-amber-700">smartphone</span> ${plan.ottScreen || 'Mobile Only (1 Phone)'}</span>`
      : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300 font-extrabold text-[11px]"><span class="material-symbols-outlined text-xs text-emerald-700">devices</span> ${plan.ottScreen || 'TV, PC & Mobile'}</span>`;

    const isLowRes = plan.ottQuality && plan.ottQuality.includes('480p');
    const qualityBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md ${isLowRes ? 'bg-red-100 text-red-950 border-red-300' : 'bg-purple-100 text-purple-950 border-purple-300'} border font-extrabold text-[11px]"><span class="material-symbols-outlined text-xs text-purple-700">hd</span> ${plan.ottQuality || '720p HD'}</span>`;

    const castStatusBadge = isMobileOnly
      ? `<span class="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded"><span class="material-symbols-outlined text-xs">block</span> TV / PC Blocked</span>`
      : `<span class="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded"><span class="material-symbols-outlined text-xs">check_circle</span> TV & PC Allowed</span>`;

    return `
      <article class="flex flex-col bg-white rounded-2xl border-2 card-ott shadow-sm overflow-hidden transform transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
        <div class="bg-purple-700 text-white py-2.5 px-4 flex items-center justify-between text-xs font-bold tracking-wider uppercase">
          <span class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm">smart_display</span>
            OTT BUNDLE ALERT
          </span>
          <span class="font-mono bg-black/25 px-2.5 py-0.5 rounded text-sm font-bold text-white">₹${plan.costPerDay} / day</span>
        </div>
        
        <div class="p-5 flex flex-col grow gap-4">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${plan.text} tracking-wide" style="background-color: ${plan.color}">${plan.operator}</span>
                <span class="plan-tag bg-purple-100 text-purple-900 border border-purple-300">
                  <span class="material-symbols-outlined text-xs">${plan.tagIcon || 'smart_display'}</span>
                  ${plan.tag}
                </span>
              </div>
              <h3 class="font-extrabold font-manrope text-lg text-gray-900 leading-tight">${plan.name}</h3>
            </div>
            <div class="text-right shrink-0">
              <span class="font-extrabold font-manrope text-3xl leading-none text-purple-700">₹${plan.price}</span><br>
              <span class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pack Price</span>
            </div>
          </div>

          <p class="text-xs text-purple-950 bg-purple-50/60 p-2.5 rounded-lg border border-purple-200 italic">
            "${plan.note}"
          </p>

          <div class="p-2.5 bg-purple-50/90 rounded-xl border border-purple-200 flex items-center gap-2">
            <span class="material-symbols-outlined text-purple-700 text-xl shrink-0">movie</span>
            <div class="text-xs text-purple-950 font-bold truncate">
              <span class="text-[10px] text-purple-700 block uppercase font-extrabold tracking-wider">BUNDLED STREAMING ACCESS</span>
              ${plan.ottApps || 'OTT Subscription'}
            </div>
          </div>

          <!-- Screen Style (Mobile vs TV/PC) & Video Quality (480p/720p) Strip -->
          <div class="p-2.5 bg-slate-50 rounded-xl border border-gray-200 flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-gray-600 font-extrabold uppercase tracking-wider">Screen Style & Quality</span>
              ${castStatusBadge}
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              ${deviceBadge}
              ${qualityBadge}
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-2 p-3 bg-purple-50/40 rounded-xl border border-purple-200 text-center">
            <div>
              <span class="block text-[10px] text-purple-800 font-bold tracking-wider mb-0.5">CYCLE VALIDITY</span>
              <b class="text-gray-900 font-manrope text-base">${plan.validity} Days</b>
            </div>
            <div>
              <span class="block text-[10px] text-purple-800 font-bold tracking-wider mb-0.5">DATA / BENEFIT</span>
              <b class="text-gray-900 font-manrope text-sm leading-tight block truncate" title="${plan.data}">${plan.data}</b>
            </div>
          </div>
          
          <div class="mt-auto bg-purple-50/80 p-3.5 rounded-xl border border-purple-300 text-xs flex flex-col gap-2">
            <div class="flex justify-between font-bold text-purple-950 items-center text-sm">
              <span>Daily Rate:</span>
              <span class="bg-purple-100 px-2.5 py-1 rounded-md shadow-xs font-mono border border-purple-300 font-bold text-purple-900">₹${plan.costPerDay} / day</span>
            </div>
            <div class="text-purple-900 border-t border-purple-200 pt-2 flex flex-col gap-1.5 font-medium">
              <div class="flex items-start gap-1">
                <span class="material-symbols-outlined text-purple-700 text-sm shrink-0 mt-0.5">screen_lock_portrait</span>
                <span><strong>Screen Lock Trap:</strong> ${plan.ottGotcha}</span>
              </div>
              <div class="flex items-start gap-1">
                <span class="material-symbols-outlined text-amber-700 text-sm shrink-0 mt-0.5">price_change</span>
                <span><strong>Price Reality:</strong> ${plan.standaloneComp}</span>
              </div>
              <div class="text-[11px] text-purple-700 mt-0.5">⚠️ ${cycleText}</div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  // --- 5. Auto-Fetch & Live Sync Controller ---
  function initLiveSyncEngine() {
    const syncBtn = document.getElementById('sync-tariffs-btn');
    const syncText = document.getElementById('sync-text');
    const syncIndicator = document.getElementById('sync-indicator');
    const syncIcon = document.getElementById('sync-icon');
    const syncToast = document.getElementById('sync-toast');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');
    const toastClose = document.getElementById('toast-close');

    if (toastClose) {
      toastClose.addEventListener('click', () => {
        syncToast.classList.remove('show');
      });
    }

    async function performLiveTariffSync(showToast = true) {
      if (syncIcon) syncIcon.classList.add('animate-spin');
      if (syncIndicator) {
        syncIndicator.className = 'h-2 w-2 rounded-full bg-blue-500 animate-ping';
      }
      if (syncText) syncText.textContent = 'Auto-fetching official feeds...';

      let ok = true;
      try {
        await fetchPlansJson();
      } catch (e) {
        ok = false; // keep whatever data is already loaded
      }
      const now = plansUpdatedAt ? new Date(plansUpdatedAt) : new Date();
      const timeStr = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
      if (ok) loadPlans();

      setTimeout(() => {
        if (syncIcon) syncIcon.classList.remove('animate-spin');
        if (syncIndicator) {
          syncIndicator.className = 'h-2 w-2 rounded-full bg-green-500 animate-pulse';
        }
        if (syncText) syncText.textContent = ok ? `Data updated ${timeStr}` : 'Offline - showing last data';

        if (showToast && syncToast) {
          toastTitle.textContent = ok ? 'Tariff data refreshed' : 'Could not refresh data';
          toastMessage.textContent = ok ? `Latest plan data loaded (last updated ${timeStr}).` : 'Could not load plans.json. Showing previously loaded data.';
          syncToast.classList.add('show');
          setTimeout(() => {
            syncToast.classList.remove('show');
          }, 6000);
        }
      }, 700);
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        performLiveTariffSync(true);
      });
    }

    // Auto-fetch on initial load
    setTimeout(() => {
      performLiveTariffSync(false);
    }, 400);
  }

  // --- 6. Interactive 28-Day Trap Waste Calculator ---
  function initTrapCalculator() {
    const calcRange = document.getElementById('calc-range');
    const priceDisplay = document.getElementById('calc-price-display');
    const annualTrapDisplay = document.getElementById('calc-annual-trap');
    const wasteDisplay = document.getElementById('calc-waste');

    if (!calcRange) return;

    function updateCalculator() {
      const price = parseInt(calcRange.value, 10);
      if (priceDisplay) priceDisplay.textContent = `₹${price}`;
      
      // 28-day spend: 365 / 28 = 13.0357 recharges a year
      const annualTrap = Math.round((365 / 28) * price);
      
      // Honest 30-day billing: 12 recharges a year
      const annualHonest = price * 12;
      
      // Extra 13th month money wasted
      const waste = Math.max(price, annualTrap - annualHonest);

      if (annualTrapDisplay) annualTrapDisplay.textContent = `₹${annualTrap.toLocaleString('en-IN')}`;
      if (wasteDisplay) wasteDisplay.textContent = `₹${waste.toLocaleString('en-IN')}`;
    }

    calcRange.addEventListener('input', updateCalculator);
    updateCalculator();
  }

  // --- 7. Search & Share Handlers ---
  function initSearchAndShare() {
    const searchInput = document.getElementById('plan-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const shareBtn = document.getElementById('share-whatsapp-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        if (clearSearchBtn) {
          if (searchQuery.length > 0) {
            clearSearchBtn.classList.remove('hidden');
          } else {
            clearSearchBtn.classList.add('hidden');
          }
        }
        loadPlans();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        loadPlans();
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const shareText = `🚨 Did you know your 28-day mobile recharge is a trap designed to force you to pay 13 times a year instead of 12? \n\nCheck TruePlan India to uncover hidden trap plans and find honest 30/365-day billing packs: ${window.location.href}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      });
    }
  }

  // --- 8. Back to Top Smooth Scroll ---
  function initBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    if (!backToTopBtn) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Load plan data first so the first render is never empty
  try { await fetchPlansJson(); } catch (e) { console.error('Could not load plans.json', e); }

  // Initialize All Controllers
  initLiveSyncEngine();
  initTrapCalculator();
  initSearchAndShare();
  initBackToTop();

  // Load initial view with default operator
  const defaultProvBtn = document.querySelector('.provider-btn');
  if (defaultProvBtn) {
    updateProviderButtons(defaultProvBtn);
    loadPlans();
  }
});
