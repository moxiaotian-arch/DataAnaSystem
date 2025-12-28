from flask import render_template

from app.DataProject.modules import ChartType


def project_add():
    """项目创建页面"""
    return render_template('DataProject/project_add.html')


def project_edit(project_id):
    """项目编辑页面"""
    return render_template('DataProject/project_edit.html', project_id=project_id)


def project_index():
    """项目首页"""
    return render_template('DataProject/index.html')


def project_detail(project_id):
    """项目详情页面"""
    return render_template('DataProject/project_detail.html', project_id=project_id)


def project_detail_index(project_id):
    """项目详情首页"""
    return render_template('Project_detail/project_detail_index.html', project_id=project_id)


def chart_table(project_id):
    """数据制图页面"""
    return render_template('Project_detail/chart_table.html', project_id=project_id)


def chart_table_detail(project_id, chart_type_id):
    """图表文件夹详情页面 - 确保参数正确传递"""
    try:
        # 确保参数是整数
        project_id = int(project_id)
        chart_type_id = int(chart_type_id)

        # 获取图表类型信息
        chart_type = ChartType.query.get(chart_type_id)
        if not chart_type:
            return "图表类型不存在", 404

        print(f"渲染图表详情页面: project_id={project_id}, chart_type_id={chart_type_id}")

        return render_template(
            'Project_detail/chart_table_detail.html',
            project_id=project_id,
            chart_type_id=chart_type_id,
            chart_type_name=chart_type.type_name
        )

    except (ValueError, TypeError) as e:
        print(f"参数错误: project_id={project_id}, chart_type_id={chart_type_id}, 错误: {e}")
        return "参数错误", 400

# -----------------------------数据分析页面路由-----------------------------------------
def data_ana_view(project_id):
    """数据制图页面"""
    return render_template('Project_detail/data_ana_detail.html', project_id=project_id)

