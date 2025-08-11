class QuizAnalyticsDashboard {
    constructor() {
        this.apiBaseUrl = '/server/api';
        this.currentQuizId = document.getElementById('quizId')?.value || 'lead2';
        this.charts = {};
        this.currentData = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadAnalytics();
    }
    
    bindEvents() {
        document.getElementById('quizId').addEventListener('change', (e) => {
            this.currentQuizId = e.target.value;
            this.loadAnalytics();
        });
        
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadAnalytics();
        });
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });
        
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') {
                this.hideModal();
            }
        });
    }
    
    async loadAnalytics() {
        this.showLoading();
        this.hideError();
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/analytics.php?quiz_id=${this.currentQuizId}&type=full`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message || 'Unknown error occurred');
            }
            
            this.currentData = data;
            this.renderDashboard(data);
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError(error.message);
            this.hideLoading();
        }
    }
    
    renderDashboard(data) {
        this.updateOverview(data.stats || {});
        this.renderFunnelResults(data.funnel || []);
        this.renderFunnelChart(data.funnel || []);
        this.renderDropoffTable(data.drop_off_analysis || []);
        this.renderAnswerAnalytics(data.answer_analytics || []);
        this.updateLastUpdated(data.generated_at);
    }
    
    updateOverview(stats) {
        if (!stats) {
            console.warn('No stats data available');
            return;
        }
        
        document.getElementById('totalUsers').textContent = this.formatNumber(stats.total_users || 0);
        document.getElementById('completedUsers').textContent = this.formatNumber(stats.completed_users || 0);
        document.getElementById('completionRate').textContent = `${stats.completion_rate || 0}%`;
    }

    renderFunnelResults(funnelData) {
        if (!Array.isArray(funnelData) || funnelData.length === 0) {
            console.warn('No funnel data available');
            return;
        }
        
        const funnelContainer = document.querySelector('.funnel-results');
        if (!funnelContainer) {
            console.warn('Funnel results container not found');
            return;
        }
        
        funnelContainer.innerHTML = '';
        
        funnelData.forEach((slide, index) => {
            const funnelItem = document.createElement('div');
            funnelItem.className = 'funnel-item';
            
            const isCompletion = slide.slide_id.includes('completion') || 
                                slide.slide_id.includes('final') || 
                                index === funnelData.length - 1;
            
            if (isCompletion) {
                funnelItem.classList.add('completion-item');
            }
            
            funnelItem.innerHTML = `
                <span class="funnel-label">${slide.slide_title || slide.slide_id}:</span>
                <span class="funnel-value">${this.formatNumber(slide.users_reached)}</span>
                <span class="funnel-unit">users</span>
            `;
            
            funnelContainer.appendChild(funnelItem);
        });
    }
    
    renderFunnelChart(funnelData) {
        const ctx = document.getElementById('funnelChart').getContext('2d');
        
        if (this.charts.funnel) {
            this.charts.funnel.destroy();
        }
        
        if (!Array.isArray(funnelData) || funnelData.length === 0) {
            console.warn('No funnel data available for chart');
            return;
        }
        
        const labels = funnelData.map(item => item.slide_title);
        const data = funnelData.map(item => item.users_reached);
        const dropOffData = funnelData.map(item => item.drop_off);
        
        const dropOffPercentages = funnelData.map(item => {
            return item.users_reached > 0 ? ((item.drop_off / item.users_reached) * 100) : 0;
        });
        

        
        this.charts.funnel = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Users Reached',
                        data: data,
                        backgroundColor: 'rgba(102, 126, 234, 0.8)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        borderWidth: 2,
                        borderRadius: 8,
                        order: 1
                    },
                    {
                        label: 'Drop-off',
                        data: dropOffData,
                        backgroundColor: 'rgba(220, 53, 69, 0.8)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 2,
                        borderRadius: 8,
                        order: 2,
                        minBarLength: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 20,
                        bottom: 80,
                        left: 20,
                        right: 20
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Quiz Funnel - User Journey',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                const index = context.dataIndex;
                                
                                if (label === 'Drop-off') {
                                    const percentage = dropOffPercentages[index];
                                    return `${label}: ${value} (${percentage.toFixed(2)}% of users on this slide)`;
                                } else {
                                    const percentage = ((value / data[0]) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Users'
                        },
                        ticks: {
                            callback: function(value) {
                                return value >= 1 ? value : value;
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Quiz Slides',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0,
                            autoSkip: false,
                            maxTicksLimit: 13,
                            font: {
                                size: 10
                            },
                            callback: function(value, index) {
                                const label = this.getLabelForValue(value);
                                if (label.length > 20) {
                                    return label.substring(0, 20) + '...';
                                }
                                return label;
                            }
                        }
                    }
                },

            }
        });
    }
    
    renderDropoffTable(dropoffData) {
        const tbody = document.getElementById('dropoffTableBody');
        tbody.innerHTML = '';
        
        dropoffData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${item.slide_id}</strong></td>
                <td>${item.slide_title}</td>
                <td>${this.formatNumber(item.users_reached)}</td>
                <td class="text-danger">${this.formatNumber(item.drop_off_count)}</td>
                <td class="text-danger">${item.drop_off_percentage}%</td>
                <td class="text-success">${(100 - item.drop_off_percentage).toFixed(1)}%</td>
            `;
            
            row.addEventListener('click', () => {
                this.showSlideDetails(item);
            });
            row.style.cursor = 'pointer';
            
            tbody.appendChild(row);
        });
    }
    

    

    

    
    renderAnswerAnalytics(answerData) {
        const container = document.getElementById('answerAnalytics');
        container.innerHTML = '';
        
        const slideGroups = {};
        answerData.forEach(answer => {
            if (!slideGroups[answer.slide_id]) {
                slideGroups[answer.slide_id] = [];
            }
            slideGroups[answer.slide_id].push(answer);
        });
        
        Object.keys(slideGroups).forEach(slideId => {
            const answers = slideGroups[slideId];
            const card = document.createElement('div');
            card.className = 'answer-card';
            
            const slideTitle = this.getSlideTitle(slideId);
            
            card.innerHTML = `
                <h4>${slideTitle}</h4>
                ${answers.map(answer => `
                    <div class="answer-item">
                        <div class="answer-text">${answer.answer_text || answer.answer_value}</div>
                        <div class="answer-stats">
                            ${answer.selection_count} (${answer.selection_percentage}%)
                        </div>
                    </div>
                `).join('')}
            `;
            
            container.appendChild(card);
        });
    }
    
    getSlideTitle(slideId) {
        if (this.currentData && this.currentData.funnel) {
            const slide = this.currentData.funnel.find(s => s.slide_id === slideId);
            return slide ? slide.slide_title : slideId;
        }
        return slideId;
    }
    
    showSlideDetails(slideData) {
        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = `Slide Details: ${slideData.slide_title}`;
        
        modalBody.innerHTML = `
            <div class="slide-details">
                <div class="detail-item">
                    <strong>Slide ID:</strong> ${slideData.slide_id}
                </div>
                <div class="detail-item">
                    <strong>Title:</strong> ${slideData.slide_title}
                </div>
                <div class="detail-item">
                    <strong>Sequence:</strong> ${slideData.sequence_order}
                </div>
                <div class="detail-item">
                    <strong>Users Reached:</strong> ${this.formatNumber(slideData.users_reached)}
                </div>
                <div class="detail-item">
                    <strong>Drop-off Count:</strong> ${this.formatNumber(slideData.drop_off_count)}
                </div>
                <div class="detail-item">
                    <strong>Drop-off Percentage:</strong> ${slideData.drop_off_percentage}%
                </div>
                <div class="detail-item">
                    <strong>Retention Rate:</strong> ${(100 - slideData.drop_off_percentage).toFixed(1)}%
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }
    
    hideModal() {
        document.getElementById('detailModal').classList.add('hidden');
    }
    
    updateLastUpdated(timestamp) {
        document.getElementById('lastUpdated').textContent = timestamp;
    }
    
    exportData() {
        if (!this.currentData) {
            alert('No data to export');
            return;
        }
        
        const dataStr = JSON.stringify(this.currentData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `quiz-analytics-${this.currentQuizId}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }
    
    showLoading() {
        document.getElementById('loadingIndicator').classList.remove('hidden');
    }
    
    hideLoading() {
        document.getElementById('loadingIndicator').classList.add('hidden');
    }
    
    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        errorText.textContent = message;
        errorElement.classList.remove('hidden');
    }
    
    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }
    
    formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat().format(num);
    }
    
    formatTime(milliseconds) {
        if (!milliseconds || milliseconds === 0) return '-';
        
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuizAnalyticsDashboard();
});

window.QuizDashboard = {
    refresh: function() {
        window.location.reload();
    },
    
    switchQuiz: function(quizId) {
        document.getElementById('quizId').value = quizId;
        document.getElementById('quizId').dispatchEvent(new Event('change'));
    },
    
    getCurrentData: function() {
        return window.dashboardInstance?.currentData;
    }
}; 