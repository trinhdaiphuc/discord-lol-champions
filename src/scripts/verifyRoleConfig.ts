import championsData from '../../champions.json';
import config from '../../config.json';

interface Champion {
  id: string;
  name: string;
  tags: string[];
}

// Type assertion for champions data
const champions = championsData as Record<string, Champion>;

// Get champions grouped by their FIRST tag
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
console.log('CHAMPIONS FILTERED BY FIRST TAG');
console.log('='.repeat(80));
console.log();

// Display champions by their first tag
Object.keys(championsByFirstTag).sort().forEach((role) => {
  console.log(`\n${role} (${championsByFirstTag[role].length} champions):`);
  console.log('-'.repeat(80));
  console.log(championsByFirstTag[role].join(', '));
});

console.log('\n');
console.log('='.repeat(80));
console.log('COMPARISON WITH CONFIG.JSON');
console.log('='.repeat(80));
console.log();

// Compare with config
const configRoles = config.CHAMPION_ROLES as Record<string, string[]>;

Object.keys(configRoles).sort().forEach((role) => {
  const configChampions = [...configRoles[role]].sort();
  const firstTagChampions = championsByFirstTag[role] || [];

  console.log(`\n${role}:`);
  console.log('-'.repeat(80));

  // Find differences
  const inConfigNotInFirstTag = configChampions.filter(
    (champ) => !firstTagChampions.includes(champ)
  );
  const inFirstTagNotInConfig = firstTagChampions.filter(
    (champ) => !configChampions.includes(champ)
  );

  if (inConfigNotInFirstTag.length === 0 && inFirstTagNotInConfig.length === 0) {
    console.log('✅ MATCH - Config matches champions with first tag');
  } else {
    console.log('❌ MISMATCH');

    if (inConfigNotInFirstTag.length > 0) {
      console.log(`\n  In config but NOT in first tag (${inConfigNotInFirstTag.length}):`);
      inConfigNotInFirstTag.forEach((champ) => {
        const championData = champions[champ];
        if (championData) {
          console.log(`    - ${champ} (first tag: ${championData.tags[0]}, all tags: ${championData.tags.join(', ')})`);
        } else {
          console.log(`    - ${champ} (NOT FOUND IN champions.json)`);
        }
      });
    }

    if (inFirstTagNotInConfig.length > 0) {
      console.log(`\n  In first tag but NOT in config (${inFirstTagNotInConfig.length}):`);
      inFirstTagNotInConfig.forEach((champ) => {
        console.log(`    - ${champ}`);
      });
    }
  }

  console.log(`\n  Config count: ${configChampions.length}`);
  console.log(`  First tag count: ${firstTagChampions.length}`);
});

console.log('\n');
console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

const allRoles = new Set([
  ...Object.keys(configRoles),
  ...Object.keys(championsByFirstTag)
]);

let totalMatches = 0;
let totalMismatches = 0;

allRoles.forEach((role) => {
  const configChampions = configRoles[role] || [];
  const firstTagChampions = championsByFirstTag[role] || [];

  if (JSON.stringify([...configChampions].sort()) === JSON.stringify(firstTagChampions.sort())) {
    totalMatches++;
  } else {
    totalMismatches++;
  }
});

console.log(`\nTotal roles: ${allRoles.size}`);
console.log(`Matching roles: ${totalMatches}`);
console.log(`Mismatching roles: ${totalMismatches}`);
console.log();
