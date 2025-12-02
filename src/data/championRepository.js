const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

const CHAMPIONS_PATH = path.join(__dirname, "..", "..", "champions.json");
const CHECKSUM_PATH = path.join(__dirname, "..", "..", "checksum.json");

async function readChampions() {
	try {
		const championsData = await fs.readFile(CHAMPIONS_PATH, "utf-8");
		return JSON.parse(championsData);
	} catch (error) {
		if (error.code === "ENOENT") {
			// If the file doesn't exist, create it with an empty object.
			await writeChampions({});
			return {};
		}
		throw error;
	}
}

async function writeChampions(champions) {
	await fs.writeFile(CHAMPIONS_PATH, JSON.stringify(champions, null, 4));
}

function createChecksum(data) {
	return crypto.createHash("sha256").update(data).digest("hex");
}

async function getChecksums() {
	try {
		const checksumsData = await fs.readFile(CHECKSUM_PATH, "utf-8");
		return JSON.parse(checksumsData);
	} catch (error) {
		if (error.code === "ENOENT") {
			return {};
		}
		throw error;
	}
}

async function saveChecksum(fileName, checksum) {
	const checksums = await getChecksums();
	const existingChecksum = checksums[fileName];
	if (existingChecksum && existingChecksum.checksum === checksum) {
		return;
	}
	checksums[fileName] = {
		checksum: checksum,
	};
	await fs.writeFile(CHECKSUM_PATH, JSON.stringify(checksums, null, 2));
}

async function verifyChecksum(fileName, checksum) {
	const checksums = await getChecksums();
	return checksums[fileName] && checksums[fileName].checksum === checksum;
}

module.exports = {
	readChampions,
	writeChampions,
	createChecksum,
	getChecksums,
	saveChecksum,
	verifyChecksum,
};
