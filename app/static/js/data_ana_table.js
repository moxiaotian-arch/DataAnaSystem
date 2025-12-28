// data_ana_table.js

// 全局变量
let analysisTypes = [];
let currentAnalysisList = [];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadAnalysisTypes();
});

// 加载数据分析类型
async function loadAnalysisTypes() {
    try {
        const response = await fetch('/data/api/projects/data_ana_types');
        const result = await response.json();

        if (result.success) {
            analysisTypes = result.data;
            renderAnalysisTypes();
            updateAnalysisCount();
        } else {
            showError('加载数据分析类型失败: ' + result.msg);
        }
    } catch (error) {
        console.error('加载数据分析类型失败:', error);
        showError('加载数据分析类型失败，请检查网络连接');
    }
}

// 渲染数据分析类型网格
function renderAnalysisTypes() {
    const grid = document.getElementById('analysis-types-grid');
    const emptyMessage = document.getElementById('empty-analysis-message');

    if (analysisTypes.length === 0) {
        grid.style.display = 'none';
        emptyMessage.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    emptyMessage.style.display = 'none';

    grid.innerHTML = analysisTypes.map(type => `
        <div class="analysis-type-card" onclick="showAnalysisList(${type.id})">
            <div class="analysis-type-icon">
                <i class="bi bi-graph-up"></i>
            </div>
            <div class="analysis-type-content">
                <h6 class="analysis-type-title">${type.type_name}</h6>
                <p class="analysis-type-desc">${type.description}</p>
                <div class="analysis-type-meta">
                    <span class="analysis-count">0个分析</span>
                    <span class="analysis-date">${type.create_time}</span>
                </div>
            </div>
            <div class="analysis-type-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); createNewAnalysis(${type.id})">
                    <i class="bi bi-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 更新分析总数
function updateAnalysisCount() {
    const countElement = document.getElementById('analysis-count');
    if (countElement) {
        countElement.textContent = analysisTypes.length;
    }
}

// 显示分析类型下的分析列表
async function showAnalysisList(typeId) {
    const type = analysisTypes.find(t => t.id === typeId);
    if (!type) return;

    try {
        // 这里需要根据实际接口调整URL
        const response = await fetch(`/data/api/projects/${window.currentProjectId}/analysis?type_id=${typeId}`);
        const result = await response.json();

        if (result.success) {
            currentAnalysisList = result.data || [];
            showAnalysisModal(type, currentAnalysisList);
        } else {
            showError('加载分析列表失败: ' + result.msg);
        }
    } catch (error) {
        console.error('加载分析列表失败:', error);
        // 如果没有对应的接口，显示空列表
        currentAnalysisList = [];
        showAnalysisModal(type, currentAnalysisList);
    }
}

// 显示分析模态框
function showAnalysisModal(type, analysisList) {
    const modalLabel = document.getElementById('analysisTypeModalLabel');
    const listBody = document.getElementById('analysis-list-body');

    modalLabel.textContent = `${type.type_name} - 分析模型列表`;

    if (analysisList.length === 0) {
        listBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <p class="mt-2">暂无分析模型</p>
                </td>
            </tr>
        `;
    } else {
        listBody.innerHTML = analysisList.map(analysis => `
            <tr>
                <td>${analysis.name || '未命名分析'}</td>
                <td>${type.type_name}</td>
                <td>${analysis.file_path || '未保存'}</td>
                <td>${analysis.create_time || '未知时间'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="previewAnalysis(${analysis.id})">
                        <i class="bi bi-eye"></i> 预览
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAnalysis(${analysis.id})">
                        <i class="bi bi-trash"></i> 删除
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('analysisTypeModal'));
    modal.show();
}

// 预览分析
async function previewAnalysis(analysisId) {
    try {
        // 这里需要根据实际接口调整URL
        const response = await fetch(`/data/api/analysis/${analysisId}/preview`);
        const result = await response.json();

        if (result.success) {
            showPreviewModal(result.data);
        } else {
            showError('预览分析失败: ' + result.msg);
        }
    } catch (error) {
        console.error('预览分析失败:', error);
        showError('预览分析失败，请检查网络连接');
    }
}

// 显示预览模态框
function showPreviewModal(previewData) {
    const previewContent = document.getElementById('analysis-preview-content');

    // 根据实际返回的数据结构调整显示内容
    if (previewData.base64_data) {
        previewContent.innerHTML = `
            <div class="text-center">
                
                <div class="mt-3">
                    <p><strong>文件路径:</strong> ${previewData.file_path}</p>
                    <p><strong>文件大小:</strong> ${(previewData.file_size / 1024).toFixed(2)} KB</p>
                </div>
            </div>
        `;
    } else {
        previewContent.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> 暂无预览数据
            </div>
        `;
    }

    const modal = new bootstrap.Modal(document.getElementById('analysisPreviewModal'));
    modal.show();
}

// 创建新分析
function createNewAnalysis(typeId) {
    const type = analysisTypes.find(t => t.id === typeId);
    if (!type) return;

    // 这里可以打开创建分析的模态框或跳转到创建页面
    alert(`开始创建 ${type.type_name} 类型的分析`);
    // 实际实现中，这里应该显示一个创建分析的模态框或跳转到创建页面
}

// 删除分析
async function deleteAnalysis(analysisId) {
    if (!confirm('确定要删除这个分析吗？此操作不可撤销。')) {
        return;
    }

    try {
        const response = await fetch(`/data/api/analysis/${analysisId}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (result.success) {
            showSuccess('分析删除成功');
            // 刷新当前分析列表
            const currentType = analysisTypes.find(t =>
                currentAnalysisList.some(a => a.id === analysisId)
            );
            if (currentType) {
                showAnalysisList(currentType.id);
            }
        } else {
            showError('删除分析失败: ' + result.msg);
        }
    } catch (error) {
        console.error('删除分析失败:', error);
        showError('删除分析失败，请检查网络连接');
    }
}

// 刷新数据
function refreshAnalysisData() {
    loadAnalysisTypes();
    showSuccess('数据已刷新');
}

// 导入分析数据
function importAnalysisData() {
    // 实现导入功能
    alert('导入分析数据功能');
}

// 导出所有分析
function exportAllAnalysis() {
    // 实现导出功能
    alert('导出所有分析功能');
}

// 下载当前分析
function downloadCurrentAnalysis() {
    // 实现下载功能
    alert('下载当前分析功能');
}

// 显示成功消息
function showSuccess(message) {
    // 可以使用Toast或其他UI组件
    alert('成功: ' + message);
}

// 显示错误消息
function showError(message) {
    // 可以使用Toast或其他UI组件
    alert('错误: ' + message);
}

// 新建文件夹（如果需要）
function createAnalysisFolder() {
    alert('新建文件夹功能');
}

// 显示创建分析模态框（如果需要）
function showCreateAnalysisModal() {
    alert('显示创建分析模态框');
}