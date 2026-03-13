# n8n Nodes for Israeli Government Data

This directory contains three n8n community node packages for accessing Israeli government data:

## Packages

### 1. [n8n-nodes-israeli-land-tenders](./n8n-nodes-israeli-land-tenders)

Access Israeli Land Authority (רמ"י) tender and auction data.

**Operations:**
- Search Tenders (with advanced filtering)
- Get Tender Details
- Get Active Tenders
- Get Recent Results
- Get Map Details

**API:** https://apps.land.gov.il/MichrazimSite/api

### 2. [n8n-nodes-mavat-plans](./n8n-nodes-mavat-plans)

Access MAVAT (מנהל התכנון) planning proposal data.

**Operations:**
- Search Plans (municipality, status, housing units, etc.)
- Get Plan Details
- Get Active Plans
- Get Approved Plans
- Get Plans by Municipality

**API:** ArcGIS Feature Server (MAVAT)

### 3. [n8n-nodes-israel-settlements](./n8n-nodes-israel-settlements)

Convert Hebrew settlement names to official Kod Yeshuv codes.

**Operations:**
- Get Kod Yeshuv (with fuzzy matching)
- List All Settlements

**Data:** Embedded static data (1,200+ settlements)

## How They Work Together

These packages are designed to work together in n8n workflows:

### Example Workflow: Monitor Tenders in a Specific City

```
1. Input: Settlement name (e.g., "תל אביב")
2. Israel Settlements → Convert to Kod Yeshuv (5000)
3. Israeli Land Tenders → Search with kod_yeshuv=5000
4. Filter → New tenders only
5. Email/Slack → Notification
```

### Example Workflow: Planning & Tender Analysis

```
1. Schedule Trigger → Daily
2. MAVAT Plans → Get approved plans in Tel Aviv
3. Filter → Plans with 100+ housing units
4. Israeli Land Tenders → Search related tenders
5. Google Sheets → Log results
```

## Installation

Each package can be installed independently from npm:

```bash
npm install n8n-nodes-israeli-land-tenders
npm install n8n-nodes-mavat-plans
npm install n8n-nodes-israel-settlements
```

Or via n8n Community Nodes interface.

## Development

Each package is structured following n8n community node standards:

```
n8n-nodes-{package-name}/
├── package.json
├── tsconfig.json
├── nodes/
│   └── {NodeName}/
│       ├── {NodeName}.node.ts
│       ├── {NodeName}.node.json
│       ├── {nodeName}.svg
│       └── [settlementData.ts]  # (settlements only)
└── README.md
```

### Build a Package

```bash
cd n8n-nodes-israeli-land-tenders
npm install
npm run build
```

### Test Locally

```bash
npm link
cd /path/to/n8n
npm link n8n-nodes-israeli-land-tenders
npm run dev
```

## Publishing

Each package can be published independently to npm:

1. Update version in package.json
2. Build the package: `npm run build`
3. Lint: `npm run lint`
4. Publish: `npm publish`

**Important:** As of May 2026, all n8n community nodes must be published with GitHub Actions and include a provenance statement.

## Key Features

### Israeli Land Tenders
- ✅ Direct API integration (no hosting required)
- ✅ Rate limiting (1 second delay)
- ✅ Automatic retries with exponential backoff
- ✅ Israeli date format support (dd/mm/yy)
- ✅ Hebrew text support (UTF-8)
- ✅ 5 priority operations

### MAVAT Plans
- ✅ ArcGIS REST API integration
- ✅ SQL-like WHERE clause building
- ✅ Rate limiting (0.5 second delay)
- ✅ Hebrew field names support
- ✅ Automatic error handling
- ✅ 5 priority operations

### Israel Settlements
- ✅ No API calls (instant lookups)
- ✅ Fuzzy matching for misspellings
- ✅ 1,200+ settlements embedded
- ✅ Exact and partial matching
- ✅ UTF-8 Hebrew text support
- ✅ 2 operations

## Data Sources

- **Israeli Land Authority**: https://apps.land.gov.il/MichrazimSite/
- **MAVAT**: https://mavat.iplan.gov.il/
- **Settlement Codes**: Official Israeli government data

## License

All packages are licensed under MIT.

## Related Projects

- [remy-mcp](../remy-mcp) - Original MCP server implementation (Python)
- These n8n nodes are TypeScript ports with direct API access

## Support

For issues or questions:
- Create an issue in the respective package repository
- Refer to n8n community documentation
- Check official API documentation

## Version

All packages: v0.1.0 (Initial release)
