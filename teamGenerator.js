const { readConfig } = require('./configManager');

async function generateTeams() {
    const config = await readConfig();
    let usedChampions = new Set();
    let blueTeam = [];
    let redTeam = [];

    function selectChampion(roleChampions, usedChamps) {
        const available = roleChampions.filter(champ => !usedChamps.has(champ));
        if (available.length === 0) {
            return null; // No available champions
        }
        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    }

    function generateTeam(roles, usedChamps) {
        const team = [];
        for (const role in roles) {
            const roleChampions = roles[role];
            let champion;
            do {
                champion = selectChampion(roleChampions, usedChamps);
            } while (champion && usedChamps.has(champion));

            if (champion) {
                team.push(champion);
                usedChamps.add(champion);
            }
        }
        return team;
    }

    let allChampions = new Set();
    Object.values(config.CHAMPION_ROLES).forEach(champions => {
        champions.forEach(champion => allChampions.add(champion));
    });

    if (allChampions.size < 10) {
        throw new Error("Not enough unique champions to generate two teams.");
    }

    blueTeam = generateTeam(config.CHAMPION_ROLES, usedChampions);
    redTeam = generateTeam(config.CHAMPION_ROLES, usedChampions);

    // Ensure teams are unique
    let allGeneratedChamps = new Set([...blueTeam, ...redTeam]);
    while (allGeneratedChamps.size < blueTeam.length + redTeam.length) {
        usedChampions = new Set();
        blueTeam = generateTeam(config.CHAMPION_ROLES, usedChampions);
        redTeam = generateTeam(config.CHAMPION_ROLES, usedChampions);
        allGeneratedChamps = new Set([...blueTeam, ...redTeam]);
    }

    return { blueTeam, redTeam };
}

module.exports = { generateTeams };
