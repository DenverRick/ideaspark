// IdeaSpark - Action Steps Logic

const ActionSteps = {
    currentIdeaId: null,
    steps: [],
    initialized: false,

    init() {
        // Generate plan button (in empty state)
        document.getElementById('generate-plan-btn').addEventListener('click', () => {
            this.generatePlan();
        });

        // Regenerate button
        document.getElementById('regenerate-plan-btn').addEventListener('click', () => {
            this.confirmRegenerate();
        });

        // Add step button
        document.getElementById('add-step-btn').addEventListener('click', () => {
            this.showAddStepInput();
        });
    },

    async open(ideaRecordId) {
        this.currentIdeaId = ideaRecordId;
        this.steps = [];
        this.initialized = false;

        await this.loadSteps();
    },

    async loadSteps() {
        try {
            const records = await AirtableAPI.getActionSteps(this.currentIdeaId);
            this.steps = records;
            this.renderSteps();
            this.initialized = true;
        } catch (error) {
            showToast('Failed to load action steps', 'error');
        }
    },

    renderSteps() {
        const noSteps = document.getElementById('no-steps-message');
        const stepsList = document.getElementById('steps-list');
        const stepsFooter = document.getElementById('steps-footer');

        if (this.steps.length === 0) {
            noSteps.classList.remove('hidden');
            stepsList.classList.add('hidden');
            stepsFooter.classList.add('hidden');
            return;
        }

        noSteps.classList.add('hidden');
        stepsList.classList.remove('hidden');
        stepsFooter.classList.remove('hidden');

        stepsList.innerHTML = this.steps.map(step => {
            const f = step.fields;
            const completed = f.Completed ? 'completed' : '';
            return `
                <div class="step-item ${completed}" data-id="${step.id}">
                    <span class="step-order">#${f.OrderNumber || ''}</span>
                    <input type="checkbox" class="step-checkbox" ${f.Completed ? 'checked' : ''} data-id="${step.id}">
                    <div class="step-body">
                        <div class="step-description">${escapeHtml(f.StepDescription)}</div>
                        ${f.EstimatedEffort ? `<span class="step-effort">${escapeHtml(f.EstimatedEffort)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Checkbox handlers
        stepsList.querySelectorAll('.step-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const recordId = e.target.dataset.id;
                const completed = e.target.checked;
                this.toggleStep(recordId, completed);
            });
        });
    },

    async toggleStep(recordId, completed) {
        // Optimistic UI update
        const stepItem = document.querySelector(`.step-item[data-id="${recordId}"]`);
        if (stepItem) {
            stepItem.classList.toggle('completed', completed);
        }

        try {
            await AirtableAPI.updateActionStep(recordId, { Completed: completed });
        } catch (error) {
            // Revert on failure
            if (stepItem) {
                stepItem.classList.toggle('completed', !completed);
                const checkbox = stepItem.querySelector('.step-checkbox');
                if (checkbox) checkbox.checked = !completed;
            }
            showToast('Failed to update step', 'error');
        }
    },

    async generatePlan() {
        const history = Brainstorm.getHistory();

        if (history.length === 0) {
            showToast('Start a brainstorm conversation first!', 'info');
            return;
        }

        const ideaTitle = currentIdeaData?.fields?.Title || 'this idea';

        // Show loading
        const stepsList = document.getElementById('steps-list');
        const noSteps = document.getElementById('no-steps-message');
        const stepsFooter = document.getElementById('steps-footer');

        noSteps.classList.add('hidden');
        stepsList.classList.remove('hidden');
        stepsList.innerHTML = '<div style="text-align: center; padding: 32px; color: var(--text-light)"><div class="spinner" style="margin: 0 auto 12px"></div>Generating action plan...</div>';
        stepsFooter.classList.add('hidden');

        try {
            const plan = await ClaudeAPI.generateActionPlan(history, ideaTitle);

            // Delete existing steps if any
            if (this.steps.length > 0) {
                const ids = this.steps.map(s => s.id);
                await AirtableAPI.deleteActionSteps(ids);
            }

            // Create new steps
            const records = await AirtableAPI.createActionSteps(this.currentIdeaId, plan.steps);
            this.steps = records;
            this.renderSteps();
            showToast('Action plan generated!', 'success');
        } catch (error) {
            stepsList.innerHTML = `<div class="empty-state"><p>Failed to generate plan: ${escapeHtml(error.message)}</p><button class="btn btn-small btn-primary" onclick="ActionSteps.generatePlan()">Try Again</button></div>`;
            showToast('Failed to generate action plan', 'error');
        }
    },

    async confirmRegenerate() {
        if (!confirm('Regenerate the action plan? This will replace all current steps.')) return;
        await this.generatePlan();
    },

    showAddStepInput() {
        const stepsFooter = document.getElementById('steps-footer');

        // Check if input already exists
        if (document.querySelector('.add-step-inline')) return;

        const inputDiv = document.createElement('div');
        inputDiv.className = 'add-step-inline';
        inputDiv.innerHTML = `
            <input type="text" placeholder="Describe the step..." id="new-step-input">
            <button class="btn btn-small btn-primary" id="new-step-save">Add</button>
        `;

        stepsFooter.parentNode.insertBefore(inputDiv, stepsFooter);

        const input = document.getElementById('new-step-input');
        input.focus();

        document.getElementById('new-step-save').addEventListener('click', () => {
            this.addCustomStep(input.value.trim());
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addCustomStep(input.value.trim());
            }
        });
    },

    async addCustomStep(description) {
        if (!description) return;

        const orderNumber = this.steps.length + 1;

        try {
            const records = await AirtableAPI.createActionSteps(this.currentIdeaId, [
                { description, effort: '1hr' }
            ]);

            // Remove input
            const inputDiv = document.querySelector('.add-step-inline');
            if (inputDiv) inputDiv.remove();

            // Reload steps
            await this.loadSteps();
            showToast('Step added', 'success');
        } catch (error) {
            showToast('Failed to add step: ' + error.message, 'error');
        }
    }
};
