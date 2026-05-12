import { createReadStream, createWriteStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import readline from 'node:readline';

const inventoryDir = '/media/robin/foss4lh/david-lovelace-archive/file-info-names';
const outputFile = 'catalog/archive-inventory.csv';

async function parseFile(filePath, csvStream) {
	const fileStream = createReadStream(filePath);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity
	});

	let currentDir = '';
	const dirRegex = /^ Directory of (.*)$/;
	const fileRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+([\d,]+|<DIR>)\s+(.*)$/;

	for await (const line of rl) {
		const trimmedLine = line.trim();
		if (!trimmedLine) continue;

		const dirMatch = line.match(dirRegex);
		if (dirMatch) {
			currentDir = dirMatch[1].trim();
			continue;
		}

		const fileMatch = line.match(fileRegex);
		if (fileMatch) {
			const [, date, time, sizeOrDir, name] = fileMatch;
			if (sizeOrDir === '<DIR>') continue;
			if (name === '.' || name === '..') continue;

			const size = parseInt(sizeOrDir.replace(/,/g, ''), 10);
			const fullPath = join(currentDir, name);
			const ext = name.split('.').pop().toLowerCase();

			csvStream.write(`"${fullPath.replace(/"/g, '""')}","${size}","${ext}","${date} ${time}"\n`);
		}
	}
}

async function main() {
	const files = (await readdir(inventoryDir)).filter((f) => f.endsWith('.txt'));
	console.log(`Found ${files.length} inventory files`);

	const csvStream = createWriteStream(outputFile);
	csvStream.write('path,size,format,timestamp\n');

	for (const file of files) {
		console.log(`Parsing ${file}...`);
		await parseFile(join(inventoryDir, file), csvStream);
	}

	csvStream.end();
	console.log(`Wrote ${outputFile}`);
}

main().catch(console.error);
