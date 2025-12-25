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

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    loadChartList();
});