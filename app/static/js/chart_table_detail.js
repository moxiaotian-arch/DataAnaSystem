// 图表详情页面JavaScript功能
class ChartTableDetail {
    constructor() {
        this.projectId = document.body.dataset.projectId;
        this.chartTypeId = document.body.dataset.chartTypeId;
        this.chartTypeName = document.body.dataset.chartTypeName;
        this.currentPage = 1;
        this.perPage = 10;
        this.totalCharts = 0;
        this.isInitialized = false;

        // 新增预览相关属性
        this.currentPreviewChartId = null;
        this.previewModal = null;
        this.currentZoom = 1; // 初始化缩放级别

        console.log('图表详情页面初始化:', {
            projectId: this.projectId,
            chartTypeId: this.chartTypeId,
            chartTypeName: this.chartTypeName
        });

        this.waitForDOMReady().then(() => this.init());
    }

    waitForDOMReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    init() {
        this.checkRequiredElements();
        this.bindEvents();
        this.loadChartData();
    }

    checkRequiredElements() {
        const requiredElements = ['chartConfigModal', 'chart-list-body', 'pagination-container'];

        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`未找到必需的元素: #${id}`);
            } else {
                console.log(`找到元素: #${id}`, element);
            }
        });

        this.isInitialized = true;
    }

    bindEvents() {
        // 绑定刷新按钮事件
        const refreshBtn = document.querySelector('button[onclick="refreshChartList()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshChartList());
        }

        // 绑定新建图表按钮事件
        const createBtn = document.querySelector('button[onclick="showCreateChartModal()"]');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateChartModal());
        }

        // 绑定返回按钮事件
        const backBtn = document.querySelector('button[onclick="goBackToChartTable()"]');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.goBackToChartTable());
        }

        // 修改确认按钮的事件绑定 - 使用事件委托
        document.addEventListener('click', (event) => {
            if (event.target.id === 'confirm-chart-config') {
                console.log('确认按钮被点击');
                this.confirmChartConfig();
            }
        });
    }

    // 加载图表数据
    async loadChartData(page = 1) {
        try {
            this.showLoading();
            this.currentPage = page;

            const response = await fetch(`/data/api/chart-types/${this.chartTypeId}/charts/paginated?page=${page}&per_page=${this.perPage}`);
            const result = await response.json();

            if (result.success) {
                this.renderChartList(result);
                this.updateChartCount(result.pagination.total_charts);
            } else {
                this.showError('加载图表数据失败: ' + result.message);
            }
        } catch (error) {
            console.error('加载图表数据时发生错误:', error);
            this.showError('网络错误，请检查连接后重试');
        }
    }

    // 渲染图表列表
    renderChartList(data) {
        const tbody = document.getElementById('chart-list-body');
        const paginationContainer = document.getElementById('pagination-container');
        const tableHead = document.querySelector('.chart-detail-table-responsive thead');

        if (!tbody) {
            console.error('未找到图表列表tbody元素');
            return;
        }

        // 清空现有内容
        tbody.innerHTML = '';

        if (!data.charts || data.charts.length === 0) {
            // 无数据情况
            this.showNoDataMessage(tbody);
            if (tableHead) tableHead.style.display = 'none';
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        // 有数据情况
        if (tableHead) tableHead.style.display = 'table-header-group';

        // 渲染图表数据行
        data.charts.forEach((chart, index) => {
            const row = this.createChartRow(chart, index);
            tbody.appendChild(row);
        });

        // 渲染分页控件
        this.renderPagination(data.pagination, paginationContainer);
    }

    // 创建图表数据行
    createChartRow(chart, index) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${chart.id || index + 1}</td>
            <td>
                <div class="chart-name-cell">
                    <i class="bi bi-bar-chart-fill text-primary me-2"></i>
                    <span class="chart-name">${this.escapeHtml(chart.name)}</span>
                </div>
            </td>
            <td>
                <div class="chart-path-cell">
                    <span class="text-muted small">${this.escapeHtml(chart.path)}</span>
                </div>
            </td>
            <td>
                <span class="text-muted small">${chart.create_time}</span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="chartTableDetail.previewChart(${chart.id})" title="预览">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" onclick="chartTableDetail.editChart(${chart.id})" title="编辑">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="chartTableDetail.deleteChart(${chart.id})" title="删除">
                        <i class="bi bi-trash"></i>
                    </button>
                    <button class="btn btn-outline-success" onclick="chartTableDetail.exportChart(${chart.id})" title="导出">
                        <i class="bi bi-download"></i>
                    </button>
                </div>
            </td>
        `;
        return row;
    }

    // 显示无数据消息
    showNoDataMessage(tbody) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <!-- 无数据消息部分 -->
            <td colspan="5" class="text-center py-5">
    <div class="no-data-message">
        <i class="bi bi-inbox display-4 text-muted mb-3"></i>
        <h5 class="text-muted">暂无图表数据</h5>
        <p class="text-muted">当前图表类型下还没有创建任何图表</p>
        <button class="btn btn-primary mt-3" onclick="chartTableDetail.showChartConfigModal()">
            <i class="bi bi-plus-circle me-2"></i>创建第一个图表
        </button>
    </div>
</td>
        `;
        tbody.appendChild(row);
    }

    // 渲染分页控件
    renderPagination(pagination, container) {
        if (!container || !pagination) return;

        const {current_page, total_pages, has_prev, has_next, prev_num, next_num} = pagination;

        let paginationHtml = `
             <nav aria-label="图表分页">
                 <ul class="pagination justify-content-center">
        `;

        // 上一页按钮
        if (has_prev) {
            paginationHtml += `
                 <li class="page-item">
                     <a class="page-link" href="javascript:void(0)" onclick="chartTableDetail.loadChartData(${prev_num})">
                         <i class="bi bi-chevron-left"></i>
                     </a>
                 </li>
             `;
        } else {
            paginationHtml += `
                 <li class="page-item disabled">
                     <span class="page-link"><i class="bi bi-chevron-left"></i></span>
                 </li>
             `;
        }

        // 页码按钮
        for (let i = 1; i <= total_pages; i++) {
            if (i === current_page) {
                paginationHtml += `
                     <li class="page-item active">
                         <span class="page-link">${i}</span>
                     </li>
                 `;
            } else {
                paginationHtml += `
                     <li class="page-item">
                         <a class="page-link" href="javascript:void(0)" onclick="chartTableDetail.loadChartData(${i})">${i}</a>
                     </li>
                 `;
            }
        }

        // 下一页按钮
        if (has_next) {
            paginationHtml += `
                <li class="page-item">
                     <a class="page-link" href="javascript:void(0)" onclick="chartTableDetail.loadChartData(${next_num})">
                         <i class="bi bi-chevron-right"></i>
                     </a>
                 </li>
             `;
        } else {
            paginationHtml += `
                 <li class="page-item disabled">
                     <span class="page-link"><i class="bi bi-chevron-right"></i></span>
                 </li>
             `;
        }

        paginationHtml += `
                 </ul>
             </nav>
             <div class="text-center text-muted small mt-2">
                 第 ${current_page} 页，共 ${total_pages} 页，总计 ${this.totalCharts} 个图表
             </div>
         `;

        container.innerHTML = paginationHtml;
    }

// 更新图表计数
    updateChartCount(count) {
        this.totalCharts = count;
        const countElement = document.getElementById('chart-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    // 显示加载状态
    showLoading() {
        const tbody = document.getElementById('chart-list-body');
        if (tbody) {
            // language=HTML
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <p class="mt-2 text-muted">正在加载图表数据...</p>
                    </td>
                </tr>
            `;
        }
    }

    // 显示错误信息
    showError(message) {
        const tbody = document.getElementById('chart-list-body');
        if (tbody) {
            tbody.innerHTML = `
                 <tr>
                     <td colspan="5" class="text-center py-4 text-danger">
                         <i class="bi bi-exclamation-triangle display-4"></i>
                         <p class="mt-2">${message}</p>
                         <button class="btn btn-outline-primary mt-2" onclick="chartTableDetail.loadChartData(1)">
                             <i class="bi bi-arrow-clockwise me-1"></i>重新加载
                         </button>
                     </td>
                 </tr>
             `;
        }
    }

    // 刷新图表列表
    refreshChartList() {
        this.loadChartData(1);
    }

    // 返回图表列表页面
    goBackToChartTable() {
        window.location.href = `/data/projects/${this.projectId}/chart-table`;
    }

    // 预览图表
    async previewChart(chartId) {
        try {
            console.log('开始预览图表:', chartId);


            // 设置当前预览的图表ID
            this.currentPreviewChartId = chartId;


            // 显示加载状态
            this.showPreviewLoading();


            // 获取图表信息
            const chartInfo = await this.getChartInfo(chartId);
            if (!chartInfo) {
                throw new Error('无法获取图表信息');
            }


            // 创建或显示预览模态框
            this.createPreviewModal(chartInfo);


            // 等待模态框完全显示后再加载图片
            setTimeout(async () => {
                try {
                    await this.loadPreviewImage(chartId);
                } catch (error) {
                    console.error('加载预览图片时发生错误:', error);
                    this.showPreviewError('预览失败: ' + error.message);
                    this.hidePreviewLoading();
                }
            }, 500);


        } catch (error) {
            console.error('预览图表时发生错误:', error);
            this.showPreviewError('预览失败: ' + error.message);
            this.hidePreviewLoading();
        }
    }

    // 新增：加载预览图片
    async loadPreviewImage(chartId) {
        try {
            // 构建预览URL，添加时间戳避免缓存
            const previewUrl = `/data/api/charts/${chartId}/preview?t=${Date.now()}`;

            // 创建图片元素
            const img = new Image();

            img.onload = () => {
                this.hidePreviewLoading();
                this.displayPreviewImage(img, chartId);
            };

            img.onerror = (error) => {
                console.error('图片加载失败:', error);
                this.showPreviewError('图片加载失败，请检查图表文件是否存在');
                this.hidePreviewLoading();
            };

            // 开始加载图片
            img.src = previewUrl;

        } catch (error) {
            console.error('加载预览图片时发生错误:', error);
            throw error;
        }
    }

    editChart(chartId) {
        console.log('编辑图表:', chartId);
        // 实现编辑逻辑
    }

    async deleteChart(chartId) {
        if (!confirm('确定要删除这个图表吗？此操作不可恢复。')) {
            return;
        }

        try {
            const response = await fetch(`/api/charts/${chartId}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                this.showSuccess('图表删除成功');
                this.loadChartData(this.currentPage);
            } else {
                this.showError('删除失败: ' + result.message);
            }
        } catch (error) {
            console.error('删除图表时发生错误:', error);
            this.showError('删除失败，请检查网络连接');
        }
    }

    exportChart(chartId) {
        chartTableDetail.downloadChart(chartId);
    }


    // 工具方法
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showSuccess(message) {
        // 这里可以实现显示成功消息的逻辑
        alert(message); // 临时使用alert，实际可以用Toast等UI组件
    }

    showChartConfigModal() {
        // 直接查找元素，不延迟重试
        const modalElement = document.getElementById('chartConfigModal');
        if (!modalElement) {
            console.error('未找到图表配置模态框元素');
            console.error('当前页面所有模态框:', document.querySelectorAll('.modal'));
            this.showError('页面加载异常，请刷新后重试');
            return;
        }

        this.initializeModal(modalElement);
    }

    initializeModal(modalElement) {
        const modal = new bootstrap.Modal(modalElement);

        // 添加模态框显示事件监听器
        const showModalHandler = () => {
            console.log('模态框显示，开始加载数据');

            // 在模态框显示后绑定确认按钮事件
            const confirmBtn = document.getElementById('confirm-chart-config');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    console.log('确认按钮被点击（模态框内绑定）');
                    this.confirmChartConfig();
                });
            }

            this.loadSheetsData().then(() => {
                console.log('Sheet数据加载完成');
            }).catch(error => {
                console.error('加载Sheet数据失败:', error);
                this.showError('加载数据表失败，请重试');
            });
        };

        const hideModalHandler = () => {
            this.cleanupModal();
            // 移除事件监听器避免重复绑定
            modalElement.removeEventListener('shown.bs.modal', showModalHandler);
            modalElement.removeEventListener('hidden.bs.modal', hideModalHandler);
        };

        modalElement.addEventListener('shown.bs.modal', showModalHandler);
        modalElement.addEventListener('hidden.bs.modal', hideModalHandler);

        modal.show();
    }

    // 改进清理方法
    cleanupModal() {
        ;

        // 清理Select2实例
        const yAxisSelect = document.getElementById('y-axis-select');
        if (yAxisSelect && $(yAxisSelect).hasClass('select2-hidden-accessible')) {
            $(yAxisSelect).select2('destroy');
        }

        // 重置所有选择框
        const selects = ['x-axis-select', 'y-axis-select', 'category-select'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">请选择...</option>';
            }
        });
    }

    async loadSheetsData() {
        try {
            this.showModalLoading();

            const response = await fetch(`/data/api/projects/${this.projectId}/sheets`);
            const result = await response.json();

            if (result.success) {
                this.renderSheetList(result.sheets);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('加载Sheet数据时发生错误:', error);
            throw error;
        }
    }

    renderSheetList(sheets) {
        const sheetListContainer = document.getElementById('sheet-list');
        sheetListContainer.innerHTML = '';

        if (!sheets || sheets.length === 0) {
            sheetListContainer.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi bi-inbox display-4"></i>
                <p>暂无数据表</p>
            </div>
        `;
            return;
        }

        sheets.forEach((sheet, index) => {
            const sheetItem = document.createElement('button');
            sheetItem.type = 'button';
            sheetItem.className = `list-group-item list-group-item-action ${index === 0 ? 'active' : ''}`;
            sheetItem.dataset.sheetId = sheet.id; // 添加data属性

            sheetItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <i class="bi bi-table me-2"></i>
                    <strong>${this.escapeHtml(sheet.name)}</strong>
                </div>
                <span class="badge bg-primary rounded-pill">${sheet.table_count || 0}</span>
            </div>
            <small class="text-muted">${sheet.created_at || ''}</small>
        `;

            sheetItem.addEventListener('click', () => {
                document.querySelectorAll('#sheet-list .list-group-item').forEach(item => {
                    item.classList.remove('active');
                });
                sheetItem.classList.add('active');
                this.loadSheetHeaders(sheet.id);
            });

            sheetListContainer.appendChild(sheetItem);
        });

        if (sheets.length > 0) {
            this.loadSheetHeaders(sheets[0].id);
        }
    }

    updateSelectElements() {
        const xAxisSelect = document.getElementById('x-axis-select');
        const categorySelect = document.getElementById('category-select');

        // 确保普通select元素显示正确的选项
        if (xAxisSelect && xAxisSelect.options.length > 1) {
            xAxisSelect.selectedIndex = 0; // 重置为"请选择..."
        }

        if (categorySelect && categorySelect.options.length > 1) {
            categorySelect.selectedIndex = 0; // 重置为"请选择..."
        }
    }

    async loadSheetHeaders(sheetId) {
        try {
            this.showModalLoading('headers');

            const response = await fetch(`/data/api/sheets/${sheetId}/headers`);
            const result = await response.json();

            if (result.success) {
                this.renderHeaderOptions(result.headers);

                // 确保普通select元素正确显示
                this.updateSelectElements();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('加载表头数据时发生错误:', error);
            this.showModalError('加载表头失败: ' + error.message);
        }
    }

    // 渲染表头选项
    renderHeaderOptions(headers) {
        const xAxisSelect = document.getElementById('x-axis-select');
        const yAxisSelect = document.getElementById('y-axis-select');
        const categorySelect = document.getElementById('category-select');

        // 清空现有选项 - 对纵轴特殊处理
        [xAxisSelect, categorySelect].forEach(select => {
            if (select) {
                // 保留第一个选项，移除其他选项（单选框保留提示）
                while (select.options.length > 1) {
                    select.remove(1);
                }
                select.selectedIndex = 0;
            }
        });

        // 纵轴多选框完全清空，不保留提示选项
        if (yAxisSelect) {
            yAxisSelect.innerHTML = ''; // 完全清空
        }

        if (!headers || headers.length === 0) {
            this.showModalInfo('该数据表暂无表头数据');

            // 如果没有表头数据，为纵轴添加一个禁用选项
            if (yAxisSelect) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '暂无可用字段';
                option.disabled = true;
                yAxisSelect.appendChild(option);
            }
            return;
        }

        // 添加表头选项
        headers.forEach(header => {
            const option = document.createElement('option');
            option.value = header.name;
            option.textContent = `${header.name} (${header.type || '未知类型'})`;

            // 添加到各个选择器
            if (xAxisSelect) xAxisSelect.appendChild(option.cloneNode(true));
            if (yAxisSelect) yAxisSelect.appendChild(option.cloneNode(true));
            if (categorySelect) categorySelect.appendChild(option.cloneNode(true));
        });

        // 重新初始化Select2（先销毁再初始化）
        this.initializeSelect2(yAxisSelect);
    }

    initializeSelect2(selectElement) {
        if (!selectElement) return;

        // 如果已经初始化过Select2，先销毁
        if ($(selectElement).hasClass('select2-hidden-accessible')) {
            $(selectElement).select2('destroy');
        }

        // 延迟初始化，确保DOM完全更新
        setTimeout(() => {
            try {
                $(selectElement).select2({
                    placeholder: "选择纵轴字段（可多选）",
                    allowClear: true,
                    width: '100%',
                    dropdownParent: $('#chartConfigModal') // 重要：指定模态框为父容器
                });
            } catch (error) {
                console.error('Select2初始化失败:', error);
            }
        }, 100);
    }

    // 确认图表配置
    async confirmChartConfig() {
        console.log("进入表单提交")
        try {
            // 获取表单值
            const xAxis = document.getElementById('x-axis-select').value;
            const yAxisSelect = document.getElementById('y-axis-select');
            let yAxis = [];

            // 处理Select2多选值
            if (yAxisSelect && $(yAxisSelect).hasClass('select2-hidden-accessible')) {
                yAxis = $(yAxisSelect).select2('val') || [];
            } else {
                // 普通多选处理
                const selectedOptions = yAxisSelect.selectedOptions;
                yAxis = Array.from(selectedOptions).map(option => option.value);
            }

            const category = document.getElementById('category-select').value;

            // 获取当前选中的Sheet
            const activeSheet = document.querySelector('#sheet-list .list-group-item.active');
            if (!activeSheet) {
                this.showError('请先选择一个数据表');
                return;
            }

            const sheetId = this.getActiveSheetId();
            if (!sheetId) {
                this.showError('无法获取数据表ID');
                return;
            }

            // 验证必填字段
            if (!xAxis) {
                this.showError('请选择横轴字段');
                return;
            }

            if (!yAxis || yAxis.length === 0) {
                this.showError('请至少选择一个纵轴字段');
                return;
            }

            // 显示加载状态
            this.showModalLoading('confirm');

            // 准备请求数据 - 添加图表类型信息
            const chartData = {
                project_id: parseInt(this.projectId),
                chart_type_id: parseInt(this.chartTypeId),
                chart_type_name: this.chartTypeName, // 添加图表类型名称
                sheet_id: parseInt(sheetId),
                x_axis: xAxis,
                y_axis: yAxis,
                category: category,
                chart_name: `${this.chartTypeName}_图表_${new Date().getTime()}`
            };

            console.log('发送到后端的数据:', chartData);

            // 发送请求
            const response = await fetch('/data/api/charts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chartData)
            });

            const result = await response.json();
            console.log('后端响应:', result);

            if (result.success) {
                this.showSuccess(`图表生成成功: ${result.chart_type}`);
                // 关闭模态框
                const modal = bootstrap.Modal.getInstance(document.getElementById('chartConfigModal'));
                if (modal) {
                    modal.hide();
                }
                // 刷新图表列表
                this.loadChartData(1);
            } else {
                throw new Error(result.message || '生成图表失败');
            }
        } catch (error) {
            console.error('生成图表时发生错误:', error);
            this.showError('生成图表失败: ' + error.message);
        } finally {
            // 恢复确认按钮状态
            this.resetConfirmButton();
        }
    }

    // 恢复确认按钮状态
    resetConfirmButton() {
        const confirmBtn = document.getElementById('confirm-chart-config');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '确认生成';
        }
    }

    // 工具方法
    getActiveSheetId() {
        const activeItem = document.querySelector('#sheet-list .list-group-item.active');
        if (!activeItem) {
            console.error('未找到选中的Sheet');
            return null;
        }

        // 从数据属性获取Sheet ID
        // 需要先在renderSheetList方法中设置data属性
        return activeItem.dataset.sheetId;
    }

    // 修改 showModalLoading 方法
    showModalLoading(type = 'general') {
        const loaders = {
            general: () => {
                const sheetList = document.getElementById('sheet-list');
                if (sheetList) {
                    sheetList.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="mt-2 small text-muted">加载数据表...</p>
                </div>
            `;
                } else {
                    console.warn('sheet-list 元素未找到，跳过加载状态显示');
                }
            }, headers: () => {
                // 只设置纵轴为加载中，横轴和分类值保持原样
                const yAxisSelect = document.getElementById('y-axis-select');
                if (yAxisSelect) {
                    yAxisSelect.innerHTML = '<option value="">加载中...</option>';
                }
            }, confirm: () => {
                const confirmBtn = document.getElementById('confirm-chart-config');
                if (confirmBtn) {
                    confirmBtn.disabled = true;
                    confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>生成中...';
                }
            }
        };

        if (loaders[type]) {
            loaders[type]();
        }
    }

    showModalError(message) {
        // 显示错误信息
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const modalBody = document.querySelector('#chartConfigModal .modal-body');
        modalBody.insertBefore(alertDiv, modalBody.firstChild);

        // 3秒后自动移除
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 3000);
    }

    showModalInfo(message) {
        // 显示信息提示
        const infoDiv = document.createElement('div');
        infoDiv.className = 'alert alert-info';
        infoDiv.innerHTML = `<i class="bi bi-info-circle me-2"></i>${message}`;

        const headerContainer = document.querySelector('#chartConfigModal .card-body');
        headerContainer.appendChild(infoDiv);
    }

    // 修改 createPreviewModalHTML 方法
    createPreviewModalHTML() {
        try {
            const modalHTML = `
<div class="modal fade" id="preview-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="preview-modal-label">
                    <i class="bi bi-eye me-2"></i>图表预览
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
            </div>
            <div class="modal-body">
                <!-- 图表信息 -->
                <div class="chart-info-card mb-3">
                    <div class="row">
                        <div class="col-md-6">
                            <strong>图表名称:</strong> <span id="preview-chart-name">-</span>
                        </div>
                        <div class="col-md-6">
                            <strong>图表类型:</strong> <span id="preview-chart-type">-</span>
                        </div>
                        <div class="col-md-6">
                            <strong>创建时间:</strong> <span id="preview-create-time">-</span>
                        </div>
                        <div class="col-md-6">
                            <strong>文件大小:</strong> <span id="preview-file-size">-</span>
                        </div>
                    </div>
                </div>

                <!-- 缩放控制 -->
                <div class="zoom-controls mb-3">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary" id="preview-zoom-out">
                            <i class="bi bi-dash"></i> 缩小
                        </button>
                        <button class="btn btn-outline-secondary" id="preview-zoom-reset">
                            <span id="preview-zoom-level">100%</span>
                        </button>
                        <button class="btn btn-outline-secondary" id="preview-zoom-in">
                            <i class="bi bi-plus"></i> 放大
                        </button>
                    </div>
                </div>

                <!-- 图片容器 -->
                <div class="image-container-wrapper">
                    <div id="preview-image-container" class="image-container">
                        <!-- 加载状态 -->
                        <div id="preview-loading" class="preview-loading text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">加载中...</span>
                            </div>
                            <p class="mt-2">正在加载图表...</p>
                        </div>
                        
                        <!-- 错误状态 -->
                        <div id="preview-error" class="preview-error text-center py-5" style="display: none;">
                            <i class="bi bi-exclamation-triangle display-4 text-danger mb-3"></i>
                            <p class="mt-2" id="preview-error-message">加载失败</p>
                            <button class="btn btn-outline-primary mt-2" id="preview-retry-btn">
                                <i class="bi bi-arrow-clockwise me-1"></i>重新加载
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    <i class="bi bi-x me-1"></i>关闭
                </button>
                <button type="button" class="btn btn-primary" id="preview-download-btn">
                    <i class="bi bi-download me-1"></i>下载图表
                </button>
            </div>
        </div>
    </div>
</div>`;

            // 将模态框添加到body末尾
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            return document.getElementById('preview-modal');
        } catch (error) {
            console.error('创建预览模态框HTML时发生错误:', error);
            return null;
        }
    }

    // 获取图表信息
    async getChartInfo(chartId) {
        try {
            const response = await fetch(`/data/api/charts/${chartId}`);
            const result = await response.json();

            if (result.success) {
                return result.chart;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('获取图表信息失败:', error);
            return null;
        }
    }

    // 创建预览模态框
    createPreviewModal(chartInfo) {
        try {
            console.log('创建预览模态框:', chartInfo);

            // 检查模态框HTML是否存在，不存在则创建
            let modalElement = document.getElementById('preview-modal');
            if (!modalElement) {
                modalElement = this.createPreviewModalHTML();
            }


            // 确保模态框元素存在
            if (!modalElement) {
                throw new Error('预览模态框元素未找到');
            }


            // 使用 Bootstrap 模态框实例
            this.previewModal = new bootstrap.Modal(modalElement, {
                backdrop: 'static',
                keyboard: false
            });


            // 更新模态框内容
            this.updatePreviewModalContent(chartInfo);


            // 绑定事件
            this.bindPreviewEvents();


            // 显示模态框
            this.previewModal.show();


        } catch (error) {
            console.error('创建预览模态框时发生错误:', error);
            throw error;
        }
    }

    // 预览模态框HTML模板
    getPreviewModalHTML() {
        return `
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="chartPreviewModalLabel">
                        <i class="bi bi-eye me-2"></i>图表预览
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                </div>
                <div class="modal-body">
                    <!-- 图表信息 -->
                    <div class="chart-info-card mb-3">
                        <div class="row">
                            <div class="col-md-6">
                                <strong>图表名称:</strong> <span id="preview-chart-name">-</span>
                            </div>
                            <div class="col-md-6">
                                <strong>图表类型:</strong> <span id="preview-chart-type">-</span>
                            </div>
                            <div class="col-md-6">
                                <strong>创建时间:</strong> <span id="preview-create-time">-</span>
                            </div>
                            <div class="col-md-6">
                                <strong>文件大小:</strong> <span id="preview-file-size">-</span>
                            </div>
                        </div>
                    </div>

                    <!-- 缩放控制 -->
                    <div class="zoom-controls mb-3">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-secondary" id="zoom-out">
                                <i class="bi bi-dash"></i> 缩小
                            </button>
                            <button class="btn btn-outline-secondary" id="zoom-reset">
                                <span id="zoom-level">100%</span>
                            </button>
                            <button class="btn btn-outline-secondary" id="zoom-in">
                                <i class="bi bi-plus"></i> 放大
                            </button>
                        </div>
                    </div>

                    <!-- 图片容器 -->
                    <div class="image-container-wrapper">
                        <div id="image-container" class="image-container">
                            <!-- 加载状态 -->
                            <div id="preview-loading" class="preview-loading text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">加载中...</span>
                                </div>
                                <p class="mt-2">正在加载图表...</p>
                            </div>
                            
                            <!-- 错误状态 -->
                            <div id="preview-error" class="preview-error text-center py-5" style="display: none;">
                                <i class="bi bi-exclamation-triangle display-4 text-danger mb-3"></i>
                                <p class="mt-2" id="error-message">加载失败</p>
                                <button class="btn btn-outline-primary mt-2" onclick="chartTableDetail.retryPreview()">
                                    <i class="bi bi-arrow-clockwise me-1"></i>重新加载
                                </button>
                            </div>
                            
                            <!-- 图片将在这里动态插入 -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        <i class="bi bi-x me-1"></i>关闭
                    </button>
                    <button type="button" class="btn btn-primary" id="download-chart-btn">
                        <i class="bi bi-download me-1"></i>下载图表
                    </button>
                </div>
            </div>
        </div>
    `;
    }

    // 更新预览模态框内容
    updatePreviewModalContent(chartInfo) {
        try {
            // 安全更新文本内容
            const updateIfExists = (id, text) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = text;
                } else {
                    console.warn(`未找到元素: ${id}`);
                }
            };


            updateIfExists('preview-chart-name', chartInfo.name || chartInfo.chart_name);
            updateIfExists('preview-chart-type', chartInfo.type || '未知类型');
            updateIfExists('preview-create-time', chartInfo.create_time || '未知时间');
            updateIfExists('preview-file-size', chartInfo.file_size || '计算中...');


        } catch (error) {
            console.error('更新预览模态框内容时发生错误:', error);
            throw error;
        }
    }

    // 修复显示预览图片方法
    displayPreviewImage(img, chartInfo) {
        const container = document.getElementById('preview-image-container');

        if (!container) {
            console.error('未找到预览图片容器');
            return;
        }

        // 清除容器内容
        container.innerHTML = '';

        // 创建图片元素
        const previewImage = document.createElement('img');
        previewImage.id = 'preview-image';
        previewImage.src = img.src;
        previewImage.alt = `图表预览 - ${chartInfo.name || chartInfo.chart_name}`;
        previewImage.className = 'img-fluid preview-image';
        previewImage.style.maxWidth = '100%';
        previewImage.style.height = 'auto';
        previewImage.style.display = 'block';
        previewImage.style.margin = '0 auto';

        container.appendChild(previewImage);

        // 初始化缩放
        this.currentZoom = 1;
        this.updateZoom();

        console.log('预览图片显示完成');
    }

    // 计算图片大小
    async calculateImageSize(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const size = blob.size;

            if (size < 1024) {
                return size + ' B';
            } else if (size < 1024 * 1024) {
                return (size / 1024).toFixed(2) + ' KB';
            } else {
                return (size / (1024 * 1024)).toFixed(2) + ' MB';
            }
        } catch (error) {
            return '未知';
        }
    }

    // 修复绑定预览事件方法
    bindPreviewEvents() {
        try {
            console.log('开始绑定预览事件');

            // 确保所有元素都存在再绑定事件
            const elementsToBind = {
                'preview-zoom-in': () => this.onZoomIn(),
                'preview-zoom-out': () => this.onZoomOut(),
                'preview-zoom-reset': () => this.onZoomReset(),
                'preview-download-btn': () => this.onDownload(),
                'preview-retry-btn': () => this.onRetryPreview()
            };

            for (const [id, handler] of Object.entries(elementsToBind)) {
                const element = document.getElementById(id);
                if (element) {
                    console.log(`绑定事件到元素: ${id}`);
                    element.addEventListener('click', handler);
                } else {
                    console.warn(`未找到元素: ${id}`);
                }
            }

            // 绑定模态框隐藏事件
            const modalElement = document.getElementById('preview-modal');
            if (modalElement) {
                modalElement.addEventListener('hidden.bs.modal', () => {
                    this.onPreviewModalHidden();
                });
            }

            console.log('预览事件绑定完成');

        } catch (error) {
            console.error('绑定预览事件时发生错误:', error);
            throw error;
        }
    }

    onZoomIn() {
        if (this.currentZoom < 3) {
            this.currentZoom += 0.1;
            this.updateZoom();
        }
    }

    onZoomOut() {
        if (this.currentZoom > 0.2) {
            this.currentZoom -= 0.1;
            this.updateZoom();
        }
    }

    onZoomReset() {
        this.currentZoom = 1;
        this.updateZoom();
    }

// 更新缩放显示
    updateZoom() {
        const image = document.getElementById('preview-image');
        const zoomLevel = document.getElementById('preview-zoom-level');

        if (image) {
            image.style.transform = `scale(${this.currentZoom})`;
        }

        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.currentZoom * 100) + '%';
        }
    }

    onDownload() {
        this.downloadCurrentChart();
    }

    onClosePreview() {
        if (this.previewModal) {
            this.previewModal.hide();
        }
    }

    // 预览模态框隐藏事件
    onPreviewModalHidden() {
        this.cleanupPreviewResources();

        // 移除模态框元素
        const modalElement = document.getElementById('preview-modal');
        if (modalElement) {
            modalElement.remove();
        }

        this.currentPreviewChartId = null;
        this.previewModal = null;
    }

    // 重试预览
    onRetryPreview() {
        if (this.currentPreviewChartId) {
            this.previewChart(this.currentPreviewChartId);
        }
    }

    // 缩放功能
    zoomIn() {
        if (this.currentZoom < 3) {
            this.currentZoom += 0.1;
            this.updateZoom();
        }
    }

    zoomOut() {
        if (this.currentZoom > 0.2) {
            this.currentZoom -= 0.1;
            this.updateZoom();
        }
    }

    zoomReset() {
        this.currentZoom = 1;
        this.updateZoom();
    }

    updateZoom() {
        const image = document.getElementById('preview-image');
        if (image) {
            image.style.transform = `scale(${this.currentZoom})`;
            this.updateZoomDisplay();
        }
    }

    updateZoomDisplay() {
        const zoomElement = document.getElementById('zoom-level');
        if (zoomElement) {
            zoomElement.textContent = Math.round(this.currentZoom * 100) + '%';
        }
    }

    // 显示/隐藏加载状态
    showPreviewLoading() {
        const loadingElement = document.getElementById('preview-loading');
        const errorElement = document.getElementById('preview-error');
        const imageContainer = document.getElementById('image-container');

        if (loadingElement) loadingElement.style.display = 'flex';
        if (errorElement) errorElement.style.display = 'none';
        if (imageContainer) imageContainer.innerHTML = '';
    }

    hidePreviewLoading() {
        const loadingElement = document.getElementById('preview-loading');
        if (loadingElement) loadingElement.style.display = 'none';
    }

    showPreviewError(message) {
        const errorElement = document.getElementById('preview-error');
        const messageElement = errorElement ? errorElement.querySelector('#error-message') : null;

        if (errorElement) errorElement.style.display = 'flex';
        if (messageElement) messageElement.textContent = message;
    }

    // 清理预览资源
    cleanupPreviewResources() {
        console.log('清理预览资源');

        // 清除图片缓存
        const image = document.getElementById('preview-image');
        if (image) {
            image.src = '';
        }

        // 重置缩放
        this.currentZoom = 1;

        console.log('预览资源清理完成');
    }

    showToast(message, type = 'info') {
        // 创建Toast容器（如果不存在）
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        // 创建Toast元素
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        toast.id = toastId;

        toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'error' ? 'bi-exclamation-circle' : 'bi-info-circle'} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

        toastContainer.appendChild(toast);

        // 初始化Toast并显示
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 3000
        });
        bsToast.show();

        // Toast隐藏后移除元素
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    // 修改下载图表方法，去掉确认对话框
    async downloadChart(chartId) {
        try {
            console.log('开始下载图表:', chartId);

            // 获取图表信息用于文件名
            const chartInfo = await this.getChartInfo(chartId);
            if (!chartInfo) {
                throw new Error('无法获取图表信息');
            }

            // 创建下载链接
            const downloadUrl = `/data/api/charts/${chartId}/download?t=${Date.now()}`;

            // 创建临时链接进行下载
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = this.sanitizeFilename((chartInfo.name || chartInfo.chart_name) + '.png');
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 显示下载成功提示（短暂延迟，确保下载开始）
            setTimeout(() => {
                this.showDownloadSuccess(chartInfo.name || chartInfo.chart_name);
            }, 500);

        } catch (error) {
            console.error('下载图表时发生错误:', error);
            this.showDownloadError(error.message);
        }
    }

    // 下载当前预览的图表
    downloadCurrentChart() {
        try {
            // 从预览模态框获取图表ID
            const chartId = this.currentPreviewChartId;
            if (!chartId) {
                throw new Error('未找到当前预览的图表ID');
            }

            this.downloadChart(chartId);

        } catch (error) {
            console.error('下载当前图表失败:', error);
            this.showDownloadError(error.message);
        }
    }

    // 显示下载确认对话框
    async showDownloadConfirmation(chartId) {
        return new Promise((resolve) => {
            // 使用SweetAlert或原生confirm
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '确认下载',
                    text: '您确定要下载这个图表吗？',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '下载',
                    cancelButtonText: '取消'
                }).then((result) => {
                    resolve(result.isConfirmed);
                });
            } else {
                resolve(confirm('您确定要下载这个图表吗？'));
            }
        });
    }

    // 文件名安全处理
    sanitizeFilename(filename) {
        return filename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_.]/g, '_');
    }

    // 显示下载成功提示
    showDownloadSuccess(chartName) {
        // 创建自定义Toast提示
        this.showToast(`图表 "${chartName}" 下载成功`, 'success');
    }

    // 显示下载错误
    showDownloadError(message) {
        this.showToast(`下载失败: ${message}`, 'error');
    }

    // 批量下载功能（可选）
    async exportCharts() {
        try {
            // 获取当前图表类型下的所有图表
            const response = await fetch(`/data/api/chart-types/${this.chartTypeId}/charts`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message);
            }

            const charts = result.charts || [];
            if (charts.length === 0) {
                this.showInfo('当前没有可导出的图表');
                return;
            }

            // 显示批量下载确认
            const confirmed = await this.showBatchExportConfirmation(charts.length);
            if (!confirmed) {
                return;
            }

            // 批量下载（逐个下载）
            for (const chart of charts) {
                await this.downloadChart(chart.id);
                // 添加延迟避免同时发起过多请求
                await new Promise(resolve => setTimeout(resolve, 500));
            }

        } catch (error) {
            console.error('批量导出失败:', error);
            this.showError('批量导出失败: ' + error.message);
        }
    }

    // 批量下载确认
    async showBatchExportConfirmation(count) {
        return new Promise((resolve) => {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '批量下载',
                    html: `您确定要下载全部 <strong>${count}</strong> 个图表吗？<br><small>图表将逐个下载</small>`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: '开始下载',
                    cancelButtonText: '取消'
                }).then((result) => {
                    resolve(result.isConfirmed);
                });
            } else {
                resolve(confirm(`您确定要下载全部 ${count} 个图表吗？`));
            }
        });
    }

    retryPreview() {
        if (this.currentPreviewChartId) {
            this.previewChart(this.currentPreviewChartId);
        }
    }
}

// 创建全局实例
const chartTableDetail = new ChartTableDetail();

// 全局函数，供HTML中的onclick事件调用
function refreshChartList() {
    chartTableDetail.refreshChartList();
}

function showCreateChartModal() {
    chartTableDetail.showCreateChartModal();
}

function goBackToChartTable() {
    chartTableDetail.goBackToChartTable();
}

// 导出功能函数
function importChart() {
    console.log('导入图表功能');
    // 实现导入逻辑
}

function exportCharts() {
    chartTableDetail.exportCharts();
}

// 扩展全局函数
function showChartConfigModal() {
    chartTableDetail.showChartConfigModal();
}

// 更新现有按钮的事件绑定
function showCreateChartModal() {
    chartTableDetail.showChartConfigModal(); // 改为调用新的配置模态框
}