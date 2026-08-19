#!/usr/bin/env node
// DLA Server — download handler + newsletter signup
// Installed as systemd service on openclaw.
// Copy to /home/clausrl/dla-server/server.js, then:
//   sudo systemctl enable dla-server && sudo systemctl start dla-server
//
// Requires: SUPABASE_SERVICE_KEY from /home/clausrl/supabase/docker/.env
// Optional: RESEND_API_KEY for sending newsletter emails

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const {
	PORT = 3001,
	ARCHIVE_ROOT = '/mnt/fe20e9cd-93ce-46c5-86be-cf2287573f45/david-lovelace-archive-clean',
	SUPABASE_URL = 'http://localhost:8000',
	SUPABASE_SERVICE_KEY = '',
	RESEND_API_KEY = ''
} = process.env;

function json(res, code, data) {
	res.writeHead(code, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(data));
}

function decodeJWT(token) {
	try {
		const parts = token.split('.');
		return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
	} catch {
		return null;
	}
}

async function querySupabase(table, select, filters) {
	const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filters ? '&' + filters : ''}`;
	const res = await fetch(url, {
		headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
	});
	return res.ok ? res.json() : [];
}

async function insertSupabase(table, data) {
	const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			apikey: SUPABASE_SERVICE_KEY,
			Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
			Prefer: 'return=minimal'
		},
		body: JSON.stringify(data)
	});
	return res.ok;
}

async function canAccess(fileRelPath) {
	const lower = fileRelPath.toLowerCase();
	if (lower.startsWith('harc-records') || lower.startsWith('projects')) return false;
	if (lower.endsWith('.docx') || lower.endsWith('.doc') || lower.endsWith('.xlsx')) return false;
	return true;
}

const server = http.createServer(async (req, res) => {
	const url = new URL(req.url, `http://localhost:${PORT}`);
	const method = req.method;

	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	if (method === 'OPTIONS') {
		res.writeHead(204);
		return res.end();
	}

	// Health
	if (url.pathname === '/health' && method === 'GET') {
		return json(res, 200, { status: 'ok', archive: fs.existsSync(ARCHIVE_ROOT) });
	}

	// Newsletter subscribe POST /api/newsletter/subscribe
	if (url.pathname === '/api/newsletter/subscribe' && method === 'POST') {
		let body = '';
		for await (const chunk of req) body += chunk;
		try {
			const { email, name } = JSON.parse(body);
			if (!email || !email.includes('@')) return json(res, 400, { error: 'Valid email required' });
			const exists = await querySupabase(
				'newsletter_subscribers',
				'id',
				`email=eq.${encodeURIComponent(email)}`
			);
			if (exists.length > 0) return json(res, 200, { message: 'Already subscribed' });
			await insertSupabase('newsletter_subscribers', {
				email,
				name: name || '',
				subscribed_at: new Date().toISOString(),
				source: 'website'
			});
			console.log(`[Newsletter] New subscriber: ${email}`);
			return json(res, 201, { message: 'Subscribed successfully' });
		} catch {
			return json(res, 400, { error: 'Invalid request' });
		}
	}

	// Newsletter list GET /api/newsletter/subscribers
	if (url.pathname === '/api/newsletter/subscribers' && method === 'GET') {
		const subscribers = await querySupabase(
			'newsletter_subscribers',
			'email,name,subscribed_at,source',
			'order=subscribed_at.desc'
		);
		return json(res, 200, { count: subscribers.length, subscribers });
	}

	// Newsletter send POST /api/newsletter/send
	if (url.pathname === '/api/newsletter/send' && method === 'POST') {
		if (!RESEND_API_KEY) return json(res, 501, { error: 'Resend not configured' });
		let body = '';
		for await (const chunk of req) body += chunk;
		const { subject, html } = JSON.parse(body);
		const subscribers = await querySupabase('newsletter_subscribers', 'email');
		let sent = 0,
			failed = 0;
		for (const sub of subscribers) {
			try {
				const r = await fetch('https://api.resend.com/emails', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${RESEND_API_KEY}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						from: 'David Lovelace Archive <updates@bosci.net>',
						to: sub.email,
						subject,
						html
					})
				});
				if (r.ok) sent++;
				else failed++;
			} catch {
				failed++;
			}
		}
		console.log(`[Newsletter] Sent ${sent}, failed ${failed}`);
		return json(res, 200, { sent, failed, total: subscribers.length });
	}

	// Download GET /download/<category>/<filepath>
	const dlMatch = url.pathname.match(/^\/download\/(.+)$/);
	if (dlMatch && method === 'GET') {
		const fileRelPath = dlMatch[1];
		const absPath = path.resolve(ARCHIVE_ROOT, fileRelPath);
		if (!absPath.startsWith(ARCHIVE_ROOT)) return json(res, 403, { error: 'Forbidden' });
		if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory())
			return json(res, 404, { error: 'Not found' });
		if (!(await canAccess(fileRelPath))) return json(res, 403, { error: 'Login required' });
		const stat = fs.statSync(absPath);
		res.writeHead(200, {
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': `attachment; filename="${path.basename(absPath)}"`,
			'Content-Length': stat.size
		});
		fs.createReadStream(absPath).pipe(res);
		const user = req.headers['authorization']
			? decodeJWT(req.headers['authorization'].slice(7))
			: null;
		console.log(
			`[DL] ${user?.email || 'anon'} → ${fileRelPath} (${(stat.size / 1e9).toFixed(2)} GB)`
		);
		return;
	}

	json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
	console.log(`DLA Server running on :${PORT}`);
	console.log(`Archive: ${ARCHIVE_ROOT}`);
});
