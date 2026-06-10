import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();
import { getLookalikeCompanies } from './services/apollo.js';
import { getLeadsAndEmails } from './services/prospeo.js';
import { sendEmail } from './services/brevo.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// RATE LIMITER HELPER: 3 seconds keeps you well under the 20 req/min ceiling
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runPipeline(seedDomain) {
    try {
        console.log(`\n=== INITIATING AUTOMATED OUTREACH PIPELINE ===\n`);

        // STAGE 1: Sourcing Lookalikes via Apollo
        console.log(`[Stage 1] Finding lookalike companies for ${seedDomain}...`);
        const allDomains = await getLookalikeCompanies(seedDomain);
        
        if (!allDomains || allDomains.length === 0) {
            throw new Error("Stage 1 Failed: No similar companies found.");
        }

        // GUARDRAIL 1: Force a max of 5 companies from Apollo
        const domains = allDomains.slice(0, 5);
        console.log(`[Success] Found ${allDomains.length} lookalikes. Scaled down to top ${domains.length} for credit safety.\n`);

        // STAGE 2: Decision Makers via Prospeo
        console.log(`[Stage 2] Extracting executives... (Targeting exactly 2 people total)`);
        let verifiedTargets = [];
        
        for (const domain of domains) {
            // GUARDRAIL 2: Stop hitting the API immediately if we already have our 2 targets
            if (verifiedTargets.length >= 2) {
                console.log(`[Target Cap Reached] Already found 2 executives. Skipping remaining domains.`);
                break;
            }

            try {
                const leads = await getLeadsAndEmails(domain);
                
                // Add leads but respect the hard cap of 2 people total
                for (const lead of leads) {
                    if (verifiedTargets.length < 2) {
                        verifiedTargets.push({ ...lead, domain });
                    }
                }

                // GUARDRAIL 3: Rate Limiter. Pauses the loop for 3 seconds to stay under 20 req/min
                console.log(`  [Rate Limiter] Pausing 3 seconds before next request...`);
                await delay(3000);

            } catch (err) {
                console.error(`  [!] Error fetching data for ${domain}: ${err.message}`);
            }
        }
        console.log(`\n[Success] Pipeline captured exactly ${verifiedTargets.length} fully qualified leads.\n`);

        // SAFETY CHECKPOINT
        if (verifiedTargets.length === 0) {
            console.log("Pipeline complete, but no verified emails were found.");
            process.exit(0);
        }

        console.log(`=== PIPELINE SUMMARY ===`);
        console.log(`Targeting ${verifiedTargets.length} verified executives:`);
        verifiedTargets.forEach(t => {
            console.log(` - ${t.name} (${t.title}) | Seniority: ${t.seniority} | ${t.email}`);
        });
        
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

const inputDomain = process.argv[2];
if (!inputDomain) {
    console.error("Usage: node index.js <company.domain>");
    process.exit(1);
}

runPipeline(inputDomain);