// 图表详情页面JavaScript功能实现
class ChartTableDetail {
    constructor() {
        this.currentPage = 1;
        this.perPage = 10;
        this.totalPages = 0;
        this.totalCharts = 0;
        this.projectId = document.body.dataset.projectId;
        this.chartTypeId = document.body.dataset.chartTypeId;
        this.chartTypeName = document.body.dataset.chartTypeName;

        this.currentImageUrl = null;

        this.init();
    }

    init() {
        console.log('图表详情页面初始化');
        console.log(`项目ID: ${this.projectId}, 图表类型ID: ${this.chartTypeId}, 图表类型名称: ${this.chartTypeName}`);

        // 页面加载时自动刷新图表列表
        this.refreshChartList();
    }

    // 获取图表数据
    async get_charts_by_charts_type() {
        try {
            console.log(`开始获取图表数据，图表类型ID: ${this.chartTypeId}, 页码: ${this.currentPage}`);

            const response = await fetch(`/data/api/chart-types/${this.chartTypeId}/charts/paginated?page=${this.currentPage}&per_page=${this.perPage}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                console.log('获取图表数据成功', result);
                return result;
            } else {
                throw new Error(result.message || '获取图表数据失败');
            }
        } catch (error) {
            console.error('获取图表数据时发生错误:', error);
            this.showError('获取图表数据失败: ' + error.message);
            return null;
        }
    }

    // 渲染图表数据
    async render_charts_by_charts_data() {
        console.log('开始渲染图表数据');

        const result = await this.get_charts_by_charts_type();

        if (!result) {
            this.showEmptyState();
            return;
        }

        const charts = result.charts || [];
        const pagination = result.pagination || {};

        this.totalPages = pagination.total_pages || 0;
        this.totalCharts = pagination.total_charts || 0;

        // 更新图表总数显示
        this.updateChartCount(this.totalCharts);

        if (charts.length === 0) {
            this.showEmptyState();
            return;
        }

        this.renderChartTable(charts);
        this.renderPagination(pagination);
    }

    // 渲染图表表格
    renderChartTable(charts) {
        const tbody = document.getElementById('chart-list-body');
        if (!tbody) {
            console.error('未找到图表列表tbody元素');
            return;
        }

        tbody.innerHTML = '';

        charts.forEach(chart => {
            const row = this.createChartTableRow(chart);
            tbody.appendChild(row);
        });

        console.log(`成功渲染 ${charts.length} 个图表`);
    }

    // 创建图表表格行
    createChartTableRow(chart) {
        const tr = document.createElement('tr');

        tr.innerHTML = `
    <td>${chart.id || '-'}</td>
    <td>${this.escapeHtml(chart.name || '未命名')}</td>
    <td>${this.escapeHtml(chart.path || '未设置路径')}</td>
    <td>${chart.create_time || '-'}</td>
    <td>
        <div class="chart-detail-actions">
            <button class="btn btn-primary btn-sm chart-detail-preview-btn" 
                    onclick="chartTableDetail.previewChart(${chart.id})"
                    title="预览图表">
                <i class="bi bi-eye me-1"></i>预览
            </button>
            <button class="btn btn-success btn-sm chart-detail-download-btn" 
                    onclick="chartTableDetail.downloadChartFromList(${chart.id})"
                    title="下载图表">
                <i class="bi bi-download me-1"></i>下载
            </button>
        </div>
    </td>
    `;

        return tr;
    }

    // 渲染分页控件
    renderPagination(pagination) {
        const container = document.getElementById('pagination-container');
        if (!container) {
            console.error('未找到分页容器元素');
            return;
        }

        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const currentPage = pagination.current_page || 1;
        const hasPrev = pagination.has_prev || false;
        const hasNext = pagination.has_next || false;
        const prevNum = pagination.prev_num || 0;
        const nextNum = pagination.next_num || 0;

        let paginationHtml = `
            <nav aria-label="图表分页">
                <ul class="pagination chart-detail-pagination">
        `;

        // 上一页按钮
        if (hasPrev) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="javascript:void(0)" onclick="chartTableDetail.goToPage(${prevNum})" aria-label="上一页">
                        <span aria-hidden="true">&laquo;</span>
                    </a>
                </li>
            `;
        } else {
            paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link" aria-hidden="true">&laquo;</span>
                </li>
            `;
        }

        // 页码按钮
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(this.totalPages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                paginationHtml += `
                    <li class="page-item active">
                        <span class="page-link">${i}</span>
                    </li>
                `;
            } else {
                paginationHtml += `
                    <li class="page-item">
                        <a class="page-link" href="javascript:void(0)" onclick="chartTableDetail.goToPage(${i})">${i}</a>
                    </li>
                `;
            }
        }

        // 下一页按钮
        if (hasNext) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="javascript:void(0)" onclick="chartTableDetail.goToPage(${nextNum})" aria-label="下一页">
                        <span aria-hidden="true">&raquo;</span>
                    </a>
                </li>
            `;
        } else {
            paginationHtml += `
                <li class="page-item disabled">
                    <span class="page-link" aria-hidden="true">&raquo;</span>
                </li>
            `;
        }

        paginationHtml += `
                </ul>
            </nav>
        `;

        container.innerHTML = paginationHtml;
    }

    // 显示空状态
    showEmptyState() {
        const tbody = document.getElementById('chart-list-body');
        const container = document.getElementById('pagination-container');

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <div class="chart-detail-empty-state">
                            <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.5;"></i>
                            <p class="mt-3 mb-0">暂无图表数据</p>
                            <small class="text-muted">当前图表类型下还没有创建任何图表</small>
                        </div>
                    </td>
                </tr>
            `;
        }

        if (container) {
            container.innerHTML = '';
        }

        this.updateChartCount(0);
    }

    // 更新图表总数显示
    updateChartCount(count) {
        const countElement = document.getElementById('chart-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    // 跳转到指定页码
    goToPage(page) {
        if (page < 1 || page > this.totalPages) {
            return;
        }

        this.currentPage = page;
        this.refreshChartList();
    }

    // 刷新图表列表
    async refresh_charts_by_charts_data() {
        console.log('刷新图表列表');

        // 显示加载状态
        this.showLoadingState();

        try {
            await this.render_charts_by_charts_data();
        } catch (error) {
            console.error('刷新图表列表时发生错误:', error);
            this.showError('刷新图表列表失败: ' + error.message);
        }
    }

    // 显示加载状态
    showLoadingState() {
        const tbody = document.getElementById('chart-list-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <div class="d-flex justify-content-center align-items-center">
                            <div class="chart-detail-loading-spinner me-2"></div>
                            <span>加载中...</span>
                        </div>
                    </td>
                </tr>
            `;
        }

        const container = document.getElementById('pagination-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    // 显示错误信息
    showError(message) {
        const tbody = document.getElementById('chart-list-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <div class="alert alert-danger mb-0">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            ${this.escapeHtml(message)}
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    // HTML转义
    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') return unsafe;
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 公共方法：刷新图表列表
    refreshChartList() {
        this.refresh_charts_by_charts_data();
    }

    /**
     * 预览图表
     */
    async previewChart(chartId) {
        console.log(`开始预览图表: ${chartId}`);

        try {
            // 先清理之前的图片资源
            this.cleanupImageUrl();

            // 显示预览模态框
            this.showPreviewModal(chartId);

            // 加载图表图片
            await this.loadChartImage(chartId);

        } catch (error) {
            console.error('预览图表时发生错误:', error);
            this.showPreviewError('加载图表失败: ' + error.message);
        }
    }


    // 显示预览模态框
    showPreviewModal(chartId) {
        // 创建或显示预览模态框
        let modal = document.getElementById('chartPreviewModal');

        if (!modal) {
            // 如果模态框不存在，创建它
            modal = this.createPreviewModal();
            document.body.appendChild(modal);
        }

        // 显示模态框
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // 存储当前预览的图表ID
        modal.dataset.currentChartId = chartId;

        // 显示加载状态
        this.showPreviewLoading();

        // 更新图表信息
        this.updatePreviewInfo(chartId);
    }

    // 创建预览模态框
    createPreviewModal() {
        const modal = document.createElement('div');
        modal.className = 'modal fade chart-preview-modal';
        modal.id = 'chartPreviewModal';
        modal.tabIndex = -1;
        modal.setAttribute('aria-labelledby', 'chartPreviewModalLabel');
        modal.setAttribute('aria-hidden', 'true');

        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="chartPreviewModalLabel">
                            <i class="bi bi-eye me-2"></i>图表预览
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- 图表信息 -->
                        <div class="chart-preview-info">
                            <div class="chart-preview-info-row">
                                <span class="chart-preview-info-label">图表ID:</span>
                                <span class="chart-preview-info-value" id="previewChartId">-</span>
                            </div>
                            <div class="chart-preview-info-row">
                                <span class="chart-preview-info-label">图表名称:</span>
                                <span class="chart-preview-info-value" id="previewChartName">-</span>
                            </div>
                            <div class="chart-preview-info-row">
                                <span class="chart-preview-info-label">创建时间:</span>
                                <span class="chart-preview-info-value" id="previewChartTime">-</span>
                            </div>
                        </div>
                        
                        <!-- 图片预览区域 -->
                        <div class="chart-preview-image-container">
                            <div class="chart-preview-loading" id="previewLoading">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">加载中...</span>
                                </div>
                                <div class="mt-2">正在加载图表图片...</div>
                            </div>
                            
                            <div class="chart-preview-error" id="previewError" style="display: none;">
                                <i class="bi bi-exclamation-triangle text-danger" style="font-size: 2rem;"></i>
                                <div class="mt-2" id="previewErrorMessage">图片加载失败</div>
                                <button class="btn btn-sm btn-outline-primary mt-2" onclick="chartTableDetail.retryPreview()">
                                    <i class="bi bi-arrow-clockwise me-1"></i>重试加载
                                </button>
                            </div>
                            <!-- 图片元素将通过JavaScript动态创建 -->
                        </div>
                        
                        <!-- 控制工具栏 -->
                        <div class="chart-preview-controls">
                            <div class="chart-preview-zoom-controls">
                                <button class="btn btn-outline-secondary btn-preview-action" 
                                        onclick="chartTableDetail.zoomOut()" title="缩小">
                                    <i class="bi bi-dash-lg"></i>
                                </button>
                                <span class="chart-preview-zoom-level" id="zoomLevel">100%</span>
                                <button class="btn btn-outline-secondary btn-preview-action" 
                                        onclick="chartTableDetail.zoomIn()" title="放大">
                                    <i class="bi bi-plus-lg"></i>
                                </button>
                            </div>
                            
                            <button class="btn btn-outline-secondary btn-preview-action" 
                                    onclick="chartTableDetail.resetZoom()" title="重置缩放">
                                <i class="bi bi-arrow-counterclockwise"></i>
                            </button>
                            
                            <button class="btn btn-outline-primary"
        onclick="chartTableDetail.downloadCurrentPreviewChart()" title="下载图片">
    <i class="bi bi-download me-1"></i>下载
</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                    </div>
                </div>
            </div>
        `;

        // 添加模态框关闭事件监听
        modal.addEventListener('hidden.bs.modal', () => {
            this.cleanupImageUrl();
        });

        return modal;
    }

    // 加载图表图片
    async loadChartImage(chartId) {
        console.log(`加载图表图片: ${chartId}`);

        try {
            // 调用预览API获取图片
            const response = await fetch(`/data/api/charts/${chartId}/preview`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 由于后端直接返回图片流，我们需要创建Blob URL
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            this.displayChartImage(imageUrl);

            // 存储blob URL以便后续清理
            this.currentImageUrl = imageUrl;

        } catch (error) {
            console.error('加载图表图片时发生错误:', error);
            this.showPreviewError('加载图表图片失败: ' + error.message);
        }
    }

    // 显示图表图片
    displayChartImage(imageUrl) {
        const loadingElement = document.getElementById('previewLoading');
        const errorElement = document.getElementById('previewError');

        // 确保图片元素存在
        let imageElement = document.getElementById('previewImage');
        if (!imageElement) {
            // 如果图片元素不存在，创建它
            const container = document.querySelector('.chart-preview-image-container');
            imageElement = document.createElement('img');
            imageElement.id = 'previewImage';
            imageElement.className = 'chart-preview-image';
            imageElement.style.display = 'none';
            container.appendChild(imageElement);
        }

        if (loadingElement) loadingElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';

        if (imageElement) {
            imageElement.src = imageUrl;
            imageElement.style.display = 'block';
            imageElement.onload = () => {
                console.log('图表图片加载完成');
                // 重置缩放和位置
                this.resetZoom();
            };
            imageElement.onerror = () => {
                this.showPreviewError('图片加载失败，请检查图片URL是否正确');
            };
        }
    }

    // 清理图片URL
    cleanupImageUrl() {
        if (this.currentImageUrl) {
            URL.revokeObjectURL(this.currentImageUrl);
            this.currentImageUrl = null;
        }
    }

    // 显示加载状态
    showPreviewLoading() {
        const loadingElement = document.getElementById('previewLoading');
        const errorElement = document.getElementById('previewError');
        const imageElement = document.getElementById('previewImage');

        if (loadingElement) loadingElement.style.display = 'flex';
        if (errorElement) errorElement.style.display = 'none';
        if (imageElement) imageElement.style.display = 'none';
    }

    // 显示错误状态
    showPreviewError(message) {
        const loadingElement = document.getElementById('previewLoading');
        const errorElement = document.getElementById('previewError');
        const imageElement = document.getElementById('previewImage');
        const errorMessageElement = document.getElementById('previewErrorMessage');

        if (loadingElement) loadingElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'flex';
        if (imageElement) imageElement.style.display = 'none';
        if (errorMessageElement) errorMessageElement.textContent = message;
    }

    // 更新预览信息
    updatePreviewInfo(chartId) {
        // 这里可以根据需要从图表数据中获取更多信息
        document.getElementById('previewChartId').textContent = chartId;
        document.getElementById('previewChartName').textContent = '正在加载...';
        document.getElementById('previewChartTime').textContent = '正在加载...';

        // 可以添加额外的API调用来获取图表详细信息
    }

    // 缩放功能
    zoomIn() {
        this.adjustZoom(1.2);
    }

    zoomOut() {
        this.adjustZoom(0.8);
    }

    resetZoom() {
        const imageElement = document.getElementById('previewImage');
        const zoomLevelElement = document.getElementById('zoomLevel');

        if (imageElement) {
            imageElement.style.transform = 'scale(1)';
            imageElement.style.transformOrigin = 'center center';
        }
        if (zoomLevelElement) {
            zoomLevelElement.textContent = '100%';
        }
    }

    adjustZoom(factor) {
        const imageElement = document.getElementById('previewImage');
        const zoomLevelElement = document.getElementById('zoomLevel');

        if (imageElement) {
            const currentTransform = imageElement.style.transform;
            let currentScale = 1;

            if (currentTransform) {
                const match = currentTransform.match(/scale\(([^)]+)\)/);
                if (match) {
                    currentScale = parseFloat(match[1]);
                }
            }

            const newScale = currentScale * factor;
            imageElement.style.transform = `scale(${newScale})`;
            imageElement.style.transformOrigin = 'center center';

            if (zoomLevelElement) {
                zoomLevelElement.textContent = `${Math.round(newScale * 100)}%`;
            }
        }
    }

    // 下载图表
    downloadChart() {
        const imageElement = document.getElementById('previewImage');
        if (imageElement && imageElement.src) {
            const link = document.createElement('a');
            link.href = imageElement.src;
            link.download = `chart-${document.getElementById('previewChartId').textContent}.png`;
            link.click();
        } else {
            this.showPreviewError('无法下载，图片未加载完成');
        }
    }

    // 重试预览
    retryPreview() {
        const modal = document.getElementById('chartPreviewModal');
        if (modal && modal.dataset.currentChartId) {
            this.previewChart(parseInt(modal.dataset.currentChartId));
        }
    }

    /**
     * 下载图表
     */
    async downloadChartFile(chartId) {
        try {
            console.log(`开始下载图表: ${chartId}`);

            // 显示下载中状态
            this.showDownloadState(chartId, true);

            // 调用后端下载接口
            const response = await fetch(`/data/api/charts/${chartId}/download`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 处理文件下载
            const blob = await response.blob();
            this.handleFileDownload(blob, chartId, response); // 传递response参数

        } catch (error) {
            console.error('下载图表时发生错误:', error);
            this.showDownloadError('下载失败: ' + error.message);
        } finally {
            // 隐藏下载中状态
            this.showDownloadState(chartId, false);
        }
    }

    downloadChartFromList(chartId) {
        console.log(`从列表下载图表: ${chartId}`);
        this.downloadChartFile(chartId);
    }

    // 修改函数定义：
    handleFileDownload(blob, chartId, response) {
        try {
            // 创建Blob URL
            const blobUrl = URL.createObjectURL(blob);

            // 创建下载链接
            const link = document.createElement('a');
            link.href = blobUrl;

            // 从响应头获取文件名，如果没有则使用默认名称
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `chart-${chartId}.png`;

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            link.download = filename;
            link.style.display = 'none';

            // 添加到文档并触发点击
            document.body.appendChild(link);
            link.click();

            // 清理
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);

            console.log(`图表下载成功: ${filename}`);
            this.showDownloadSuccess('下载成功！');

        } catch (error) {
            console.error('处理文件下载时发生错误:', error);
            this.showDownloadError('文件处理失败: ' + error.message);
        }
    }

    showDownloadState(chartId, isLoading) {
        const downloadBtn = document.querySelector(`button[onclick="chartTableDetail.downloadChartFromList(${chartId})"]`);
        if (downloadBtn) {
            if (isLoading) {
                downloadBtn.disabled = true;
                downloadBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>下载中...';
                downloadBtn.classList.add('disabled');
            } else {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = '<i class="bi bi-download me-1"></i>下载';
                downloadBtn.classList.remove('disabled');
            }
        }
    }

    showDownloadSuccess(message) {
        this.showToast(message, 'success');
    }

    showDownloadError(message) {
        this.showToast(message, 'error');
        console.error('下载错误:', message);
    }

    showToast(message, type = 'info') {
        // 创建或获取Toast容器
        let toastContainer = document.getElementById('chart-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'chart-toast-container';
            toastContainer.className = 'chart-toast-container';
            document.body.appendChild(toastContainer);
        }

        // 创建Toast元素
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `chart-toast chart-toast-${type}`;
        toast.innerHTML = `
        <div class="chart-toast-content">
            <span class="chart-toast-message">${this.escapeHtml(message)}</span>
            <button class="chart-toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;

        toastContainer.appendChild(toast);

        // 自动移除
        setTimeout(() => {
            const toastElement = document.getElementById(toastId);
            if (toastElement) {
                toastElement.remove();
            }
        }, 3000);
    }

    downloadCurrentPreviewChart() {
        const modal = document.getElementById('chartPreviewModal');
        if (modal && modal.dataset.currentChartId) {
            const chartId = parseInt(modal.dataset.currentChartId);
            this.downloadChartFile(chartId);
        } else {
            this.showDownloadError('未找到当前预览的图表ID');
        }
    }
}

// 全局函数：返回图表列表
function

goBackToChartTable() {
    const projectId = document.body.dataset.projectId;
    window.location.href = `/data/projects/${projectId}/chart-table`;
}

// 页面加载完成后初始化
document
    .addEventListener(
        'DOMContentLoaded'
        ,

        function () {
            console.log('DOM内容加载完成，初始化图表详情页面');

            // 创建全局图表详情实例
            window.chartTableDetail = new ChartTableDetail();

            // 绑定刷新按钮事件
            const refreshBtn = document.querySelector('button[onclick*="refreshChartList"]');
            if (refreshBtn) {
                refreshBtn.onclick = function () {
                    if (window.chartTableDetail) {
                        window.chartTableDetail.refreshChartList();
                    }
                };
            }
        }
    )
;

function

render_charts_by_charts_data() {
    if (window.chartTableDetail) {
        window.chartTableDetail.render_charts_by_charts_data();
    }
}

function

get_charts_by_charts_type() {
    if (window.chartTableDetail) {
        return window.chartTableDetail.get_charts_by_charts_type();
    }
    return Promise.resolve(null);
}

// 在全局函数部分添加预览相关函数
function

previewChart(chartId) {
    if (window.chartTableDetail) {
        window.chartTableDetail.previewChart(chartId);
    }
}

// 在全局函数部分添加下载相关函数
function downloadChartFromList(chartId) {
    if (window.chartTableDetail) {
        window.chartTableDetail.downloadChartFromList(chartId);
    }
}

function downloadCurrentPreviewChart() {
    if (window.chartTableDetail) {
        window.chartTableDetail.downloadCurrentPreviewChart();
    }
}