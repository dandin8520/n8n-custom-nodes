# n8n-nodes-mavat-plans

This is an n8n community node for accessing MAVAT (מנהל התכנון - Israeli Planning Administration) planning proposal data.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-mavat-plans` in **Enter npm package name**
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes
5. Select **Install**

### Manual installation

To get started install the package in your n8n root directory:

```bash
npm install n8n-nodes-mavat-plans
```

For Docker-based deployments add the package in the `NODE_FUNCTION_ALLOW_EXTERNAL` environment variable:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e NODE_FUNCTION_ALLOW_EXTERNAL=n8n-nodes-mavat-plans \
  n8nio/n8n
```

## Operations

This node provides 5 operations for working with MAVAT planning proposal data:

### 1. Search Plans

Search for planning proposals using advanced filtering options.

**Parameters:**
- **Municipality** (optional): Municipality name in Hebrew (רשות מקומית) - e.g., "תל אביב יפו"
- **Status** (optional): Plan status in Hebrew (סטטוס מנהל) - e.g., "מאושרת", "בתכנון"
- **Authorization** (optional): Authorization status in Hebrew (הרשאה) - e.g., "פעיל", "הושלם"
- **Minimum Housing Units** (optional): Minimum number of housing units
- **District** (optional): Planning district in Hebrew (מחוז תכנון)
- **Limit**: Maximum number of results (default: 50)

**Example:**
```json
{
  "municipality": "תל אביב יפו",
  "harshaa": "פעיל",
  "minUnits": 100,
  "limit": 25
}
```

### 2. Get Plan Details

Get detailed information for a specific planning proposal by plan number.

**Parameters:**
- **Plan Number** (required): Plan number (מספר תכנית) - e.g., "552-0147272"

**Example:**
```json
{
  "planNumber": "552-0147272"
}
```

### 3. Get Active Plans

Retrieve all active planning proposals (harshaa='פעיל').

**Parameters:**
- **Limit**: Maximum number of results (default: 50)

### 4. Get Approved Plans

Retrieve all approved planning proposals (status='מאושרת').

**Parameters:**
- **Limit**: Maximum number of results (default: 50)

### 5. Get Plans by Municipality

Get all planning proposals for a specific municipality.

**Parameters:**
- **Municipality** (required): Municipality name in Hebrew - e.g., "תל אביב יפו", "אור יהודה"
- **Limit**: Maximum number of results (default: 50)

**Example:**
```json
{
  "municipality": "חיפה",
  "limit": 100
}
```

## Common Field Names (Hebrew)

The API returns data with Hebrew field names:
- **מספר_תכנית** - Plan number
- **סטטוס_מנהל** - Status
- **rashut_mek** - Municipality
- **harshaa** - Authorization status
- **num_yhd** - Number of housing units
- **rent_yhd** - Rental units
- **plan_name** - Plan name
- **link** - Plan URL

## Common Values

**Status (סטטוס_מנהל):**
- "מאושרת" - Approved
- "בתכנון" - In planning
- "הגשת תוכנית" - Plan submitted

**Authorization (harshaa):**
- "פעיל" - Active
- "הושלם" - Completed
- "מושהה" - Suspended

## API Details

This node accesses the MAVAT public ArcGIS Feature Server:
- **Base URL**: https://services5.arcgis.com/.../FeatureServer/0
- **Official Website**: https://mavat.iplan.gov.il/
- **Rate Limiting**: 0.5 second delay between requests

## Example Workflows

### Monitor New Planning Proposals in Tel Aviv

1. **Trigger**: Schedule Trigger (run daily)
2. **MAVAT Plans**: Operation = "Get Plans by Municipality"
   - Municipality = "תל אביב יפו"
   - Limit = 50
3. **Filter**: Filter for recently added plans
4. **Email/Slack**: Send notification for new proposals

### Track Large Housing Projects

1. **Trigger**: Schedule Trigger (run weekly)
2. **MAVAT Plans**: Operation = "Search Plans"
   - Minimum Housing Units = 500
   - Harshaa = "פעיל"
3. **Format**: Create summary report
4. **Airtable/Google Sheets**: Log to database

### Get Details for Specific Plan

1. **Trigger**: Webhook or manual trigger with plan number
2. **MAVAT Plans**: Operation = "Get Plan Details"
3. **Format**: Extract relevant fields
4. **Email**: Send detailed report

## Compatibility

Tested with n8n version 1.0.0+

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [MAVAT Official Site](https://mavat.iplan.gov.il/)

## License

[MIT](LICENSE.md)
