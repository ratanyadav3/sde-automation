// services/brevo.js

/**
 * Brevo sends each contact a personalized outreach email.
 * @param {Object} target - The lead object { name, title, email, domain }
 * @returns {Promise<boolean>}
 */
export async function sendEmail(target) {
    const url = 'https://api.brevo.com/v3/smtp/email';
    
    // The personalized copy - keep it sharp and realistic
    const subject = `Scaling engineering infrastructure at ${target.domain}`;
    const htmlContent = `
        <p>Hi ${target.name.split(' ')[0]},</p>
        <p>Noticed you're leading the charge as ${target.title}. I am a software engineer building fully automated, hands-free outreach pipelines.</p>
        <p>This email was actually generated and sent with zero human intervention via a custom Node.js engine I built.</p>
        <p>If you're ever looking to integrate robust automation pipelines at ${target.domain}, I'd love to connect.</p>
        <p>Best,<br>Ratan Yadav</p>
    `;

    const payload = {
        sender: {
            name: "Ratan Yadav",
            email: "ratan@ratanyadav.live" // YOUR AUTHENTICATED DOMAIN
        },
        to: [{
            email: target.email,
            name: target.name
        }],
        subject: subject,
        htmlContent: htmlContent
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Failed to send email');
        }

        console.log(`  -> [Brevo] Successfully fired email to ${target.email} (${target.name})`);
        return true;

    } catch (error) {
        console.error(`  [!] Failed to send email to ${target.email}: ${error.message}`);
        return false;
    }
}