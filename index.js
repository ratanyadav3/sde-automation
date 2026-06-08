import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();
import { getLookalikeCompanies } from './services/apollo.js';
import { getLeadsAndEmails } from './services/prospeo.js';
import { sendEmail } from './services/brevo.js';

// Setup CLI interface for the safety checkpoint
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function runPipeline(seedDomain) {
    try {
        console.log(`\n=== INITIATING AUTOMATED OUTREACH PIPELINE ===\n`);

        // STAGE 1: Sourcing Lookalikes via Apollo
        console.log(`[Stage 1] Finding lookalike companies for ${seedDomain}...`);
        const domains = await getLookalikeCompanies(seedDomain);
        
        if (!domains || domains.length === 0) {
            throw new Error("Stage 1 Failed: No similar companies found.");
        }
        console.log(`[Success] Found ${domains.length} lookalike domains.\n`);

        // STAGE 2: Decision Makers & Emails via Prospeo
        console.log(`[Stage 2] Extracting executives AND emails via Prospeo...`);
        let verifiedTargets = [];
        
        for (const domain of domains) {
            try {
                const leads = await getLeadsAndEmails(domain);
                leads.forEach(lead => verifiedTargets.push({ ...lead, domain }));
            } catch (err) {
                console.error(`  [!] Error fetching data for ${domain}: ${err.message}`);
            }
        }
        console.log(`[Success] Extracted and verified ${verifiedTargets.length} fully qualified leads.\n`);

        // SAFETY CHECKPOINT
        if (verifiedTargets.length === 0) {
            console.log("Pipeline complete, but no verified emails were found.");
            process.exit(0);
        }

        console.log(`=== PIPELINE SUMMARY ===`);
        console.log(`Targeting ${verifiedTargets.length} verified executives:`);
        verifiedTargets.forEach(t => console.log(` - ${t.name} (${t.title}) | ${t.email}`));
        
        rl.question(`\nProceed with firing emails via Brevo? (Y/n): `, async (answer) => {
            if (answer.toLowerCase() === 'y' || answer === '') {
                // STAGE 3: Personalized Outreach via Brevo
                console.log(`\n[Stage 3] Dispatching personalized emails...`);
                for (const target of verifiedTargets) {
                    await sendEmail(target);
                }
                console.log(`\n=== PIPELINE FINISHED SUCCESSFULLY ===\n`);
            } else {
                console.log('\n[Aborted] Emails were not sent.');
            }
            rl.close();
        });

    } catch (error) {
        console.error(`\n[FATAL ERROR] Pipeline crashed:`, error);
        rl.close();
        process.exit(1);
    }
}

// Ensure the user provided a domain argument
const inputDomain = process.argv[2];

if (!inputDomain) {
    console.error("Usage: node index.js <company.domain>");
    process.exit(1);
}

// Execute the engine
runPipeline(inputDomain);