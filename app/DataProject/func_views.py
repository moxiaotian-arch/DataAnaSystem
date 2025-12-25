import base64
import os
import json
import re

from datetime import datetime

import pandas as pd
from flask import request, jsonify, current_app, send_file
from werkzeug.utils import secure_filename

from app import db
from .modules import (
    DataProject, ProjectUser, Table, Sheet, SheetProject,
    ChartData, ChartType, ChartProject
)
from app.user.modules import User  # 导入User模型
from app.core.config import config  # 导入配置文件

from app.Utils.data_project_utils import DataProjectUtils
from app.Utils.chart_utils import ChartUtils
from app.Utils.RequestsUtils import RequestsUtils
from app.Utils.data_detail_utils import ExcelExec


# -------------------------项目数据处理方法-------------------------------
def project_add():
    """创建项目功能"""
    try:
        # 获取请求数据
        data = request.get_json()

        # 添加调试信息
        print("=== 收到创建项目请求 ===")
        print(f"请求数据: {data}")
        print(f"请求头: {dict(request.headers)}")
        print(f"Content-Type: {request.content_type}")

        if not data:
            print("错误: 请求数据为空")
            return jsonify({
                'success': False,
                'message': '请求数据不能为空'
            }), 400

        # 验证必填字段
        required_fields = ['name', 'user_ids']
        print(f"验证必填字段: {required_fields}")

        for field in required_fields:
            print(f"检查字段 '{field}': 存在={field in data}, 值={data.get(field) if field in data else '不存在'}")
            if field not in data or not data[field]:
                print(f"错误: 字段 '{field}' 为空或不存在")
                return jsonify({
                    'success': False,
                    'message': f'{field}字段不能为空'
                }), 400

        name = data['name'].strip()
        description = data.get('description', '').strip()
        user_ids = data['user_ids']  # 用户ID列表

        print(f"处理数据 - 名称: '{name}', 描述: '{description}', 用户ID: {user_ids}")

        # 检查项目名是否已存在
        existing_project = DataProject.query.filter_by(name=name).first()
        if existing_project:
            print(f"错误: 项目名 '{name}' 已存在")
            return jsonify({
                'success': False,
                'message': '项目名已存在'
            }), 400

        # 验证用户是否存在
        valid_users = []
        for user_id in user_ids:
            user = User.query.get(user_id)
            if not user:
                print(f"错误: 用户ID {user_id} 不存在")
                return jsonify({
                    'success': False,
                    'message': f'用户ID {user_id} 不存在'
                }), 400
            valid_users.append(user)
            print(f"用户 {user_id} 验证通过: {user.username}")

        # 创建新项目
        new_project = DataProject(
            name=name,
            description=description
        )

        db.session.add(new_project)
        db.session.flush()  # 获取项目ID但不提交事务
        print(f"创建项目成功，项目ID: {new_project.id}")

        # 创建项目-用户关联关系
        for user_id in user_ids:
            project_user = ProjectUser(
                user_id=user_id,
                project_id=new_project.id
            )
            db.session.add(project_user)
            print(f"创建项目-用户关联: 项目ID={new_project.id}, 用户ID={user_id}")

        db.session.commit()
        print("数据库提交成功")

        # 获取完整的项目信息（包含用户信息）
        project_dict = new_project.to_dict()
        project_dict['users'] = [user.to_dict() for user in valid_users]

        print("=== 项目创建完成 ===")
        return jsonify({
            'success': True,
            'message': '项目创建成功',
            'project': project_dict
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"=== 发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'项目创建失败: {str(e)}'
        }), 500


def get_project_list():
    """获取项目列表（包含用户信息）"""
    try:
        projects = DataProject.query.all()
        project_list = []

        for project in projects:
            project_dict = project.to_dict()
            # 获取项目关联的用户
            project_users = ProjectUser.query.filter_by(project_id=project.id).all()
            user_ids = [pu.user_id for pu in project_users]
            users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []
            project_dict['users'] = [user.to_dict() for user in users]
            project_list.append(project_dict)

        return jsonify({
            'success': True,
            'projects': project_list,
            'count': len(projects)
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取项目列表失败: {str(e)}'
        }), 500


def project_delete(project_id):
    """删除项目功能"""
    try:
        print(f"=== 收到删除项目请求 ===")
        print(f"要删除的项目ID: {project_id}")

        # 查找项目是否存在
        project = DataProject.query.get(project_id)
        if not project:
            print(f"错误: 项目ID {project_id} 不存在")
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404

        print(f"找到项目: {project.name} (ID: {project.id})")

        # 先删除项目-用户关联关系
        project_users = ProjectUser.query.filter_by(project_id=project_id).all()
        for project_user in project_users:
            db.session.delete(project_user)
            print(f"删除项目-用户关联: 项目ID={project_id}, 用户ID={project_user.user_id}")

        # 删除项目本身
        db.session.delete(project)
        db.session.commit()

        print(f"项目删除成功: {project.name}")
        return jsonify({
            'success': True,
            'message': '项目删除成功'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"=== 删除项目时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'项目删除失败: {str(e)}'
        }), 500


def get_users_for_select():
    """获取用户列表用于下拉选择"""
    try:
        users = User.query.all()
        return jsonify({
            'success': True,
            'users': [{
                'id': user.id,
                'username': user.username,
                'email': user.email
            } for user in users]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取用户列表失败: {str(e)}'
        }), 500


def get_project_detail(project_id):
    """获取项目详情"""
    try:
        print(f"=== 获取项目详情请求 ===")
        print(f"项目ID: {project_id}")

        # 查找项目是否存在
        project = DataProject.query.get(project_id)
        if not project:
            print(f"错误: 项目ID {project_id} 不存在")
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404

        # 获取项目关联的用户
        project_users = ProjectUser.query.filter_by(project_id=project_id).all()
        user_ids = [pu.user_id for pu in project_users]
        users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []

        project_dict = project.to_dict()
        project_dict['users'] = [user.to_dict() for user in users]
        project_dict['user_ids'] = user_ids  # 单独返回用户ID列表，便于前端处理

        print(f"项目详情获取成功: {project.name}")
        return jsonify({
            'success': True,
            'project': project_dict
        }), 200

    except Exception as e:
        print(f"=== 获取项目详情时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'获取项目详情失败: {str(e)}'
        }), 500


def project_update(project_id):
    """更新项目信息"""
    try:
        # 获取请求数据
        data = request.get_json()

        print("=== 收到更新项目请求 ===")
        print(f"项目ID: {project_id}")
        print(f"请求数据: {data}")

        if not data:
            print("错误: 请求数据为空")
            return jsonify({
                'success': False,
                'message': '请求数据不能为空'
            }), 400

        # 验证项目是否存在
        project = DataProject.query.get(project_id)
        if not project:
            print(f"错误: 项目ID {project_id} 不存在")
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404

        # 验证必填字段
        required_fields = ['name', 'user_ids']
        print(f"验证必填字段: {required_fields}")

        for field in required_fields:
            print(f"检查字段 '{field}': 存在={field in data}, 值={data.get(field) if field in data else '不存在'}")
            if field not in data or not data[field]:
                print(f"错误: 字段 '{field}' 为空或不存在")
                return jsonify({
                    'success': False,
                    'message': f'{field}字段不能为空'
                }), 400

        name = data['name'].strip()
        description = data.get('description', '').strip()
        user_ids = data['user_ids']  # 用户ID列表

        print(f"处理数据 - 名称: '{name}', 描述: '{description}', 用户ID: {user_ids}")

        # 检查项目名是否已存在（排除当前项目）
        existing_project = DataProject.query.filter(
            DataProject.name == name,
            DataProject.id != project_id
        ).first()
        if existing_project:
            print(f"错误: 项目名 '{name}' 已存在")
            return jsonify({
                'success': False,
                'message': '项目名已存在'
            }), 400

        # 验证用户是否存在
        valid_users = []
        for user_id in user_ids:
            user = User.query.get(user_id)
            if not user:
                print(f"错误: 用户ID {user_id} 不存在")
                return jsonify({
                    'success': False,
                    'message': f'用户ID {user_id} 不存在'
                }), 400
            valid_users.append(user)
            print(f"用户 {user_id} 验证通过: {user.username}")

        # 更新项目信息
        project.name = name
        project.description = description

        # 删除原有的项目-用户关联关系
        ProjectUser.query.filter_by(project_id=project_id).delete()
        print("删除原有项目-用户关联关系")

        # 创建新的项目-用户关联关系
        for user_id in user_ids:
            project_user = ProjectUser(
                user_id=user_id,
                project_id=project_id
            )
            db.session.add(project_user)
            print(f"创建项目-用户关联: 项目ID={project_id}, 用户ID={user_id}")

        db.session.commit()
        print("数据库提交成功")

        # 获取更新后的项目信息
        project_dict = project.to_dict()
        project_dict['users'] = [user.to_dict() for user in valid_users]

        print("=== 项目更新完成 ===")
        return jsonify({
            'success': True,
            'message': '项目更新成功',
            'project': project_dict
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"=== 更新项目时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'项目更新失败: {str(e)}'
        }), 500


def get_project_stats():
    """获取项目统计信息"""
    try:
        # 获取总项目数
        total_projects = DataProject.query.count()

        # 这里需要根据实际业务逻辑添加状态统计
        # 假设目前所有项目都默认为"进行中"状态
        # 后续可以根据项目状态字段进行实际统计
        active_projects = total_projects  # 暂时用总项目数代替
        pending_projects = 0  # 待启动项目数
        completed_projects = 0  # 已完成项目数

        return jsonify({
            'success': True,
            'stats': {
                'total': total_projects,
                'active': active_projects,
                'pending': pending_projects,
                'completed': completed_projects
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取项目统计失败: {str(e)}'
        }), 500


def get_project_data_views(project_id):
    """获取项目数据视图数据"""
    try:
        print(f"=== 获取项目数据视图请求 ===")
        print(f"项目ID: {project_id}")

        # 验证项目是否存在
        project = DataProject.query.get(project_id)
        if not project:
            print(f"错误: 项目ID {project_id} 不存在")
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404

        # 模拟数据视图数据（实际开发中这里会从数据库获取真实数据）
        data_views = [
            {
                'id': 1,
                'name': '销售数据概览',
                'type': 'chart',
                'description': '展示项目销售数据的总体情况',
                'created_at': '2024-01-15 10:30:00',
                'updated_at': '2024-01-20 14:25:00'
            },
            {
                'id': 2,
                'name': '用户行为分析',
                'type': 'table',
                'description': '分析用户在项目中的行为模式',
                'created_at': '2024-01-18 09:15:00',
                'updated_at': '2024-01-22 16:40:00'
            },
            {
                'id': 3,
                'name': '性能指标监控',
                'type': 'metric',
                'description': '监控项目的关键性能指标',
                'created_at': '2024-01-20 11:20:00',
                'updated_at': '2024-01-25 08:30:00'
            }
        ]

        print(f"数据视图获取成功，共 {len(data_views)} 个视图")
        return jsonify({
            'success': True,
            'project': project.to_dict(),
            'data_views': data_views,
            'total_views': len(data_views)
        }), 200

    except Exception as e:
        print(f"=== 获取数据视图时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'获取数据视图失败: {str(e)}'
        }), 500


# -------------------------表格数据处理方法-------------------------------
def save_workbook_data(project_id):
    """保存工作簿数据到文件系统，并转换为Excel，同时存入数据库"""
    try:
        print(f"=== 收到保存工作簿请求 ===")
        print(f"项目ID: {project_id}")

        # 获取请求数据
        data = request.get_json()
        print(f"请求数据: {data}")

        # 使用工具类验证数据
        is_valid, validation_msg = DataProjectUtils.validate_workbook_data(data)
        if not is_valid:
            print(f"数据验证失败: {validation_msg}")
            return jsonify({
                'success': False,
                'message': validation_msg
            }), 400

        workbook_name = data['workbook_name']
        sheets_data = data['sheets']

        print(f"处理工作簿: {workbook_name}, 包含 {len(sheets_data)} 个表格")

        # 验证项目是否存在
        project = DataProject.query.get(project_id)
        if not project:
            print(f"错误: 项目ID {project_id} 不存在")
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404

        # 使用工具类准备项目目录
        project_dir = DataProjectUtils.prepare_project_directory(project_id, config)
        print(f"项目目录: {project_dir}")

        # 保存工作簿数据为JSON文件
        json_file_path = os.path.join(project_dir, f"{workbook_name}.json")
        workbook_structure = {
            'project_id': project_id,
            'project_name': project.name,
            'workbook_name': workbook_name,
            'saved_at': datetime.utcnow().isoformat(),
            'sheets': sheets_data
        }

        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(workbook_structure, f, ensure_ascii=False, indent=2)

        print(f"工作簿JSON数据已保存到: {json_file_path}")

        # 使用工具类将JSON转换为Excel文件（修改点：不再生成CSV）
        excel_file_path = os.path.join(project_dir, f"{workbook_name}.xlsx")

        DataProjectUtils.convert_json_to_excel(json_file_path, excel_file_path)  # 修改点：调用新方法
        print("JSON数据已成功转换为Excel文件")

        # 数据库操作部分保持不变
        try:
            # 1. 创建Sheet记录
            sheet_record = Sheet(
                name=workbook_name,
                file_path=excel_file_path
            )
            db.session.add(sheet_record)
            db.session.flush()  # 获取ID但不提交

            print(f"创建Sheet记录: ID={sheet_record.id}, 名称={workbook_name}")

            # 2. 创建SheetProject关联记录
            sheet_project = SheetProject(
                sheet_id=sheet_record.id,
                project_id=project_id
            )
            db.session.add(sheet_project)
            print(f"创建SheetProject关联: sheet_id={sheet_record.id}, project_id={project_id}")

            # 3. 创建Table记录（基于页签名）
            table_records = []
            for sheet_data in sheets_data:
                table_name = sheet_data.get('name', '未命名表格')
                table_record = Table(
                    name=table_name,
                    sheet_id=sheet_record.id
                )
                db.session.add(table_record)
                table_records.append(table_record)
                print(f"创建Table记录: 名称={table_name}, sheet_id={sheet_record.id}")

            # 提交所有数据库操作
            db.session.commit()
            print("数据库操作提交成功")

            sheet_id = sheet_record.id
            table_count = len(table_records)

        except Exception as db_error:
            db.session.rollback()
            print(f"数据库操作失败: {str(db_error)}")
            return jsonify({
                'success': False,
                'message': f'数据库操作失败: {str(db_error)}'
            }), 500

        print(f"数据已存入数据库: Sheet ID={sheet_id}, 包含 {table_count} 个Table记录")

        # 使用工具类清除JSON文件
        DataProjectUtils.cleanup_json_file(json_file_path)

        return jsonify({
            'success': True,
            'message': '工作簿数据保存成功',
            'sheet_id': sheet_id,
            'excel_file_path': excel_file_path,
            'table_count': table_count,
            'saved_at': workbook_structure['saved_at']
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"=== 保存工作簿时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'保存工作簿失败: {str(e)}'
        }), 500


def load_workbook_data(project_id):
    """从Excel文件加载工作簿数据"""
    try:
        # 验证项目是否存在
        project = DataProject.query.get(project_id)
        if not project:
            print(f"错误: 项目ID {project_id} 不存在")
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404

        # 查找项目目录
        project_dir = DataProjectUtils.prepare_project_directory(project_id, config)
        if not os.path.exists(project_dir):
            print(f"项目目录不存在: {project_dir}")
            return jsonify({
                'success': True,
                'message': '项目目录不存在，返回空数据',
                'workbook_data': None
            }), 200

        # 查找最新的Excel文件（而不是JSON文件）
        excel_file_path = DataProjectUtils.get_latest_excel_file(project_dir)
        if not excel_file_path:
            print("未找到Excel工作簿文件")
            return jsonify({
                'success': True,
                'message': '未找到工作簿文件',
                'workbook_data': None
            }), 200

        print(f"找到Excel文件: {excel_file_path}")

        # 使用工具类将Excel文件转换为JSON数据
        workbook_data = DataProjectUtils.convert_excel_to_json(excel_file_path)

        # 添加项目信息到返回数据
        workbook_data['project_id'] = project_id
        workbook_data['project_name'] = project.name

        print(f"从Excel文件加载工作簿数据成功: {excel_file_path}")
        print(f"工作簿包含 {len(workbook_data.get('sheets', []))} 个工作表")

        return jsonify({
            'success': True,
            'message': '工作簿数据加载成功',
            'workbook_data': workbook_data
        }), 200

    except Exception as e:
        print(f"=== 加载工作簿时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'加载工作簿失败: {str(e)}'
        }), 500


def import_excel_file(project_id):
    """简化版Excel文件导入处理"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': '没有上传文件'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': '没有选择文件'}), 400

        if not file.filename.lower().endswith(('.xlsx', '.xls')):
            return jsonify({'success': False, 'message': '只支持.xlsx/.xls格式'}), 400

        # 准备项目数据目录
        project_dir = os.path.join(current_app.config['SHEET_DATA_DIR'], str(project_id))
        os.makedirs(project_dir, exist_ok=True)

        # 覆盖写入数据文件
        target_path = os.path.join(project_dir, 'workbook_data.xlsx')
        file.save(target_path)

        return jsonify({
            'success': True,
            'message': '文件导入成功',
            'filepath': target_path
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'文件导入失败: {str(e)}'
        }), 500


def merge_tables(project_id):
    """数据合并接口 - 完整实现"""
    try:
        print(f"=== 收到数据合并请求 ===")
        print(f"项目ID: {project_id}")

        # 获取请求数据
        data = request.get_json()

        # 验证必要字段
        if not data:
            print("错误: 请求数据为空")
            return jsonify({
                'success': False,
                'message': '请求数据不能为空',
                'error_code': 'VALIDATION_ERROR'
            }), 400

        # 第一步：验证匹配列是否存在于所有源表中
        validation_result = validate_match_columns(data, project_id)
        if not validation_result['success']:
            return jsonify(validation_result), 400

        # 第二步：验证待合并列是否存在
        merge_validation_result = validate_merge_columns(data, project_id)
        if not merge_validation_result['success']:
            return jsonify(merge_validation_result), 400

        # 准备项目目录和Excel文件路径
        project_dir = DataProjectUtils.prepare_project_directory(project_id, config)
        excel_file_path = DataProjectUtils.get_latest_excel_file(project_dir)

        # 第三步：执行数据合并
        merge_result = ExcelExec.join_excels(data, project_id, excel_file_path)

        if merge_result:
            # 合并成功后，重新加载工作簿数据返回给前端
            try:
                workbook_data = DataProjectUtils.convert_excel_to_json(excel_file_path)
                return RequestsUtils.make_response(
                    status_code=200,
                    msg='数据合并成功',
                    data={
                        'merge_result': {
                            'target_table': data.get('targetTableName'),
                            'source_tables': data.get('sourceTableNames', []),
                            'merged_columns_count': len(data.get('mergeColumns', [])),
                            'created_new_table': data.get('createNewTable', False),
                            'new_table_name': data.get('newTableName', '')
                        },
                    }
                )
            except Exception as load_error:
                print(f"加载合并后数据失败: {str(load_error)}")

                return jsonify({
                    'success': True,
                    'message': '数据合并成功，但加载更新数据时出现问题',
                    'error_code': 'DATA_LOAD_ERROR',
                    'details': str(load_error)
                }), 200

        else:
            return jsonify({
                'success': False,
                'message': '数据合并失败，请检查数据格式',
                'error_code': 'MERGE_EXECUTION_ERROR'
            }), 500

    except Exception as e:
        print(f"=== 数据合并时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'数据合并失败: {str(e)}',
            'error_code': 'UNKNOWN_ERROR',
            'details': str(e)
        }), 500


def validate_match_columns(data, project_id):
    """第一步：验证匹配列是否存在于所有源表中"""
    try:
        print("=== 开始验证匹配列 ===")

        target_table_name = data.get('targetTableName')
        source_table_names = data.get('sourceTableNames', [])
        match_columns = data.get('matchColumns', [])

        print(f"目标表: {target_table_name}")
        print(f"源表: {source_table_names}")
        print(f"匹配列: {match_columns}")

        if not match_columns:
            return {
                'success': False,
                'message': '匹配列不能为空'
            }

        if not source_table_names:
            return {
                'success': False,
                'message': '源表列表不能为空'
            }

        # 获取项目的工作簿数据
        workbook_data = get_project_workbook_data(project_id)
        if not workbook_data:
            return {
                'success': False,
                'message': '项目工作簿数据不存在'
            }

        # 检查所有源表是否存在
        all_tables = [target_table_name] + source_table_names
        missing_tables = []

        for table_name in all_tables:
            if not find_table_by_name(workbook_data, table_name):
                missing_tables.append(table_name)

        if missing_tables:
            return {
                'success': False,
                'message': f'以下表格不存在: {", ".join(missing_tables)}'
            }

        # 验证匹配列是否在所有表中都存在
        missing_columns_info = []

        for table_name in all_tables:
            table = find_table_by_name(workbook_data, table_name)
            if table:
                table_columns = [col['name'] for col in table.get('columns', [])]

                missing_columns = []
                for match_col in match_columns:
                    if match_col not in table_columns:
                        missing_columns.append(match_col)

                if missing_columns:
                    missing_columns_info.append({
                        'table_name': table_name,
                        'missing_columns': missing_columns
                    })

        if missing_columns_info:
            error_messages = []
            for info in missing_columns_info:
                error_messages.append(
                    f"表 '{info['table_name']}' 中缺少列: {', '.join(info['missing_columns'])}"
                )

            return {
                'success': False,
                'message': '匹配列在部分表中不存在: ' + '; '.join(error_messages)
            }

        print("=== 匹配列验证通过 ===")
        return {'success': True}

    except Exception as e:
        print(f"验证匹配列时发生异常: {str(e)}")
        return {
            'success': False,
            'message': f'验证匹配列失败: {str(e)}'
        }


def validate_merge_columns(data, project_id):
    """第二步：验证待合并列是否存在"""
    try:
        print("=== 开始验证待合并列 ===")

        merge_columns_config = data.get('mergeColumns', [])

        print(f"待合并列配置: {merge_columns_config}")

        if not merge_columns_config:
            return {
                'success': False,
                'message': '未找到待合入数据配置'
            }

        # 获取项目的工作簿数据
        workbook_data = get_project_workbook_data(project_id)
        if not workbook_data:
            return {
                'success': False,
                'message': '项目工作簿数据不存在'
            }

        # 验证每个待合并配置
        missing_tables = []
        missing_columns_info = []

        for merge_config in merge_columns_config:
            table_name = merge_config.get('tableName')
            columns = merge_config.get('columns', [])

            if not table_name:
                return {
                    'success': False,
                    'message': '待合并配置中表名不能为空'
                }

            # 检查表是否存在
            table = find_table_by_name(workbook_data, table_name)
            if not table:
                missing_tables.append(table_name)
                continue

            # 检查列是否存在
            table_columns = [col['name'] for col in table.get('columns', [])]
            missing_columns = []

            for column in columns:
                if column not in table_columns:
                    missing_columns.append(column)

            if missing_columns:
                missing_columns_info.append({
                    'table_name': table_name,
                    'missing_columns': missing_columns
                })

        if missing_tables:
            return {
                'success': False,
                'message': f'以下待合入表格不存在: {", ".join(missing_tables)}'
            }

        if missing_columns_info:
            error_messages = []
            for info in missing_columns_info:
                error_messages.append(
                    f"表 '{info['table_name']}' 中缺少列: {', '.join(info['missing_columns'])}"
                )

            return {
                'success': False,
                'message': '待合入列在部分表中不存在: ' + '; '.join(error_messages)
            }

        print("=== 待合并列验证通过 ===")
        return {'success': True}

    except Exception as e:
        print(f"验证待合并列时发生异常: {str(e)}")
        return {
            'success': False,
            'message': f'验证待合并列失败: {str(e)}'
        }


# 辅助函数
def get_project_workbook_data(project_id):
    """获取项目的工作簿数据"""
    try:
        # 这里需要根据实际的数据存储方式实现
        # 假设我们从文件系统或数据库加载工作簿数据
        project_dir = DataProjectUtils.prepare_project_directory(project_id, config)
        excel_file_path = DataProjectUtils.get_latest_excel_file(project_dir)

        if excel_file_path and os.path.exists(excel_file_path):
            return DataProjectUtils.convert_excel_to_json(excel_file_path)

        return None
    except Exception as e:
        print(f"获取项目工作簿数据失败: {str(e)}")
        return None


def find_table_by_name(workbook_data, table_name):
    """根据表名查找表"""
    if not workbook_data or 'sheets' not in workbook_data:
        return None

    for sheet in workbook_data['sheets']:
        if sheet.get('name') == table_name:
            return sheet
    return None


# -------------------------chart处理方法-------------------------------
def get_chart_types():
    """获取图表类型列表（用于创建文件夹）"""
    try:
        print("=== 获取图表类型列表请求 ===")

        # 从数据库获取所有图表类型
        chart_types = ChartType.query.all()

        chart_types_list = []
        for chart_type in chart_types:
            # 获取该类型对应的图表数量
            chart_count = ChartData.query.filter_by(chart_type_id=chart_type.id).count()

            chart_types_list.append({
                'id': chart_type.id,
                'type_name': chart_type.type_name,
                'description': chart_type.description,
                'chart_count': chart_count,
                'create_time': chart_type.created_at.strftime('%Y-%m-%d') if chart_type.created_at else '未知'
            })

        print(f"获取到 {len(chart_types_list)} 个图表类型")
        return jsonify({
            'success': True,
            'chart_types': chart_types_list,
            'count': len(chart_types_list)
        }), 200

    except Exception as e:
        print(f"=== 获取图表类型列表时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'获取图表类型列表失败: {str(e)}'
        }), 500


def get_charts_by_type(chart_type_id):
    """根据图表类型ID获取该类型下的所有图表"""
    try:
        print(f"=== 获取图表类型详情请求 ===")
        print(f"图表类型ID: {chart_type_id}")

        # 验证图表类型是否存在
        chart_type = ChartType.query.get(chart_type_id)
        if not chart_type:
            print(f"错误: 图表类型ID {chart_type_id} 不存在")
            return jsonify({
                'success': False,
                'message': '图表类型不存在'
            }), 404

        # 获取该类型下的所有图表
        charts = ChartData.query.filter_by(chart_type_id=chart_type_id).all()

        charts_list = []
        for chart in charts:
            charts_list.append({
                'id': chart.id,
                'name': chart.chart_name,
                'type': chart_type.type_name,  # 使用图表类型的名称
                'path': chart.file_path or '未设置路径',
                'create_time': chart.created_at.strftime('%Y-%m-%d %H:%M') if chart.created_at else '未知'
            })

        print(f"获取到图表类型 '{chart_type.type_name}' 下的 {len(charts_list)} 个图表")
        return jsonify({
            'success': True,
            'chart_type': {
                'id': chart_type.id,
                'type_name': chart_type.type_name,
                'description': chart_type.description
            },
            'charts': charts_list,
            'count': len(charts_list)
        }), 200

    except Exception as e:
        print(f"=== 获取图表类型详情时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'获取图表类型详情失败: {str(e)}'
        }), 500


def create_chart():
    """创建新图表"""
    try:
        print("=== 收到创建图表请求 ===")

        # 检查是否包含文件上传
        if 'chart_file' in request.files:
            file = request.files['chart_file']
            # 处理文件上传逻辑
            if file.filename != '':
                # 文件保存逻辑（这里简化处理）
                filename = secure_filename(file.filename)
                print(f"收到文件: {filename}")

        # 获取表单数据
        chart_name = request.form.get('chart_name', '').strip()
        chart_type_id = request.form.get('chart_type_id', type=int)
        project_id = request.form.get('project_id', type=int)

        print(f"图表数据 - 名称: '{chart_name}', 类型ID: {chart_type_id}, 项目ID: {project_id}")

        if not chart_name:
            return jsonify({
                'success': False,
                'message': '图表名称不能为空'
            }), 400

        if not chart_type_id:
            return jsonify({
                'success': False,
                'message': '图表类型ID不能为空'
            }), 400

        # 验证图表类型是否存在
        chart_type = ChartType.query.get(chart_type_id)
        if not chart_type:
            return jsonify({
                'success': False,
                'message': '图表类型不存在'
            }), 404

        # 创建新图表记录
        new_chart = ChartData(
            chart_type_id=chart_type_id,
            chart_name=chart_name,
            file_path=None  # 实际项目中这里应该保存文件路径
        )

        db.session.add(new_chart)
        db.session.commit()

        # 创建图表-项目关联关系
        chart_project = ChartProject(
            chart_id=new_chart.id,
            project_id=project_id
        )
        db.session.add(chart_project)
        db.session.commit()

        print(f"图表创建成功: ID={new_chart.id}, 名称={chart_name}")

        return jsonify({
            'success': True,
            'message': '图表创建成功',
            'chart': {
                'id': new_chart.id,
                'name': new_chart.chart_name,
                'type': chart_type.type_name,
                'create_time': new_chart.created_at.strftime('%Y-%m-%d %H:%M') if new_chart.created_at else '未知'
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"创建图表时发生异常: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'创建图表失败: {str(e)}'
        }), 500


def get_charts_by_type_with_pagination(chart_type_id):
    """根据图表类型ID获取该类型下的图表（带分页）"""
    try:
        print(f"=== 获取图表分页数据请求 ===")
        print(f"图表类型ID: {chart_type_id}")

        # 获取分页参数
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        # 验证图表类型是否存在
        chart_type = ChartType.query.get(chart_type_id)
        if not chart_type:
            print(f"错误: 图表类型ID {chart_type_id} 不存在")
            return jsonify({
                'success': False,
                'message': '图表类型不存在'
            }), 404

        # 分页查询图表数据
        charts_query = ChartData.query.filter_by(chart_type_id=chart_type_id)
        total_charts = charts_query.count()

        # 分页处理
        charts_pagination = charts_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # 格式化图表数据
        charts_list = []
        for chart in charts_pagination.items:
            charts_list.append({
                'id': chart.id,
                'name': chart.chart_name,
                'path': chart.file_path or '未设置路径',
                'create_time': chart.created_at.strftime('%Y-%m-%d %H:%M') if chart.created_at else '未知'
            })

        print(f"获取到图表类型 '{chart_type.type_name}' 下的图表数据，第{page}页，共{charts_pagination.pages}页")

        return jsonify({
            'success': True,
            'chart_type': {
                'id': chart_type.id,
                'type_name': chart_type.type_name,
                'description': chart_type.description
            },
            'charts': charts_list,
            'pagination': {
                'current_page': page,
                'per_page': per_page,
                'total_pages': charts_pagination.pages,
                'total_charts': total_charts,
                'has_prev': charts_pagination.has_prev,
                'has_next': charts_pagination.has_next,
                'prev_num': charts_pagination.prev_num,
                'next_num': charts_pagination.next_num
            }
        }), 200

    except Exception as e:
        print(f"=== 获取图表分页数据时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'获取图表数据失败: {str(e)}'
        }), 500


def get_project_sheets(project_id):
    """获取项目下的所有Sheet列表"""
    try:
        print(f"=== 获取项目Sheet列表请求 ===")
        print(f"项目ID: {project_id}")

        # 验证项目是否存在
        project = DataProject.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404

        # 获取项目关联的Sheet
        sheet_project = SheetProject.query.filter_by(project_id=project_id).order_by(
            SheetProject.sheet_id.desc()).first()
        sheet = Sheet.query.filter(Sheet.id == sheet_project.sheet_id).first()
        # 获取文件下的sheets
        sheets = ExcelExec.get_table_sheets(sheet.file_path)
        # 获取每个sheets的字段
        sheet_column_params = {}
        for sheet_name in sheets:
            sheet_columns = ExcelExec.get_table_sheet_columns(sheet.file_path, sheet_name)
            sheet_column_params[sheet_name] = sheet_columns

        return RequestsUtils.make_response(
            status_code=200,
            msg="获取列成功",
            data=sheet_column_params,
            success=True
        )

    except Exception as e:
        print(f"=== 获取项目Sheet列表时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'获取Sheet列表失败: {str(e)}'
        }), 500


def get_sheet_headers(sheet_id):
    """获取Sheet的表头信息"""
    try:
        print(f"=== 获取Sheet表头请求 ===")
        print(f"Sheet ID: {sheet_id}")

        # 验证Sheet是否存在
        sheet = Sheet.query.get(sheet_id)
        if not sheet:
            return jsonify({
                'success': False,
                'message': 'Sheet不存在'
            }), 404

        # 从Excel文件中读取表头信息
        if not sheet.file_path or not os.path.exists(sheet.file_path):
            return jsonify({
                'success': False,
                'message': 'Sheet文件不存在'
            }), 404

        # 读取Excel文件
        excel_file = pd.ExcelFile(sheet.file_path)

        headers_list = []

        # 读取每个工作表的表头
        for sheet_name in excel_file.sheet_names:
            try:
                # 读取前几行获取表头
                df = pd.read_excel(sheet.file_path, sheet_name=sheet_name, nrows=5)

                for col_name in df.columns:
                    headers_list.append({
                        'sheet_name': sheet_name,
                        'name': str(col_name),
                        'type': str(df[col_name].dtype),
                        'sample_data': df[col_name].dropna().head(3).tolist() if not df[col_name].dropna().empty else []
                    })

            except Exception as e:
                print(f"读取工作表 {sheet_name} 时出错: {str(e)}")
                continue

        print(f"从Sheet {sheet.name} 中读取到 {len(headers_list)} 个表头字段")
        return jsonify({
            'success': True,
            'headers': headers_list,
            'sheet_name': sheet.name,
            'total_headers': len(headers_list)
        }), 200

    except Exception as e:
        print(f"=== 获取Sheet表头时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'获取表头信息失败: {str(e)}'
        }), 500


def generate_chart():
    """根据配置生成图表（修复sheet_id和table_id逻辑）"""
    try:
        print("=== 收到前端图表数据 ===")

        # 获取请求数据
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'message': '请求数据不能为空'
            }), 400

        # 打印接收到的数据
        print("前端发送的数据:")
        print(json.dumps(data, ensure_ascii=False, indent=2))

        # 验证必填字段 - 添加sheet_id和table_id验证
        required_fields = ['project_id', 'chart_type_id', 'sheet_id', 'table_id', 'x_axis', 'y_axis', 'chart_name']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'{field}字段不能为空'
                }), 400

        # 提取参数
        project_id = data['project_id']
        chart_type_id = data['chart_type_id']
        sheet_id = data['sheet_id']  # 真实的sheet ID，用于获取文件路径
        table_id = data['table_id']  # table ID，用于获取表名
        x_axis = data['x_axis']
        y_axis = data['y_axis']  # 数组
        category = data.get('category')
        chart_name = data['chart_name']

        print(f"开始处理图表生成: 项目ID={project_id}, 图表类型ID={chart_type_id}")
        print(f"Sheet ID: {sheet_id}, Table ID: {table_id}")

        # 1. 验证项目、Sheet、Table、图表类型是否存在
        project = DataProject.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404

        chart_type = ChartType.query.get(chart_type_id)
        if not chart_type:
            return jsonify({
                'success': False,
                'message': '图表类型不存在'
            }), 404

        # 验证Sheet是否存在
        sheet = Sheet.query.get(sheet_id)
        if not sheet:
            return jsonify({
                'success': False,
                'message': 'Sheet不存在'
            }), 404

        # 验证Table是否存在
        table = Table.query.get(table_id)
        if not table:
            return jsonify({
                'success': False,
                'message': 'Table不存在'
            }), 404

        # 验证Table是否属于指定的Sheet
        if table.sheet_id != sheet.id:
            return jsonify({
                'success': False,
                'message': 'Table不属于指定的Sheet'
            }), 400

        print(f"验证通过: Sheet文件路径={sheet.file_path}, Table名称={table.name}")

        # 2. 读取Excel数据 - 使用table.name作为工作表名称
        print(f"读取Excel文件: {sheet.file_path}, 工作表: {table.name}")
        try:
            # 读取指定工作表
            df = pd.read_excel(sheet.file_path, sheet_name=table.name)
            print(f"成功读取数据，形状: {df.shape}")
            print(f"数据列: {list(df.columns)}")
        except Exception as e:
            print(f"读取Excel文件失败: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'读取Excel文件失败: {str(e)}'
            }), 500

        # 3. 验证选择的列是否存在
        all_columns = list(df.columns)
        missing_columns = []

        # 检查X轴列
        if x_axis not in all_columns:
            missing_columns.append(f"X轴: {x_axis}")

        # 检查Y轴列
        for y_col in y_axis:
            if y_col not in all_columns:
                missing_columns.append(f"Y轴: {y_col}")

        # 检查分类列（如果存在）
        if category and category not in all_columns:
            missing_columns.append(f"分类: {category}")

        if missing_columns:
            return jsonify({
                'success': False,
                'message': f'以下列在数据中不存在: {", ".join(missing_columns)}'
            }), 400

        # 4. 生成图表（这里需要根据您的ChartUtils实现来调整）
        try:
            # 创建图表对象 - 根据您的实际图表生成逻辑调整
            # 示例：使用散点图
            plt = ChartUtils.scatter_chart(
                chart_index=0,
                data=df,
                x_axis=x_axis,
                y_axis=y_axis,
                category=category,
                chart_name=chart_name
            )

            # 生成图表文件路径
            chart_file_path = ChartUtils.save_chart(
                plt=plt,
                project_id=project_id,
                chart_type_name=chart_type.type_name,
                chart_name=chart_name,
                chart_id=0  # 临时ID，后面会用数据库ID
            )

            print(f"图表生成成功: {chart_file_path}")

        except Exception as e:
            print(f"生成图表失败: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'生成图表失败: {str(e)}'
            }), 500

        # 5. 数据库操作 - 开启事务
        try:
            # 创建chart_data记录
            new_chart = ChartData(
                chart_type_id=chart_type_id,
                chart_name=chart_name,
                file_path=chart_file_path,
                created_at=datetime.utcnow()
            )
            db.session.add(new_chart)
            db.session.flush()  # 获取ID但不提交

            chart_id = new_chart.id
            print(f"创建ChartData记录，ID: {chart_id}")

            # 创建chart_projects关联记录
            chart_project = ChartProject(
                chart_id=chart_id,
                project_id=project_id,
                created_at=datetime.utcnow()
            )
            db.session.add(chart_project)

            # 提交所有数据库操作
            db.session.commit()

            print("图表生成和保存完成")

            # 返回成功响应
            return jsonify({
                'success': True,
                'message': '图表生成成功',
                'chart': {
                    'id': chart_id,
                    'name': chart_name,
                    'type': chart_type.type_name,
                    'file_path': chart_file_path,
                    'create_time': new_chart.created_at.strftime('%Y-%m-%d %H:%M')
                }
            }), 200

        except Exception as e:
            db.session.rollback()
            print(f"数据库操作失败: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'数据库操作失败: {str(e)}'
            }), 500

    except Exception as e:
        db.session.rollback()
        print(f"=== 生成图表时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'生成图表失败: {str(e)}'
        }), 500


def preview_chart(chart_id):
    """预览图表 - 返回图表图片流"""
    try:
        print(f"=== 图表预览请求 ===")
        print(f"图表ID: {chart_id}")

        # 验证图表是否存在
        chart = ChartData.query.get(chart_id)
        if not chart:
            return jsonify({
                'success': False,
                'message': '图表不存在'
            }), 404

        # 检查图表文件是否存在
        if not chart.file_path or not os.path.exists(chart.file_path):
            return jsonify({
                'success': False,
                'message': '图表文件不存在'
            }), 404

        print(f"找到图表文件: {chart.file_path}")

        # 返回图片文件流
        return send_file(
            chart.file_path,
            mimetype='image/png',
            as_attachment=False,  # 不作为附件下载
            download_name=f"preview_{chart_id}.png"  # 下载时的文件名
        )

    except Exception as e:
        print(f"=== 图表预览时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'图表预览失败: {str(e)}'
        }), 500


def get_chart_file_path(chart_id):
    """获取图表文件路径（用于下载）"""
    try:
        chart = ChartData.query.get(chart_id)
        if not chart or not chart.file_path:
            return None
        return chart.file_path
    except Exception as e:
        print(f"获取图表文件路径失败: {str(e)}")
        return None


# 通过项目ID和图的typeid获取图的列表
def get_chart_list_by_project_id_or_type_id(project_id):
    """
    1、从请求中获取到项目id和图的typeid
    2、先筛选项目id
    3、如果存在chart_type_id，则筛选chart_type_id
    4、使用RequestsUtils.make_response打包返回值
    """
    try:
        print(f"=== 获取图表列表请求 ===")
        print(f"项目ID: {project_id}")

        # 1. 从请求参数中获取chart_type_id（可选）
        chart_type_id = request.args.get('chart_type_id', type=int)
        print(f"请求参数 - chart_type_id: {chart_type_id}")

        # 2. 验证项目是否存在
        project = DataProject.query.get(project_id)
        if not project:
            print(f"错误: 项目ID {project_id} 不存在")
            return RequestsUtils.make_response(
                status_code=404,
                msg='项目不存在',
                success=False
            )

        # 3. 构建查询 - 先通过项目ID筛选
        chart_projects = ChartProject.query.filter_by(project_id=project_id).all()
        chart_ids = [cp.chart_id for cp in chart_projects]

        if not chart_ids:
            print(f"项目 {project_id} 下没有图表")
            return RequestsUtils.make_response(
                status_code=200,
                msg='项目下暂无图表',
                data=[],
                success=True
            )

        # 4. 根据chart_type_id进一步筛选
        if chart_type_id:
            print(f"按图表类型ID {chart_type_id} 进行筛选")
            # 验证图表类型是否存在
            chart_type = ChartType.query.get(chart_type_id)
            if not chart_type:
                return RequestsUtils.make_response(
                    status_code=404,
                    msg='图表类型不存在',
                    success=False
                )

            # 查询指定类型下的图表
            charts = ChartData.query.filter(
                ChartData.id.in_(chart_ids),
                ChartData.chart_type_id == chart_type_id
            ).all()
        else:
            # 查询项目下的所有图表
            charts = ChartData.query.filter(ChartData.id.in_(chart_ids)).all()

        # 5. 构建返回数据
        charts_list = []
        for chart in charts:
            # 获取图表类型信息
            chart_type = ChartType.query.get(chart.chart_type_id)

            chart_data = {
                'id': chart.id,
                'name': chart.chart_name,
                'type_id': chart.chart_type_id,
                'type_name': chart_type.type_name if chart_type else '未知类型',
                'file_path': chart.file_path,
                'create_time': chart.created_at.strftime('%Y-%m-%d %H:%M') if chart.created_at else '未知',
                'project_id': project_id
            }
            charts_list.append(chart_data)

        print(f"获取到 {len(charts_list)} 个图表")

        # 6. 使用RequestsUtils.make_response打包返回值
        return RequestsUtils.make_response(
            status_code=200,
            msg='获取图表列表成功',
            data=charts_list,
            success=True,
        )

    except Exception as e:
        print(f"=== 获取图表列表时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")

        return RequestsUtils.make_response(
            status_code=500,
            msg=f'获取图表列表失败: {str(e)}',
            success=False
        )


# 通过图ID修改图的信息
def update_chart(chart_id):
    """
    通过图ID修改图的信息
    1、从请求中获取到图ID和要修改的图名
    2、找到对应图
    3、当前只允许修改图名
    4、使用RequestsUtils.make_response打包返回值
    """
    try:
        print(f"=== 更新图表信息请求 ===")
        print(f"图表ID: {chart_id}")

        # 1. 获取请求数据
        data = request.get_json()
        print(f"请求数据: {data}")

        if not data:
            print("错误: 请求数据为空")
            return RequestsUtils.make_response(
                status_code=400,
                msg='请求数据不能为空',
                success=False
            )

        # 2. 验证必填字段
        chart_name = data.get('chart_name', '').strip()
        if not chart_name:
            print("错误: 图表名称不能为空")
            return RequestsUtils.make_response(
                status_code=400,
                msg='图表名称不能为空',
                success=False
            )

        # 3. 验证图表是否存在
        chart = ChartData.query.get(chart_id)
        if not chart:
            print(f"错误: 图表ID {chart_id} 不存在")
            return RequestsUtils.make_response(
                status_code=404,
                msg='图表不存在',
                success=False
            )

        # 4. 检查图表名称是否已存在（排除当前图表）
        existing_chart = ChartData.query.filter(
            ChartData.chart_name == chart_name,
            ChartData.id != chart_id
        ).first()
        if existing_chart:
            print(f"错误: 图表名称 '{chart_name}' 已存在")
            return RequestsUtils.make_response(
                status_code=400,
                msg='图表名称已存在',
                success=False
            )

        # 5. 保存旧的图表名称用于日志
        old_name = chart.chart_name

        # 6. 更新图表信息（当前只允许修改图表名称）
        chart.chart_name = chart_name
        chart.updated_at = datetime.utcnow()

        # 7. 提交到数据库
        db.session.commit()

        print(f"图表更新成功: ID={chart_id}, 旧名称='{old_name}' -> 新名称='{chart_name}'")

        # 8. 获取更新后的图表信息
        chart_type = ChartType.query.get(chart.chart_type_id)

        updated_chart_data = {
            'id': chart.id,
            'chart_name': chart.chart_name,
            'chart_type_id': chart.chart_type_id,
            'chart_type_name': chart_type.type_name if chart_type else '未知类型',
            'file_path': chart.file_path,
            'create_time': chart.created_at.strftime('%Y-%m-%d %H:%M') if chart.created_at else '未知',
            'update_time': chart.updated_at.strftime('%Y-%m-%d %H:%M') if chart.updated_at else '未知'
        }

        # 9. 使用RequestsUtils.make_response返回成功响应
        return RequestsUtils.make_response(
            status_code=200,
            msg='图表信息更新成功',
            data=updated_chart_data,
            success=True
        )

    except Exception as e:
        db.session.rollback()
        print(f"=== 更新图表信息时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")

        return RequestsUtils.make_response(
            status_code=500,
            msg=f'更新图表信息失败: {str(e)}',
            success=False
        )


# 通过图ID获取图的信息
def get_chart_by_id(chart_id):
    """
    通过图ID获取图的信息
    1、从请求中获取到图ID
    2、获取到信息
    3、使用RequestsUtils.make_response打包返回值
    """
    try:
        print(f"=== 获取图表详情请求 ===")
        print(f"图表ID: {chart_id}")

        # 1. 验证图表是否存在
        chart = ChartData.query.get(chart_id)
        if not chart:
            print(f"错误: 图表ID {chart_id} 不存在")
            return RequestsUtils.make_response(
                status_code=404,
                msg='图表不存在',
                success=False
            )

        # 2. 获取图表类型信息
        chart_type = ChartType.query.get(chart.chart_type_id)

        # 3. 获取图表关联的项目信息
        chart_project = ChartProject.query.filter_by(chart_id=chart_id).first()
        project_info = None
        if chart_project:
            project = DataProject.query.get(chart_project.project_id)
            if project:
                project_info = {
                    'id': project.id,
                    'name': project.name
                }

        # 4. 构建完整的图表信息
        chart_data = {
            'id': chart.id,
            'chart_name': chart.chart_name,
            'chart_type_id': chart.chart_type_id,
            'chart_type_name': chart_type.type_name if chart_type else '未知类型',
            'file_path': chart.file_path,
            'file_exists': os.path.exists(chart.file_path) if chart.file_path else False,
            'create_time': chart.created_at.strftime('%Y-%m-%d %H:%M:%S') if chart.created_at else '未知',
            'update_time': chart.updated_at.strftime('%Y-%m-%d %H:%M:%S') if chart.updated_at else '未知',
            'project_info': project_info
        }

        print(f"获取图表详情成功: {chart.chart_name}")

        # 5. 使用RequestsUtils.make_response打包返回值
        return RequestsUtils.make_response(
            status_code=200,
            msg='获取图表详情成功',
            data=chart_data,
            success=True
        )

    except Exception as e:
        print(f"=== 获取图表详情时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")

        return RequestsUtils.make_response(
            status_code=500,
            msg=f'获取图表详情失败: {str(e)}',
            success=False
        )


# 通过图ID获取图的信息，并返回前端可以解析的数据
def get_img_pre_view(chart_id):
    """
    通过图ID获取图的地址，并返回图的数据到前端给前端预览
    1、从请求中获取到图ID
    2、获取到图路径
    3、将图片转换为Base64编码返回给前端
    4、使用RequestsUtils.make_response打包返回值
    """
    try:
        print(f"=== 获取图表预览数据请求 ===")
        print(f"图表ID: {chart_id}")

        # 1. 验证图表是否存在
        chart = ChartData.query.get(chart_id)
        if not chart:
            print(f"错误: 图表ID {chart_id} 不存在")
            return RequestsUtils.make_response(
                status_code=404,
                msg='图表不存在',
                success=False
            )

        # 2. 检查图表文件是否存在
        if not chart.file_path or not os.path.exists(chart.file_path):
            print(f"错误: 图表文件不存在 - {chart.file_path}")
            return RequestsUtils.make_response(
                status_code=404,
                msg='图表文件不存在',
                success=False
            )

        print(f"找到图表文件: {chart.file_path}")

        # 3. 读取图片文件并转换为Base64编码
        try:
            with open(chart.file_path, 'rb') as image_file:
                image_data = image_file.read()
                base64_encoded = base64.b64encode(image_data).decode('utf-8')

            # 根据文件扩展名确定MIME类型
            file_extension = os.path.splitext(chart.file_path)[1].lower()
            mime_type = 'image/png'  # 默认PNG
            if file_extension == '.jpg' or file_extension == '.jpeg':
                mime_type = 'image/jpeg'
            elif file_extension == '.gif':
                mime_type = 'image/gif'
            elif file_extension == '.bmp':
                mime_type = 'image/bmp'
            elif file_extension == '.svg':
                mime_type = 'image/svg+xml'

            # 构建完整的数据URL
            data_url = f"data:{mime_type};base64,{base64_encoded}"

            print(f"图片转换成功，大小: {len(image_data)} 字节，MIME类型: {mime_type}")

        except Exception as e:
            print(f"图片文件读取失败: {str(e)}")
            return RequestsUtils.make_response(
                status_code=500,
                msg=f'图片文件读取失败: {str(e)}',
                success=False
            )

        # 4. 构建返回数据
        preview_data = {
            'chart_id': chart_id,
            'chart_name': chart.chart_name,
            'file_path': chart.file_path,
            'file_size': len(image_data),
            'mime_type': mime_type,
            'data_url': data_url,  # 完整的Base64数据URL，前端可以直接用在img标签的src中
            'base64_data': base64_encoded,  # 单独的Base64数据，供需要的地方使用
            'preview_available': True
        }

        print(f"图表预览数据生成成功: {chart.chart_name}")

        # 5. 使用RequestsUtils.make_response打包返回值
        return RequestsUtils.make_response(
            status_code=200,
            msg='获取图表预览数据成功',
            data=preview_data,
            success=True
        )

    except Exception as e:
        print(f"=== 获取图表预览数据时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")

        return RequestsUtils.make_response(
            status_code=500,
            msg=f'获取图表预览数据失败: {str(e)}',
            success=False
        )


# 通过图ID删除图
def delete_chart_by_id(chart_id):
    """通过图ID删除图表及其关联关系"""
    try:
        print(f"=== 删除图表请求 ===")
        print(f"图表ID: {chart_id}")

        # 1. 查询图表是否存在
        chart = ChartData.query.get(chart_id)
        if not chart:
            print(f"错误: 图表ID {chart_id} 不存在")
            return RequestsUtils.make_response(
                status_code=404,
                msg='图表不存在',
                success=False
            )

        # 2. 删除关联的 ChartProject 记录
        chart_projects = ChartProject.query.filter_by(chart_id=chart_id).all()
        for cp in chart_projects:
            db.session.delete(cp)
            print(f"删除图表-项目关联: chart_id={chart_id}, project_id={cp.project_id}")

        # 3. 尝试删除物理文件（如果存在）
        file_deleted = False
        if chart.file_path and os.path.exists(chart.file_path):
            try:
                os.remove(chart.file_path)
                file_deleted = True
                print(f"物理图表文件已删除: {chart.file_path}")
            except OSError as e:
                print(f"警告: 无法删除图表文件 {chart.file_path}: {e}")

        # 4. 删除主图表记录
        db.session.delete(chart)
        db.session.commit()

        print(f"图表删除成功: ID={chart_id}, 文件删除={'成功' if file_deleted else '跳过'}")

        return RequestsUtils.make_response(
            status_code=200,
            msg='图表删除成功',
            data={
                'chart_id': chart_id,
                'file_deleted': file_deleted,
                'file_path': chart.file_path
            },
            success=True
        )

    except Exception as e:
        db.session.rollback()
        print(f"=== 删除图表时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return RequestsUtils.make_response(
            status_code=500,
            msg=f'删除图表失败: {str(e)}',
            success=False
        )


# 通过图ID下载图
def download_chart(chart_id):
    """下载指定图表的文件"""
    try:
        print(f"=== 下载图表请求 ===")
        print(f"图表ID: {chart_id}")

        # 1. 查询图表是否存在
        chart = ChartData.query.get(chart_id)
        if not chart:
            print(f"错误: 图表ID {chart_id} 不存在")
            return RequestsUtils.make_response(
                status_code=404,
                msg='图表不存在',
                success=False
            )

        # 2. 检查图表文件是否存在
        if not chart.file_path or not os.path.exists(chart.file_path):
            print(f"错误: 图表文件不存在 - {chart.file_path}")
            return RequestsUtils.make_response(
                status_code=404,
                msg='图表文件不存在',
                success=False
            )

        print(f"找到图表文件: {chart.file_path}")

        # 3. 获取文件名（处理中文字符问题）
        filename = os.path.basename(chart.file_path)
        # 确保文件名安全（移除非法字符）
        safe_filename = re.sub(r'[\\/*?:"<>|]', "", filename)
        if not safe_filename:
            safe_filename = f"chart_{chart_id}{os.path.splitext(filename)[1]}"

        # 4. 获取文件 MIME 类型
        file_extension = os.path.splitext(chart.file_path)[1].lower()
        mime_type = 'application/octet-stream'  # 默认类型
        if file_extension == '.png':
            mime_type = 'image/png'
        elif file_extension in ['.jpg', '.jpeg']:
            mime_type = 'image/jpeg'
        elif file_extension == '.gif':
            mime_type = 'image/gif'
        elif file_extension == '.svg':
            mime_type = 'image/svg+xml'

        # 5. 返回文件流（触发浏览器下载）
        return send_file(
            chart.file_path,
            mimetype=mime_type,
            as_attachment=True,
            download_name=safe_filename
        )

    except Exception as e:
        print(f"=== 下载图表时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return RequestsUtils.make_response(
            status_code=500,
            msg=f'下载图表失败: {str(e)}',
            success=False
        )
