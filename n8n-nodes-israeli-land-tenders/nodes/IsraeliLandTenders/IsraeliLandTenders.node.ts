import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class IsraeliLandTenders implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Israeli Land Tenders',
		name: 'israeliLandTenders',
		icon: 'file:israeliLandTenders.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Access Israeli Land Authority tender and auction data',
		defaults: {
			name: 'Israeli Land Tenders',
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
						name: 'Search Tenders',
						value: 'searchTenders',
						description: 'Search for tenders with advanced filtering',
						action: 'Search for tenders',
					},
					{
						name: 'Get Tender Details',
						value: 'getTenderDetails',
						description: 'Get detailed information for a specific tender',
						action: 'Get tender details',
					},
					{
						name: 'Get Active Tenders',
						value: 'getActiveTenders',
						description: 'Get all currently active tenders',
						action: 'Get active tenders',
					},
					{
						name: 'Get Recent Results',
						value: 'getRecentResults',
						description: 'Get tenders with results from recent days',
						action: 'Get recent results',
					},
					{
						name: 'Get Map Details',
						value: 'getMapDetails',
						description: 'Get geographic/mapping data for a tender',
						action: 'Get map details',
					},
				],
				default: 'searchTenders',
			},
			// Search Tenders fields
			{
				displayName: 'Tender Number',
				name: 'tenderNumber',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['searchTenders'],
					},
				},
				default: '',
				description: 'Specific tender number to search for (מספר מכרז)',
			},
			{
				displayName: 'Tender Types',
				name: 'tenderTypes',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['searchTenders'],
					},
				},
				default: '',
				description: 'Comma-separated list of tender type IDs (e.g., "1,2,3")',
			},
			{
				displayName: 'Settlement Code (Kod Yeshuv)',
				name: 'kodYeshuv',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['searchTenders'],
					},
				},
				default: 0,
				description: 'Settlement code (e.g., 5000 for Tel Aviv)',
			},
			{
				displayName: 'Neighborhood',
				name: 'neighborhood',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['searchTenders'],
					},
				},
				default: '',
				description: 'Neighborhood name (שכונה)',
			},
			{
				displayName: 'Submission Date From',
				name: 'submissionDateFrom',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['searchTenders'],
					},
				},
				default: '',
				description: 'Filter by submission deadline start date',
			},
			{
				displayName: 'Submission Date To',
				name: 'submissionDateTo',
				type: 'dateTime',
				displayOptions: {
					show: {
						operation: ['searchTenders'],
					},
				},
				default: '',
				description: 'Filter by submission deadline end date',
			},
			{
				displayName: 'Active Only',
				name: 'activeOnly',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['searchTenders'],
					},
				},
				default: false,
				description: 'Whether to return only active tenders',
			},
			{
				displayName: 'Quick Search',
				name: 'quickSearch',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['searchTenders'],
					},
				},
				default: false,
				description: 'Whether to use quick search mode',
			},
			{
				displayName: 'Max Results',
				name: 'maxResults',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['searchTenders', 'getActiveTenders'],
					},
				},
				default: 100,
				description: 'Maximum number of results to return',
			},
			// Get Tender Details / Map Details fields
			{
				displayName: 'Tender ID (Michraz ID)',
				name: 'michrazId',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getTenderDetails', 'getMapDetails'],
					},
				},
				default: 0,
				required: true,
				description: 'The tender ID to retrieve',
			},
			// Get Recent Results fields
			{
				displayName: 'Days Back',
				name: 'daysBack',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getRecentResults'],
					},
				},
				default: 30,
				description: 'Number of days to look back for results',
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

	// Helper method to format dates to Israeli format (dd/mm/yy)
	private formatIsraeliDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		const day = String(d.getDate()).padStart(2, '0');
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const year = String(d.getFullYear()).slice(-2);
		return `${day}/${month}/${year}`;
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

		const baseUrl = 'https://apps.land.gov.il/MichrazimSite/api';
		const headers = {
			'User-Agent': 'datagov-external-client',
			'Content-Type': 'application/json',
			'Origin': 'https://apps.land.gov.il',
			'Referer': 'https://apps.land.gov.il/MichrazimSite/',
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				// Rate limit all requests (1 second delay)
				await this.rateLimit(1000);

				let responseData: any;

				if (operation === 'searchTenders') {
					// Build search payload
					const payload: any = {
						ActiveQuickSearch: this.getNodeParameter('quickSearch', i, false) as boolean,
						ActiveMichraz: this.getNodeParameter('activeOnly', i, false) as boolean,
					};

					const tenderNumber = this.getNodeParameter('tenderNumber', i, '') as string;
					if (tenderNumber) {
						payload.MisMichraz = tenderNumber;
					}

					const tenderTypes = this.getNodeParameter('tenderTypes', i, '') as string;
					if (tenderTypes) {
						payload.SugMichraz = tenderTypes.split(',').map((id) => parseInt(id.trim(), 10));
					}

					const kodYeshuv = this.getNodeParameter('kodYeshuv', i, 0) as number;
					if (kodYeshuv && kodYeshuv > 0) {
						payload.KodYeshuv = kodYeshuv;
					}

					const neighborhood = this.getNodeParameter('neighborhood', i, '') as string;
					if (neighborhood) {
						payload.Shchuna = neighborhood;
					}

					const submissionDateFrom = this.getNodeParameter('submissionDateFrom', i, '') as string;
					const submissionDateTo = this.getNodeParameter('submissionDateTo', i, '') as string;
					if (submissionDateFrom || submissionDateTo) {
						payload.CloseDate = {};
						if (submissionDateFrom) {
							payload.CloseDate.from = this.formatIsraeliDate(submissionDateFrom);
						}
						if (submissionDateTo) {
							payload.CloseDate.to = this.formatIsraeliDate(submissionDateTo);
						}
					}

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'POST',
								uri: `${baseUrl}/SearchApi/Search`,
								headers,
								body: payload,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);

					// Limit results
					const maxResults = this.getNodeParameter('maxResults', i, 100) as number;
					if (Array.isArray(responseData)) {
						responseData = responseData.slice(0, maxResults);
					} else if (responseData.results) {
						responseData.results = responseData.results.slice(0, maxResults);
					}
				} else if (operation === 'getTenderDetails') {
					const michrazId = this.getNodeParameter('michrazId', i) as number;

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'GET',
								uri: `${baseUrl}/MichrazDetailsApi/Get`,
								qs: { michrazID: michrazId },
								headers,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);
				} else if (operation === 'getActiveTenders') {
					const maxResults = this.getNodeParameter('maxResults', i, 100) as number;

					const payload = {
						ActiveMichraz: true,
						ActiveQuickSearch: false,
					};

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'POST',
								uri: `${baseUrl}/SearchApi/Search`,
								headers,
								body: payload,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);

					// Limit results
					if (Array.isArray(responseData)) {
						responseData = responseData.slice(0, maxResults);
					}
				} else if (operation === 'getRecentResults') {
					const daysBack = this.getNodeParameter('daysBack', i, 30) as number;
					const dateFrom = new Date();
					dateFrom.setDate(dateFrom.getDate() - daysBack);

					const payload = {
						ActiveQuickSearch: false,
						ActiveMichraz: false,
						hasResults: true,
						CloseDate: {
							from: this.formatIsraeliDate(dateFrom),
						},
					};

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'POST',
								uri: `${baseUrl}/SearchApi/Search`,
								headers,
								body: payload,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);
				} else if (operation === 'getMapDetails') {
					const michrazId = this.getNodeParameter('michrazId', i) as number;

					responseData = await this.retryRequest(
						async () =>
							await this.helpers.request({
								method: 'GET',
								uri: `${baseUrl}/MichrazDetailsApi/GetMichrazMapaDetails`,
								qs: { michrazID: michrazId },
								headers,
								json: true,
								timeout: 30000,
							}),
						3,
						this,
					);
				}

				// Return the response data
				if (Array.isArray(responseData)) {
					responseData.forEach((item) => {
						returnData.push({ json: item });
					});
				} else {
					returnData.push({ json: responseData });
				}
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
