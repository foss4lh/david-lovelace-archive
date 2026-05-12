import { base } from '$app/paths';
import { browser } from '$app/environment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;

export async function initDuckDB() {
	if (!browser) return null;
	if (db) return db;

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

	return db;
}

export async function queryInventory(sql: string) {
	if (!browser) return null;
	const instance = await initDuckDB();
	const conn = await instance.connect();

	// Load the database file if not already loaded into the virtual filesystem
	const response = await fetch(`${base}/data/archive.duckdb`);
	const buffer = await response.arrayBuffer();
	await instance.registerFileBuffer('archive.duckdb', new Uint8Array(buffer));

	// Open the database
	await conn.query(`ATTACH 'archive.duckdb' AS archive (READ_ONLY);`);

	const results = await conn.query(sql);
	await conn.close();
	return results;
}
