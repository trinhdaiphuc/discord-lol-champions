const fs = require('fs').promises;
const path = require('path');

const imageCache = new Map();
const imagesDir = path.join(__dirname, 'images');

async function getChampionImage(championImage) {
    if (imageCache.has(championImage)) {
        return imageCache.get(championImage);
    }

    const imagePath = path.join(imagesDir, championImage);
    try {
        const imageBuffer = await fs.readFile(imagePath);
        imageCache.set(championImage, imageBuffer);
        return imageBuffer;
    } catch (error) {
        console.error(`Failed to read image ${championImage}: ${error.message}`);
        return null;
    }
}

module.exports = { getChampionImage };
