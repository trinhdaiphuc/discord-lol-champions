import championsData from '../../champions.json';
import config from '../../config.json';

interface Champion {
  id: string;
  name: string;
  tags: string[];
}

// Type assertion for champions data
const champions = championsData as Record<string, Champion>;

// OLD LOGIC: Get champions grouped by ALL tags (a champion can appear in multiple roles)
const championsByAllTags: Record<string, string[]> = {};

Object.values(champions).forEach((champion) => {
  champion.tags.forEach((tag) => {
    if (!championsByAllTags[tag]) {
      championsByAllTags[tag] = [];
    }
    championsByAllTags[tag].push(champion.id);
  });
});

// Sort for easier comparison
Object.keys(championsByAllTags).forEach((role) => {
  championsByAllTags[role].sort();
});

// NEW LOGIC: Get champions grouped by FIRST tag only
const championsByFirstTag: Record<string, string[]> = {};

Object.values(champions).forEach((champion) => {
  const firstTag = champion.tags[0];
  if (firstTag) {
    if (!championsByFirstTag[firstTag]) {
      championsByFirstTag[firstTag] = [];
    }
    championsByFirstTag[firstTag].push(champion.id);
  }
});

// Sort for easier comparison
Object.keys(championsByFirstTag).forEach((role) => {
  championsByFirstTag[role].sort();
});

console.log('='.repeat(80));
console.log('CHAMPIONS FILTERED OUT BY SWITCHING TO FIRST TAG ONLY');
console.log('='.repeat(80));
console.log();

const configRoles = config.CHAMPION_ROLES as Record<string, string[]>;
const allRoles = Object.keys(configRoles).sort();

let totalFilteredOut = 0;
const filteredOutByRole: Record<string, Array<{ champion: string; allTags: string[] }>> = {};

allRoles.forEach((role) => {
  const oldLogicChampions = championsByAllTags[role] || [];
  const newLogicChampions = championsByFirstTag[role] || [];

  // Find champions that were in the role with old logic but not with new logic
  const filteredOut = oldLogicChampions.filter(
    (champ) => !newLogicChampions.includes(champ)
  );

  if (filteredOut.length > 0) {
    filteredOutByRole[role] = filteredOut.map((champ) => ({
      champion: champ,
      allTags: champions[champ].tags
    }));
    totalFilteredOut += filteredOut.length;
  }
});

// Display filtered out champions by role
allRoles.forEach((role) => {
  const filtered = filteredOutByRole[role];

  console.log(`\n${role}:`);
  console.log('-'.repeat(80));

  if (filtered && filtered.length > 0) {
    console.log(`❌ ${filtered.length} champion(s) filtered out:\n`);
    filtered.forEach(({ champion, allTags }) => {
      const firstTag = allTags[0];
      console.log(`  - ${champion}`);
      console.log(`    First tag: ${firstTag} (now in ${firstTag} role)`);
      console.log(`    All tags: ${allTags.join(', ')}`);
      console.log(`    Reason: "${role}" is secondary tag, not primary\n`);
    });
  } else {
    console.log('✅ No champions filtered out');
  }

  const oldCount = championsByAllTags[role]?.length || 0;
  const newCount = championsByFirstTag[role]?.length || 0;
  console.log(`  Old logic count: ${oldCount}`);
  console.log(`  New logic count: ${newCount}`);
  console.log(`  Difference: ${oldCount - newCount}`);
});

console.log('\n');
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log();

console.log(`Total champions filtered out across all roles: ${totalFilteredOut}`);
console.log();

// Show all filtered out champions in a compact list
if (totalFilteredOut > 0) {
  console.log('Complete list of filtered out champions:');
  console.log('-'.repeat(80));

  const allFilteredChampions = new Set<string>();
  Object.values(filteredOutByRole).forEach((filtered) => {
    filtered.forEach(({ champion }) => allFilteredChampions.add(champion));
  });

  const sortedFiltered = Array.from(allFilteredChampions).sort();
  sortedFiltered.forEach((champ) => {
    const championData = champions[champ];
    console.log(`  ${champ} (${championData.tags.join(' → ')})`);
  });

  console.log();
  console.log(`Total unique champions affected: ${allFilteredChampions.size}`);
} else {
  console.log('No champions were filtered out! 🎉');
}

console.log();
