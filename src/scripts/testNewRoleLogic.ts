import championsData from '../../champions.json';

interface Champion {
  id: string;
  name: string;
  tags: string[];
}

// Type assertion for champions data
const champions = championsData as Record<string, Champion>;

// OLD LOGIC: First tag only
const oldLogic: Record<string, string[]> = {
  Fighter: [],
  Mage: [],
  Tank: [],
  Marksman: [],
  Assassin: [],
  Support: [],
};

// NEW LOGIC: Assassin priority over Fighter + Tank+Support in both roles
const newLogic: Record<string, string[]> = {
  Fighter: [],
  Mage: [],
  Tank: [],
  Marksman: [],
  Assassin: [],
  Support: [],
};

for (const champName in champions) {
  const champ = champions[champName];

  // Old logic: first tag only
  const oldTag = champ.tags[0];
  if (oldLogic[oldTag]) {
    oldLogic[oldTag].push(champ.id);
  }

  // New logic: Special cases
  if (champ.tags.includes('Fighter') && champ.tags.includes('Assassin')) {
    newLogic.Assassin.push(champ.id);
  } else if (champ.tags.includes('Tank') && champ.tags.includes('Support')) {
    newLogic.Tank.push(champ.id);
    newLogic.Support.push(champ.id);
  } else {
    const assignedRole = champ.tags[0];
    if (newLogic[assignedRole]) {
      newLogic[assignedRole].push(champ.id);
    }
  }
}

console.log('='.repeat(80));
console.log('ROLE ASSIGNMENT CHANGES');
console.log('='.repeat(80));
console.log();

// Find champions with both Tank and Support tags
const tankSupportChampions = Object.values(champions).filter(
  (champ) => champ.tags.includes('Tank') && champ.tags.includes('Support')
);

console.log('Champions with both Tank and Support tags (will be in BOTH roles):');
console.log('-'.repeat(80));
tankSupportChampions.forEach((champ) => {
  console.log(`  ✓ ${champ.id} (${champ.tags.join(', ')})`);
});
console.log(`\nTotal: ${tankSupportChampions.length} champions\n`);

// Find champions that moved from Fighter to Assassin
const movedToAssassin = oldLogic.Fighter.filter(
  (champ) => newLogic.Assassin.includes(champ) && !oldLogic.Assassin.includes(champ)
);

console.log('Champions moved from Fighter to Assassin:');
console.log('-'.repeat(80));
if (movedToAssassin.length > 0) {
  movedToAssassin.forEach((champ) => {
    const championData = champions[champ];
    console.log(`  ✓ ${champ} (${championData.tags.join(', ')})`);
  });
  console.log(`\nTotal: ${movedToAssassin.length} champions\n`);
} else {
  console.log('  None\n');
}

console.log('='.repeat(80));
console.log('ROLE DISTRIBUTION COMPARISON');
console.log('='.repeat(80));
console.log();

const roles = ['Fighter', 'Mage', 'Tank', 'Marksman', 'Assassin', 'Support'];

roles.forEach((role) => {
  const oldCount = oldLogic[role].length;
  const newCount = newLogic[role].length;
  const diff = newCount - oldCount;
  const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '0';
  const icon = diff > 0 ? '📈' : diff < 0 ? '📉' : '➡️';

  console.log(`${icon} ${role.padEnd(10)} | Old: ${oldCount.toString().padStart(2)} → New: ${newCount.toString().padStart(2)} (${diffStr})`);
});

console.log();
console.log('='.repeat(80));
console.log('NEW ROLE ASSIGNMENTS');
console.log('='.repeat(80));
console.log();

roles.forEach((role) => {
  console.log(`\n${role} (${newLogic[role].length} champions):`);
  console.log('-'.repeat(80));
  console.log(newLogic[role].sort().join(', '));
});

console.log();
