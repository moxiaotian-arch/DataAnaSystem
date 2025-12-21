# app/Utils/data_project_utils.py
import os
import json
import pandas as pd
from datetime import datetime


class DataProjectUtils:
    """数据项目工具类"""

    @staticmethod
    def convert_json_to_excel(json_file_path, excel_file_path):
        """将JSON数据转换为Excel文件"""
        try:
            # 读取JSON数据
            with open(json_file_path, 'r', encoding='utf-8') as f:
                workbook_data = json.load(f)

            # 创建Excel写入器
            with pd.ExcelWriter(excel_file_path, engine='openpyxl') as writer:
                for sheet in workbook_data.get('sheets', []):
                    sheet_name = sheet.get('name', 'Sheet1')
                    columns = sheet.get('columns', [])
                    rows = sheet.get('rows', [])

                    # 如果没有数据，创建空的工作表
                    if not columns and not rows:
                        df = pd.DataFrame()
                    else:
                        # 提取列名
                        headers = [col.get('name', f'列{i + 1}') for i, col in enumerate(columns)]

                        # 准备数据行
                        data_rows = []
                        for row in rows:
                            # 按照列的顺序提取数据
                            row_data = []
                            for i, col in enumerate(columns):
                                # 使用列索引作为键来获取单元格值
                                cell_value = row.get(str(i), '')  # 注意：前端存储的键是字符串
                                row_data.append(cell_value)
                            data_rows.append(row_data)

                        # 创建DataFrame
                        df = pd.DataFrame(data_rows, columns=headers)

                    # 写入Excel
                    df.to_excel(writer, sheet_name=sheet_name[:31], index=False)  # 限制sheet名称长度

                    print(f"已转换表格: {sheet_name} -> 行数: {len(rows)}, 列数: {len(columns)}")

            print(f"Excel文件已保存: {excel_file_path}")

        except Exception as e:
            print(f"转换文件时发生错误: {str(e)}")
            raise

    @staticmethod
    def convert_excel_to_json(excel_file_path):
        """将Excel文件转换为JSON格式数据"""
        try:
            print(f"开始转换Excel文件为JSON: {excel_file_path}")

            # 读取Excel文件中的所有sheet
            excel_data = pd.read_excel(excel_file_path, sheet_name=None, engine='openpyxl')

            sheets_data = []

            for sheet_name, df in excel_data.items():
                print(f"处理工作表: {sheet_name}")

                # 处理列数据
                columns = []
                for i, col_name in enumerate(df.columns):
                    columns.append({
                        'id': i,
                        'name': str(col_name) if pd.notna(col_name) else f'列{i + 1}'
                    })

                # 处理行数据
                rows = []
                for _, row in df.iterrows():
                    row_data = {}
                    for i, value in enumerate(row):
                        # 处理NaN值为空字符串
                        cell_value = '' if pd.isna(value) else str(value)
                        row_data[str(i)] = cell_value
                    rows.append(row_data)

                # 构建sheet数据
                sheet_data = {
                    'name': sheet_name,
                    'columns': columns,
                    'rows': rows
                }

                sheets_data.append(sheet_data)
                print(f"工作表 {sheet_name} 转换完成: {len(columns)} 列, {len(rows)} 行")

            # 从文件名提取工作簿名称
            workbook_name = os.path.splitext(os.path.basename(excel_file_path))[0]

            # 构建完整的workbook数据
            workbook_data = {
                'workbook_name': workbook_name,
                'saved_at': datetime.fromtimestamp(os.path.getmtime(excel_file_path)).isoformat(),
                'sheets': sheets_data
            }

            print(f"Excel文件转换完成: 共 {len(sheets_data)} 个工作表")
            return workbook_data

        except Exception as e:
            print(f"转换Excel文件为JSON时发生错误: {str(e)}")
            raise

    @staticmethod
    def cleanup_json_file(json_file_path):
        """清理JSON文件"""
        try:
            if os.path.exists(json_file_path):
                os.remove(json_file_path)
                print(f"已清理JSON文件: {json_file_path}")
                return True
            return False
        except Exception as e:
            print(f"清理JSON文件失败: {str(e)}")
            return False

    @staticmethod
    def validate_workbook_data(data):
        """验证工作簿数据"""
        if not data:
            return False, "请求数据不能为空"

        required_fields = ['workbook_name', 'sheets']
        for field in required_fields:
            if field not in data:
                return False, f"缺少必要字段: {field}"

        # 验证每个sheet的结构
        for i, sheet in enumerate(data.get('sheets', [])):
            if 'name' not in sheet:
                return False, f"第{i + 1}个sheet缺少name字段"
            if 'columns' not in sheet:
                return False, f"第{i + 1}个sheet缺少columns字段"
            if 'rows' not in sheet:
                return False, f"第{i + 1}个sheet缺少rows字段"

        return True, "验证通过"

    @staticmethod
    def prepare_project_directory(project_id, config):
        """准备项目目录"""
        project_dir = os.path.join(config.SHEET_DATA_DIR, str(project_id))
        os.makedirs(project_dir, exist_ok=True)
        return project_dir

    @staticmethod
    def get_latest_excel_file(project_dir):
        """获取项目目录中最新的Excel文件"""
        try:
            if not os.path.exists(project_dir):
                return None

            excel_files = [f for f in os.listdir(project_dir) if f.endswith('.xlsx')]
            if not excel_files:
                return None

            # 按修改时间排序，获取最新的文件
            latest_file = max(excel_files, key=lambda f: os.path.getmtime(os.path.join(project_dir, f)))
            return os.path.join(project_dir, latest_file)

        except Exception as e:
            print(f"获取最新Excel文件时出错: {str(e)}")
            return None

    @staticmethod
    def convert_dict_to_excel(workbook_dict, excel_file_path):
        """将字典数据直接转换为Excel文件"""
        try:
            # 创建Excel写入器
            with pd.ExcelWriter(excel_file_path, engine='openpyxl') as writer:
                for sheet in workbook_dict.get('sheets', []):
                    sheet_name = sheet.get('name', 'Sheet1')
                    columns = sheet.get('columns', [])
                    rows = sheet.get('rows', [])

                    # 如果没有数据，创建空的工作表
                    if not columns and not rows:
                        df = pd.DataFrame()
                    else:
                        # 提取列名
                        headers = [col.get('name', f'列{i + 1}') for i, col in enumerate(columns)]

                        # 准备数据行
                        data_rows = []
                        for row in rows:
                            # 按照列的顺序提取数据
                            row_data = []
                            for i, col in enumerate(columns):
                                # 使用列索引作为键来获取单元格值
                                cell_value = row.get(str(i), '')  # 注意：前端存储的键是字符串
                                row_data.append(cell_value)
                            data_rows.append(row_data)

                        # 创建DataFrame
                        df = pd.DataFrame(data_rows, columns=headers)

                    # 写入Excel
                    df.to_excel(writer, sheet_name=sheet_name[:31], index=False)  # 限制sheet名称长度

                    print(f"已转换表格: {sheet_name} -> 行数: {len(rows)}, 列数: {len(columns)}")

            print(f"Excel文件已保存: {excel_file_path}")
            return True

        except Exception as e:
            print(f"转换字典数据到Excel时发生错误: {str(e)}")
            raise
