# 🚀 Automated B2B Outreach Pipeline

A fully automated, zero-human-in-the-loop CLI engine built with Node.js. This pipeline takes a single seed domain, dynamically sources lookalike competitors, extracts verified C-suite decision-makers, and dispatches personalized HTML outreach via an authenticated custom domain.

## 🏗 Architecture & Data Flow

The system is separated into three distinct, modular stages managed by a central orchestrator (`index.js`).

1. **Stage 1: Sourcing (Apollo.io)**
   * Takes a seed domain via CLI argument.
   * Queries the Apollo REST API to return a clean array of direct competitor/lookalike domains.
2. **Stage 2: Lead Extraction (Prospeo)**
   * Iterates through the competitor domains.
   * Queries Prospeo's `search-person` endpoint to identify high-level decision-makers (CEOs, Founders, VPs, CTOs) and extract their verified emails.
3. **Stage 3: Outreach Execution (Brevo)**
   * Implements a **Safety Checkpoint** via native Node `readline`, blocking execution until manual human verification.
   * Dynamically injects lead data (Name, Title, Domain) into a personalized HTML template.
   * Dispatches the emails via Brevo's SMTP API using an authenticated custom domain to ensure maximum deliverability and bypass spam filters.

## 🛠 Engineering Highlights

* **Fault Tolerance & API Resilience:** Network loops are wrapped in isolated `try/catch` blocks. If a third-party service deprecates an endpoint or throws a 422/400 error (e.g., recent Prospeo API strict filter updates), the system gracefully catches the error, logs a warning, and engages a dynamic fallback array to prevent the Node process from crashing.
* **Separation of Concerns:** Each API integration is isolated in its own service module (`/services`), keeping the master controller clean and making individual APIs easy to swap or extend without breaking the core logic.
* **Deliverability Best Practices:** The final execution loop includes a simulated 2-second asynchronous jitter (`setTimeout`) to mimic human sending cadence, protecting the sender domain reputation.
* **Zero Dependency Bloat:** Built using Node.js native `fetch` API.

## 💻 Installation & Setup

**1. Clone the repository**
```bash
git clone [https://github.com/yourusername/outreach-automation-pipeline.git](https://github.com/yourusername/outreach-automation-pipeline.git)
cd outreach-automation-pipeline
```

**2. Configure Environment Variables**
Create a `.env` file in the root directory and add your API keys:
```env
APOLLO_API_KEY=your_apollo_key_here
PROSPEO_API_KEY=your_prospeo_key_here
BREVO_API_KEY=your_brevo_key_here
```

**3. Run the Engine**
Execute the pipeline by passing a seed domain as an argument:
```bash
node index.js stripe.com
```

## 📁 Project Structure

```text
├── index.js                # Master orchestrator and CLI interface
├── package.json            # Project metadata 
├── .env                    # Environment variables (Ignored in Git)
├── .gitignore              # Git ignore rules
└── services/
    ├── apollo.js           # Stage 1: Domain sourcing logic
    ├── prospeo.js          # Stage 2: Lead extraction logic
    └── brevo.js            # Stage 3: SMTP execution and HTML templating
```

## 👨‍💻 Author
Built by **Ratan Yadav**