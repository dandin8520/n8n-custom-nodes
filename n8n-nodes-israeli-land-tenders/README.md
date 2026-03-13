# n8n-nodes-israeli-land-tenders

This is an n8n community node for accessing Israeli Land Authority (רמ"י) tender and auction data.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-israeli-land-tenders` in **Enter npm package name**
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes
5. Select **Install**

### Manual installation

To get started install the package in your n8n root directory:

```bash
npm install n8n-nodes-israeli-land-tenders
```

For Docker-based deployments add the package in the `NODE_FUNCTION_ALLOW_EXTERNAL` environment variable:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e NODE_FUNCTION_ALLOW_EXTERNAL=n8n-nodes-israeli-land-tenders \
  n8nio/n8n
```

## Operations

This node provides 5 operations for working with Israeli Land Authority tender data:

### 1. Search Tenders

Search for tenders using advanced filtering options.

**Parameters:**
- **Tender Number** (optional): Specific tender number (מספר מכרז)
- **Tender Types** (optional): Comma-separated list of tender type IDs
- **Settlement Code** (optional): Kod Yeshuv code (e.g., 5000 for Tel Aviv)
- **Neighborhood** (optional): Neighborhood name in Hebrew
- **Submission Date From/To** (optional): Date range for submission deadline
- **Active Only**: Filter to show only active tenders
- **Quick Search**: Use quick search mode
- **Max Results**: Maximum number of results to return (default: 100)

**Example:**
```json
{
  "kodYeshuv": 5000,
  "activeOnly": true,
  "maxResults": 50
}
```

### 2. Get Tender Details

Get comprehensive details for a specific tender by ID.

**Parameters:**
- **Tender ID (Michraz ID)** (required): The tender ID to retrieve

**Example:**
```json
{
  "michrazId": 20250001
}
```

### 3. Get Active Tenders

Retrieve all currently active/open tenders.

**Parameters:**
- **Max Results**: Maximum number of results (default: 100)

### 4. Get Recent Results

Find tenders with results published in recent days.

**Parameters:**
- **Days Back**: Number of days to look back (default: 30)

**Example:**
```json
{
  "daysBack": 7
}
```

### 5. Get Map Details

Get geographic/mapping data for a specific tender.

**Parameters:**
- **Tender ID (Michraz ID)** (required): The tender ID

## Common Settlement Codes (Kod Yeshuv)

- Tel Aviv: 5000
- Jerusalem: 3000
- Haifa: 4000
- Be'er Sheva: 9000
- Netanya: 6600

For a complete list, use the [n8n-nodes-israel-settlements](https://www.npmjs.com/package/n8n-nodes-israel-settlements) node.

## API Details

This node accesses the public Israeli Land Authority API:
- **Base URL**: https://apps.land.gov.il/MichrazimSite/api
- **Official Website**: https://apps.land.gov.il/MichrazimSite/
- **Rate Limiting**: 1 second delay between requests

## Example Workflows

### Monitor New Tenders in Tel Aviv

1. **Trigger**: Schedule Trigger (run daily)
2. **Israeli Land Tenders**: Operation = "Search Tenders"
   - Kod Yeshuv = 5000
   - Active Only = true
3. **Filter**: Filter out already processed tenders
4. **Email/Slack**: Send notification for new tenders

### Get Tender Details and Send Report

1. **Trigger**: Webhook or manual trigger with tender ID
2. **Israeli Land Tenders**: Operation = "Get Tender Details"
3. **Israeli Land Tenders**: Operation = "Get Map Details" (same tender ID)
4. **Format**: Combine data into report
5. **Email**: Send detailed report

## Compatibility

Tested with n8n version 1.0.0+

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Israeli Land Authority Official Site](https://apps.land.gov.il/MichrazimSite/)

## License

[MIT](LICENSE.md)
