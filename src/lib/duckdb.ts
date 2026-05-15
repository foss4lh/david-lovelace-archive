import { base } from '$app/paths';
import { browser } from '$app/environment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
let dbInitialized = false;

export async function initDuckDB() {
	if (!browser) return null;
	if (db && dbInitialized) return db;

	const duckdb = await import('@duckdb/duckdb-wasm');

	const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
	const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

	const worker_url = URL.createObjectURL(
		new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
	);

	const worker = new Worker(worker_url);
	const logger = new duckdb.ConsoleLogger();
	db = new duckdb.AsyncDuckDB(logger, worker);
	await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
	URL.revokeObjectURL(worker_url);

	// Fetch and register the database file ONCE
	const response = await fetch(`${base}/data/archive-v5.duckdb`);
	if (!response.ok) throw new Error(`Failed to fetch archive-v5.duckdb: ${response.statusText}`);

	const buffer = await response.arrayBuffer();
	await db.registerFileBuffer('archive.duckdb', new Uint8Array(buffer));

	// Attach the registered file as a named database once.
	// ATTACH is database-level and persists across connections.
	const conn = await db.connect();
	try {
		await conn.query(`ATTACH 'archive.duckdb' AS archive (READ_ONLY);`);
	} finally {
		await conn.close();
	}

	dbInitialized = true;
	return db;
}

export async function queryInventory(sql: string) {
	if (!browser) return null;
	const instance = await initDuckDB();
	if (!instance) return null;

	const conn = await instance.connect();
	try {
		const results = await conn.query(sql);
		return results;
	} finally {
		await conn.close();
	}
}
