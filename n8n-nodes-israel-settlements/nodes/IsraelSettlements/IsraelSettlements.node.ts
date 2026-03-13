import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { KOD_YESHUV_DATA } from './settlementData';

interface PartialMatch {
	settlement_name: string;
	kod_yeshuv: number;
	similarity: string;
}

export class IsraelSettlements implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Israel Settlements',
		name: 'israelSettlements',
		icon: 'file:israelSettlements.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Convert Hebrew settlement names to official Kod Yeshuv codes',
		defaults: {
			name: 'Israel Settlements',
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
						name: 'Get Kod Yeshuv',
						value: 'getKodYeshuv',
						description: 'Convert settlement name to Kod Yeshuv code',
						action: 'Get kod yeshuv code',
					},
					{
						name: 'List All Settlements',
						value: 'listAllSettlements',
						description: 'Get all settlement codes and names',
						action: 'List all settlements',
					},
				],
				default: 'getKodYeshuv',
			},
			{
				displayName: 'Settlement Name',
				name: 'settlementName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getKodYeshuv'],
					},
				},
				default: '',
				required: true,
				placeholder: 'תל אביב - יפו',
				description: 'Settlement name in Hebrew',
			},
			{
				displayName: 'Enable Fuzzy Matching',
				name: 'fuzzyMatch',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getKodYeshuv'],
					},
				},
				default: true,
				description: 'Whether to return partial matches if exact match not found',
			},
			{
				displayName: 'Max Partial Matches',
				name: 'maxPartialMatches',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['getKodYeshuv'],
						fuzzyMatch: [true],
					},
				},
				default: 10,
				description: 'Maximum number of partial matches to return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'getKodYeshuv') {
					const settlementName = this.getNodeParameter('settlementName', i) as string;
					const fuzzyMatch = this.getNodeParameter('fuzzyMatch', i, true) as boolean;
					const maxPartialMatches = this.getNodeParameter('maxPartialMatches', i, 10) as number;

					const trimmedName = settlementName.trim();

					// Try exact match first
					let exactMatch: { kod_yeshuv: number; settlement_name: string } | null = null;

					for (const [kodStr, name] of Object.entries(KOD_YESHUV_DATA)) {
						if (name === trimmedName) {
							exactMatch = {
								settlement_name: name,
								kod_yeshuv: parseInt(kodStr, 10),
							};
							break;
						}
					}

					if (exactMatch) {
						returnData.push({
							json: {
								success: true,
								settlement_name: exactMatch.settlement_name,
								kod_yeshuv: exactMatch.kod_yeshuv,
								match_type: 'exact',
							},
						});
					} else if (fuzzyMatch) {
						// Try partial/fuzzy matching
						const partialMatches: PartialMatch[] = [];
						const lowerSearchName = trimmedName.toLowerCase();

						for (const [kodStr, name] of Object.entries(KOD_YESHUV_DATA)) {
							const lowerName = name.toLowerCase();
							// Check if search term is contained in settlement name or vice versa
							if (
								lowerSearchName.includes(lowerName) ||
								lowerName.includes(lowerSearchName)
							) {
								partialMatches.push({
									settlement_name: name,
									kod_yeshuv: parseInt(kodStr, 10),
									similarity: 'partial',
								});
							}
						}

						if (partialMatches.length > 0) {
							returnData.push({
								json: {
									success: true,
									searched_name: trimmedName,
									exact_match: false,
									partial_matches: partialMatches.slice(0, maxPartialMatches),
									match_type: 'partial',
									total_matches: partialMatches.length,
								},
							});
						} else {
							returnData.push({
								json: {
									success: false,
									error: `No settlement found matching '${trimmedName}'`,
									searched_name: trimmedName,
									suggestion:
										'Try using the exact Hebrew name or check the settlement name spelling',
								},
							});
						}
					} else {
						returnData.push({
							json: {
								success: false,
								error: `No exact match found for '${trimmedName}'`,
								searched_name: trimmedName,
								suggestion: 'Enable fuzzy matching to see partial matches',
							},
						});
					}
				} else if (operation === 'listAllSettlements') {
					// Return all settlements as an array
					const allSettlements = Object.entries(KOD_YESHUV_DATA).map(([kod, name]) => ({
						kod_yeshuv: parseInt(kod, 10),
						settlement_name: name,
					}));

					returnData.push({
						json: {
							success: true,
							total_settlements: allSettlements.length,
							settlements: allSettlements,
						},
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					returnData.push({ json: { error: errorMessage } });
					continue;
				}
				const errorMessage = error instanceof Error ? error.message : String(error);
				throw new NodeOperationError(this.getNode(), errorMessage);
			}
		}

		return [returnData];
	}
}
