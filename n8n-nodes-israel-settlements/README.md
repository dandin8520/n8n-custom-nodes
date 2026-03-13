# n8n-nodes-israel-settlements

This is an n8n community node for converting Hebrew settlement names to official Kod Yeshuv (settlement code) numbers used by Israeli government systems.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-israel-settlements` in **Enter npm package name**
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes
5. Select **Install**

### Manual installation

To get started install the package in your n8n root directory:

```bash
npm install n8n-nodes-israel-settlements
```

For Docker-based deployments add the package in the `NODE_FUNCTION_ALLOW_EXTERNAL` environment variable:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e NODE_FUNCTION_ALLOW_EXTERNAL=n8n-nodes-israel-settlements \
  n8nio/n8n
```

## Operations

This node provides 2 operations:

### 1. Get Kod Yeshuv

Convert a Hebrew settlement name to its official Kod Yeshuv code.

**Parameters:**
- **Settlement Name** (required): Settlement name in Hebrew (e.g., "תל אביב - יפו")
- **Enable Fuzzy Matching**: Return partial matches if exact match not found (default: true)
- **Max Partial Matches**: Maximum number of partial matches to return (default: 10)

**Exact Match Example:**
```json
{
  "settlementName": "תל אביב - יפו",
  "fuzzyMatch": true
}
```

**Response (Exact Match):**
```json
{
  "success": true,
  "settlement_name": "תל אביב - יפו",
  "kod_yeshuv": 5000,
  "match_type": "exact"
}
```

**Partial Match Example:**
```json
{
  "settlementName": "תל אביב",
  "fuzzyMatch": true,
  "maxPartialMatches": 5
}
```

**Response (Partial Match):**
```json
{
  "success": true,
  "searched_name": "תל אביב",
  "exact_match": false,
  "match_type": "partial",
  "total_matches": 1,
  "partial_matches": [
    {
      "settlement_name": "תל אביב - יפו",
      "kod_yeshuv": 5000,
      "similarity": "partial"
    }
  ]
}
```

**No Match Example:**
```json
{
  "success": false,
  "error": "No settlement found matching 'invalid name'",
  "searched_name": "invalid name",
  "suggestion": "Try using the exact Hebrew name or check the settlement name spelling"
}
```

### 2. List All Settlements

Get complete list of all settlement codes and names.

**Response:**
```json
{
  "success": true,
  "total_settlements": 1200,
  "settlements": [
    { "kod_yeshuv": 5000, "settlement_name": "תל אביב - יפו" },
    { "kod_yeshuv": 3000, "settlement_name": "ירושלים" },
    ...
  ]
}
```

## Common Kod Yeshuv Codes

| Kod Yeshuv | Settlement Name (Hebrew) | English |
|------------|-------------------------|---------|
| 5000 | תל אביב - יפו | Tel Aviv |
| 3000 | ירושלים | Jerusalem |
| 4000 | חיפה | Haifa |
| 9000 | באר שבע | Be'er Sheva |
| 6600 | חולון | Holon |
| 2400 | אור יהודה | Or Yehuda |
| 6100 | בני ברק | Bnei Brak |
| 6200 | בת ים | Bat Yam |
| 6300 | גבעתיים | Givatayim |
| 6400 | הרצליה | Herzliya |
| 8600 | רמת גן | Ramat Gan |
| 2650 | רמת השרון | Ramat HaSharon |

## Use Cases

### Integration with Israeli Land Tenders

Use this node to convert settlement names to codes before searching tenders:

1. **Input**: Settlement name from user/webhook
2. **Israel Settlements**: Convert to Kod Yeshuv
3. **Israeli Land Tenders**: Search with kod_yeshuv parameter

**Example Workflow:**
```
Webhook → Israel Settlements (Get Kod Yeshuv) → Israeli Land Tenders (Search) → Format → Send
```

### Integration with MAVAT Plans

Convert municipality names to codes for filtering:

1. **Input**: Municipality name
2. **Israel Settlements**: Get Kod Yeshuv
3. **MAVAT Plans**: Search by municipality
4. **Filter/Transform**: Process results

### Data Validation

Validate user input settlement names:

1. **Form Input**: User enters settlement name
2. **Israel Settlements**: Validate and get code
3. **Conditional**: If not found, request correction
4. **Success**: Proceed with workflow

## Technical Details

- **Data Source**: Official Israeli government settlement codes
- **Total Settlements**: 1,200+ settlements
- **Matching**: Exact and partial (fuzzy) matching supported
- **Language**: Hebrew text (UTF-8 encoded)
- **Performance**: No API calls - all data is embedded (instant lookups)

## Compatibility

Tested with n8n version 1.0.0+

## Related Nodes

- [n8n-nodes-israeli-land-tenders](https://www.npmjs.com/package/n8n-nodes-israeli-land-tenders) - Israeli Land Authority tenders
- [n8n-nodes-mavat-plans](https://www.npmjs.com/package/n8n-nodes-mavat-plans) - MAVAT planning proposals

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)
