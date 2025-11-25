document.addEventListener("DOMContentLoaded", function() {

    // Helper data (replace with backend API call)
    const analyticsData = {
        months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
        userCount: [150, 220, 350, 480, 520, 600],
        categories: {
            labels: ['Technical', 'GK', 'Law', 'Sports', 'Coding'],
            data: [35, 25, 15, 10, 15], // Percentages
            colors: ['#3498db', '#e67e22', '#2ecc71', '#9b59b6', '#f39c12']
        }
    };

    // --- Chart 1: User Registration Trend (Line Chart) ---
    const userChartCtx = document.getElementById('userChart').getContext('2d');
    new Chart(userChartCtx, {
        type: 'line',
        data: {
            labels: analyticsData.months,
            datasets: [{
                label: 'New Registrations',
                data: analyticsData.userCount,
                borderColor: '#4a00e0',
                backgroundColor: 'rgba(74, 0, 224, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });

    // --- Chart 2: Quiz Category Distribution (Doughnut Chart) ---
    const categoryChartCtx = document.getElementById('categoryChart').getContext('2d');
    new Chart(categoryChartCtx, {
        type: 'doughnut',
        data: {
            labels: analyticsData.categories.labels,
            datasets: [{
                data: analyticsData.categories.data,
                backgroundColor: analyticsData.categories.colors,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
});