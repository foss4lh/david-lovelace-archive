<script lang="ts">
	import { ExternalLink, BookOpen, FolderOpen } from '@lucide/svelte';

	interface Parish {
		name: string;
		pages: string;
	}

	const volume1Parishes: Parish[] = [
		{ name: 'Abbey Dore', pages: '1-11' },
		{ name: 'Aconbury', pages: '11-14' },
		{ name: 'Allensmore', pages: '14-18' },
		{ name: 'Bacton', pages: '18-21' },
		{ name: 'Ballingham', pages: '21-22' },
		{ name: 'Birch, Little', pages: '22' },
		{ name: 'Birch, Much', pages: '23' },
		{ name: 'Blakemere', pages: '23-24' },
		{ name: 'Bolstone', pages: '24-25' },
		{ name: 'Bredwardine', pages: '25-28' },
		{ name: 'Bridstow', pages: '28-34' },
		{ name: 'Bullingham, Lower', pages: '34' },
		{ name: 'Callow', pages: '34-35' },
		{ name: 'Clehonger', pages: '35-37' },
		{ name: 'Clifford', pages: '38-42' },
		{ name: 'Craswall', pages: '42-46' },
		{ name: 'Cusop', pages: '46-47' },
		{ name: 'Dewchurch, Little', pages: '47-48' },
		{ name: 'Dewchurch, Much', pages: '48-52' },
		{ name: 'Dewsall', pages: '52-54' },
		{ name: 'Dinedor', pages: '54-55' },
		{ name: 'Dorstone', pages: '55-58' },
		{ name: 'Dulas', pages: '58-59' },
		{ name: 'Eaton Bishop', pages: '59-62' },
		{ name: 'Ewyas Harold', pages: '62-64' },
		{ name: 'Foy', pages: '64-68' },
		{ name: 'Ganarew', pages: '68-69' },
		{ name: 'Garway', pages: '69-73' },
		{ name: 'Goodrich', pages: '73-82' },
		{ name: 'Grafton', pages: '82-83' },
		{ name: 'Harewood', pages: '83-84' },
		{ name: 'Haywood', pages: '84' },
		{ name: 'Hentland', pages: '84-90' },
		{ name: 'Hereford', pages: '90-144' },
		{ name: 'Holme Lacy', pages: '144-152' },
		{ name: 'Kenderchurch', pages: '152' },
		{ name: 'Kentchurch', pages: '153-155' },
		{ name: 'Kilpeck', pages: '156-161' },
		{ name: 'Kingstone', pages: '161-164' },
		{ name: 'Llancillo', pages: '164-166' },
		{ name: 'Llandinabo', pages: '166-167' },
		{ name: 'Llangarren', pages: '167-171' },
		{ name: 'Llanrothal', pages: '171-173' },
		{ name: 'Llanveynoe', pages: '173-177' },
		{ name: 'Llanwarne', pages: '177-179' },
		{ name: 'Longtown', pages: '179-191' },
		{ name: 'Madley', pages: '191-199' },
		{ name: 'Marstow', pages: '199' },
		{ name: 'Michaelchurch Escley', pages: '199-203' },
		{ name: 'Moccas', pages: '203-205' },
		{ name: 'Newton', pages: '205-207' },
		{ name: 'Orcop', pages: '207-208' },
		{ name: 'Pencoyd', pages: '209' },
		{ name: 'Peterchurch', pages: '209-217' },
		{ name: 'Peterstow', pages: '217-218' },
		{ name: 'Preston on Wye', pages: '218-220' },
		{ name: 'Rowlstone', pages: '220-223' },
		{ name: 'St. Devereux', pages: '223-225' },
		{ name: 'St. Margarets', pages: '225-227' },
		{ name: 'St. Weonards', pages: '227-234' },
		{ name: 'Sellack', pages: '234-237' },
		{ name: 'Thruxton', pages: '237-239' },
		{ name: 'Tretire with Michaelchurch', pages: '239-240' },
		{ name: 'Treville', pages: '240' },
		{ name: 'Turnastone', pages: '241-242' },
		{ name: 'Tyberton', pages: '242-243' },
		{ name: 'Vowchurch', pages: '243-246' },
		{ name: 'Walterstone', pages: '246-248' },
		{ name: 'Welsh Bicknor', pages: '248' },
		{ name: 'Welsh Newton', pages: '249-253' },
		{ name: 'Whitchurch', pages: '253-254' },
		{ name: 'Wormbridge', pages: '254-255' }
	];

	const volume2Parishes: Parish[] = [
		{ name: 'Acton Beauchamp', pages: '1-2' },
		{ name: 'Ashperton', pages: '2-4' },
		{ name: 'Aston Ingham', pages: '5-6' },
		{ name: 'Avenbury', pages: '6-8' },
		{ name: 'Aylton', pages: '8-9' },
		{ name: 'Bartestree', pages: '9-10' },
		{ name: "Bishop's Frome", pages: '10-12' },
		{ name: 'Bodenham', pages: '12-17' },
		{ name: 'Bosbury', pages: '17-22' },
		{ name: 'Brampton Abbotts', pages: '23-25' },
		{ name: 'Bredenbury', pages: '25-26' },
		{ name: 'Breinton', pages: '26-27' },
		{ name: 'Brinsop', pages: '27-32' },
		{ name: 'Brockhampton by Bromyard', pages: '32-34' },
		{ name: 'Brockhampton by Ross', pages: '34-36' },
		{ name: 'Bromyard', pages: '36-41' },
		{ name: 'Burghill', pages: '41-44' },
		{ name: 'Canon Frome', pages: '44-45' },
		{ name: 'Canon Pyon', pages: '45-48' },
		{ name: 'Castle Frome', pages: '48-50' },
		{ name: 'Coddington', pages: '50-51' },
		{ name: 'Collington', pages: '51-52' },
		{ name: 'Colwall', pages: '52-57' },
		{ name: 'Cowarne, Little', pages: '57-58' },
		{ name: 'Cowarne, Much', pages: '58-60' },
		{ name: 'Cradley', pages: '61-64' },
		{ name: 'Credenhill', pages: '64-67' },
		{ name: 'Dinmore', pages: '67-68' },
		{ name: 'Donnington', pages: '68-70' },
		{ name: 'Dormington', pages: '70-72' },
		{ name: 'Eastnor', pages: '72-75' },
		{ name: 'Edvin Loach', pages: '75-76' },
		{ name: 'Edvin Ralph', pages: '76-77' },
		{ name: 'Egleton', pages: '77-78' },
		{ name: 'Evesbatch', pages: '78-79' },
		{ name: 'Felton', pages: '79-80' },
		{ name: 'Fownhope', pages: '80-83' },
		{ name: 'Grendon Bishop', pages: '83-85' },
		{ name: 'Hampton Bishop', pages: '85-87' },
		{ name: 'Hampton Charles', pages: '87' },
		{ name: 'Holmer', pages: '87-89' },
		{ name: 'Hope Mansel', pages: '89-91' },
		{ name: 'How Capel', pages: '91-93' },
		{ name: 'Kenchester', pages: '93-96' },
		{ name: "King's Capel", pages: '96-98' },
		{ name: 'Lea', pages: '98-100' },
		{ name: 'Ledbury', pages: '100-114' },
		{ name: 'Ledbury (Rural)', pages: '114-118' },
		{ name: 'Linton By Bromyard', pages: '118-119' },
		{ name: 'Linton By Ross', pages: '119-122' },
		{ name: 'Lugwardine', pages: '122-127' },
		{ name: 'Marcle, Little', pages: '127' },
		{ name: 'Marcle, Much', pages: '127-134' },
		{ name: 'Marden', pages: '134-141' },
		{ name: 'Mathon', pages: '141-143' },
		{ name: 'Mordiford', pages: '143-146' },
		{ name: 'Moreton Jeffreys', pages: '146' },
		{ name: 'Moreton-on-Lugg', pages: '147-148' },
		{ name: 'Munsley', pages: '148-149' },
		{ name: 'Norton', pages: '149' },
		{ name: 'Ocle Pychard', pages: '149-151' },
		{ name: 'Pencombe', pages: '151-152' },
		{ name: 'Pipe and Lyde', pages: '152-153' },
		{ name: 'Pixley', pages: '153-155' },
		{ name: 'Preston Wynne', pages: '155-156' },
		{ name: 'Putley', pages: '156-158' },
		{ name: 'Ross', pages: '158-165' },
		{ name: 'Ross (Rural)', pages: '165-167' },
		{ name: 'Saltmarshe', pages: '167' },
		{ name: 'Sapey, Upper', pages: '167-168' },
		{ name: 'Sollers Hope', pages: '168-170' },
		{ name: 'Stanford Bishop', pages: '170-172' },
		{ name: 'Stoke Edith', pages: '172-173' },
		{ name: 'Stoke Lacy', pages: '173-174' },
		{ name: 'Stretton Grandison', pages: '174-176' },
		{ name: 'Stretton Sugwas', pages: '176-177' },
		{ name: 'Sutton', pages: '177-182' },
		{ name: 'Tarrington', pages: '182-185' },
		{ name: 'Tedstone Delamere', pages: '186-187' },
		{ name: 'Tedstone Wafer', pages: '187' },
		{ name: 'Thornbury', pages: '187-191' },
		{ name: 'Ullingswick', pages: '191-192' },
		{ name: 'Upton Bishop', pages: '192-195' },
		{ name: 'Wacton', pages: '195' },
		{ name: 'Walford-on-Wye', pages: '195-200' },
		{ name: 'Wellington', pages: '200-204' },
		{ name: 'Wellington Heath', pages: '204-205' },
		{ name: 'Westhide', pages: '205-207' },
		{ name: 'Weston Beggard', pages: '207-208' },
		{ name: 'Weston-under-Penyard', pages: '208-212' },
		{ name: 'Whitbourne', pages: '212-216' },
		{ name: 'Winslow', pages: '216' },
		{ name: 'Withington', pages: '216-219' }
	];

	const bhoVol1 = 'https://www.british-history.ac.uk/rchme/heref/vol1';
	const bhoVol2 = 'https://www.british-history.ac.uk/rchme/heref/vol2';
</script>

<main>
	<section class="page-heading">
		<h1>Royal Commission on Historical Monuments</h1>
		<p>
			Herefordshire was surveyed by the RCHME in the 1930s. Two volumes were published (1931 and
			1932), covering every parish in the county. This page links to the fully digitised text and
			plates on British History Online, and notes where the David Lovelace Archive holds additional
			unpublished material.
		</p>
	</section>

	<div class="rc-grid">
		<article class="rc-card">
			<h2><BookOpen size={20} /> Volume 1 — South-west (1931)</h2>
			<p>
				Covers the south-western division of Herefordshire, including the cathedral city of
				Hereford, the Wye valley, and the Black Mountains border. 72 parishes, 851 monuments.
			</p>
			<a class="rc-link" href={bhoVol1} target="_blank" rel="noopener noreferrer">
				<ExternalLink size={16} />
				Browse on British History Online
			</a>
		</article>

		<article class="rc-card">
			<h2><BookOpen size={20} /> Volume 2 — East (1932)</h2>
			<p>
				Covers the eastern division, including Ledbury, Ross-on-Wye, Bromyard, and the Malvern Hills
				border. The second of two published volumes.
			</p>
			<a class="rc-link" href={bhoVol2} target="_blank" rel="noopener noreferrer">
				<ExternalLink size={16} />
				Browse on British History Online
			</a>
		</article>
	</div>

	<section class="archive-note">
		<h2><FolderOpen size={20} /> Unpublished material in the archive</h2>
		<p>
			The published volumes represent a selection of the surveyed monuments. The David Lovelace
			Archive holds additional RCHME material that did not appear in print, including:
		</p>
		<ul>
			<li><code>History/NMRC_RC</code> — working survey notes and drafts</li>
			<li><code>History/NMRC_printed</code> — printed matter and offprints</li>
			<li><code>History/NMRC_redboxes</code> — red-box photograph collections</li>
		</ul>
		<p class="muted">
			A future task is to cross-reference these folders with the published parish entries and
			identify which unpublished photos and notes belong to which monuments.
		</p>
	</section>

	<section class="parish-index">
		<h2>Parish index — Volume 1 (South-west)</h2>
		<div class="parish-grid">
			{#each volume1Parishes as parish (parish.name)}
				<a
					class="parish-link"
					href={bhoVol1}
					target="_blank"
					rel="noopener noreferrer"
					title="Browse BHO Volume 1"
				>
					<span class="parish-name">{parish.name}</span>
					<span class="parish-pages">pp. {parish.pages}</span>
				</a>
			{/each}
		</div>
	</section>

	<section class="parish-index">
		<h2>Parish index — Volume 2 (East)</h2>
		<div class="parish-grid">
			{#each volume2Parishes as parish (parish.name)}
				<a
					class="parish-link"
					href={bhoVol2}
					target="_blank"
					rel="noopener noreferrer"
					title="Browse BHO Volume 2"
				>
					<span class="parish-name">{parish.name}</span>
					<span class="parish-pages">pp. {parish.pages}</span>
				</a>
			{/each}
		</div>
	</section>
</main>

<style>
	.rc-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.rc-card {
		padding: 1rem;
		border: 1px solid #d9d3c6;
		border-radius: 8px;
		background: #fffdf7;
	}

	.rc-card h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	.rc-card p {
		margin: 0 0 0.75rem;
		color: #55594f;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.rc-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: #304832;
		font-weight: 600;
		font-size: 0.85rem;
		text-decoration: none;
	}

	.rc-link:hover {
		text-decoration: underline;
	}

	.archive-note {
		padding: 1rem;
		margin-bottom: 1.5rem;
		border: 1px solid #e4ded0;
		border-radius: 8px;
		background: #f9f7f1;
	}

	.archive-note h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}

	.archive-note ul {
		margin: 0.5rem 0;
		padding-left: 1.2rem;
		color: #55594f;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.archive-note code {
		padding: 0.08rem 0.25rem;
		border-radius: 4px;
		background: #eee8da;
		font-size: 0.85rem;
	}

	.muted {
		color: #8c887d;
		font-size: 0.85rem;
	}

	.parish-index {
		margin-bottom: 1.5rem;
	}

	.parish-index h2 {
		margin-bottom: 0.75rem;
		font-size: 1.1rem;
	}

	.parish-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.4rem;
	}

	.parish-link {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
		color: #20231f;
		font-size: 0.85rem;
		text-decoration: none;
	}

	.parish-link:hover {
		background: #f0ece2;
	}

	.parish-name {
		font-weight: 500;
	}

	.parish-pages {
		color: #8c887d;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	@media (max-width: 760px) {
		.rc-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
