// IdeaSpark Airtable API Wrapper

const AirtableAPI = {
    _getHeaders() {
        const keys = getApiKeys();
        return {
            'Authorization': `Bearer ${keys.airtableToken}`,
            'Content-Type': 'application/json'
        };
    },

    _getBaseUrl() {
        const keys = getApiKeys();
        return `${AppConfig.AIRTABLE_API_URL}/${keys.airtableBaseId}`;
    },

    async _request(method, table, { params = {}, body = null, recordId = '' } = {}) {
        let url = `${this._getBaseUrl()}/${encodeURIComponent(table)}`;
        if (recordId) url += `/${recordId}`;

        if (method === 'GET' && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (Array.isArray(value)) {
                    value.forEach((v, i) => {
                        if (typeof v === 'object') {
                            Object.entries(v).forEach(([subKey, subVal]) => {
                                searchParams.append(`${key}[${i}][${subKey}]`, subVal);
                            });
                        } else {
                            searchParams.append(`${key}[]`, v);
                        }
                    });
                } else {
                    searchParams.append(key, value);
                }
            }
            url += `?${searchParams.toString()}`;
        }

        const options = {
            method,
            headers: this._getHeaders()
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.error?.message || `Airtable API error: ${response.status}`;
            throw new Error(message);
        }

        if (method === 'DELETE' && !recordId) {
            return await response.json();
        }
        if (method === 'DELETE') {
            return { deleted: true };
        }

        return await response.json();
    },

    // IDEAS CRUD
    async listIdeas({ filterFormula = '', sortField = 'Created', sortDirection = 'desc' } = {}) {
        const params = {};

        if (filterFormula) {
            params.filterByFormula = filterFormula;
        }

        // 'Created' is not a sortable Airtable field name — skip sort param
        // and sort client-side by createdTime. For other fields, use API sort.
        if (sortField && sortField !== 'Created') {
            params.sort = [{ field: sortField, direction: sortDirection }];
        }

        let allRecords = [];
        let offset = null;

        do {
            if (offset) params.offset = offset;
            const data = await this._request('GET', AppConfig.TABLE_NAMES.IDEAS, { params });
            allRecords = allRecords.concat(data.records || []);
            offset = data.offset;
        } while (offset);

        // Client-side sort by createdTime when sorting by 'Created'
        if (sortField === 'Created') {
            allRecords.sort((a, b) => {
                const timeA = new Date(a.createdTime).getTime();
                const timeB = new Date(b.createdTime).getTime();
                return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
            });
        }

        return allRecords;
    },

    async getIdea(recordId) {
        const data = await this._request('GET', AppConfig.TABLE_NAMES.IDEAS, { recordId });
        return data;
    },

    async createIdea(fields) {
        const data = await this._request('POST', AppConfig.TABLE_NAMES.IDEAS, {
            body: { fields }
        });
        return data;
    },

    async updateIdea(recordId, fields) {
        const data = await this._request('PATCH', AppConfig.TABLE_NAMES.IDEAS, {
            recordId,
            body: { fields }
        });
        return data;
    },

    async deleteIdea(recordId) {
        return await this._request('DELETE', AppConfig.TABLE_NAMES.IDEAS, { recordId });
    },

    // CONVERSATIONS
    async getConversations(ideaRecordId) {
        const params = {
            filterByFormula: `FIND("${ideaRecordId}", ARRAYJOIN(IdeaID))`,
            sort: [{ field: 'TurnNumber', direction: 'asc' }]
        };

        let allRecords = [];
        let offset = null;

        do {
            if (offset) params.offset = offset;
            const data = await this._request('GET', AppConfig.TABLE_NAMES.CONVERSATIONS, { params });
            allRecords = allRecords.concat(data.records || []);
            offset = data.offset;
        } while (offset);

        return allRecords;
    },

    async addConversation(ideaRecordId, role, message, turnNumber) {
        const fields = {
            IdeaID: [ideaRecordId],
            Role: role,
            Message: message,
            TurnNumber: turnNumber
        };
        return await this._request('POST', AppConfig.TABLE_NAMES.CONVERSATIONS, {
            body: { fields }
        });
    },

    // ACTION STEPS
    async getActionSteps(ideaRecordId) {
        const params = {
            filterByFormula: `FIND("${ideaRecordId}", ARRAYJOIN(IdeaID))`,
            sort: [{ field: 'OrderNumber', direction: 'asc' }]
        };

        let allRecords = [];
        let offset = null;

        do {
            if (offset) params.offset = offset;
            const data = await this._request('GET', AppConfig.TABLE_NAMES.ACTION_STEPS, { params });
            allRecords = allRecords.concat(data.records || []);
            offset = data.offset;
        } while (offset);

        return allRecords;
    },

    async createActionSteps(ideaRecordId, steps) {
        const results = [];
        // Airtable batch limit: 10 records per request
        for (let i = 0; i < steps.length; i += 10) {
            const batch = steps.slice(i, i + 10).map((step, idx) => ({
                fields: {
                    IdeaID: [ideaRecordId],
                    StepDescription: step.description,
                    EstimatedEffort: step.effort,
                    Completed: false,
                    OrderNumber: i + idx + 1
                }
            }));

            const data = await this._request('POST', AppConfig.TABLE_NAMES.ACTION_STEPS, {
                body: { records: batch }
            });
            results.push(...(data.records || []));
        }
        return results;
    },

    async updateActionStep(recordId, fields) {
        return await this._request('PATCH', AppConfig.TABLE_NAMES.ACTION_STEPS, {
            recordId,
            body: { fields }
        });
    },

    async deleteActionSteps(recordIds) {
        const results = [];
        for (let i = 0; i < recordIds.length; i += 10) {
            const batch = recordIds.slice(i, i + 10);
            const params = {};
            batch.forEach((id, idx) => {
                params[`records[${idx}]`] = id;
            });

            // For batch delete, use query params
            let url = `${this._getBaseUrl()}/${encodeURIComponent(AppConfig.TABLE_NAMES.ACTION_STEPS)}?`;
            url += batch.map(id => `records[]=${id}`).join('&');

            const response = await fetch(url, {
                method: 'DELETE',
                headers: this._getHeaders()
            });

            if (!response.ok) {
                throw new Error(`Failed to delete action steps: ${response.status}`);
            }
            const data = await response.json();
            results.push(...(data.records || []));
        }
        return results;
    },

    // Connection validation
    async validateConnection() {
        try {
            await this._request('GET', AppConfig.TABLE_NAMES.IDEAS, {
                params: { maxRecords: 1 }
            });
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
};
