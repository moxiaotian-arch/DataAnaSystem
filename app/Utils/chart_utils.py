import os
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from datetime import datetime
import seaborn as sns
from app.core.config import config


class ChartUtils:
    @staticmethod
    def gen_chart(chart_type_id, params):
        """

        """
        chart_types = {
            1: ChartUtils.scatter_chart
            # 2: 'line',  # 折线图
            # 3: 'bar',  # 柱状图
            # 4: 'pie'  # 饼图
        }
        return chart_types.get(chart_type_id)(**params)


    @staticmethod
    def decide_char(chart_type_id):
        """
        根据图表类型ID决定图表类型字符
        """
        chart_types = {
            1: 'scatter',  # 散点图
            # 2: 'line',  # 折线图
            # 3: 'bar',  # 柱状图
            # 4: 'pie'  # 饼图
        }
        return chart_types.get(chart_type_id)

    @staticmethod
    def scatter_chart(data, x_axis, y_axis, category=None, chart_name="散点图", **kwargs):
        """
        生成散点图
        :param data: 数据DataFrame
        :param x_axis: X轴字段名
        :param y_axis: Y轴字段名列表
        :param category: 分类字段名（可选）
        :param chart_name: 图表名称
        :return: 图表文件路径
        """
        try:
            # 设置中文字体
            plt.rcParams['font.sans-serif'] = ['SimHei', 'Arial Unicode MS', 'DejaVu Sans']
            plt.rcParams['axes.unicode_minus'] = False

            # 创建图表
            plt.figure(figsize=(12, 8))

            # 检查数据列是否存在
            if x_axis not in data.columns:
                raise ValueError(f"X轴字段 '{x_axis}' 不存在于数据中")

            # 处理Y轴字段（支持多个Y轴）
            y_columns = []
            for y_field in y_axis:
                if y_field in data.columns:
                    y_columns.append(y_field)
                else:
                    print(f"警告: Y轴字段 '{y_field}' 不存在于数据中，已跳过")

            if not y_columns:
                raise ValueError("没有有效的Y轴字段")

            # 清理数据（去除空值）
            plot_data = data[[x_axis] + y_columns].copy()
            if category and category in data.columns:
                plot_data[category] = data[category]
                plot_data = plot_data.dropna(subset=[x_axis, category] + y_columns)
            else:
                plot_data = plot_data.dropna(subset=[x_axis] + y_columns)

            if plot_data.empty:
                raise ValueError("清理后的数据为空，无法生成图表")

            # 生成散点图
            if category and category in plot_data.columns:
                # 按分类字段分组绘制
                categories = plot_data[category].unique()
                colors = plt.cm.Set3(np.linspace(0, 1, len(categories)))

                for i, cat in enumerate(categories):
                    cat_data = plot_data[plot_data[category] == cat]
                    for y_col in y_columns:
                        plt.scatter(cat_data[x_axis], cat_data[y_col],
                                    c=[colors[i]], label=f'{cat}-{y_col}',
                                    alpha=0.7, s=60, edgecolors='w', linewidth=0.5)
            else:
                # 不分类，直接绘制
                for y_col in y_columns:
                    plt.scatter(plot_data[x_axis], plot_data[y_col],
                                label=y_col, alpha=0.7, s=60, edgecolors='w', linewidth=0.5)

            # 设置图表属性
            plt.xlabel(x_axis, fontsize=12)
            plt.ylabel('值', fontsize=12)
            plt.title(f'{chart_name}\nX轴: {x_axis}, Y轴: {", ".join(y_columns)}', fontsize=14)
            plt.legend()
            plt.grid(True, alpha=0.3)

            # 自动调整刻度标签
            plt.xticks(rotation=45)
            plt.tight_layout()

            return plt

        except Exception as e:
            print(f"生成散点图时出错: {str(e)}")
            raise

    @staticmethod
    def save_chart(plt, project_id, chart_type_name, chart_name, chart_id):
        """
        保存图表到指定路径
        """
        try:
            # 创建保存目录
            save_dir = os.path.join(config.CHART_SAVE_ROOT_DIR, str(project_id), chart_type_name)
            os.makedirs(save_dir, exist_ok=True)

            # 生成文件名（使用图表ID确保唯一性）
            filename = f"{chart_name}_{chart_id}.png"
            filepath = os.path.join(save_dir, filename)

            # 保存图表
            plt.savefig(filepath, dpi=300, bbox_inches='tight', format='png')
            plt.close()

            print(f"图表已保存到: {filepath}")
            return filepath

        except Exception as e:
            print(f"保存图表时出错: {str(e)}")
            raise