import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

// Helper function to implement rate limiting
async function rateLimit(delayMs: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, delayMs));
}

// Helper function to retry failed requests
async function retryRequest(
	fn: () => Promise<any>,
	retries: number,
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

			await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
		}
	}
}

export class DiraLehaskir implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Nadlan Dira Lehaskir',
		name: 'nadlanDiraLehaskir',
		icon: 'file:diraLehaskir.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Access Dira Lehaskir (דירה להשכיר) housing project data with rental units',
		defaults: {
			name: 'Nadlan Dira Lehaskir',
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
						name: 'Get All Plans',
						value: 'getAllPlans',
						action: 'Get all active plans (filtered)',
						description: 'Get all plans excluding suspended/pending (filters: סטטוס_מנהל != מושהה/התנעה, harshaa != מושהה)',
					},
					{
						name: 'Search Plans',
						value: 'searchPlans',
						action: 'Search planning proposals',
						description: 'Search for planning proposals with various filters',
					},
					{
						name: 'Get Plan Details',
						value: 'getPlanDetails',
						action: 'Get plan details by number',
						description: 'Get detailed information about a specific plan',
					},
					{
						name: 'Get Active Plans',
						value: 'getActivePlans',
						action: 'Get all active plans',
						description: 'Get list of all active planning proposals (harshaa = פעיל)',
					},
					{
						name: 'Get Plans by Municipality',
						value: 'getPlansByMunicipality',
						action: 'Get plans by municipality',
						description: 'Get all plans for a specific municipality',
					},
					{
						name: 'Get Approved Plans',
						value: 'getApprovedPlans',
						action: 'Get approved plans',
						description: 'Get list of approved planning proposals (סטטוס_מנהל = מאושרת)',
					},
				],
				default: 'searchPlans',
			},

			// Search Plans parameters
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
				description: 'רשות מקומית (Municipality name)',
			},
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
				description: 'מספר תכנית (Plan number)',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['searchPlans'],
					},
				},
				options: [
					{
						name: 'Any',
						value: '',
					},
					{
						name: 'מאושרת (Approved)',
						value: 'מאושרת',
					},
					{
						name: 'בתכנון (In Planning)',
						value: 'בתכנון',
					},
					{
						name: 'הגשת תוכנית (Plan Submission)',
						value: 'הגשת תוכנית',
					},
				],
				default: '',
				description: 'סטטוס מנהל (Plan status)',
			},
			{
				displayName: 'Authorization Status',
				name: 'harshaa',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['searchPlans'],
					},
				},
				options: [
					{
						name: 'Any',
						value: '',
					},
					{
						name: 'פעיל (Active)',
						value: 'פעיל',
					},
					{
						name: 'הושלם (Completed)',
						value: 'הושלם',
					},
					{
						name: 'מושהה (Suspended)',
						value: 'מושהה',
					},
				],
				default: '',
				description: 'הרשאה (Authorization status)',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['searchPlans'],
					},
				},
				options: [
					{
						displayName: 'Minimum Units',
						name: 'minUnits',
						type: 'number',
						default: 0,
						description: 'מינימום יחידות דיור (Minimum housing units)',
					},
					{
						displayName: 'Maximum Units',
						name: 'maxUnits',
						type: 'number',
						default: 0,
						description: 'מקסימום יחידות דיור (Maximum housing units)',
					},
					{
						displayName: 'District',
						name: 'district',
						type: 'string',
						default: '',
						placeholder: 'ועדה מחוזית תל אביב',
						description: 'מחוז תכנון (Planning district)',
					},
					{
						displayName: 'Active Only',
						name: 'activeOnly',
						type: 'boolean',
						default: false,
						description: 'Whether to return only active plans (harshaa="פעיל")',
					},
					{
						displayName: 'Approved Only',
						name: 'approvedOnly',
						type: 'boolean',
						default: false,
						description: 'Whether to return only approved plans (status="מאושרת")',
					},
					{
						displayName: 'With Rent Only',
						name: 'withRent',
						type: 'boolean',
						default: false,
						description: 'Whether to return only plans with rental units',
					},
					{
						displayName: 'Include Suspended Plans',
						name: 'includeSuspended',
						type: 'boolean',
						default: false,
						description: 'Whether to include suspended plans (מושהה/התנעה). Default: false (matches UI behavior)',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						default: 50,
						description: 'Maximum number of results to return',
					},
				],
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getAllPlans', 'getActivePlans', 'getPlansByMunicipality', 'getApprovedPlans'],
					},
				},
				default: 1000,
				description: 'Maximum number of results to return (UI default: all results, filtered)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const baseUrl = 'https://services5.arcgis.com/O4ssQkyfAFdhjtn0/arcgis/rest/services/blue_lines_Dira_Lehaskir/FeatureServer/0';

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				// Apply rate limiting
				if (i > 0) {
					await rateLimit(500);
				}

				let responseData: any;

				if (operation === 'getAllPlans') {
					const limit = this.getNodeParameter('limit', i, 1000) as number;

					// Get all plans with UI-style filtering
					// Exclude: סטטוס_מנהל = 'מושהה' OR 'התנעה', AND harshaa = 'מושהה'
					const whereClause = "סטטוס_מנהל <> 'מושהה' AND סטטוס_מנהל <> 'התנעה' AND harshaa <> 'מושהה'";

					responseData = await retryRequest(
						async () => {
							const response = await this.helpers.request({
								method: 'GET',
								url: `${baseUrl}/query`,
								qs: {
									where: whereClause,
									outFields: '*',
									returnGeometry: 'false',
									f: 'json',
									resultRecordCount: limit,
								},
								json: true,
							});
							return response;
						},
						3,
						this,
					);

					const features = responseData.features || [];
					for (const feature of features) {
						returnData.push({ json: feature.attributes });
					}
				} else if (operation === 'searchPlans') {
					const municipality = this.getNodeParameter('municipality', i, '') as string;
					const status = this.getNodeParameter('status', i, '') as string;
					const harshaa = this.getNodeParameter('harshaa', i, '') as string;
					const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
						minUnits?: number;
						maxUnits?: number;
						district?: string;
						activeOnly?: boolean;
						approvedOnly?: boolean;
						withRent?: boolean;
						includeSuspended?: boolean;
						limit?: number;
					};

					// Build WHERE clause
					const conditions: string[] = [];

					// Default filter (matches UI behavior): exclude suspended plans
					if (!additionalOptions.includeSuspended) {
						conditions.push("סטטוס_מנהל <> 'מושהה'");
						conditions.push("סטטוס_מנהל <> 'התנעה'");
						conditions.push("harshaa <> 'מושהה'");
					}

					if (municipality) {
						conditions.push(`rashut_mek = '${municipality}'`);
					}
					if (status) {
						conditions.push(`סטטוס_מנהל = '${status}'`);
					}
					if (harshaa) {
						conditions.push(`harshaa = '${harshaa}'`);
					}
					if (additionalOptions.district) {
						conditions.push(`district = '${additionalOptions.district}'`);
					}
					if (additionalOptions.minUnits) {
						conditions.push(`num_yhd >= ${additionalOptions.minUnits}`);
					}
					if (additionalOptions.maxUnits) {
						conditions.push(`num_yhd <= ${additionalOptions.maxUnits}`);
					}
					if (additionalOptions.activeOnly) {
						conditions.push(`harshaa = 'פעיל'`);
					}
					if (additionalOptions.approvedOnly) {
						conditions.push(`סטטוס_מנהל = 'מאושרת'`);
					}
					if (additionalOptions.withRent) {
						conditions.push(`rent_yhd > 0`);
					}

					const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

					responseData = await retryRequest(
						async () => {
							const response = await this.helpers.request({
								method: 'GET',
								url: `${baseUrl}/query`,
								qs: {
									where: whereClause,
									outFields: '*',
									returnGeometry: 'false',
									f: 'json',
									resultRecordCount: additionalOptions.limit || 50,
								},
								json: true,
							});
							return response;
						},
						3,
						this,
					);

					// Extract features
					const features = responseData.features || [];
					for (const feature of features) {
						returnData.push({ json: feature.attributes });
					}
				} else if (operation === 'getPlanDetails') {
					const planNumber = this.getNodeParameter('planNumber', i) as string;

					responseData = await retryRequest(
						async () => {
							const response = await this.helpers.request({
								method: 'GET',
								url: `${baseUrl}/query`,
								qs: {
									where: `מספר_תכנית = '${planNumber}'`,
									outFields: '*',
									returnGeometry: 'false',
									f: 'json',
									resultRecordCount: 1,
								},
								json: true,
							});
							return response;
						},
						3,
						this,
					);

					const features = responseData.features || [];
					if (features.length > 0) {
						returnData.push({ json: features[0].attributes });
					}
				} else if (operation === 'getActivePlans') {
					const limit = this.getNodeParameter('limit', i) as number;

					responseData = await retryRequest(
						async () => {
							const response = await this.helpers.request({
								method: 'GET',
								url: `${baseUrl}/query`,
								qs: {
									where: "harshaa = 'פעיל'",
									outFields: '*',
									returnGeometry: 'false',
									f: 'json',
									resultRecordCount: limit,
								},
								json: true,
							});
							return response;
						},
						3,
						this,
					);

					const features = responseData.features || [];
					for (const feature of features) {
						returnData.push({ json: feature.attributes });
					}
				} else if (operation === 'getPlansByMunicipality') {
					const municipality = this.getNodeParameter('municipality', i) as string;
					const limit = this.getNodeParameter('limit', i) as number;

					responseData = await retryRequest(
						async () => {
							const response = await this.helpers.request({
								method: 'GET',
								url: `${baseUrl}/query`,
								qs: {
									where: `rashut_mek = '${municipality}'`,
									outFields: '*',
									returnGeometry: 'false',
									f: 'json',
									resultRecordCount: limit,
								},
								json: true,
							});
							return response;
						},
						3,
						this,
					);

					const features = responseData.features || [];
					for (const feature of features) {
						returnData.push({ json: feature.attributes });
					}
				} else if (operation === 'getApprovedPlans') {
					const limit = this.getNodeParameter('limit', i) as number;

					responseData = await retryRequest(
						async () => {
							const response = await this.helpers.request({
								method: 'GET',
								url: `${baseUrl}/query`,
								qs: {
									where: "סטטוס_מנהל = 'מאושרת'",
									outFields: '*',
									returnGeometry: 'false',
									f: 'json',
									resultRecordCount: limit,
								},
								json: true,
							});
							return response;
						},
						3,
						this,
					);

					const features = responseData.features || [];
					for (const feature of features) {
						returnData.push({ json: feature.attributes });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					returnData.push({ json: { error: errorMessage } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
