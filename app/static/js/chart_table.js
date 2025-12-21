// 图表数据（模拟数据）
let chartData = {
    folders: [
        {
            id: 1,
            name: "柱状图列表",
            description: "销售数据相关柱状图",
            chartCount: 3,
            createTime: "2024-01-15",
            charts: [
                {
                    id: 1,
                    name: "月度销售趋势",
                    type: "柱状图",
                    path: "/charts/sales/trend.png",
                    createTime: "2024-01-15 10:30"
                },
                {
                    id: 2,
                    name: "产品销量分布",
                    type: "柱状图",
                    path: "/charts/sales/distribution.png",
                    createTime: "2024-01-16 14:20"
                },
                {
                    id: 3,
                    name: "区域销售对比",
                    type: "柱状图",
                    path: "/charts/sales/comparison.png",
                    createTime: "2024-01-17 09:15"
                }
            ]
        },
        {
            id: 2,
            name: "折线图列表",
            description: "用户行为数据折线图",
            chartCount: 2,
            createTime: "2024-01-18",
            charts: [
                {
                    id: 4,
                    name: "用户活跃度",
                    type: "折线图",
                    path: "/charts/user/activity.png",
                    createTime: "2024-01-18 11:45"
                },
                {
                    id: 5,
                    name: "用户留存率",
                    type: "折线图",
                    path: "/charts/user/retention.png",
                    createTime: "2024-01-19 16:30"
                }
            ]
        },
        {
            id: 3,
            name: "饼图列表",
            description: "财务数据饼图可视化",
            chartCount: 4,
            createTime: "2024-01-20",
            charts: [
                {
                    id: 6,
                    name: "收入趋势",
                    type: "饼图",
                    path: "/charts/finance/revenue.png",
                    createTime: "2024-01-20 13:20"
                },
                {
                    id: 7,
                    name: "成本分析",
                    type: "饼图",
                    path: "/charts/finance/cost.png",
                    createTime: "2024-01-21 10:10"
                },
                {
                    id: 8,
                    name: "利润分布",
                    type: "饼图",
                    path: "/charts/finance/profit.png",
                    createTime: "2024-01-22 15:45"
                },
                {
                    id: 9,
                    name: "现金流",
                    type: "饼图",
                    path: "/charts/finance/cashflow.png",
                    createTime: "2024-01-23 08:30"
                }
            ]
        },
        {
            id: 4,
            name: "面积图列表",
            description: "时间序列面积图",
            chartCount: 2,
            createTime: "2024-01-24",
            charts: [
                {
                    id: 10,
                    name: "网站流量统计",
                    type: "面积图",
                    path: "/charts/analytics/traffic.png",
                    createTime: "2024-01-24 14:25"
                },
                {
                    id: 11,
                    name: "用户增长趋势",
                    type: "面积图",
                    path: "/charts/analytics/growth.png",
                    createTime: "2024-01-25 11:15"
                }
            ]
        }
    ]
};

// 当前预览的图表ID
let currentPreviewChartId = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    initializeChartTable();
});

// 初始化图表表格
// function initializeChartTable() {
//     console.log('数据制图页面初始化完成，项目ID:', window.currentProjectId);
//
//     // 渲染图表文件夹
//     renderChartFolders();
//
//     // 更新图表统计
//     updateChartStats();
//
//     showMessage('图表数据加载完成', 'success');
// }

function initializeChartTable() {
    console.log('数据制图页面初始化完成，项目ID:', window.currentProjectId);

    // 加载图表类型数据
    loadChartTypes();

    showMessage('图表数据加载中...', 'info');
}


// 加载图表类型数据
function loadChartTypes() {
    fetch('/data/api/chart-types')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 将API返回的数据转换为前端需要的格式
                const formattedData = {
                    folders: data.chart_types.map(type => ({
                        id: type.id,
                        name: type.type_name,
                        description: type.description,
                        chartCount: type.chart_count,
                        createTime: type.create_time,
                        charts: [] // 初始为空，点击文件夹时再加载详细图表
                    }))
                };

                // 渲染图表文件夹
                renderChartFolders(formattedData);
                // 更新图表统计
                updateChartStats(formattedData);

                showMessage(`成功加载 ${data.count} 个图表类型`, 'success');
            } else {
                showMessage('加载图表类型失败: ' + data.message, 'error');
                // 显示空状态
                showEmptyState();
            }
        })
        .catch(error => {
            console.error('加载图表类型失败:', error);
            showMessage('加载图表类型失败，请检查网络连接', 'error');
            showEmptyState();
        });
}

// 显示空状态
function showEmptyState() {
    const container = document.getElementById('chart-folders-grid');
    const emptyMessage = document.getElementById('empty-charts-message');

    if (container && emptyMessage) {
        container.style.display = 'none';
        emptyMessage.style.display = 'block';
        emptyMessage.innerHTML = `
            <i class="bi bi-inbox"></i>
            <h4>暂无图表类型</h4>
            <p>请联系管理员初始化图表类型数据</p>
        `;
    }
}

// 修改渲染函数，接收数据参数
function renderChartFolders(chartData) {
    const container = document.getElementById('chart-folders-grid');
    const emptyMessage = document.getElementById('empty-charts-message');

    if (!container || !emptyMessage) {
        console.error('未找到图表容器元素');
        return;
    }

    if (!chartData || !chartData.folders || chartData.folders.length === 0) {
        container.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    emptyMessage.style.display = 'none';
    container.innerHTML = '';

    chartData.folders.forEach(folder => {
        const folderElement = document.createElement('div');
        folderElement.className = 'chart-folder';
        folderElement.setAttribute('data-folder-id', folder.id);

        folderElement.innerHTML = `
            <div class="chart-folder-header">
                <div class="chart-folder-icon">
                    <i class="bi bi-folder-fill"></i>
                </div>
                <div class="chart-folder-info">
                    <h6>${folder.name}</h6>
                    <small>${folder.description}</small>
                </div>
            </div>
            <div class="chart-folder-stats">
                <span>创建时间: ${folder.createTime}</span>
                <span class="chart-count">${folder.chartCount} 图表</span>
            </div>
        `;

        folderElement.addEventListener('click', () => {
            openChartFolder(folder.id);
        });

        container.appendChild(folderElement);
    });
}

// 修改打开文件夹函数，跳转到详情页面
function openChartFolder(chartTypeId) {
    // 跳转到图表文件夹详情页面
    window.location.href = `/data/projects/${window.currentProjectId}/chart-types/${chartTypeId}`;
}


// 下载图表
function downloadChart(chartId) {
    // 查找图表信息
    let chartInfo = null;
    for (const folder of chartData.folders) {
        chartInfo = folder.charts.find(chart => chart.id === chartId);
        if (chartInfo) break;
    }

    if (chartInfo) {
        showMessage(`开始下载图表: ${chartInfo.name}`, 'info');
        // 模拟下载延迟
        setTimeout(() => {
            showMessage(`图表 "${chartInfo.name}" 下载完成`, 'success');
        }, 1000);
    }
}

// 下载当前预览的图表
function downloadCurrentChart() {
    if (currentPreviewChartId) {
        downloadChart(currentPreviewChartId);
        const modalElement = document.getElementById('chartPreviewModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
    } else {
        showMessage('请先选择要下载的图表', 'warning');
    }
}

// 创建新图表
function showCreateChartModal() {
    showMessage('创建图表功能开发中...', 'info');
}

// 导入图表数据
function importChartData() {
    showMessage('导入图表功能开发中...', 'info');
}

// 创建图表文件夹
function createChartFolder() {
    showMessage('创建文件夹功能开发中...', 'info');
}

// 刷新图表数据
function refreshChartData() {
    showMessage('正在刷新图表数据...', 'info');
    loadChartTypes();
}

// 导出所有图表
function exportAllCharts() {
    showMessage('开始导出所有图表...', 'info');
    // 模拟导出延迟
    setTimeout(() => {
        const totalCharts = chartData.folders.reduce((sum, folder) => sum + folder.chartCount, 0);
        showMessage(`成功导出 ${totalCharts} 个图表`, 'success');
    }, 2000);
}

// 更新统计函数
function updateChartStats(chartData) {
    const totalCharts = chartData.folders.reduce((sum, folder) => sum + folder.chartCount, 0);
    const chartCountElement = document.getElementById('chart-count');
    if (chartCountElement) {
        chartCountElement.textContent = totalCharts;
    }
}

// 显示消息函数
function showMessage(message, type) {
    // 创建消息容器（如果不存在）
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1055';
        document.body.appendChild(toastContainer);
    }

    // 创建Toast元素
    const toastId = 'toast-' + Date.now();
    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-white bg-${getToastType(type)} border-0`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    toastElement.setAttribute('aria-atomic', 'true');
    toastElement.id = toastId;

    toastElement.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi ${getToastIcon(type)} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toastElement);

    // 初始化并显示Toast
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 3000
    });

    toast.show();

    // Toast隐藏后移除元素
    toastElement.addEventListener('hidden.bs.toast', function () {
        toastElement.remove();
    });
}

// 获取Toast类型对应的背景色
function getToastType(type) {
    const typeMap = {
        'success': 'success',
        'warning': 'warning',
        'error': 'danger',
        'info': 'info'
    };
    return typeMap[type] || 'primary';
}

// 获取Toast图标
function getToastIcon(type) {
    const iconMap = {
        'success': 'bi-check-circle-fill',
        'warning': 'bi-exclamation-triangle-fill',
        'error': 'bi-x-circle-fill',
        'info': 'bi-info-circle-fill'
    };
    return iconMap[type] || 'bi-bell-fill';
}