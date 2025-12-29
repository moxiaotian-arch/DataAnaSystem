// 全局变量
let workbookData = {
    name: "未命名工作簿",
    sheets: []
};
let activeSheetIndex = 0;
let selectedColumn = null;
let selectedRow = null;
let selectedCell = null;
let hasWorkbookData = false;
let createTableModal = null;
let renameSheetModal = null;
let sheetToRename = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM内容加载完成，开始初始化应用...');
    // 确保Bootstrap已加载
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap未加载，应用初始化可能失败');
        // 可以在这里添加Bootstrap的延迟加载或降级方案
    }
    initializeApp();
});

// 初始化应用
function initializeApp() {
    console.log('=== 初始化应用 ===');

    // 新增：初始化Bootstrap模态框
    const createTableModalElement = document.getElementById('createTableModal');
    if (createTableModalElement) {
        createTableModal = new bootstrap.Modal(createTableModalElement);
    } else {
        console.error('创建表格模态框元素未找到');
    }

    // 新增：初始化重命名模态框
    const renameSheetModalElement = document.getElementById('renameSheetModal');
    if (renameSheetModalElement) {
        renameSheetModal = new bootstrap.Modal(renameSheetModalElement);
    } else {
        console.error('重命名表格模态框元素未找到');
    }

    // 简化侧边栏切换
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function () {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('main-content');
            if (sidebar && mainContent) {
                sidebar.style.left = sidebar.style.left === '0px' ? '-100%' : '0';
                mainContent.style.marginLeft = sidebar.style.left === '0px' ? 'var(--sidebar-width)' : '0';
            }
        });
    }

    // 简化导航菜单点击事件 - 直接使用链接跳转
    const navLinks = document.querySelectorAll('.sidebar-menu .nav-link');
    navLinks.forEach(link => {
        // 移除之前的复杂事件处理，使用默认的链接跳转
        link.addEventListener('click', function (e) {
            // 只处理非活动链接的点击
            if (!this.classList.contains('active')) {
                console.log('导航点击:', this.href);
                // 允许默认的链接跳转行为
            }
        });
    });

    // 初始化工作簿相关功能（保持不变）
    initializeWorkbook();
    checkAndLoadWorkbookData();

    // 初始化数据合并功能
    initializeMergeFunctions();

    // 初始化单sheet导入功能
    initializeSingleSheetImport();

    console.log('应用初始化完成');
}

// 显示创建表格模态框
function showCreateTableModal() {
    // 生成默认表格名称
    const defaultName = `表格${workbookData.sheets.length + 1}`;

    // 修改：添加防御性检查
    const tableNameInput = document.getElementById('tableNameInput');
    if (!tableNameInput) {
        console.error('tableNameInput元素未找到');
        showMessage('页面元素加载异常，请刷新页面重试', 'error');
        return;
    }

    tableNameInput.value = defaultName;

    // 修改：确保模态框已初始化
    if (!createTableModal) {
        const modalElement = document.getElementById('createTableModal');
        if (modalElement) {
            createTableModal = new bootstrap.Modal(modalElement);
        } else {
            console.error('createTableModal元素未找到');
            showMessage('模态框初始化失败，请刷新页面重试', 'error');
            return;
        }
    }

    createTableModal.show();

    // 修改：添加防御性检查
    setTimeout(() => {
        if (tableNameInput) {
            tableNameInput.focus();
            tableNameInput.select();
        }
    }, 500);
}

// 确认创建表格
function confirmCreateTable() {
    const tableNameInput = document.getElementById('tableNameInput');
    if (!tableNameInput) {
        showMessage('页面元素加载异常，请刷新页面重试', 'error');
        return;
    }


    const newTableName = tableNameInput.value.trim();

    if (newTableName === '') {
        showMessage('表格名称不能为空', 'warning');
        tableNameInput.focus();
        return;
    }

    // 检查名称是否重复
    const isDuplicate = workbookData.sheets.some(sheet => sheet.name === newTableName);
    if (isDuplicate) {
        showMessage('表格名称已存在，请使用其他名称', 'warning');
        tableNameInput.focus();
        return;
    }

    createTableModal.hide();
    createNewSheet(newTableName);
}

// 初始化工作簿
function initializeWorkbook() {
    // 检查是否有工作簿数据
    // checkWorkbookData();
    console.log('初始化工作簿系统');
}

// 检查工作簿数据
function checkWorkbookData() {
    // 模拟从后端获取数据
    setTimeout(() => {
        // 假设没有工作簿数据
        hasWorkbookData = false;
        updateWorkbookDisplay();
    }, 100);
}

// 更新工作簿显示状态（修复版）
function updateWorkbookDisplay() {
    console.log('更新工作簿显示状态，hasWorkbookData:', hasWorkbookData, 'sheets数量:', workbookData.sheets.length);

    // 安全地获取DOM元素
    const dataTable = document.getElementById('data-table');
    const emptyTableMessage = document.getElementById('empty-table-message');
    const sheetTabsContainer = document.getElementById('sheet-tabs-container');
    const tableStats = document.getElementById('table-stats');
    const selectedCellInfo = document.getElementById('selected-cell-info');
    const tableStatus = document.getElementById('table-status');
    const workbookNameDisplay = document.getElementById('workbook-name-display');

    // 检查必要的DOM元素是否存在
    if (!dataTable || !emptyTableMessage) {
        console.error('关键DOM元素未找到，无法更新显示');
        return;
    }

    if (hasWorkbookData && workbookData.sheets.length > 0) {
        // 有工作簿数据，显示表格
        console.log('显示数据表格');
        dataTable.style.display = 'table';
        emptyTableMessage.style.display = 'none';

        // 安全地渲染Sheet页签
        if (sheetTabsContainer) {
            renderSheetTabs();
        } else {
            console.warn('未找到sheet-tabs-container元素');
        }

        renderTable();
        updateTableStatus();
    } else {
        // 没有工作簿数据，显示提示
        console.log('显示空表格提示');
        dataTable.style.display = 'none';
        emptyTableMessage.style.display = 'block';

        // 安全地清空Sheet页签
        if (sheetTabsContainer) {
            sheetTabsContainer.innerHTML = '';
        }

        // 安全地更新统计信息
        if (tableStats) {
            tableStats.textContent = '行数: 0, 列数: 0';
        } else {
            console.warn('未找到table-stats元素');
        }

        if (selectedCellInfo) {
            selectedCellInfo.textContent = '选中单元格: 无';
        } else {
            console.warn('未找到selected-cell-info元素');
        }

        if (tableStatus) {
            tableStatus.textContent = '无数据';
        } else {
            console.warn('未找到table-status元素');
        }
    }

    // 安全地更新工作簿名称显示
    if (workbookNameDisplay) {
        workbookNameDisplay.textContent = workbookData.name;
    } else {
        console.warn('未找到workbook-name-display元素');
    }
}

// 创建新表格
function createNewSheet(sheetName) {
    // 创建工作表数据
    const newSheet = {
        name: sheetName,
        columns: [
            {id: 0, name: '列1'},
            {id: 1, name: '列2'}
        ],
        rows: [
            {0: '', 1: ''}
        ]
    };

    // 添加到工作簿
    workbookData.sheets.push(newSheet);

    // 设置新工作表为活动工作表
    activeSheetIndex = workbookData.sheets.length - 1;

    // 标记为有工作簿数据
    hasWorkbookData = true;

    // 更新显示
    updateWorkbookDisplay();

    showMessage(`新表格 "${sheetName}" 已创建成功！现在您可以开始编辑数据了。`, 'success');
}

// 渲染Sheet页签（修复版）
function renderSheetTabs() {
    const container = document.getElementById('sheet-tabs-container');
    if (!container) {
        console.error('未找到sheet-tabs-container元素，无法渲染页签');
        return;
    }

    container.innerHTML = '';

    workbookData.sheets.forEach((sheet, index) => {
        const tab = document.createElement('div');
        tab.className = `sheet-tab ${index === activeSheetIndex ? 'active' : ''}`;
        tab.setAttribute('data-sheet-index', index);
        tab.title = sheet.name; // 添加悬停提示

        const tabName = document.createElement('span');
        tabName.className = 'sheet-tab-name';
        tabName.textContent = sheet.name;

        const tabActions = document.createElement('div');
        tabActions.className = 'sheet-tab-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'sheet-tab-action-btn';
        renameBtn.innerHTML = '<i class="bi bi-pencil"></i>';
        renameBtn.title = '重命名';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showRenameSheetModal(index);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'sheet-tab-action-btn';
        deleteBtn.innerHTML = '<i class="bi bi-x"></i>';
        deleteBtn.title = '删除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (workbookData.sheets.length > 1) {
                deleteSheet(index);
            } else {
                showMessage('工作簿至少需要保留一个表格', 'warning');
            }
        });

        tabActions.appendChild(renameBtn);
        // 只有在多个表格时才显示删除按钮
        if (workbookData.sheets.length > 1) {
            tabActions.appendChild(deleteBtn);
        }

        tab.appendChild(tabName);
        tab.appendChild(tabActions);

        tab.addEventListener('click', () => {
            switchSheet(index);
        });

        container.appendChild(tab);
    });

    // 添加新建Sheet按钮
    const addTab = document.createElement('button');
    addTab.className = 'add-sheet-tab';
    addTab.innerHTML = '<i class="bi bi-plus-lg"></i>';
    addTab.title = '添加新表格';
    addTab.addEventListener('click', showCreateTableModal);

    container.appendChild(addTab);

    console.log('Sheet页签渲染完成，数量:', workbookData.sheets.length);
}

// 切换工作表
function switchSheet(sheetIndex) {
    if (sheetIndex === activeSheetIndex) return;

    activeSheetIndex = sheetIndex;
    renderSheetTabs();
    renderTable();
    updateTableStatus();
    updateSelectedCellInfo();

    showMessage(`已切换到表格 "${getActiveSheet().name}"`, 'info');
}

// 获取当前活动工作表
function getActiveSheet() {
    return workbookData.sheets[activeSheetIndex];
}

// 显示重命名表格模态框
function showRenameSheetModal(sheetIndex) {
    sheetToRename = sheetIndex;
    const sheet = workbookData.sheets[sheetIndex];

    // 添加防御性检查
    const sheetNameInput = document.getElementById('sheetNameInput');
    if (!sheetNameInput) {
        console.error('sheetNameInput元素未找到');
        showMessage('页面元素加载异常，请刷新页面重试', 'error');
        return;
    }

    sheetNameInput.value = sheet.name;

    // 确保模态框已初始化
    if (!renameSheetModal) {
        const modalElement = document.getElementById('renameSheetModal');
        if (modalElement) {
            renameSheetModal = new bootstrap.Modal(modalElement);
        } else {
            console.error('renameSheetModal元素未找到');
            showMessage('模态框初始化失败，请刷新页面重试', 'error');
            return;
        }
    }

    renameSheetModal.show();


    // 自动聚焦到输入框
    setTimeout(() => {
        if (sheetNameInput) {
            sheetNameInput.focus();
            sheetNameInput.select();
        }
    }, 500);
}

// 确认重命名表格
function confirmRenameSheet() {
    // 添加防御性检查
    const sheetNameInput = document.getElementById('sheetNameInput');
    if (!sheetNameInput) {
        showMessage('页面元素加载异常，请刷新页面重试', 'error');
        return;
    }

    const newSheetName = sheetNameInput.value.trim();
    if (!newSheetName) {
        showMessage('表格名称不能为空', 'error');
        return;
    }

    // 检查名称是否已存在
    const isNameExist = workbookData.sheets.some(
        (sheet, index) => sheet.name === newSheetName && index !== sheetToRename
    );

    if (isNameExist) {
        showMessage('表格名称已存在，请使用其他名称', 'error');
        return;
    }

    // 更新表格名称
    workbookData.sheets[sheetToRename].name = newSheetName;

    // 刷新界面
    refreshSheetsList();

    // 关闭模态框
    renameSheetModal.hide();

    showMessage('表格重命名成功', 'success');
}

// 删除表格（优化版）
function deleteSheet(sheetIndex) {
    if (workbookData.sheets.length <= 1) {
        showMessage('工作簿至少需要保留一个表格', 'warning');
        return;
    }

    const sheetName = workbookData.sheets[sheetIndex].name;

    // 使用更友好的确认对话框
    const confirmDelete = confirm(`确定要删除表格 "${sheetName}" 吗？\n\n此操作将永久删除该表格及其所有数据，且不可撤销。`);

    if (!confirmDelete) return;

    // 删除表格
    workbookData.sheets.splice(sheetIndex, 1);

    // 如果删除的是当前活动表格，切换到前一个表格
    if (sheetIndex === activeSheetIndex) {
        activeSheetIndex = Math.max(0, sheetIndex - 1);
    } else if (sheetIndex < activeSheetIndex) {
        activeSheetIndex--;
    }

    updateWorkbookDisplay();
    showMessage(`表格 "${sheetName}" 已删除`, 'success');
}

// 添加列
function addColumn() {
    if (!hasWorkbookData) {
        showCreateTableModal();
        return;
    }

    const sheet = getActiveSheet();
    const colIndex = sheet.columns.length;
    const colName = `列${colIndex + 1}`;

    sheet.columns.push({
        id: colIndex,
        name: colName
    });

    // 为每一行添加新的单元格
    sheet.rows.forEach(row => {
        row[colIndex] = '';
    });

    renderTable();
    updateTableStatus();
}

// 添加行
function addRow() {
    if (!hasWorkbookData) {
        showCreateTableModal();
        return;
    }

    const sheet = getActiveSheet();
    const rowIndex = sheet.rows.length;
    const newRow = {};

    // 为每一列添加空单元格
    sheet.columns.forEach((col, index) => {
        newRow[index] = '';
    });

    sheet.rows.push(newRow);
    renderTable();
    updateTableStatus();
}

// 删除选中列
function deleteSelectedColumn() {
    if (!hasWorkbookData) {
        showMessage('当前没有表格数据，请先创建表格', 'warning');
        return;
    }

    const sheet = getActiveSheet();

    if (selectedColumn === null) {
        showMessage('请先选择要删除的列，点击列标题即可选择', 'warning');
        return;
    }

    if (sheet.columns.length <= 1) {
        showMessage('表格至少需要保留一列，无法删除最后一列', 'warning');
        return;
    }

    // 从列数组中删除
    sheet.columns.splice(selectedColumn, 1);

    // 从每一行中删除对应的单元格
    sheet.rows.forEach(row => {
        delete row[selectedColumn];

        // 重新索引列
        const newRow = {};
        Object.keys(row).forEach(key => {
            const numKey = parseInt(key);
            if (numKey > selectedColumn) {
                newRow[numKey - 1] = row[numKey];
            } else if (numKey < selectedColumn) {
                newRow[numKey] = row[numKey];
            }
        });

        // 更新行数据
        Object.keys(newRow).forEach(key => {
            row[key] = newRow[key];
        });

        // 删除多余的属性
        Object.keys(row).forEach(key => {
            if (parseInt(key) >= sheet.columns.length) {
                delete row[key];
            }
        });
    });

    // 更新列ID
    sheet.columns.forEach((col, index) => {
        col.id = index;
    });

    selectedColumn = null;
    renderTable();
    updateTableStatus();
    showMessage('列已成功删除', 'success');
}

// 删除选中行
function deleteSelectedRow() {
    if (!hasWorkbookData) {
        showMessage('当前没有表格数据，请先创建表格', 'warning');
        return;
    }

    const sheet = getActiveSheet();

    if (selectedRow === null) {
        showMessage('请先选择要删除的行，点击行号即可选择', 'warning');
        return;
    }

    if (sheet.rows.length <= 1) {
        showMessage('表格至少需要保留一行，无法删除最后一行', 'warning');
        return;
    }

    sheet.rows.splice(selectedRow, 1);
    selectedRow = null;
    renderTable();
    updateTableStatus();
    showMessage('行已成功删除', 'success');
}

// 渲染表格
function renderTable() {
    if (!hasWorkbookData) return;

    const sheet = getActiveSheet();
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');

    // 清空现有内容
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';

    // 创建表头行
    const headerRow = document.createElement('tr');

    // 添加行号列
    const rowNumberHeader = document.createElement('th');
    rowNumberHeader.className = 'row-number';
    rowNumberHeader.textContent = '#';
    headerRow.appendChild(rowNumberHeader);

    // 添加数据列
    sheet.columns.forEach((col, colIndex) => {
        const th = document.createElement('th');
        th.dataset.colIndex = colIndex;

        const colHeader = document.createElement('div');
        colHeader.className = 'column-header';

        const colNameSpan = document.createElement('span');
        colNameSpan.textContent = col.name;
        colNameSpan.addEventListener('dblclick', () => {
            editColumnName(colIndex);
        });

        const colActions = document.createElement('div');
        colActions.className = 'column-actions';

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
        editBtn.title = '编辑列名';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editColumnName(colIndex);
        });

        colActions.appendChild(editBtn);

        colHeader.appendChild(colNameSpan);
        colHeader.appendChild(colActions);
        th.appendChild(colHeader);

        th.addEventListener('click', () => {
            selectColumn(colIndex);
        });

        if (colIndex === selectedColumn) {
            th.classList.add('header-selected');
        }

        headerRow.appendChild(th);
    });

    tableHeader.appendChild(headerRow);

    // 创建数据行
    sheet.rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.dataset.rowIndex = rowIndex;

        // 添加行号
        const rowNumberCell = document.createElement('td');
        rowNumberCell.className = 'row-number';

        const rowNumberDiv = document.createElement('div');
        rowNumberDiv.style.position = 'relative';

        const rowNumberSpan = document.createElement('span');
        rowNumberSpan.textContent = rowIndex + 1;

        const rowActions = document.createElement('div');
        rowActions.className = 'row-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
        deleteBtn.title = '删除行';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedRow = rowIndex;
            deleteSelectedRow();
        });

        rowActions.appendChild(deleteBtn);

        rowNumberDiv.appendChild(rowNumberSpan);
        rowNumberDiv.appendChild(rowActions);
        rowNumberCell.appendChild(rowNumberDiv);

        rowNumberCell.addEventListener('click', () => {
            selectRow(rowIndex);
        });

        tr.appendChild(rowNumberCell);

        // 添加数据单元格
        sheet.columns.forEach((col, colIndex) => {
            const td = document.createElement('td');
            td.dataset.rowIndex = rowIndex;
            td.dataset.colIndex = colIndex;

            const cellValue = row[colIndex] || '';
            td.textContent = cellValue;

            td.addEventListener('click', () => {
                selectCell(rowIndex, colIndex);
            });

            td.addEventListener('dblclick', () => {
                editCell(rowIndex, colIndex);
            });

            if (selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex) {
                td.classList.add('selected');
            }

            tr.appendChild(td);
        });

        if (rowIndex === selectedRow) {
            tr.classList.add('selected');
        }

        tableBody.appendChild(tr);
    });
}

// 选择列
function selectColumn(colIndex) {
    if (!hasWorkbookData) return;

    selectedColumn = colIndex;
    selectedRow = null;
    selectedCell = null;
    renderTable();
    updateSelectedCellInfo();
}

// 选择行
function selectRow(rowIndex) {
    if (!hasWorkbookData) return;

    selectedRow = rowIndex;
    selectedColumn = null;
    selectedCell = null;
    renderTable();
    updateSelectedCellInfo();
}

// 选择单元格
function selectCell(rowIndex, colIndex) {
    if (!hasWorkbookData) return;

    selectedCell = {row: rowIndex, col: colIndex};
    selectedColumn = null;
    selectedRow = null;
    renderTable();
    updateSelectedCellInfo();
}

// 编辑列名
function editColumnName(colIndex) {
    if (!hasWorkbookData) return;

    const sheet = getActiveSheet();
    const newName = prompt('请输入新的列名:', sheet.columns[colIndex].name);
    if (newName !== null && newName.trim() !== '') {
        sheet.columns[colIndex].name = newName.trim();
        renderTable();
        updateTableStatus();
        showMessage('列名已成功更新', 'success');
    }
}

// 编辑单元格
function editCell(rowIndex, colIndex) {
    if (!hasWorkbookData) return;

    const sheet = getActiveSheet();
    const cell = document.querySelector(`td[data-row-index="${rowIndex}"][data-col-index="${colIndex}"]`);
    const originalValue = sheet.rows[rowIndex][colIndex] || '';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalValue;

    cell.textContent = '';
    cell.classList.add('editing');
    cell.appendChild(input);

    input.focus();
    input.select();

    const finishEditing = () => {
        const newValue = input.value;
        sheet.rows[rowIndex][colIndex] = newValue;
        cell.classList.remove('editing');
        cell.textContent = newValue;
        updateTableStatus();
        showMessage('单元格内容已更新', 'success');
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            finishEditing();
        } else if (e.key === 'Escape') {
            cell.classList.remove('editing');
            cell.textContent = originalValue;
        }
    });
}

// 更新表格状态
function updateTableStatus() {
    if (!hasWorkbookData) {
        console.log('无工作簿数据，跳过表格状态更新');
        return;
    }

    const sheet = getActiveSheet();
    const rowCount = sheet.rows.length;
    const colCount = sheet.columns.length;

    const tableStats = document.getElementById('table-stats');
    if (tableStats) {
        tableStats.textContent = `行数: ${rowCount}, 列数: ${colCount}`;
    }

    const tableStatus = document.getElementById('table-status');
    if (tableStatus) {
        tableStatus.textContent = '已修改';
    }

    console.log(`表格状态更新: ${rowCount}行, ${colCount}列`);
}

// 更新选中单元格信息
function updateSelectedCellInfo() {
    const selectedCellInfo = document.getElementById('selected-cell-info');
    if (!selectedCellInfo) {
        console.warn('未找到selected-cell-info元素');
        return;
    }

    if (!hasWorkbookData) {
        selectedCellInfo.textContent = '选中单元格: 无';
        return;
    }

    const sheet = getActiveSheet();
    let info = '选中单元格: ';

    if (selectedCell) {
        const colName = sheet.columns[selectedCell.col].name;
        info = `选中单元格: ${colName}${selectedCell.row + 1}`;
    } else if (selectedColumn !== null) {
        const colName = sheet.columns[selectedColumn].name;
        info = `选中列: ${colName}`;
    } else if (selectedRow !== null) {
        info = `选中行: ${selectedRow + 1}`;
    } else {
        info = '选中单元格: 无';
    }

    selectedCellInfo.textContent = info;
}

// 保存工作簿数据
function saveWorkbookData() {
    if (!hasWorkbookData) {
        showMessage('当前没有工作簿数据可保存，请先创建表格', 'warning');
        return;
    }

    // 获取当前项目ID
    const projectId = getCurrentProjectId();
    if (!projectId) {
        showMessage('无法获取项目ID，请确保在正确的项目页面中操作', 'error');
        return;
    }

    // 准备要保存的数据
    const saveData = {
        workbook_name: workbookData.name,
        sheets: workbookData.sheets.map(sheet => ({
            name: sheet.name,
            columns: sheet.columns,
            rows: sheet.rows
        }))
    };

    console.log('准备保存工作簿数据:', saveData);

    // 显示保存中状态
    showMessage('正在保存工作簿数据...', 'info');

    // 发送保存请求到后端
    fetch(`/data/api/project/${projectId}/workbook/save`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('table-status').textContent = '已保存';
                showMessage('工作簿数据已成功保存到服务器！', 'success');
                console.log('保存成功:', data);
                // 新增：保存成功后重新加载数据以确保一致性
                loadWorkbookData();
            } else {
                throw new Error(data.message || '保存失败');
            }
        })
        .catch(error => {
            console.error('保存失败:', error);
            showMessage(`保存失败: ${error.message}`, 'error');
        });


}

function getCurrentProjectId() {
    // 方法1: 从URL路径中提取（支持多种格式）
    const pathSegments = window.location.pathname.split('/');
    console.log('URL路径分段:', pathSegments);

    // 支持格式: /data/projects/123/index 或 /data/projects/123
    for (let i = 0; i < pathSegments.length; i++) {
        if (pathSegments[i] === 'projects' && i + 1 < pathSegments.length) {
            const projectId = parseInt(pathSegments[i + 1]);
            if (!isNaN(projectId)) {
                console.log('从URL提取到项目ID:', projectId);
                return projectId;
            }
        }
    }

    // 方法2: 从页面中的隐藏字段获取（需要在HTML模板中添加）
    const projectIdElement = document.getElementById('project-id');
    if (projectIdElement && projectIdElement.value) {
        const projectId = parseInt(projectIdElement.value);
        console.log('从隐藏字段获取项目ID:', projectId);
        return projectId;
    }

    // 方法3: 从全局变量获取
    if (window.currentProjectId) {
        console.log('从全局变量获取项目ID:', window.currentProjectId);
        return window.currentProjectId;
    }

    console.error('无法获取项目ID，请检查URL格式或页面配置');
    return null;
}

// 导出工作簿数据（包含所有sheet）
function exportWorkbookData() {
    if (!hasWorkbookData) {
        showMessage('当前没有工作簿数据可导出，请先创建表格', 'warning');
        return;
    }

    try {
        // 创建一个新的工作簿
        const wb = XLSX.utils.book_new();

        // 为每个sheet创建一个工作表
        workbookData.sheets.forEach((sheet, index) => {
            // 准备数据
            const data = [];

            // 添加表头
            const headers = sheet.columns.map(col => col.name);
            data.push(headers);

            // 添加数据行
            sheet.rows.forEach(row => {
                const rowData = sheet.columns.map(col => row[col.id] || '');
                data.push(rowData);
            });

            // 创建工作表
            const ws = XLSX.utils.aoa_to_sheet(data);

            // 将工作表添加到工作簿
            XLSX.utils.book_append_sheet(wb, ws, sheet.name);
        });

        // 导出为Excel文件
        XLSX.writeFile(wb, `${workbookData.name}.xlsx`);

        showMessage('工作簿数据已成功导出为Excel文件！', 'success');
    } catch (error) {
        console.error('导出失败:', error);
        showMessage('导出失败，请重试', 'error');
    }
}

// 导入表格数据
function importTableData() {
    // 创建文件选择模态框
    showImportFileModal();
}


function showImportFileModal() {
    // 创建模态框HTML
    const modalHtml = `
        <div class="modal fade" id="importFileModal" tabindex="-1" aria-labelledby="importFileModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="importFileModalLabel">导入Excel文件</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            请选择要导入的.xlsx格式Excel文件
                        </div>
                        <div class="mb-3">
                            <label for="fileInput" class="form-label">选择文件</label>
                            <input class="form-control" type="file" id="fileInput" accept=".xlsx,.xls">
                            <div class="form-text">仅支持.xlsx格式的Excel文件</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmImportBtn" disabled>确认导入</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalElement = document.getElementById('importFileModal');
    const importModal = new bootstrap.Modal(modalElement);
    const fileInput = document.getElementById('fileInput');
    const confirmBtn = document.getElementById('confirmImportBtn');

    // 文件选择事件
    fileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                confirmBtn.disabled = false;
            } else {
                showMessage('请选择.xlsx或.xls格式的Excel文件', 'warning');
                this.value = '';
                confirmBtn.disabled = true;
            }
        }
    });

    // 确认导入事件
    confirmBtn.addEventListener('click', function () {
        const file = fileInput.files[0];
        if (file) {
            importModal.hide();
            // 显示确认覆盖警告
            showImportConfirmation(file);
        }
    });

    // 模态框隐藏后清理
    modalElement.addEventListener('hidden.bs.modal', function () {
        this.remove();
    });

    importModal.show();
}

// 显示导入确认警告
function showImportConfirmation(file) {
    const confirmationHtml = `
        <div class="modal fade" id="importConfirmationModal" tabindex="-1" aria-labelledby="importConfirmationModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="importConfirmationModalLabel">确认导入</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-warning">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            <strong>警告：</strong>导入数据将完全覆盖当前工作簿中的所有数据，此操作不可撤销！
                        </div>
                        <p>文件名称：<strong>${file.name}</strong></p>
                        <p>文件大小：<strong>${(file.size / 1024).toFixed(2)} KB</strong></p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-danger" id="finalConfirmImportBtn">确认导入</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', confirmationHtml);

    const modalElement = document.getElementById('importConfirmationModal');
    const confirmationModal = new bootstrap.Modal(modalElement);
    const finalConfirmBtn = document.getElementById('finalConfirmImportBtn');

    // 最终确认导入
    finalConfirmBtn.addEventListener('click', function () {
        confirmationModal.hide();
        processFileImport(file);
    });

    // 模态框隐藏后清理
    modalElement.addEventListener('hidden.bs.modal', function () {
        this.remove();
    });

    confirmationModal.show();
}

// 处理文件导入（带后端API版本）
function processFileImport(file) {
    const formData = new FormData();
    formData.append('file', file);

    fetch(`/data/api/project/${getCurrentProjectId()}/import-excel`, {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('导入失败');
        })
        .then(data => {
            if (data.success) {
                // 导入成功后重新加载数据
                loadWorkbookData();
            } else {
                throw new Error(data.message || '导入失败');
            }
        })
        .catch(error => {
            showMessage(`导入失败: ${error.message}`, 'error');
        });
}

// 增强版页面切换函数
function switchPage(page) {
    console.log('切换页面到:', page);

    try {
        // 重置所有导航链接的active状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // 设置当前导航链接为active状态
        const currentNavLink = document.querySelector(`.nav-link[href*="${page}"]`);
        if (currentNavLink) {
            currentNavLink.classList.add('active');
        }

        // 如果是数据制图页面，直接跳转（不是单页应用切换）
        if (page === 'data-reporting') {
            const reportingLink = document.querySelector('.nav-link[href*="chart-table"]');
            if (reportingLink && reportingLink.href) {
                window.location.href = reportingLink.href;
                return;
            }
        }

        // 如果是数据表格页面，直接跳转
        if (page === 'data-views') {
            const tableLink = document.querySelector('.nav-link[href*="index"]');
            if (tableLink && tableLink.href) {
                window.location.href = tableLink.href;
                return;
            }
        }

        console.log('页面切换完成:', page);

    } catch (error) {
        console.error('页面切换出错:', error);
        // 出错时跳转到数据表格页面
        window.location.href = '/data/projects/' + getCurrentProjectId() + '/index';
    }
}

// 辅助函数：更新页面标题
function updatePageTitle(page) {
    const pageTitles = {
        'data-views': '数据表格',
        'data-analysis': '数据分析',
        'data-reporting': '数据制图'
    };


    const pageTitleElement = document.getElementById('page-title');
    if (pageTitleElement && pageTitles[page]) {
        pageTitleElement.textContent = pageTitles[page];
    }
}

// 显示消息函数 - 改进版：使用Toast通知（修复版）
function showMessage(message, type) {
    if (!message) {
        console.error('显示消息失败：消息内容为空');
        return;
    }

    console.log(`显示消息 [${type}]:`, message);

    // 检查Bootstrap是否可用
    if (typeof bootstrap === 'undefined' || !bootstrap.Toast) {
        console.warn('Bootstrap Toast 不可用，使用alert代替:', message);
        alert(`${type.toUpperCase()}: ${message}`);
        return;
    }

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

    try {
        // 初始化并显示Toast
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: 5000
        });

        toast.show();

        // Toast隐藏后移除元素
        toastElement.addEventListener('hidden.bs.toast', function () {
            toastElement.remove();
        });
    } catch (error) {
        console.error('显示Toast消息失败:', error);
        // 降级处理：使用简单的alert
        alert(`${type.toUpperCase()}: ${message}`);
    }
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

// 加载工作簿数据
function loadWorkbookData() {
    // 获取当前项目ID
    const projectId = getCurrentProjectId();
    if (!projectId || isNaN(projectId)) {
        console.error('无效的项目ID，跳过数据加载');
        showMessage('无法识别当前项目，请刷新页面重试', 'error');
        return;
    }

    console.log('开始加载工作簿数据，项目ID:', projectId);

    // 显示加载状态
    showMessage('正在加载工作簿数据...', 'info');

    fetch(`/data/api/project/${projectId}/workbook/load`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('工作簿加载响应:', data);

            if (data.success) {
                if (data.workbook_data) {
                    // 更新工作簿数据
                    workbookData = {
                        name: data.workbook_data.workbook_name || "未命名工作簿",
                        sheets: data.workbook_data.sheets || []
                    };

                    // 标记为有工作簿数据
                    hasWorkbookData = workbookData.sheets.length > 0;
                    activeSheetIndex = 0;

                    // 安全地更新显示
                    updateWorkbookDisplay();

                    console.log('工作簿数据加载成功，工作表数量:', workbookData.sheets.length);
                    showMessage('工作簿数据已成功加载！', 'success');
                } else {
                    // 没有工作簿数据
                    hasWorkbookData = false;
                    workbookData = {
                        name: "未命名工作簿",
                        sheets: []
                    };
                    // 安全地更新显示
                    updateWorkbookDisplay();
                    console.log('后端没有工作簿数据，使用默认空工作簿');
                    showMessage('当前项目没有工作簿数据，请创建新表格开始使用', 'info');
                }
            } else {
                throw new Error(data.message || '加载失败');
            }
        })
        .catch(error => {
            console.error('加载工作簿数据失败:', error);
            showMessage(`加载工作簿数据失败: ${error.message}`, 'error');

            // 失败时也安全地显示空表格状态
            hasWorkbookData = false;
            workbookData = {
                name: "未命名工作簿",
                sheets: []
            };
            // 安全地更新显示
            updateWorkbookDisplay();
        });
}

// 检查并加载工作簿数据（在初始化时调用）
function checkAndLoadWorkbookData() {
    const projectId = getCurrentProjectId();
    if (projectId && !isNaN(projectId)) {
        console.log('检测到有效项目ID，开始加载工作簿数据:', projectId);
        loadWorkbookData();
    } else {
        console.log('未检测到有效项目ID，使用默认空工作簿');
        // 确保显示空表格状态
        hasWorkbookData = false;
        workbookData = {
            name: "未命名工作簿",
            sheets: []
        };
        updateWorkbookDisplay();
    }
}

function switchToFallbackPage() {
    const fallbackElement = document.getElementById('data-views-content');
    if (fallbackElement) {
        fallbackElement.style.display = 'block';
        console.log('强制回退显示数据表格页面');

        // 更新导航状态
        const dataViewsLink = document.querySelector('.nav-link[data-page="data-views"]');
        if (dataViewsLink) {
            dataViewsLink.classList.add('active');
        }

        // 更新页面标题
        updatePageTitle('data-views');
    }
}

// 合并逻辑JS
// 数据合并相关全局变量
let mergeTablesModal = null;
let mergeConfigModal = null;
let mergeData = {
    sourceTables: [],      // 待合入表格
    targetTable: null,     // 目标表格
    matchColumns: [],      // 匹配列配置
    mergeColumns: [],       // 待合并列配置
    createNewTable: false, // 是否创建新表
    newTableName: ''       // 新表名称
};
let selectedTableForColumns = null; // 当前选择的表格（用于列选择）

// 显示数据合并模态框（第一步）
function showMergeTablesModal() {
    if (!hasWorkbookData || workbookData.sheets.length < 2) {
        showMessage('至少需要2个表格才能进行数据合并操作', 'warning');
        return;
    }

    // 初始化合并数据
    mergeData = {
        sourceTables: [],
        targetTable: null,
        matchColumns: [],
        mergeColumns: [],
        createNewTable: false,
        newTableName: ''
    };

    // 渲染表格列表
    renderMergeTableLists();

    // 显示模态框
    mergeTablesModal = new bootstrap.Modal(document.getElementById('mergeTablesModal'));
    mergeTablesModal.show();
}

// 渲染合并表格列表
function renderMergeTableLists() {
    const sourceList = document.getElementById('source-tables-list');
    const targetList = document.getElementById('target-tables-list');

    sourceList.innerHTML = '';
    targetList.innerHTML = '';

    workbookData.sheets.forEach((sheet, index) => {
        // 源表格列表（可多选）
        const sourceItem = document.createElement('div');
        sourceItem.className = 'table-list-item';
        sourceItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${index}" id="source-table-${index}">
                <label class="form-check-label" for="source-table-${index}">
                    ${sheet.name}
                </label>
            </div>
        `;
        sourceList.appendChild(sourceItem);

        // 目标表格列表（单选）
        const targetItem = document.createElement('div');
        targetItem.className = 'table-list-item';
        targetItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="radio" name="targetTable" value="${index}" id="target-table-${index}">
                <label class="form-check-label" for="target-table-${index}">
                    ${sheet.name}
                </label>
            </div>
        `;
        targetList.appendChild(targetItem);
    });

    // 添加事件监听
    sourceList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateMergeSelectionState);
    });

    targetList.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', updateMergeSelectionState);
    });
}

// 更新合并选择状态
function updateMergeSelectionState() {
    const sourceChecked = document.querySelectorAll('#source-tables-list input[type="checkbox"]:checked');
    const targetChecked = document.querySelector('#target-tables-list input[type="radio"]:checked');
    const confirmBtn = document.getElementById('confirmMergeSelection');

    confirmBtn.disabled = !(sourceChecked.length > 0 && targetChecked);
}

// 确认表格选择，进入第二步配置
function setupMergeSelectionConfirmation() {
    document.getElementById('confirmMergeSelection').addEventListener('click', function () {
        // 收集选择的表格
        const sourceChecked = document.querySelectorAll('#source-tables-list input[type="checkbox"]:checked');
        const targetChecked = document.querySelector('#target-tables-list input[type="radio"]:checked');

        mergeData.sourceTables = Array.from(sourceChecked).map(cb => parseInt(cb.value));
        mergeData.targetTable = parseInt(targetChecked.value);

        // 检查目标表格是否在源表格中
        if (mergeData.sourceTables.includes(mergeData.targetTable)) {
            showMessage('目标表格不能同时作为待合入表格', 'warning');
            return;
        }

        // 隐藏第一步模态框，显示第二步模态框
        mergeTablesModal.hide();
        showMergeConfigModal();
    });
}

// 显示合并配置模态框（第二步）
function showMergeConfigModal() {
    renderMergeConfigModal();
    mergeConfigModal = new bootstrap.Modal(document.getElementById('mergeConfigModal'));
    mergeConfigModal.show();
}

// 渲染合并配置模态框
function renderMergeConfigModal() {
    // 渲染表格名称列表
    renderTableNamesList();

    // 清空显示区域
    document.getElementById('match-columns-display').innerHTML = '<p class="text-muted mb-0">暂无匹配列配置</p>';
    document.getElementById('merge-columns-display').innerHTML = '<p class="text-muted mb-0">暂无待合并列配置</p>';

    // 重置新表配置
    document.getElementById('createNewTable').checked = false;
    document.getElementById('newTableNameContainer').style.display = 'none';
    document.getElementById('newTableName').value = '';
}

// 渲染表格名称列表
function renderTableNamesList() {
    const tableNamesList = document.getElementById('table-names-list');
    tableNamesList.innerHTML = '';

    // 添加目标表格
    const targetSheet = workbookData.sheets[mergeData.targetTable];
    const targetItem = document.createElement('div');
    targetItem.className = 'table-list-item';
    targetItem.innerHTML = `
        <div class="fw-bold">目标表格</div>
        <div class="table-name-item" data-table-index="${mergeData.targetTable}" data-table-type="target">
            ${targetSheet.name}
        </div>
    `;
    tableNamesList.appendChild(targetItem);

    // 添加源表格
    mergeData.sourceTables.forEach(tableIndex => {
        const sourceSheet = workbookData.sheets[tableIndex];
        const sourceItem = document.createElement('div');
        sourceItem.className = 'table-list-item mt-2';
        sourceItem.innerHTML = `
            <div class="fw-bold">待合入表格</div>
            <div class="table-name-item" data-table-index="${tableIndex}" data-table-type="source">
                ${sourceSheet.name}
            </div>
        `;
        tableNamesList.appendChild(sourceItem);
    });

    // 添加表格点击事件
    tableNamesList.querySelectorAll('.table-name-item').forEach(item => {
        item.addEventListener('click', function () {
            // 移除其他选中状态
            tableNamesList.querySelectorAll('.table-name-item').forEach(i => {
                i.classList.remove('selected');
            });
            // 设置当前选中
            this.classList.add('selected');
            selectedTableForColumns = parseInt(this.dataset.tableIndex);
            renderColumnsList(selectedTableForColumns, this.dataset.tableType);
        });
    });
}

// 渲染列头列表
function renderColumnsList(tableIndex, tableType) {
    const columnsList = document.getElementById('columns-list');
    columnsList.innerHTML = '';

    const sheet = workbookData.sheets[tableIndex];

    sheet.columns.forEach((col, colIndex) => {
        const colItem = document.createElement('div');
        colItem.className = 'column-item';
        colItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${colIndex}" id="col-${tableIndex}-${colIndex}">
                <label class="form-check-label" for="col-${tableIndex}-${colIndex}">
                    ${col.name}
                </label>
            </div>
        `;
        columnsList.appendChild(colItem);
    });

    // 更新操作按钮状态
    const addMatchBtn = document.getElementById('add-match-column');
    const addMergeBtn = document.getElementById('add-merge-column');

    addMatchBtn.onclick = function () {
        addMatchColumn(tableIndex, tableType);
    };
    addMergeBtn.onclick = function () {
        addMergeColumn(tableIndex, tableType);
    };
}

// 添加匹配列
function addMatchColumn(tableIndex, tableType) {
    const selectedColumns = getSelectedColumns();
    if (selectedColumns.length === 0) {
        showMessage('请先选择要添加的列', 'warning');
        return;
    }

    const sheet = workbookData.sheets[tableIndex];

    selectedColumns.forEach(colIndex => {
        const colName = sheet.columns[colIndex].name;

        // 检查是否已存在相同的匹配列配置
        const exists = mergeData.matchColumns.some(item =>
            item.tableIndex === tableIndex && item.columnIndex === colIndex
        );

        if (!exists) {
            mergeData.matchColumns.push({
                tableIndex: tableIndex,
                tableName: sheet.name,
                columnIndex: colIndex,
                columnName: colName
            });
        }
    });

    renderMatchColumnsDisplay();
    clearColumnSelection();
}

// 添加合并列
function addMergeColumn(tableIndex, tableType) {
    const selectedColumns = getSelectedColumns();
    if (selectedColumns.length === 0) {
        showMessage('请先选择要合并的列', 'warning');
        return;
    }

    const sheet = workbookData.sheets[tableIndex];

    selectedColumns.forEach(colIndex => {
        const colName = sheet.columns[colIndex].name;

        // 检查是否已存在相同的合并列配置
        const exists = mergeData.mergeColumns.some(item =>
            item.tableIndex === tableIndex && item.columnIndex === colIndex
        );

        if (!exists) {
            mergeData.mergeColumns.push({
                tableIndex: tableIndex,
                tableName: sheet.name,
                columnIndex: colIndex,
                columnName: colName
            });
        }
    });

    renderMergeColumnsDisplay();
    clearColumnSelection();
}

// 获取选中的列
function getSelectedColumns() {
    const checkboxes = document.querySelectorAll('#columns-list input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// 清空列选择
function clearColumnSelection() {
    document.querySelectorAll('#columns-list input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

// 渲染匹配列显示
function renderMatchColumnsDisplay() {
    const display = document.getElementById('match-columns-display');

    if (mergeData.matchColumns.length === 0) {
        display.innerHTML = '<p class="text-muted mb-0">暂无匹配列配置</p>';
        return;
    }

    display.innerHTML = mergeData.matchColumns.map((item, index) => `
        <span class="config-badge">
            <span class="badge bg-primary">${item.tableName}.${item.columnName}</span>
            <span class="badge bg-danger" onclick="removeMatchColumn(${index})">×</span>
        </span>
    `).join('');
}

// 渲染合并列显示
function renderMergeColumnsDisplay() {
    const display = document.getElementById('merge-columns-display');

    if (mergeData.mergeColumns.length === 0) {
        display.innerHTML = '<p class="text-muted mb-0">暂无待合并列配置</p>';
        return;
    }

    display.innerHTML = mergeData.mergeColumns.map((item, index) => `
        <span class="config-badge">
            <span class="badge bg-success">${item.tableName}.${item.columnName}</span>
            <span class="badge bg-danger" onclick="removeMergeColumn(${index})">×</span>
        </span>
    `).join('');
}

// 移除匹配列
function removeMatchColumn(index) {
    mergeData.matchColumns.splice(index, 1);
    renderMatchColumnsDisplay();
}

// 移除合并列
function removeMergeColumn(index) {
    mergeData.mergeColumns.splice(index, 1);
    renderMergeColumnsDisplay();
}

// 设置新表配置
function setupNewTableConfig() {
    const createNewTableCheckbox = document.getElementById('createNewTable');
    const newTableNameContainer = document.getElementById('newTableNameContainer');

    createNewTableCheckbox.addEventListener('change', function () {
        mergeData.createNewTable = this.checked;
        newTableNameContainer.style.display = this.checked ? 'block' : 'none';

        if (this.checked) {
            // 生成默认新表名
            const targetSheet = workbookData.sheets[mergeData.targetTable];
            mergeData.newTableName = `${targetSheet.name}_合并_${new Date().getTime()}`;
            document.getElementById('newTableName').value = mergeData.newTableName;
        }
    });

    document.getElementById('newTableName').addEventListener('input', function () {
        mergeData.newTableName = this.value;
    });
}

// 确认合并配置
function setupMergeConfigConfirmation() {
    document.getElementById('confirmMergeConfig').addEventListener('click', function () {
        // 验证配置
        if (mergeData.matchColumns.length === 0) {
            showMessage('请至少配置一个匹配列', 'warning');
            return;
        }

        if (mergeData.mergeColumns.length === 0) {
            showMessage('请至少配置一个待合并列', 'warning');
            return;
        }

        if (mergeData.createNewTable && !mergeData.newTableName.trim()) {
            showMessage('请输入新表名称', 'warning');
            return;
        }

        // 准备发送到后端的数据
        const requestData = prepareMergeRequestData();

        // 调用后端接口
        executeDataMerge(requestData);
    });
}

// 准备合并请求数据（使用英文字段名）
function prepareMergeRequestData() {
    const targetSheet = workbookData.sheets[mergeData.targetTable];

    const requestData = {
        targetTableName: targetSheet.name,           // 目标表名
        sourceTableNames: [],                        // 待合入表名数组
        matchColumns: [],                            // 匹配列（不需要表名）
        mergeColumns: [],                            // 待合入表头
        createNewTable: mergeData.createNewTable,    // 是否创建新表
        newTableName: mergeData.newTableName         // 新表名
    };

    // 组织待合入表名
    mergeData.sourceTables.forEach(tableIndex => {
        const sourceSheet = workbookData.sheets[tableIndex];
        requestData.sourceTableNames.push(sourceSheet.name);
    });

    // 组织匹配列数据（直接列名数组，不需要表名）
    const matchColumnNames = new Set();
    mergeData.matchColumns.forEach(item => {
        matchColumnNames.add(item.columnName);
    });
    requestData.matchColumns = Array.from(matchColumnNames);

    // 组织待合并列数据（保持原有结构，包含表名和列名）
    const mergeColumnsByTable = {};
    mergeData.mergeColumns.forEach(item => {
        if (!mergeColumnsByTable[item.tableIndex]) {
            mergeColumnsByTable[item.tableIndex] = {
                tableName: item.tableName,
                columns: []
            };
        }
        mergeColumnsByTable[item.tableIndex].columns.push(item.columnName);
    });
    requestData.mergeColumns = Object.values(mergeColumnsByTable);

    console.log('Prepared merge request data:', requestData);
    return requestData;
}

// 执行数据合并
function executeDataMerge(requestData) {
    const projectId = getCurrentProjectId();

    showMessage('正在处理数据合并...', 'info');

    // 禁用确认按钮防止重复提交
    const confirmBtn = document.getElementById('confirmMergeConfig');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>处理中...';
    }

    fetch(`/data/api/project/${projectId}/merge-tables`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    })
        .then(response => response.json())
        .then(data => {
            console.log('合并接口返回数据:', data);

            if (data.success) {
                // 合并成功处理
                if (mergeConfigModal) {
                    mergeConfigModal.hide();
                }

                let successMessage = data.message || '数据合并成功';

                // 如果返回了工作簿数据，更新前端
                if (data.workbook_data) {
                    workbookData = {
                        name: data.workbook_data.workbook_name || "合并后的工作簿",
                        sheets: data.workbook_data.sheets || []
                    };
                    hasWorkbookData = workbookData.sheets.length > 0;
                    activeSheetIndex = 0;
                    updateWorkbookDisplay();
                    successMessage += '，工作簿已更新';
                } else {
                    // 如果没有返回数据，重新加载
                    loadWorkbookData();
                }

                showMessage(successMessage, 'success');
            } else {
                // 合并失败
                showMessage(data.message || '数据合并失败', 'error');
            }
        })
        .catch(error => {
            console.error('数据合并请求失败:', error);
            showMessage(`数据合并失败: ${error.message}`, 'error');
        })
        .finally(() => {
            // 重新启用确认按钮
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '确认合并';
            }
        });
}

// 上一步按钮功能
function setupBackButton() {
    document.getElementById('backToSelection').addEventListener('click', function () {
        mergeConfigModal.hide();
        mergeTablesModal.show();
    });
}

// 初始化数据合并相关事件
function initializeMergeFunctions() {
    // 设置表格选择确认
    setupMergeSelectionConfirmation();

    // 设置新表配置
    setupNewTableConfig();

    // 设置合并配置确认
    setupMergeConfigConfirmation();

    // 设置上一步按钮
    setupBackButton();
}

// 在initializeApp函数末尾调用
// initializeMergeFunctions();

// 导入单sheet数据函数
async function importSingleSheetData() {
    try {
        console.log('开始导入单Sheet数据流程...');

        // 获取当前项目ID
        const projectId = getCurrentProjectId();
        if (!projectId || isNaN(projectId)) {
            showMessage('无法获取有效的项目ID，请刷新页面重试', 'error');
            return;
        }

        console.log('项目ID:', projectId);

        // 获取项目下的sheet信息
        const sheetInfo = await getProjectSheetInfo(projectId);
        if (!sheetInfo || !sheetInfo.success) {
            showMessage('获取项目Sheet信息失败: ' + (sheetInfo?.message || '未知错误'), 'error');
            return;
        }

        if (!sheetInfo.data || sheetInfo.data.length === 0) {
            showMessage('当前项目没有可用的Sheet，请先创建工作簿', 'warning');
            return;
        }

        // 使用第一个sheet（通常一个项目对应一个sheet）
        const sheet = sheetInfo.data[0];
        console.log('找到Sheet:', sheet);

        if (!sheet.file_exists) {
            showMessage('Sheet文件不存在，无法导入数据', 'error');
            return;
        }

        // 显示导入模态框
        showSingleSheetImportModal(sheet.id, sheet.name);

    } catch (error) {
        console.error('导入单Sheet数据初始化失败:', error);
        showMessage(`导入初始化失败: ${error.message}`, 'error');
    }
}

async function getProjectSheetInfo(projectId) {
    try {
        console.log(`获取项目 ${projectId} 的Sheet信息...`);

        const response = await fetch(`/data/api/projects/${projectId}/sheet`);
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }

        const data = await response.json();
        console.log('获取Sheet信息响应:', data);
        return data;

    } catch (error) {
        console.error('获取项目Sheet信息失败:', error);
        throw error;
    }
}

// 显示单sheet导入模态框
function showSingleSheetImportModal(sheetId, sheetName) {
    const modalHtml = `
        <div class="modal fade" id="singleSheetImportModal" tabindex="-1" aria-labelledby="singleSheetImportModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="singleSheetImportModalLabel">导入单Sheet数据</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle me-2"></i>
                            请选择要导入的Excel文件，数据将追加到当前表格中
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">目标信息</label>
                            <div class="border p-2 rounded bg-light">
                                <div class="row">
                                    <div class="col-6">
                                        <small class="text-muted">Sheet名称:</small>
                                        <div>${sheetName}</div>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted">Sheet ID:</small>
                                        <div>${sheetId}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="singleSheetFileInput" class="form-label">选择Excel文件</label>
                            <input class="form-control" type="file" id="singleSheetFileInput" accept=".xlsx,.xls">
                            <div class="form-text">仅支持.xlsx/.xls格式的Excel文件，文件大小不超过10MB</div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="tableNameInput" class="form-label">表格名称（可选）</label>
                            <input type="text" class="form-control" id="tableNameInput" placeholder="请输入新表格名称，留空将使用文件名">
                            <div class="form-text">如果留空，将使用Excel文件中的第一个工作表名称</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                        <button type="button" class="btn btn-primary" id="confirmSingleSheetImportBtn" disabled>
                            <i class="bi bi-upload me-1"></i>确认导入
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalElement = document.getElementById('singleSheetImportModal');
    const importModal = new bootstrap.Modal(modalElement);
    const fileInput = document.getElementById('singleSheetFileInput');
    const tableNameInput = document.getElementById('tableNameInput');
    const confirmBtn = document.getElementById('confirmSingleSheetImportBtn');

    // 文件选择事件
    fileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                // 文件验证通过
                if (file.size > 10 * 1024 * 1024) { // 10MB限制
                    showMessage('文件大小不能超过10MB', 'warning');
                    this.value = '';
                    confirmBtn.disabled = true;
                    return;
                }

                confirmBtn.disabled = false;

                // 自动填充表格名称（如果没有手动输入）
                if (!tableNameInput.value.trim()) {
                    const nameWithoutExt = file.name.replace(/\.(xlsx|xls)$/i, '');
                    tableNameInput.value = nameWithoutExt;
                }
            } else {
                showMessage('请选择.xlsx或.xls格式的Excel文件', 'warning');
                this.value = '';
                confirmBtn.disabled = true;
            }
        } else {
            confirmBtn.disabled = true;
        }
    });

    // 确认导入事件
    confirmBtn.addEventListener('click', function () {
        const file = fileInput.files[0];
        if (file) {
            const tableName = tableNameInput.value.trim();
            importModal.hide();
            processSingleSheetImport(file, sheetId, tableName);
        }
    });

    // 模态框隐藏后清理
    modalElement.addEventListener('hidden.bs.modal', function () {
        this.remove();
    });

    // 显示模态框
    importModal.show();

    // 自动聚焦到文件输入框
    setTimeout(() => {
        if (fileInput) {
            fileInput.focus();
        }
    }, 500);
}

async function processSingleSheetImport(file, sheetId, tableName) {
    try {
        console.log('开始处理单Sheet数据导入...');
        console.log('文件:', file.name, 'Sheet ID:', sheetId, '表格名称:', tableName);

        // 显示加载状态
        showMessage('正在上传Excel文件...', 'info');

        // 直接调用API，不读取文件内容
        const result = await callSingleSheetImportAPI(sheetId, file, tableName);

        if (result.success) {
            showMessage(`单Sheet数据导入成功！`, 'success');
            // 延迟刷新页面，让用户看到成功消息
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            throw new Error(result.message || '导入失败');
        }

    } catch (error) {
        console.error('单Sheet数据导入失败:', error);
        showMessage(`导入失败: ${error.message}`, 'error');
    }
}

// 读取Excel文件内容
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});

                const result = {
                    sheets: []
                };

                // 处理每个工作表
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    result.sheets.push({
                        name: sheetName,
                        data: jsonData
                    });
                });

                resolve(result);
            } catch (error) {
                reject(new Error(`读取Excel文件失败: ${error.message}`));
            }
        };

        reader.onerror = function () {
            reject(new Error('读取文件时发生错误'));
        };

        reader.readAsArrayBuffer(file);
    });
}

// 调用单sheet导入API
// 调用单sheet导入API
async function callSingleSheetImportAPI(sheetId, file, tableName) {
    console.log(`调用单Sheet导入API: /data/api/tables/${sheetId}/load_sheet_data_to_data`);

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('table_name', tableName || '');

        const response = await fetch(`/data/api/tables/${sheetId}/load_sheet_data_to_data`, {
            method: 'POST',
            body: formData
            // 注意：不要设置 Content-Type，让浏览器自动设置 multipart/form-data
        });

        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }

        const data = await response.json();
        console.log('API响应:', data);
        return data;

    } catch (error) {
        console.error('调用单Sheet导入API失败:', error);
        throw error;
    }
}

// 初始化单sheet导入功能
function initializeSingleSheetImport() {
    console.log('单Sheet导入功能已初始化');

    // 可以在这里添加一些全局事件监听或状态初始化
    // 例如：检查XLSX库是否可用
    if (typeof XLSX === 'undefined') {
        console.warn('XLSX库未加载，单Sheet导入功能可能受限');
    }
}