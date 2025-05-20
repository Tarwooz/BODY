// 加载体重数据并渲染图表
document.addEventListener('DOMContentLoaded', function () {
    // 加载数据
    fetch('../data/BODY_MORNING_DATA.json')
        .then(response => response.json())
        .then(data => {
            // 初始化数据
            initializeData(data)
            // 绑定时间范围按钮事件
            bindTimeRangeButtons(data)
        })
        .catch(error => {
            console.error('加载数据失败:', error)
            alert('加载数据失败，请检查控制台获取详细信息。')
        })
})

// 初始化数据和图表
function initializeData(data) {
    // 初始显示全部数据
    renderChart(data, 'all')
    // 更新统计信息
    updateStats(data)
}

// 绑定时间范围按钮事件
function bindTimeRangeButtons(data) {
    const buttons = document.querySelectorAll('.time-btn')
    buttons.forEach(button => {
        button.addEventListener('click', function () {
            // 移除所有按钮的active类
            buttons.forEach(btn => btn.classList.remove('active'))
            // 给当前按钮添加active类
            this.classList.add('active')
            // 获取时间范围
            const range = this.getAttribute('data-range')
            // 根据时间范围过滤数据并重新渲染图表
            renderChart(data, range)
            // 更新统计信息
            updateStats(filterDataByRange(data, range))
        })
    })
}

// 根据时间范围过滤数据
function filterDataByRange(data, range) {
    // 如果是全部数据，直接返回
    if (range === 'all') {
        return data
    }

    // 当前日期
    const now = new Date()
    let startDate

    // 根据不同的时间范围设置开始日期
    switch (range) {
        case '3m': // 3个月
            startDate = new Date(now)
            startDate.setMonth(now.getMonth() - 3)
            break
        case '1m': // 1个月
            startDate = new Date(now)
            startDate.setMonth(now.getMonth() - 1)
            break
        case '2w': // 2周
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 14)
            break
        default:
            return data
    }

    // 过滤数据
    return data.filter(item => {
        const itemDate = new Date(item.time)
        return itemDate >= startDate
    })
}

// 渲染图表
function renderChart(data, range) {
    // 过滤数据
    const filteredData = filterDataByRange(data, range)

    // 提取日期和体重数据
    const dates = filteredData.map(item => {
        const date = new Date(item.time)
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    })
    const weights = filteredData.map(item => item.weight)
    const bmis = filteredData.map(item => parseFloat(item.bmi))

    // 创建趋势线数据
    // 使用完整的数据点而不是只有首尾的空数组
    const trendLineData = []
    if (dates.length > 1) {
        // 只保留首尾两个点的数据
        const first = weights[0]
        const last = weights[weights.length - 1]

        // 直接使用两点构建趋势线
        trendLineData.push({ x: dates[0], y: first })
        trendLineData.push({ x: dates[dates.length - 1], y: last })
    }

    // 获取canvas元素
    const ctx = document.getElementById('weightChart').getContext('2d')

    // 销毁之前的图表实例（如果存在）
    if (window.weightChartInstance) {
        window.weightChartInstance.destroy()
    }

    // 创建新的图表实例
    window.weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '体重 (kg)',
                    data: weights,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.2,
                    yAxisID: 'y',
                },
                {
                    label: 'BMI',
                    data: bmis,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.2,
                    yAxisID: 'y1',
                    hidden: true, // 默认隐藏BMI数据，用户可以选择显示
                },
                {
                    label: '趋势线',
                    data:
                        trendLineData.length > 0
                            ? [
                                  { x: dates[0], y: trendLineData[0].y },
                                  { x: dates[dates.length - 1], y: trendLineData[1].y },
                              ]
                            : [],
                    borderColor: '#e67e22', // 橙色
                    borderWidth: 2,
                    borderDash: [5, 5], // 虚线样式
                    fill: false,
                    tension: 0, // 直线
                    pointRadius: [4, 4], // 显示首尾两个点
                    pointBackgroundColor: '#e67e22',
                    yAxisID: 'y',
                    showLine: true, // 确保线条显示
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || ''
                            if (label) {
                                label += ': '
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1)
                            }
                            return label
                        },
                        title: function (tooltipItems) {
                            const index = tooltipItems[0].dataIndex
                            return filteredData[index].time.split(' ')[0] // 只显示日期部分
                        },
                    },
                },
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 20,
                        usePointStyle: true,
                    },
                },
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                },
                y: {
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '体重 (kg)',
                    },
                    // 设置合适的刻度，加减一点余量使得图表更好看
                    min: Math.floor(Math.min(...weights)) - 1,
                    max: Math.ceil(Math.max(...weights)) + 1,
                    ticks: {
                        stepSize: 1,
                    },
                },
                y1: {
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false, // 只有体重的网格线显示
                    },
                    title: {
                        display: true,
                        text: 'BMI',
                    },
                    min: Math.floor(Math.min(...bmis)) - 1,
                    max: Math.ceil(Math.max(...bmis)) + 1,
                },
            },
        },
    })
}

// 更新统计信息
function updateStats(data) {
    if (!data || data.length === 0) return

    // 排序数据（按时间）
    const sortedData = [...data].sort((a, b) => new Date(a.time) - new Date(b.time))

    // 获取统计数据
    const startWeight = sortedData[0].weight
    const currentWeight = sortedData[sortedData.length - 1].weight
    const maxWeight = Math.max(...data.map(item => item.weight))
    const minWeight = Math.min(...data.map(item => item.weight))
    const avgWeight = (data.reduce((sum, item) => sum + item.weight, 0) / data.length).toFixed(1)
    const weightChange = (currentWeight - startWeight).toFixed(1)
    const currentBMI = sortedData[sortedData.length - 1].bmi
    const totalDays = calculateTotalDays(sortedData)
    const lastUpdate = sortedData[sortedData.length - 1].time

    // 更新DOM
    document.getElementById('startWeight').textContent = startWeight.toFixed(1)
    document.getElementById('currentWeight').textContent = currentWeight.toFixed(1)
    document.getElementById('maxWeight').textContent = maxWeight.toFixed(1)
    document.getElementById('minWeight').textContent = minWeight.toFixed(1)
    document.getElementById('avgWeight').textContent = avgWeight
    document.getElementById('weightChange').textContent = weightChange
    document.getElementById('currentBMI').textContent = parseFloat(currentBMI).toFixed(1)
    document.getElementById('totalDays').textContent = totalDays
    document.getElementById('lastUpdate').textContent = lastUpdate

    // 设置体重变化的颜色
    const weightChangeElement = document.getElementById('weightChange')
    if (parseFloat(weightChange) < 0) {
        weightChangeElement.style.color = '#27ae60' // 绿色表示减重
    } else if (parseFloat(weightChange) > 0) {
        weightChangeElement.style.color = '#e74c3c' // 红色表示增重
    } else {
        weightChangeElement.style.color = '#3498db' // 不变则使用默认颜色
    }
}

// 计算总天数（不重复计算同一天的多条记录）
function calculateTotalDays(data) {
    if (!data || data.length === 0) return 0

    // 提取每条记录的日期部分
    const days = data.map(item => item.time.split(' ')[0])

    // 统计不重复的天数
    const uniqueDays = new Set(days)

    return uniqueDays.size
}
