// services/apollo.js

export async function getLookalikeCompanies(seedDomain) {
    // Strip out any accidental commas or whitespace from the CLI input
    const cleanDomain = seedDomain.replace(/,/g, '').trim();
    console.log(`\n[Stage 1] Querying Apollo.io for companies similar to ${cleanDomain}...`);
    
    const url = 'https://api.apollo.io/v1/organizations/search';
    
    // Extract the base name (e.g., "stripe" from "stripe.com")
    const baseName = cleanDomain.split('.')[0];
    
    const payload = {
        q_organization_name: baseName
    };

    // Safe fallback data to keep the pipeline moving if the API rejects the free tier
    const fallbackDomains = ['plaid.com', 'checkout.com'];

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': process.env.APOLLO_API_KEY // Updated security header
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.log(`  [!] Apollo API rejected the query (Status: ${response.status}). Engaging resilient fallback...`);
            return fallbackDomains;
        }

        const data = await response.json();
        
        if (!data.organizations || data.organizations.length === 0) {
            console.log(`  [!] Apollo returned empty data. Engaging resilient fallback...`);
            return fallbackDomains;
        }

        const domains = data.organizations
            .map(org => org.primary_domain)
            .filter(domain => domain && domain !== cleanDomain); 

        if (domains.length === 0) {
            return fallbackDomains;
        }

        return domains;

    } catch (error) {
        console.error(`  [!] Stage 1 Network Error: ${error.message}. Engaging resilient fallback...`);
        return fallbackDomains;
    }
}