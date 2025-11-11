const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { readConfig, writeConfig } = require('./configManager');

const CHAMPIONS_PATH = path.join(__dirname, 'champions.json');

async function getLatestVersion() {
    try {
        const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
        return response.data[0];
    } catch (error) {
        console.error('Error fetching latest version:', error);
        return null;
    }
}

async function getChampions(version) {
    try {
        const response = await axios.get(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
        return response.data.data;
    } catch (error) {
        console.error(`Error fetching champions for version ${version}:`, error);
        return null;
    }
}

function groupChampionsByRole(champions) {
    const roles = {
        Fighter: [],
        Mage: [],
        Tank: [],
        Marksman: [],
        Assassin: [],
        Support: []
    };

    for (const champName in champions) {
        const champ = champions[champName];
        champ.tags.forEach(tag => {
            if (roles[tag]) {
                roles[tag].push(champ.id);
            }
        });
    }
    return roles;
}

async function updateChampions() {
    console.log('Checking for new champion data...');
    const config = await readConfig();
    const latestVersion = await getLatestVersion();

    if (!latestVersion) {
        console.log('Could not fetch latest version. Skipping update.');
        return;
    }

    if (latestVersion === config.DRAGON_VERSION) {
        console.log('Champion data is up to date.');
        return;
    }

    console.log(`New version found: ${latestVersion}. Updating champions...`);

    const champions = await getChampions(latestVersion);
    if (!champions) {
        console.log('Could not fetch champions. Skipping update.');
        return;
    }

    const newRoles = groupChampionsByRole(champions);

    config.DRAGON_VERSION = latestVersion;
    config.CHAMPION_ROLES = newRoles;

    await writeConfig(config);

    // Also, update the champions.json file for the bot to use
    try {
        await fs.writeFile(CHAMPIONS_PATH, JSON.stringify(champions, null, 4));
        console.log('Champions data updated successfully.');
    } catch (error) {
        console.error('Error writing champions.json file:', error);
    }
}

// Run the update function directly if the script is executed from the command line
if (require.main === module) {
    updateChampions();
}

module.exports = { updateChampions };
