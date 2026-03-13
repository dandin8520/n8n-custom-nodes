import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class MavatPlans implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MAVAT Plans',
		name: 'mavatPlans',
		icon: 'file:mavatPlans.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Access MAVAT (Israeli Planning Administration) planning proposal data',
		defaults: {
			name: 'MAVAT Plans',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Search Plans',
						value: 'searchPlans',
						description: 'Search for planning proposals with advanced filtering',
						action: 'Search for planning proposals',
					},
					{
						name: 'Get Plan Details',
						value: 'getPlanDetails',
						description: 'Get details for a specific plan by plan number',
						action: 'Get plan details',
					},
					{
						name: 'Get Active Plans',
						value: 'getActivePlans',
						description: 'Get all active planning proposals',
						action: 'Get active plans',
					},
					{
						name: 'Get Approved Plans',
						value: 'getApprovedPlans',
						description: 'Get all approved planning proposals',
						action: 'Get approved plans',
					},
					{
						name: 'Get Plans by Municipality',
						value: 'getPlansByMunicipality',
						description: 'Get plans for a specific municipality',
						action: 'Get plans by municipality',
					},
				],
				default: 'searchPlans',
			},
			// Search Plans fields
			{
				displayName: 'Municipality',
				name: 'municipality',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['searchPlans', 'getPlansByMunicipality'],
					},
				},
				default: '',
				placeholder: 'תל אביב יפו',
				description: 'Municipality name in Hebrew (e.g., "תל אביב יפו", "אור יהודה")',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['searchPlans'],
					},
				},
				default: '',
				placeholder: 'מאושרת',
				description: 'Plan status in Hebrew (e.g., "מאושרת", "בתכנון")',
			},
			{
				displayName: 'Authorization (Harshaa)',
				name: 'harshaa',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['searchPlans'],
					},
				},
				default: '',
				placeholder: 'פעיל',
				description: 'Authorization status in Hebrew (e.g., "פעיל", "הושלם", "מושהה")',
			},
			{
				displayName: 'Minimum Housing Units',
				name: 'minUnits',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['searchPlans'],
					},
				},
				default: 0,
				description: 'Minimum number of housing units',
			},
			{
				displayName: 'District',
				name: 'district',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['searchPlans'],
					},
				},
				default: '',
				placeholder: 'ועדה מחוזית תל אביב',
				description: 'Planning district in Hebrew',
			},
			// Get Plan Details field
			{
				displayName: 'Plan Number',
				name: 'planNumber',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getPlanDetails'],
					},
				},
				default: '',
				required: true,
				placeholder: '552-0147272',
				description: 'Plan number (מספר תכנית)',
			},
			// Limit field (for all list operations)
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['searchPlans', 'getActivePlans', 'getApprovedPlans', 'getPlansByMunicipality'],
					},
				},
				default: 50,
				description: 'Maximum number of results to return',
			},
		],
	};

	private lastRequestTime = 0;

	// Helper method to implement rate limiting
	private async rateLimit(delayMs: number): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - this.lastRequestTime;
		if (timeSinceLastRequest < delayMs) {
			await new Promise((resolve) => setTimeout(resolve, delayMs - timeSinceLastRequest));
		}
		this.lastRequestTime = Date.now();
	}

	// Helper method to build WHERE clause for ArcGIS query
	private buildWhereClause(conditions: { [key: string]: string | number }): string {
		const clauses: string[] = [];

		for (const [field, value] of Object.entries(conditions)) {
			if (value !== '' && value !== 0 && value !== undefined && value !== null) {
				if (typeof value === 'string') {
					clauses.push(`${field} = '${value}'`);
				} else {
					clauses.push(`${field} >= ${value}`);
				}
			}
		}

		return clauses.length > 0 ? clauses.join(' AND ') : '1=1';
	}

	// Helper method to retry failed requests
	private async retryRequest(
		fn: () => Promise<any>,
		retries = 3,
		context: IExecuteFunctions,
	): Promise<any> {
		for (let i = 0; i < retries; i++) {
			try {
				return await fn();
			} catch (error: any) {
				const statusCode = error.statusCode || error.response?.status;
				const shouldRetry = [429, 500, 502, 503, 504].includes(statusCode);

				if (i === retries - 1 || !shouldRetry) {
					throw new NodeOperationError(
						context.getNode(),
						`API request failed: ${error.message}`,
					);
				}
				// Exponential backoff
				await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
			}
		}
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const baseUrl =
			'https://services5.arcgis.com/O4ssQkyfAFdhjtn0/arcgis/rest/services/blue_lines_Dira_Lehaskir/FeatureServer/0';
		const headers = {
			'User-Agent': 'Mozilla/5.0',
			'Accept': 'application/json',
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				// Rate limit all requests (0.5 second delay)
				await this.rateLimit(500);

				let whereClause = '1=1';
				let responseData: any;

				if (operation === 'searchPlans') {
					// Build WHERE clause from search criteria
					const conditions: { [key: string]: string | number } = {};

					const municipality = this.getNodeParameter('municipality', i, '') as string;
					if (municipality) {
						conditions['rashut_mek'] = municipality;
					}

					const status = this.getNodeParameter('status', i, '') as string;
					if (status) {
						conditions['סטטוס_מנהל'] = status;
					}

					const harshaa = this.getNodeParameter('harshaa', i, '') as string;
					if (harshaa) {
						conditions['harshaa'] = harshaa;
					}

					const minUnits = this.getNodeParameter('minUnits', i, 0) as number;
					if (minUnits > 0) {
						conditions['num_yhd'] = minUnits;
					}

					const district = this.getNodeParameter('district', i, '') as string;
					if (district) {
						conditions['district'] = district;
					}

					whereClause = this.buildWhereClause(conditions);
					const limit = this.getNodeParameter('limit', i, 50) as number;

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'GET',
								uri: `${baseUrl}/query`,
								qs: {
									where: whereClause,
									outFields: '*',
									returnGeometry: 'false',
									resultRecordCount: limit,
									f: 'json',
								},
								headers,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);
				} else if (operation === 'getPlanDetails') {
					const planNumber = this.getNodeParameter('planNumber', i) as string;
					whereClause = `מספר_תכנית = '${planNumber}'`;

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'GET',
								uri: `${baseUrl}/query`,
								qs: {
									where: whereClause,
									outFields: '*',
									returnGeometry: 'false',
									resultRecordCount: 1,
									f: 'json',
								},
								headers,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);
				} else if (operation === 'getActivePlans') {
					whereClause = "harshaa = 'פעיל'";
					const limit = this.getNodeParameter('limit', i, 50) as number;

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'GET',
								uri: `${baseUrl}/query`,
								qs: {
									where: whereClause,
									outFields: '*',
									returnGeometry: 'false',
									resultRecordCount: limit,
									f: 'json',
								},
								headers,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);
				} else if (operation === 'getApprovedPlans') {
					whereClause = "סטטוס_מנהל = 'מאושרת'";
					const limit = this.getNodeParameter('limit', i, 50) as number;

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'GET',
								uri: `${baseUrl}/query`,
								qs: {
									where: whereClause,
									outFields: '*',
									returnGeometry: 'false',
									resultRecordCount: limit,
									f: 'json',
								},
								headers,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);
				} else if (operation === 'getPlansByMunicipality') {
					const municipality = this.getNodeParameter('municipality', i) as string;
					whereClause = `rashut_mek = '${municipality}'`;
					const limit = this.getNodeParameter('limit', i, 50) as number;

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'GET',
								uri: `${baseUrl}/query`,
								qs: {
									where: whereClause,
									outFields: '*',
									returnGeometry: 'false',
									resultRecordCount: limit,
									f: 'json',
								},
								headers,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);
				}

				// Check for ArcGIS errors
				if (responseData?.error) {
					throw new NodeOperationError(
						this.getNode(),
						`ArcGIS API Error: ${responseData.error.message || 'Unknown error'}`,
					);
				}

				// Extract features from ArcGIS response
				const features = responseData?.features || [];

				if (features.length === 0 && operation === 'getPlanDetails') {
					throw new NodeOperationError(this.getNode(), 'Plan not found');
				}

				// Return plan data (attributes from features)
				features.forEach((feature: any) => {
					returnData.push({ json: feature.attributes });
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
