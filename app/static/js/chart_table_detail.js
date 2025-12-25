// 获取图表列表
function loadChartList() {
    const projectId = document.body.dataset.projectId;
    const chartTypeId = document.body.dataset.chartTypeId;

    // 显示加载状态
    showLoadingState();

    fetch(`/data/api/project/${projectId}/chart`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderChartList(data.data);
                updateChartCount(data.data.length);
            } else {
                console.error('获取图表列表失败:', data.msg);
                showErrorState('获取图表列表失败: ' + data.msg);
            }
        })
        .catch(error => {
            console.error('请求失败:', error);
            showErrorState('网络请求失败，请检查连接');
        });
}

// 渲染图表列表
function renderChartList(chartData) {
    const tbody = document.getElementById('chart-list-body');
    const emptyState = document.getElementById('empty-state');

    tbody.innerHTML = '';

    if (chartData.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    chartData.forEach(chart => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${chart.id}</td>
            <td>${chart.name}</td>
            <td class="chart-detail-font-monospace" title="${chart.file_path}">${chart.file_path}</td>
            <td>${chart.create_time}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="renameChart(${chart.id}, '${chart.name.replace(/'/g, "\\'")}')">
                    <i class="bi bi-pencil me-1"></i>重命名
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="previewChart(${chart.id})">
                    <i class="bi bi-eye me-1"></i>预览
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteChart(${chart.id})">
                    <i class="bi bi-trash me-1"></i>删除
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="downloadChart(${chart.id})">
                    <i class="bi bi-download me-1"></i>下载
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 更新图表计数
function updateChartCount(count) {
    const countElement = document.getElementById('chart-count');
    const headerCountElement = document.getElementById('chart-count-header');

    if (countElement) {
        countElement.textContent = count;
    }
    if (headerCountElement) {
        headerCountElement.textContent = count;
    }
}

// 显示加载状态
function showLoadingState() {
    const tbody = document.getElementById('chart-list-body');
    const emptyState = document.getElementById('empty-state');

    emptyState.style.display = 'none';
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <div class="mt-2">正在加载图表数据...</div>
            </td>
        </tr>
    `;
}

// 显示错误状态
function showErrorState(message) {
    const tbody = document.getElementById('chart-list-body');
    const emptyState = document.getElementById('empty-state');

    emptyState.style.display = 'none';
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center py-4 text-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${message}
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadChartList()">
                    <i class="bi bi-arrow-clockwise me-1"></i>重试
                </button>
            </td>
        </tr>
    `;
}

// 重命名图表
function renameChart(chartId, currentName) {
    const newName = prompt('请输入新的图表名称：', currentName);

    if (newName === null || newName.trim() === '' || newName === currentName) {
        return; // 用户取消或名称未改变
    }

    // 显示加载状态
    const originalButton = event.target.closest('button');
    const originalHTML = originalButton.innerHTML;
    originalButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>重命名中...';
    originalButton.disabled = true;

    fetch(`/data/api/charts/${chartId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chart_name: newName.trim()
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 重命名成功后重新加载列表
                loadChartList();
                // 可选：显示成功提示
                showTempMessage('重命名成功！', 'success');
            } else {
                alert('重命名失败：' + data.msg);
                // 恢复按钮状态
                originalButton.innerHTML = originalHTML;
                originalButton.disabled = false;
            }
        })
        .catch(error => {
            console.error('重命名请求失败:', error);
            alert('网络请求失败，请检查连接');
            // 恢复按钮状态
            originalButton.innerHTML = originalHTML;
            originalButton.disabled = false;
        });
}

// 显示临时提示消息（可选功能）
function showTempMessage(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const alertElement = document.createElement('div');
    alertElement.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    alertElement.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertElement);

    // 3秒后自动消失
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.remove();
        }
    }, 3000);
}

// 预览图表功能
function previewChart(chartId) {
    // 重置弹窗状态
    resetPreviewModal();

    // 显示弹窗
    const modal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
    modal.show();

    // 显示加载状态
    document.getElementById('preview-loading').classList.remove('d-none');

    // 调用预览接口
    fetch(`/data/api/charts/${chartId}/img_pre_view`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayPreviewImage(data.data);
            } else {
                showPreviewError('获取预览失败: ' + data.msg);
            }
        })
        .catch(error => {
            console.error('预览请求失败:', error);
            showPreviewError('网络请求失败，请检查连接');
        });
}

// 重置预览弹窗状态
function resetPreviewModal() {
    document.getElementById('preview-loading').classList.add('d-none');
    document.getElementById('preview-content').classList.add('d-none');
    document.getElementById('preview-error').classList.add('d-none');

    // 清空图片和提示信息
    document.getElementById('preview-image').src = '';
    document.getElementById('preview-info').textContent = '';
    document.getElementById('error-message').textContent = '';
}

// 显示预览图片
function displayPreviewImage(imageData) {
    // 隐藏加载状态
    document.getElementById('preview-loading').classList.add('d-none');

    // 设置图片数据
    const imgElement = document.getElementById('preview-image');
    imgElement.src = 'data:' + imageData.mime_type + ';base64,' + imageData.base64_data;

    // 设置图片信息
    const infoElement = document.getElementById('preview-info');
    infoElement.textContent = `文件大小: ${(imageData.file_size / 1024).toFixed(2)} KB | 格式: ${imageData.mime_type}`;

    // 显示预览内容
    document.getElementById('preview-content').classList.remove('d-none');
}

// 显示预览错误
function showPreviewError(message) {
    document.getElementById('preview-loading').classList.add('d-none');
    document.getElementById('error-message').textContent = message;
    document.getElementById('preview-error').classList.remove('d-none');
}

// 删除图表功能
function deleteChart(chartId) {
    // 确认删除
    if (!confirm('确定要删除此图表吗？此操作不可恢复！')) {
        return;
    }

    // 显示加载状态
    const originalButton = event.target.closest('button');
    const originalHTML = originalButton.innerHTML;
    originalButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>删除中...';
    originalButton.disabled = true;

    // 发送 DELETE 请求
    fetch(`/data/api/charts/${chartId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 删除成功后刷新列表
                loadChartList();
                // 显示成功提示
                showTempMessage('图表删除成功！', 'success');
            } else {
                alert('删除失败: ' + data.msg);
                // 恢复按钮状态
                originalButton.innerHTML = originalHTML;
                originalButton.disabled = false;
            }
        })
        .catch(error => {
            console.error('删除请求失败:', error);
            alert('网络请求失败，请检查连接');
            // 恢复按钮状态
            originalButton.innerHTML = originalHTML;
            originalButton.disabled = false;
        });
}

// 下载图表
function downloadChart(chartId) {
    // 1. 显示加载状态（与删除操作一致）
    const originalButton = event.target.closest('button');
    const originalHTML = originalButton.innerHTML;
    originalButton.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>下载中...';
    originalButton.disabled = true;
    console.log("触发下载");
    // 2. 发送 GET 请求（与删除操作一致的 fetch 调用）
    fetch(`/data/api/charts/${chartId}/download`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            // 3. 处理响应（与删除操作一致的错误处理）
            if (!response.ok) {
                throw new Error(`下载失败: ${response.status}`);
            }

            // 4. 解析文件名（从 Content-Disposition 头获取）
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'chart_download.png';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.*?)"?$/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            // 5. 创建 Blob 并触发下载（关键处理）
            return response.blob().then(blob => {
                return {blob, filename};
            });
        })
        .then(({blob, filename}) => {
            // 6. 创建下载链接（与删除操作一致的 UI 交互）
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            // 7. 显示成功提示（与删除操作一致）
            showTempMessage('图表已下载！', 'success');
        })
        .catch(error => {
            console.error('下载失败:', error);
            alert('下载失败: ' + error.message);
        })
        .finally(() => {
            // 8. 恢复按钮状态（与删除操作一致）
            originalButton.innerHTML = originalHTML;
            originalButton.disabled = false;
        });
}

// 返回图表列表页面
function goBackToChartTable() {
    const projectId = document.body.dataset.projectId;
    window.location.href = `/data/projects/${projectId}/chart-table`;
}

/**
 * 创建图表弹窗逻辑
 */
// 存储选中的数据
// 存储选中的数据
let selectedData = {
    sheetId: null,
    tableId: null,
    tableName: null,
    xAxis: null,
    yAxis: [],
    category: null,
    chartName: null
};

// 页面初始化时获取项目对应的sheetId
let projectSheetId = null;

// 初始化项目sheet信息
function initProjectSheet() {
    const projectId = document.body.dataset.projectId;

    fetch(`/data/api/projects/${projectId}/sheet`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.data.length > 0) {
                // 获取第一个sheet的ID
                projectSheetId = data.data[0].id;
                console.log('项目对应的sheetId:', projectSheetId);
            } else {
                console.error('获取项目sheet信息失败:', data.msg);
                alert('无法获取项目的工作表信息');
            }
        })
        .catch(error => {
            console.error('请求项目sheet信息失败:', error);
            alert('网络请求失败，请检查连接');
        });
}

// 打开新建图表弹窗
function openCreateChartModal() {
    const modal = new bootstrap.Modal(document.getElementById('createChartModal'));
    modal.show();

    // 重置表单
    resetCreateChartForm();

    // 如果还没有获取sheetId，先初始化
    if (!projectSheetId) {
        initProjectSheet();
    }

    // 加载表格列表
    loadTablesList();
}

function resetCreateChartForm() {
    // 重置步骤
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';

    // 重置按钮
    document.getElementById('nextBtn').style.display = 'block';
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('generateBtn').style.display = 'none';

    // 重置选择
    document.getElementById('tableSelect').innerHTML = '<option value="">请选择表格</option>';

    // 重置选中数据
    selectedData = {
        sheetId: projectSheetId, // 使用项目对应的sheetId
        tableId: null,
        tableName: null,
        xAxis: null,
        yAxis: [],
        category: null,
        chartName: null
    };
}

// 加载工作表列表
function loadSheetsList() {
    const sheetId = document.body.dataset.sheetId; // 从页面获取sheet_id

    // 调用正确的接口获取工作表下的表格列表
    fetch(`/api/sheets/${sheetId}/tables`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("获取表格数据", data);
                const sheetSelect = document.getElementById('sheetSelect');
                sheetSelect.innerHTML = '<option value="">请选择表格</option>';

                // 解析表格数据
                data.data.forEach(table => {
                    const option = document.createElement('option');
                    option.value = table.id;
                    option.textContent = table.name || `表格 ${table.id}`;
                    sheetSelect.appendChild(option);
                });
            } else {
                console.error('加载表格列表失败:', data.msg);
                alert('加载表格列表失败: ' + data.msg);
            }
        })
        .catch(error => {
            console.error('请求表格列表失败:', error);
            alert('网络请求失败，请检查连接');
        });
}

// 加载表格列表
function loadTablesList() {
    if (!projectSheetId) {
        console.error('项目sheetId未初始化');
        alert('工作表信息加载中，请稍后重试');
        return;
    }

    fetch(`/data/api/sheets/${projectSheetId}/tables`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("获取表格数据", data);
                const tableSelect = document.getElementById('tableSelect');
                tableSelect.innerHTML = '<option value="">请选择表格</option>';

                // 解析表格数据
                data.data.forEach(table => {
                    const option = document.createElement('option');
                    option.value = table.id;
                    option.textContent = table.name || `表格 ${table.id}`;
                    tableSelect.appendChild(option);
                });

                // 如果有表格数据，自动选择第一个
                if (data.data.length > 0) {
                    const firstTable = data.data[0];
                    tableSelect.value = firstTable.id;
                    // 预加载表头信息
                    preloadTableHeaders(firstTable.id);
                }
            } else {
                console.error('加载表格列表失败:', data.msg);
                alert('加载表格列表失败: ' + data.msg);
            }
        })
        .catch(error => {
            console.error('请求表格列表失败:', error);
            alert('网络请求失败，请检查连接');
        });
}

// 预加载表头信息（用于显示表格基本信息）
function preloadTableHeaders(tableId) {
    fetch(`/data/api/tables/${tableId}/headers`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 更新表格基本信息显示
                document.getElementById('tableInfo').innerHTML = `
                    <strong>表格名称:</strong> ${data.data.table_name}<br>
                    <strong>列数量:</strong> ${data.data.total_headers}<br>
                    <strong>示例数据:</strong> 已加载 ${data.data.headers.length} 个表头
                `;
            }
        })
        .catch(error => {
            console.error('预加载表头信息失败:', error);
        });
}

// 监听表格选择变化
document.getElementById('tableSelect').addEventListener('change', function () {
    const tableId = this.value;
    if (tableId) {
        preloadTableHeaders(tableId);
    }
});


// 显示步骤2
function showStep2() {
    const tableId = document.getElementById('tableSelect').value;

    if (!tableId) {
        alert('请先选择表格');
        return;
    }

    // 更新选中的表格ID和名称
    selectedData.tableId = parseInt(tableId);
    const selectedOption = document.getElementById('tableSelect').options[document.getElementById('tableSelect').selectedIndex];
    selectedData.tableName = selectedOption.textContent;

    // 生成默认图表名称
    const defaultChartName = `${selectedData.tableName}_图表_${Date.now()}`;
    document.getElementById('chartNameInput').value = defaultChartName;
    selectedData.chartName = defaultChartName;

    // 加载详细表头信息
    loadHeaders(tableId);

    // 显示步骤2
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';

    // 更新按钮
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('prevBtn').style.display = 'block';
    document.getElementById('generateBtn').style.display = 'block';
}

// 显示步骤1
function showStep1() {
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';

    // 更新按钮
    document.getElementById('nextBtn').style.display = 'block';
    document.getElementById('prevBtn').style.display = 'none';
    document.getElementById('generateBtn').style.display = 'none';
}

// 加载详细表头信息
function loadHeaders(tableId) {
    fetch(`/data/api/tables/${tableId}/headers`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tbody = document.getElementById('headersTableBody');
                tbody.innerHTML = '';

                data.data.headers.forEach(header => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${header.name}</td>
                        <td><span class="badge bg-secondary">${header.type}</span></td>
                        <td><small class="text-muted">${header.sample_data.slice(0, 3).join(', ')}</small></td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="selectColumn('${header.name}', 'xAxis')" title="设为X轴">
                                    <i class="bi bi-graph-up"></i> X轴
                                </button>
                                <button class="btn btn-outline-success" onclick="selectColumn('${header.name}', 'yAxis')" title="设为Y轴">
                                    <i class="bi bi-graph-down"></i> Y轴
                                </button>
                                <button class="btn btn-outline-warning" onclick="selectColumn('${header.name}', 'category')" title="设为分类器">
                                    <i class="bi bi-tags"></i> 分类
                                </button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(row);
                });

                // 重置选择状态
                document.getElementById('selectedXAxis').textContent = '未选择';
                document.getElementById('selectedYAxis').innerHTML = '<div class="text-muted">未选择</div>';
                document.getElementById('selectedCategory').textContent = '未选择';

                selectedData.xAxis = null;
                selectedData.yAxis = [];
                selectedData.category = null;
            } else {
                console.error('加载表头失败:', data.msg);
                alert('加载表头失败: ' + data.msg);
            }
        })
        .catch(error => {
            console.error('请求表头失败:', error);
            alert('网络请求失败，请检查连接');
        });
}

// 选择列
function selectColumn(columnName, type) {
    switch (type) {
        case 'xAxis':
            selectedData.xAxis = columnName;
            document.getElementById('selectedXAxis').textContent = columnName;
            break;
        case 'yAxis':
            if (!selectedData.yAxis.includes(columnName)) {
                selectedData.yAxis.push(columnName);
                updateYAxisDisplay();
            }
            break;
        case 'category':
            selectedData.category = columnName;
            document.getElementById('selectedCategory').textContent = columnName;
            break;
    }
}

// 更新Y轴显示
function updateYAxisDisplay() {
    const yAxisDiv = document.getElementById('selectedYAxis');
    yAxisDiv.innerHTML = '';

    if (selectedData.yAxis.length > 0) {
        selectedData.yAxis.forEach(yAxis => {
            const yAxisItem = document.createElement('div');
            yAxisItem.className = 'y-axis-item';
            yAxisItem.innerHTML = `
                <span class="badge bg-success me-1">${yAxis}</span>
                <button class="btn btn-sm btn-outline-danger" onclick="removeYAxis('${yAxis}')" title="移除">
                    <i class="bi bi-x"></i>
                </button>
            `;
            yAxisDiv.appendChild(yAxisItem);
        });
    } else {
        yAxisDiv.innerHTML = '<div class="text-muted">未选择</div>';
    }
}

// 移除Y轴选择
function removeYAxis(columnName) {
    selectedData.yAxis = selectedData.yAxis.filter(item => item !== columnName);
    updateYAxisDisplay();
}

// 监听图表名称输入
document.getElementById('chartNameInput').addEventListener('input', function () {
    selectedData.chartName = this.value;
});

// 生成图表
function generateChart() {
    // 验证必填项
    if (!selectedData.xAxis) {
        alert('请选择X轴');
        return;
    }

    if (selectedData.yAxis.length === 0) {
        alert('请至少选择一个Y轴');
        return;
    }

    if (!selectedData.chartName) {
        alert('请输入图表名称');
        return;
    }

    // 准备发送数据
    const requestData = {
        project_id: parseInt(document.body.dataset.projectId),
        chart_type_id: parseInt(document.body.dataset.chartTypeId),
        sheet_id: selectedData.sheetId,
        table_id: selectedData.tableId,
        x_axis: selectedData.xAxis,
        y_axis: selectedData.yAxis,
        category: selectedData.category || null,
        chart_name: selectedData.chartName
    };

    console.log('发送图表生成请求:', requestData);

    // 显示生成中状态
    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>生成中...';
    generateBtn.disabled = true;

    // 发送请求
    fetch('/data/api/charts/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('图表生成接口返回数据:', data);

            if (data.success) {
                // 图表生成成功处理
                handleChartGenerationSuccess(data);
            } else {
                // 图表生成失败
                throw new Error(data.msg || '图表生成失败');
            }
        })
        .catch(error => {
            console.error('生成图表失败:', error);
            handleChartGenerationError(error);
        })
        .finally(() => {
            // 恢复按钮状态
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        });
}

// 图表生成成功处理函数
function handleChartGenerationSuccess(responseData) {
    const chartData = responseData.data.chart;

    // 显示成功消息
    showTempMessage('图表生成成功！', 'success');

    // 可选：在控制台输出详细信息
    console.log('图表生成成功详情:', {
        id: chartData.id,
        name: chartData.name,
        type: chartData.type,
        createTime: chartData.create_time,
        filePath: chartData.file_path
    });

    // 关闭弹窗
    const modal = bootstrap.Modal.getInstance(document.getElementById('createChartModal'));
    if (modal) {
        modal.hide();
    }

    // 重新加载图表列表
    loadChartList();

    // 可选：自动跳转到图表详情页或显示预览
    // setTimeout(() => {
    //     previewChart(chartData.id);
    // }, 1000);
}

// 图表生成失败处理函数
function handleChartGenerationError(error) {
    let errorMessage = '图表生成失败';

    if (error.message.includes('HTTP错误')) {
        errorMessage = '网络请求失败，请检查服务器连接';
    } else if (error.message.includes('图表生成失败')) {
        errorMessage = error.message;
    } else {
        errorMessage = `生成过程中出现错误: ${error.message}`;
    }

    alert(errorMessage);

    // 可选：显示错误提示
    showTempMessage(errorMessage, 'error');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    // 初始化项目sheet信息
    initProjectSheet();
    // 加载图表列表
    loadChartList();
});