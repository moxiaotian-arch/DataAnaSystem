from flask import Blueprint, redirect
from . import func_views, html_views

# 创建DataProject蓝图
data_project_bp = Blueprint('DataProject', __name__)


# 添加根路径重定向到项目首页
@data_project_bp.route('/')
def root_redirect():
    """DataProject蓝图根路径重定向到项目首页"""
    return redirect('/data/project')


# API路由（后端逻辑）- 指定唯一的端点名称
data_project_bp.route('/api/project/add', methods=['POST'], endpoint='api_project_add')(func_views.project_add)
data_project_bp.route('/api/projects', methods=['GET'], endpoint='api_project_list')(func_views.get_project_list)
data_project_bp.route('/api/users/select', methods=['GET'], endpoint='api_users_select')(
    func_views.get_users_for_select)
data_project_bp.route('/api/project/<int:project_id>', methods=['DELETE'], endpoint='api_project_delete')(
    func_views.project_delete)

data_project_bp.route('/api/project/<int:project_id>', methods=['GET'], endpoint='api_project_detail')(
    func_views.get_project_detail)
data_project_bp.route('/api/projects/<int:project_id>', methods=['GET'], endpoint='api_project_detail')(
    func_views.get_project_detail)

data_project_bp.route('/api/project/<int:project_id>', methods=['PUT'], endpoint='api_project_update')(
    func_views.project_update)
data_project_bp.route('/api/project/stats', methods=['GET'], endpoint='api_project_stats')(func_views.get_project_stats)
data_project_bp.route('/api/project/<int:project_id>/data-views', methods=['GET'], endpoint='api_project_data_views')(
    func_views.get_project_data_views)

# 页面路由（前端页面）- 支持两种URL格式以保持兼容性
data_project_bp.route('/project/add', methods=['GET'], endpoint='page_project_add')(html_views.project_add)
# 添加复数形式的创建路由以保持一致性（修复404问题）
data_project_bp.route('/projects/create', methods=['GET'], endpoint='page_projects_create')(html_views.project_add)

data_project_bp.route('/project/edit/<int:project_id>', methods=['GET'], endpoint='page_project_edit')(
    html_views.project_edit)
# 添加新的路由以支持 /projects/3/edit 格式（解决404问题）
data_project_bp.route('/projects/<int:project_id>/edit', methods=['GET'], endpoint='page_project_edit_alt')(
    html_views.project_edit)
data_project_bp.route('/project', methods=['GET'], endpoint='page_project_index')(html_views.project_index)
# 添加复数形式的项目列表路由以保持一致性
data_project_bp.route('/projects', methods=['GET'], endpoint='page_projects_index')(html_views.project_index)
# 添加复数形式的项目详情路由以保持一致性
data_project_bp.route('/projects/<int:project_id>', methods=['GET'], endpoint='page_projects_detail')(
    html_views.project_detail)
# 添加项目详情首页路由
data_project_bp.route('/projects/<int:project_id>/index', methods=['GET'], endpoint='page_project_detail_index')(
    html_views.project_detail_index)

# 添加工作簿数据保存和加载路由
data_project_bp.route('/api/project/<int:project_id>/workbook/save', methods=['POST'], endpoint='api_workbook_save')(
    func_views.save_workbook_data)
data_project_bp.route('/api/project/<int:project_id>/workbook/load', methods=['GET'], endpoint='api_workbook_load')(
    func_views.load_workbook_data)

# 添加Excel文件导入路由
data_project_bp.route('/api/project/<int:project_id>/import-excel', methods=['POST'], endpoint='api_import_excel')(
    func_views.import_excel_file)

# 添加数据制图页面路由
data_project_bp.route('/project/<int:project_id>/chart-table', methods=['GET'], endpoint='page_project_chart_table')(
    html_views.chart_table)
# 添加复数形式的数据制图路由以保持一致性
data_project_bp.route('/projects/<int:project_id>/chart-table', methods=['GET'], endpoint='page_projects_chart_table')(
    html_views.chart_table)

# 图表类型相关API路由
data_project_bp.route('/api/chart-types', methods=['GET'], endpoint='api_chart_types')(func_views.get_chart_types)
data_project_bp.route('/api/chart-types/<int:chart_type_id>/charts', methods=['GET'], endpoint='api_chart_type_charts')(
    func_views.get_charts_by_type)

# 图表文件夹详情页面路由
data_project_bp.route('/projects/<int:project_id>/chart-types/<int:chart_type_id>',
                     methods=['GET'],
                     endpoint='page_chart_table_detail')(html_views.chart_table_detail)

# 图表相关API路由
data_project_bp.route('/api/charts', methods=['POST'], endpoint='api_chart_create')(func_views.create_chart)
data_project_bp.route('/api/charts/<int:chart_id>', methods=['GET'], endpoint='api_chart_detail')(func_views.get_chart_detail)
data_project_bp.route('/api/charts/<int:chart_id>', methods=['PUT'], endpoint='api_chart_update')(func_views.update_chart)
data_project_bp.route('/api/charts/<int:chart_id>', methods=['DELETE'], endpoint='api_chart_delete')(func_views.delete_chart)

# 图表分页数据API路由
data_project_bp.route('/api/chart-types/<int:chart_type_id>/charts/paginated',
                     methods=['GET'],
                     endpoint='api_chart_type_charts_paginated')(
    func_views.get_charts_by_type_with_pagination)

# 本次新增
# 获取项目下的Sheet列表
data_project_bp.route('/api/projects/<int:project_id>/sheets', methods=['GET'], endpoint='api_project_sheets')(
    func_views.get_project_sheets)

# 获取Sheet的表头信息
data_project_bp.route('/api/sheets/<int:sheet_id>/headers', methods=['GET'], endpoint='api_sheet_headers')(
    func_views.get_sheet_headers)

# 生成图表API
data_project_bp.route('/api/charts/generate', methods=['POST'], endpoint='api_chart_generate')(
    func_views.generate_chart)

# 图表预览路由
data_project_bp.route('/api/charts/<int:chart_id>/preview', methods=['GET'], endpoint='api_chart_preview')(
    func_views.preview_chart)

# 图表下载路由
data_project_bp.route('/api/charts/<int:chart_id>/download', methods=['GET'], endpoint='api_chart_download')(
    func_views.download_chart)

# 数据合并API路由
data_project_bp.route('/api/project/<int:project_id>/merge-tables', methods=['POST'], endpoint='api_merge_tables')(
    func_views.merge_tables)


