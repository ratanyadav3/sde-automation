import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.resolve('./prospeo_cache.json');

function readCache() {
    if (!fs.existsSync(CACHE_FILE)) {
        return {};
    }

    try {
        return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (error) {
        console.error('Failed to read cache:', error.message);
        return {};
    }
}

function writeCache(cacheData) {
    try {
        fs.writeFileSync(
            CACHE_FILE,
            JSON.stringify(cacheData, null, 2),
            'utf8'
        );
    } catch (error) {
        console.error('Failed to write cache:', error.message);
    }
}

const delay = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

export async function getLeadsAndEmails(companyDomain) {
    const cache = readCache();

    if (cache[companyDomain]) {
        console.log(
            `  -> [CACHE HIT] Found saved data for ${companyDomain}`
        );
        return cache[companyDomain].results;
    }

    console.log(
        `  -> [API CALL] Searching executives at ${companyDomain}...`
    );

    try {
        // STEP 1: Search Person

        const searchResponse = await fetch(
            'https://api.prospeo.io/search-person',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-KEY': process.env.PROSPEO_API_KEY
                },
                body: JSON.stringify({
                    page: 1,
                    filters: {
                        company: {
                            websites: {
                                include: [companyDomain]
                            }
                        },
                        person_seniority: {
                            include: [
                                'C-Suite',
                                'Vice President',
                                'Founder/Owner'
                            ]
                        }
                    }
                })
            }
        );

        if (!searchResponse.ok) {
            throw new Error(
                `Search failed (${searchResponse.status})`
            );
        }

        const searchData = await searchResponse.json();

        if (
            !searchData.results ||
            searchData.results.length === 0
        ) {
            console.log(
                `  [!] No executives found for ${companyDomain}`
            );
            cache[companyDomain] = { results: [], cachedAt: Date.now() };
            writeCache(cache);
            return [];
        }

        const targetPerson =
            searchData.results[0]?.person;

        const targetPersonId =
            targetPerson?.person_id;

        if (!targetPersonId) {
            console.log(
                `  [!] Missing person_id for ${companyDomain}`
            );
            cache[companyDomain] = { results: [], cachedAt: Date.now() };
            writeCache(cache);
            return [];
        }

        console.log(
            `  -> [API CALL] Enriching ${targetPersonId}...`
        );

        await delay(3000);

        // STEP 2: Enrich Person

        const enrichResponse = await fetch(
            'https://api.prospeo.io/enrich-person',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-KEY': process.env.PROSPEO_API_KEY
                },
                body: JSON.stringify({
                    data: {
                        person_id: targetPersonId
                    }
                })
            }
        );

        if (!enrichResponse.ok) {
            throw new Error(
                `Enrich failed (${enrichResponse.status})`
            );
        }

        const enrichData = await enrichResponse.json();

        if (
            enrichData.error ||
            !enrichData.person
        ) {
            console.log(
                `  [!] Failed to enrich ${companyDomain}`
            );
            cache[companyDomain] = { results: [], cachedAt: Date.now() };
            writeCache(cache);
            return [];
        }

        const p = enrichData.person;

        const finalLead = [
            {
                name: p.full_name || null,
                title: p.current_job_title || null,
                email: p.email?.email || null,
                linkedin: p.linkedin_url || null,
                seniority:
                    p.job_history?.[0]?.seniority ||
                    'Unknown'
            }
        ];

        cache[companyDomain] = { results: finalLead, cachedAt: Date.now() };
        writeCache(cache);

        return finalLead;
    } catch (error) {
        console.error(
            `  [!] Error for ${companyDomain}: ${error.message}`
        );
        cache[companyDomain] = { results: [], cachedAt: Date.now() };
        writeCache(cache);
        return [];
    }
}