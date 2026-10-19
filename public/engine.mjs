// A bounded English rule lookup. Recommendations come from the curated JSON.
const LABELS = {
  paper: 'Paper', metal: 'Metal', plastic: 'Plastic', tetra_pak: 'Tetra Pak',
  glass_bottle: 'Glass bottles', rechargeable_battery: 'Rechargeable batteries',
};

const ALIASES = {
  R01: ['office paper', 'printer paper', 'printing paper', 'corrugated paper', 'corrugated cardboard', 'envelope', 'envelopes'],
  R02: ['napkin', 'napkins', 'toilet paper', 'tissue', 'tissues'],
  R03: ['wax paper', 'waxed paper', 'adhesive paper', 'thermal induction fax paper'],
  R04: ['food contaminated paper', 'paint contaminated cardboard', 'chemically contaminated paper'],
  R05: ['aluminium can', 'aluminium cans', 'aluminum can', 'aluminum cans', 'iron can', 'iron cans', 'soda can', 'soda cans'],
  R06: ['aerosol can', 'aerosol cans', 'paint can', 'paint cans', 'chemical container', 'chemical containers', 'cookware', 'potato chips can', 'potato chips cans', 'pringles can'],
  R07: ['plastic beverage bottle', 'plastic beverage bottles', 'plastic bottle', 'plastic bottles', 'plastic takeaway box', 'plastic takeaway boxes', 'plastic takeout box'],
  R08: ['medicine container', 'medicine containers', 'correction fluid container', 'toothpaste tube', 'toothpaste tubes', 'rubber product', 'silicone product', 'plastic products with metal components', 'composite material', 'composite materials'],
  R09: ['beverage carton', 'beverage cartons', 'milk carton', 'milk cartons', 'juice carton', 'tetra pak', 'paper cup', 'paper cups'],
  R10: ['glass beverage bottle', 'glass beverage bottles', 'glass food bottle', 'glass sauce bottle', 'glass bottle', 'glass bottles', 'vinegar bottle'],
  R11: ['tempered glass', 'laminated glass', 'strengthened glass'],
  R12: ['portable household rechargeable battery', 'portable household rechargeable batteries', 'rechargeable battery', 'rechargeable batteries'],
  R13: ['single use battery', 'single use batteries', 'disposable battery', 'disposable batteries', 'lead acid battery', 'lead acid batteries'],
  R14: ['damaged battery', 'damaged batteries', 'swollen battery', 'swollen batteries', 'leaking battery'],
  R15: ['pizza box', 'pizza boxes'],
  R16: ['takeaway coffee cup', 'takeaway coffee cups', 'take away coffee cup', 'coffee cup', 'coffee cups'],
  R17: ['baking paper', 'parchment paper'],
  R18: ['contact lens packaging', 'contact lens package', 'contact lens tray'],
  R19: ['personal care container', 'personal care containers', 'personal care bottle', 'personal care bottles', 'shampoo bottle', 'shampoo bottles', 'lotion bottle'],
  R20: ['cling film with a food label', 'cling film with food label'],
  R21: ['metal mooncake container', 'metal mooncake box', 'mooncake tin'],
  R22: ['foil lined snack packaging', 'foil lined snack bag', 'aluminium foil pouch', 'aluminum foil pouch', 'aluminium foil bag', 'aluminum foil bag', 'chips bag', 'crisp packet'],
};

const normalise = text => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (text, phrase) => ` ${text} `.includes(` ${phrase} `);
const matches = (text, id) => (ALIASES[id] || []).some(alias => has(text, alias));
const choice = (label, query, cleanliness) => ({label, query, ...(cleanliness ? {cleanliness} : {})});

export function createGuide(knowledge, catalog) {
  const rules = new Map(knowledge.rules.map(rule => [rule.id, rule]));
  const sources = new Map(catalog.sources.map(source => [source.id, source]));
  const cite = (id, locator) => {
    const source = sources.get(id);
    return {id, title: source.title, url: source.url, locator, accessedOn: source.accessed_on};
  };
  const fromRules = ids => ids.map(id => {
    const rule = rules.get(id);
    return {...cite(rule.source_id, rule.source_locator), ruleId: id};
  });
  const base = (status, title, explanation, extra = {}) => ({
    status, title, explanation, facility: 're Kiosk', steps: [], citations: [], choices: [], ...extra,
  });
  const clarify = (title, explanation, choices = [], ids = []) => base('clarify', title, explanation, {choices, citations: fromRules(ids)});

  return function answer(question, options = {}) {
    if (typeof question !== 'string' || !question.trim()) {
      return clarify('What would you like to recycle?', 'Describe one item, such as a clean pizza box or an aluminium can.');
    }
    if (question.length > 600) return clarify('Please describe one item briefly.', 'Use up to 600 characters. Include the material and condition when you know them.');
    const text = normalise(question);
    if (!/[a-z]/.test(text)) return clarify('Please ask in English.', 'This first version supports a limited set of English item names.');

    // Specialist waste always takes precedence over ordinary material matches.
    if (/\b(chemical|chemicals|radioactive|clinical|medical waste|laboratory|biohazard|solvent|syringe|sharps|acid waste)\b/.test(text)) {
      return base('refer', 'Use a specialist waste service.', 'This guide cannot recommend an ordinary recycling bin for hazardous or laboratory waste. Contact the HKU Safety Office for appropriate guidance.', {
        citations: [cite('S07', 'Chemicals & Waste / Chemical Safety Service')],
      });
    }
    if (/\b(smart bin|smart bins|smart recycling|re bin|re bins|centennial|pine court|kk leung|k k leung|meng wah|hui oi chow|sassoon|jockey club|home|off campus|library|hostel|hall)\b/.test(text)) {
      return base('out_of_scope', 'This version covers re Kiosk only.', 'Other facilities may accept different materials. Check the official facilities page or ask again specifically about re Kiosk.', {
        citations: [cite('S01', 're Facilities / facility types and smart-bin exceptions')],
      });
    }
    if (/\b(event|collection week|special collection|collection date|recycling week|october|today|tomorrow)\b/.test(text)) {
      return base('out_of_scope', 'Check the current collection schedule.', 'Special collections have their own dates and conditions. This version answers routine re Kiosk questions only.', {
        citations: [cite('S06', 'Resources Circulation Event Schedules')],
      });
    }
    const itemText = text.replace(/\b(clean and empty|clean and dry|rinsed and empty)\b/g, 'clean');
    if (/\b(and|plus|along with|as well as)\b/.test(itemText)) {
      return clarify('Please check one item at a time.', 'Describe a single item and its condition, then submit any other items separately.');
    }
    if (/\b(not a|not an|isn t a|isn t an)\b/.test(text) && !/\bnot a clean\b/.test(text)) {
      return clarify('What is the item actually made of?', 'This description rules out an item type. State the actual item and material so this version can check a supported rule.');
    }
    if (/\b(where is|location of|find re kiosk)\b/.test(text) && /\bre kiosk\b/.test(text)) {
      return base('information', 'Find re Kiosk at Run Run Shaw Podium.', knowledge.facilities.find(f => f.id === 're_kiosk').location, {
        citations: [cite('S01', 're Kiosk / location')],
      });
    }
    if (/\b(what|which)\b/.test(text) && /\b(accept|accepts|accepted|collect|collects|categories)\b/.test(text) && /\b(re kiosk|categories|what can i recycle)\b/.test(text) && !Object.keys(ALIASES).some(id => matches(text, id)) && !/\b(bottle|bottles|battery|batteries)\b/.test(text)) {
      return base('information', 'Six recycling categories at re Kiosk.', 'Ask about a specific item to check restrictions and preparation requirements.', {
        steps: knowledge.facilities.find(f => f.id === 're_kiosk').listed_categories.map(c => LABELS[c]),
        citations: [cite('S01', 're Kiosk / accepted recyclables')],
      });
    }

    let ids = Object.keys(ALIASES).filter(id => matches(text, id));
    // More specific rules take precedence only within the same item family.
    if (ids.includes('R16')) ids = ids.filter(id => id !== 'R09');
    if (ids.includes('R19')) ids = ids.filter(id => id !== 'R07');
    if (ids.includes('R04')) ids = ids.filter(id => id !== 'R01');
    if (ids.includes('R14') || (/\b(battery|batteries)\b/.test(text) && /\b(damaged|swollen|leaking|broken)\b/.test(text))) {
      return base('refer', 'Ask staff about this damaged battery.', 'Do not use a routine bin recommendation for a damaged, swollen, or leaking battery. Ask HKU staff to confirm the appropriate specialist route.', {
        citations: fromRules(['R14']),
      });
    }
    if (ids.length > 1) {
      return clarify('Please check one item at a time.', 'Your description matches more than one rule. Choose the item you mean, then check any remaining items separately.', ids.map(id => choice(rules.get(id).items_en[0], rules.get(id).items_en[0])));
    }
    if (/\b(battery|batteries)\b/.test(text) && !ids.length) {
      return clarify('What kind of battery is it?', 'Battery type and condition matter. Choose a type only if you can identify it.', [
        choice('Portable household rechargeable', 'portable household rechargeable battery'),
        choice('Single-use', 'single-use battery'),
        choice('Damaged or swollen', 'damaged battery'),
      ], ['R12', 'R13', 'R14']);
    }
    if (!ids.length && /\b(bottle|bottles)\b/.test(text)) {
      return clarify('What kind of bottle is it?', 'The material and use determine which rule applies.', [
        choice('Plastic beverage bottle', 'plastic beverage bottle'),
        choice('Glass beverage bottle', 'glass beverage bottle'),
        choice('Personal care bottle', 'personal care bottle'),
      ]);
    }
    if (!ids.length) {
      return base('unknown', 'I cannot confirm this item yet.', 'No supported rule matches this description. Try a more specific English item name or check the official guide. An unknown item is not automatically general waste.', {
        citations: [cite('S02', 'Recycling 101 / material categories')],
      });
    }

    const id = ids[0];
    const rule = rules.get(id);
    if (id === 'R07' && /\b(metal|composite|mixed material|mixed materials)\b/.test(text)) {
      return clarify('Does it contain other materials?', 'Plastic products with metal components and other composites are excluded by the poster. A generic plastic-bottle match is not enough to confirm this item.', [], ['R08']);
    }
    if (id === 'R10' && /\b(broken|shattered|cracked)\b/.test(text)) {
      return base('unknown', 'I cannot confirm damaged glass.', 'This prototype has no verified rule for broken or damaged glass bottles. Ask staff before choosing a collection route.', {citations: fromRules(['R10'])});
    }
    if (id === 'R12' && !/\b(portable|household)\b/.test(text)) {
      return clarify('Is it a portable household battery?', 'The documented rule covers portable household rechargeable batteries. Confirm the type and whether it is intact.', [
        choice('Portable household and intact', 'intact portable household rechargeable battery'),
        choice('Damaged or swollen', 'damaged rechargeable battery'),
      ], ['R12', 'R14']);
    }
    if (id === 'R12' && !/\b(intact|undamaged)\b/.test(text)) {
      return clarify('Is the battery intact?', 'Confirm its condition before using the portable household rechargeable-battery rule.', [
        choice('Intact', 'intact portable household rechargeable battery'),
        choice('Damaged or swollen', 'damaged rechargeable battery'),
      ], ['R12', 'R14']);
    }

    const dirty = /\b(dirty|greasy|oily|stained|unclean|unwashed|food residue|not clean|not a clean|not empty|not rinsed|isn t clean|isn t empty|contaminated|leftover|leftovers|half full|full of|still contains|with coffee inside)\b/.test(text) || options.cleanliness === 'dirty';
    const clean = !dirty && (/\b(clean|cleaned|rinsed)\b/.test(text) || options.cleanliness === 'clean');
    const needsCondition = ['R01', 'R07', 'R09', 'R10', 'R15', 'R16', 'R18', 'R19', 'R21'].includes(id);
    if (needsCondition && dirty) {
      if (['R01', 'R15'].includes(id)) {
        return base('not_accepted', 'Do not use the paper category in this condition.', 'The poster excludes paper and cardboard contaminated with food. This does not establish another disposal route.', {citations: fromRules(['R04'])});
      }
      return clarify('I cannot confirm it in this condition.', 'The input indicates residue or contamination. Check the official preparation guidance or ask re Kiosk staff; this version will not guess whether the item can be made acceptable.', [], [id]);
    }
    if (needsCondition && !clean) {
      return clarify('Is the item clean and free of contents?', 'Condition can change the answer. Confirm this for the item or components you want to recycle.', [
        choice('Yes, clean and empty', question, 'clean'),
        choice('No, residue remains', question, 'dirty'),
      ], [id]);
    }
    if (id === 'R22') {
      return base('not_accepted', 'Not accepted in routine re Kiosk collection.', 'The Photo Guide excludes this packaging. Special events may have different conditions; check their schedule separately.', {
        citations: [...fromRules([id]), cite('S06', 'Special collection dates and item conditions')],
      });
    }
    if (rule.decision === 'not_accepted') {
      return base('not_accepted', 'Not accepted in this recycling category.', `The re Kiosk guidance excludes this item${LABELS[rule.category] ? ` from ${LABELS[rule.category].toLowerCase()}` : ''}. This does not automatically establish another disposal route.`, {citations: fromRules([id])});
    }
    if (rule.decision === 'separate_components') {
      return base('separate', 'Separate the components first.', 'Different parts of this item follow different re Kiosk rules.', {steps: rule.conditions, citations: fromRules([id])});
    }
    return base('accepted', `Use the ${LABELS[rule.category]} category.`, 'The item matches an accepted example in the published re Kiosk guidance. Follow the conditions below and check the current label before depositing it.', {
      category: rule.category, steps: rule.conditions, citations: fromRules([id]),
    });
  };
}
