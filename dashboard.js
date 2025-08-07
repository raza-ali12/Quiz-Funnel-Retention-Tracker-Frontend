let currentQuizId = null;
let retentionChart = null;
let dropoffChart = null;

$(document).ready(function() {
    loadQuizzes();
    
    setInterval(loadQuizzes, 5000);
    
    setInterval(function() {
        const selectedQuiz = $('#quizSelect').val();
        if (selectedQuiz) {
            loadAnalytics();
        }
    }, 3000);
});

async function loadQuizzes() {
    try {
        const apiUrl = $('#apiUrl').val();
        const response = await fetch(`${apiUrl}/api/analytics/quizzes`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const select = $('#quizSelect');
            select.html('<option value="">Select a quiz...</option>');
            
            data.data.forEach(quiz => {
                select.append(`<option value="${quiz.quiz_id}">${quiz.title} (${quiz.total_sessions} sessions)</option>`);
            });
        }
    } catch (error) {
        showError(`Failed to load quizzes: ${error.message}`);
    }
}

async function loadAnalytics() {
    const quizId = $('#quizSelect').val();
    if (!quizId) {
        showError('Please select a quiz first.');
        return;
    }

    currentQuizId = quizId;
    showLoading(true);
    hideError();

    try {
        const apiUrl = $('#apiUrl').val();
        const response = await fetch(`${apiUrl}/api/analytics/quiz/${quizId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayAnalytics(data.data);
        } else {
            throw new Error('Failed to load analytics data');
        }
    } catch (error) {
        showError(`Failed to load analytics: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

async function refreshAnalytics() {
    if (currentQuizId) {
        console.log('Manual refresh triggered');
        await loadAnalytics();
    } else {
        showError('Please select a quiz first.');
    }
}

function displayAnalytics(data) {
    displaySimpleResults(data);
    displayStats(data);
    displayRetentionChart(data);
    displayDropoffChart(data);
    displaySlideAnalytics(data);
}

function displaySimpleResults(data) {
    const container = $('#simpleResults');
    const list = $('#resultsList');
    
    list.empty();
    
    data.slide_analytics.forEach(slide => {
        const totalUsers = slide.unique_users;
        const activeUsers = slide.active_users;
        const statusClass = activeUsers > 0 ? 'active' : '';
        
        let userDisplay = `${totalUsers} users`;
        if (activeUsers > 0) {
            userDisplay = `<strong>${activeUsers} active</strong> / ${totalUsers} total`;
        } else if (totalUsers > 0) {
            userDisplay = `${totalUsers} users (0 active)`;
        }
        
        const li = $(`
            <li class="result-item">
                <span>Slide ${slide.slide_sequence}: ${slide.slide_title}</span>
                <span class="result-count ${statusClass}">${userDisplay}</span>
                ${activeUsers > 0 ? '<span class="active-indicator">● LIVE NOW</span>' : ''}
            </li>
        `);
        list.append(li);
    });
    
    const completedLi = $(`
        <li class="result-item completed">
            <span>Completed</span>
            <span class="result-count">${data.completed_sessions} users</span>
        </li>
    `);
    list.append(completedLi);
    
    if (data.active_users > 0) {
        const activeLi = $(`
            <li class="result-item active-summary">
                <span>Currently Active</span>
                <span class="result-count active">${data.active_users} users</span>
            </li>
        `);
        list.append(activeLi);
    }
    
    container.show();
}

function displayStats(data) {
    $('#totalSessions').text(data.total_sessions);
    $('#completedSessions').text(data.completed_sessions);
    $('#completionRate').text(`${data.completion_rate}%`);
    $('#totalSlides').text(data.slide_analytics.length);
    
    $('#stats').show();
}

function displayRetentionChart(data) {
    const ctx = document.getElementById('retentionChart').getContext('2d');
    
    if (retentionChart) {
        retentionChart.destroy();
    }
    
    const labels = data.slide_analytics.map(slide => `Slide ${slide.slide_sequence}`);
    const values = data.slide_analytics.map(slide => slide.unique_users);
    
    retentionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Users',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Users'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Slide Number'
                    }
                }
            }
        }
    });
    
    $('#funnelChart').show();
}

function displayDropoffChart(data) {
    const ctx = document.getElementById('dropoffAnalysisChart').getContext('2d');
    
    if (dropoffChart) {
        dropoffChart.destroy();
    }
    
    const labels = data.slide_analytics.map(slide => `Slide ${slide.slide_sequence}`);
    const dropoffRates = [];
    
    for (let i = 0; i < data.slide_analytics.length; i++) {
        if (i === 0) {
            dropoffRates.push(0);
        } else {
            const previousCount = data.slide_analytics[i - 1].visit_count;
            const currentCount = data.slide_analytics[i].visit_count;
            const dropoff = previousCount > 0 ? ((previousCount - currentCount) / previousCount * 100) : 0;
            dropoffRates.push(Math.round(dropoff));
        }
    }
    
    dropoffChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Drop-off Rate (%)',
                data: dropoffRates,
                backgroundColor: dropoffRates.map(rate => 
                    rate > 50 ? '#dc3545' : 
                    rate > 25 ? '#ffc107' : '#28a745'
                ),
                borderColor: '#333',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Drop-off Rate (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Slide Number'
                    }
                }
            }
        }
    });
    
    $('#dropoffChart').show();
}

function displaySlideAnalytics(data) {
    const list = $('#slideList');
    list.empty();
    
    data.slide_analytics.forEach(slide => {
        const li = $(`
            <li class="slide-item">
                <div class="slide-info">
                    <div class="slide-title">${slide.slide_title}</div>
                    <div class="slide-id">ID: ${slide.slide_id} | Sequence: ${slide.slide_sequence}</div>
                </div>
                <div class="slide-count">${slide.visit_count} users</div>
            </li>
        `);
        list.append(li);
    });
    
    $('#slideAnalytics').show();
}

function showLoading(show) {
    $('#loading').toggle(show);
}

function showError(message) {
    $('#error').text(message).show();
}

function hideError() {
    $('#error').hide();
} 