import os
import json

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
        print(json.dumps(data, ensure_ascii=False, indent=2))

        # 验证必要字段
        if not data:
            print("错误: 请求数据为空")
            return jsonify({
                'success': False,
                'message': '请求数据不能为空'
            }), 400

        # 第一步：验证匹配列是否存在于所有源表中
        validation_result = validate_match_columns(data, project_id)
        if not validation_result['success']:
            return jsonify(validation_result), 400

        # 第二步：验证待合并列是否存在
        merge_validation_result = validate_merge_columns(data, project_id)
        if not merge_validation_result['success']:
            return jsonify(merge_validation_result), 400

        # 第三步：执行数据合并
        merge_result = execute_data_merge(data, project_id)
        # return jsonify(merge_result), merge_result.get('status_code', 200)
        return jsonify("test"), 200

    except Exception as e:
        print(f"=== 数据合并时发生异常 ===")
        print(f"错误类型: {type(e).__name__}")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'数据合并失败: {str(e)}'
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


def execute_data_merge(data, project_id):
    """第三步：执行数据合并（修复版）"""
    try:
        print("=== 开始执行数据合并 ===")

        target_table_name = data.get('targetTableName')
        source_table_names = data.get('sourceTableNames', [])
        match_columns = data.get('matchColumns', [])
        merge_columns_config = data.get('mergeColumns', [])
        create_new_table = data.get('createNewTable', False)
        new_table_name = data.get('newTableName', '')
        #
        # print(f"创建新工作簿: {create_new_table}")
        # if create_new_table:
        #     print(f"新工作簿名称: {new_table_name}")
        #
        # # 获取项目的工作簿数据（整个Excel文件）
        # workbook_data = get_project_workbook_data(project_id)
        # if not workbook_data:
        #     return {
        #         'success': False,
        #         'message': '项目工作簿数据不存在',
        #         'status_code': 404
        #     }
        #
        # # 获取目标表数据
        # target_table = find_table_by_name(workbook_data, target_table_name)
        # if not target_table:
        #     return {
        #         'success': False,
        #         'message': f'目标表 {target_table_name} 不存在',
        #         'status_code': 404
        #     }
        #
        # # 获取源表数据
        # source_tables = []
        # for source_table_name in source_table_names:
        #     source_table = find_table_by_name(workbook_data, source_table_name)
        #     if source_table:
        #         source_tables.append(source_table)
        #
        # if not source_tables:
        #     return {
        #         'success': False,
        #         'message': '未找到有效的源表数据',
        #         'status_code': 404
        #     }
        #
        # # 执行合并逻辑
        # if create_new_table:
        #     result = create_new_merged_table(
        #         workbook_data, target_table, source_tables,
        #         match_columns, merge_columns_config, new_table_name
        #     )
        # else:
        #     result = merge_into_target_table(
        #         workbook_data, target_table, source_tables,
        #         match_columns, merge_columns_config
        #     )
        #
        # if result['success']:
        #     # 保存合并后的工作簿数据到同一个Excel文件
        #     save_result = save_merged_workbook_data(project_id, workbook_data)
        #     if not save_result['success']:
        #         return save_result
        #
        #     return {
        #         'success': True,
        #         'message': result['message'],
        #         'merged_table_name': result.get('merged_table_name'),
        #         'created_new_table': create_new_table,
        #         'file_updated': True  # 表示文件已更新
        #     }
        # else:
        #     return result

    except Exception as e:
        print(f"执行数据合并时发生异常: {str(e)}")
        return {
            'success': False,
            'message': f'执行数据合并失败: {str(e)}',
            'status_code': 500
        }


def create_new_merged_table(workbook_data, target_table, source_tables, match_columns, merge_columns_config,
                            new_table_name):
    """创建新合并表（在原Excel中新增工作簿）"""
    try:
        print("=== 在原Excel中新增合并工作簿 ===")

        if not new_table_name.strip():
            return {
                'success': False,
                'message': '新表名称不能为空'
            }

        # 检查新表名是否已存在于当前Excel文件中
        if find_table_by_name(workbook_data, new_table_name):
            return {
                'success': False,
                'message': f'表名 {new_table_name} 已存在，请使用其他名称'
            }

        # 创建新工作簿结构
        new_table = {
            'name': new_table_name,
            'columns': [],
            'rows': []
        }

        # 添加匹配列
        for match_col in match_columns:
            # 从目标表获取列定义
            target_col = find_column_by_name(target_table, match_col)
            if target_col:
                new_table['columns'].append(target_col.copy())

        # 添加待合并列
        for merge_config in merge_columns_config:
            source_table_name = merge_config['tableName']
            source_table = find_table_by_name(workbook_data, source_table_name)

            for column_name in merge_config['columns']:
                source_col = find_column_by_name(source_table, column_name)
                if source_col:
                    # 避免重复列名
                    col_name = column_name
                    counter = 1
                    while find_column_by_name(new_table, col_name):
                        col_name = f"{column_name}_{counter}"
                        counter += 1

                    new_col = source_col.copy()
                    new_col['name'] = col_name
                    new_table['columns'].append(new_col)

        # 执行数据合并
        merged_data = perform_data_merge(target_table, source_tables, match_columns, merge_columns_config)
        new_table['rows'] = merged_data

        # 将新工作簿添加到当前Excel文件的工作簿列表中
        workbook_data['sheets'].append(new_table)

        print(f"新工作簿创建成功，包含 {len(new_table['rows'])} 行数据")
        return {
            'success': True,
            'message': f'数据合并完成，已在原Excel中新增工作簿 "{new_table_name}"',
            'merged_table_name': new_table_name
        }

    except Exception as e:
        print(f"创建新合并工作簿时发生异常: {str(e)}")
        return {
            'success': False,
            'message': f'创建新合并工作簿失败: {str(e)}'
        }


def merge_into_target_table(workbook_data, target_table, source_tables, match_columns, merge_columns_config):
    """合并到目标表（在原Excel中的原工作簿）"""
    try:
        print("=== 合并到目标表 ===")

        original_row_count = len(target_table['rows'])

        # 执行数据合并
        merged_data = perform_data_merge(target_table, source_tables, match_columns, merge_columns_config)

        # 直接更新原工作簿的数据
        target_table['rows'] = merged_data

        new_row_count = len(target_table['rows'])
        added_rows = new_row_count - original_row_count

        print(f"目标表合并完成，新增 {added_rows} 行数据")
        return {
            'success': True,
            'message': f'数据合并完成，目标表 "{target_table["name"]}" 已更新，新增 {added_rows} 行数据'
        }
    except Exception as e:
        print(f"合并到目标表时发生异常: {str(e)}")
        return {
            'success': False,
            'message': f'合并到目标表失败: {str(e)}'
        }


def perform_data_merge(target_table, source_tables, match_columns, merge_columns_config):
    """执行实际的数据合并逻辑（修复版）- 保留目标表所有原始数据"""
    try:
        print("=== 执行数据合并逻辑（修复版）===")

        # 创建目标表数据的完整副本（保留所有列）
        merged_rows = []

        # 1. 首先完整复制目标表的所有数据
        for target_row in target_table['rows']:
            # 创建目标行的完整副本
            merged_row = target_row.copy()  # 重要：复制所有列数据
            merged_row['_source'] = 'target'  # 标记来源
            merged_rows.append(merged_row)

        print(f"目标表原始数据行数: {len(merged_rows)}")

        # 2. 处理源表数据
        for source_table in source_tables:
            print(f"处理源表: {source_table['name']}")

            for source_row in source_table['rows']:
                # 查找匹配的行（基于匹配列）
                matching_row = find_matching_row(merged_rows, source_row, match_columns, source_table)

                if matching_row:
                    print(f"找到匹配行，更新数据")
                    # 更新现有行：只添加/更新待合并列，不删除任何数据
                    update_existing_row(matching_row, source_row, source_table, merge_columns_config)
                else:
                    print(f"未找到匹配行，创建新行")
                    # 创建新行：包含匹配列和待合并列
                    new_row = create_new_row_with_all_data(target_table, source_row, source_table, match_columns,
                                                           merge_columns_config)
                    merged_rows.append(new_row)

        print(f"合并完成，总行数: {len(merged_rows)}")
        return merged_rows

    except Exception as e:
        print(f"执行数据合并逻辑时发生异常: {str(e)}")
        raise e


def create_new_row_with_all_data(target_table, source_row, source_table, match_columns, merge_columns_config):
    """创建新行（修复版）- 包含目标表的所有列结构"""
    new_row = {}

    # 1. 首先设置目标表的所有列（初始化为空值）
    for col_index, col_def in enumerate(target_table['columns']):
        col_name = col_def['name']
        new_row[col_index] = ''  # 初始化为空

    # 2. 填充匹配列数据
    for match_col in match_columns:
        col_index = find_column_index_by_name(target_table, match_col)
        source_col_index = find_column_index_by_name(source_table, match_col)

        if col_index is not None and source_col_index is not None:
            new_row[col_index] = source_row.get(source_col_index, '')

    # 3. 填充待合并列数据
    for config in merge_columns_config:
        if config['tableName'] == source_table['name']:
            for column_name in config['columns']:
                # 在目标表中查找对应的列索引
                col_index = find_column_index_by_name(target_table, column_name)
                source_col_index = find_column_index_by_name(source_table, column_name)

                if col_index is not None and source_col_index is not None:
                    new_row[col_index] = source_row.get(source_col_index, '')

    new_row['_source'] = source_table['name']
    return new_row


def update_existing_row(existing_row, source_row, source_table, merge_columns_config):
    """更新现有行（修复版）- 只更新特定列，不删除数据"""
    # 查找当前源表对应的合并配置
    source_config = None
    for config in merge_columns_config:
        if config['tableName'] == source_table['name']:
            source_config = config
            break

    if source_config:
        for column_name in source_config['columns']:
            # 这里需要根据您的数据结构来更新对应的列
            # 假设 existing_row 使用列索引作为键
            # 您需要根据列名找到对应的索引
            col_index = find_column_index_by_name_from_context(column_name)  # 需要实现这个函数
            source_col_index = find_column_index_by_name(source_table, column_name)

            if col_index is not None and source_col_index is not None:
                existing_row[col_index] = source_row.get(source_col_index, '')

def find_matching_row(merged_rows, source_row, match_columns, source_table):
    """查找匹配的行"""
    for merged_row in merged_rows:
        is_match = True
        for match_col in match_columns:
            source_col_index = find_column_index_by_name(source_table, match_col)
            if source_col_index is not None:
                source_value = source_row.get(source_col_index, '')
                merged_value = merged_row.get(match_col, '')

                if str(source_value) != str(merged_value):
                    is_match = False
                    break

        if is_match:
            return merged_row
    return None

def create_new_row(source_row, source_table, match_columns, merge_columns_config):
    """创建新行"""
    new_row = {}

    # 添加匹配列数据
    for match_col in match_columns:
        col_index = find_column_index_by_name(source_table, match_col)
        if col_index is not None:
            new_row[match_col] = source_row.get(col_index, '')

    # 添加待合并列数据
    for config in merge_columns_config:
        if config['tableName'] == source_table['name']:
            for column_name in config['columns']:
                col_index = find_column_index_by_name(source_table, column_name)
                if col_index is not None:
                    new_row[column_name] = source_row.get(col_index, '')

    new_row['_source'] = source_table['name']
    return new_row


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


def find_column_index_by_name_from_context(column_name, target_table=None, workbook_data=None, project_id=None):
    """根据列名查找列索引（从上下文获取表信息）"""
    try:
        # 如果有直接传入的目标表，优先使用
        if target_table and 'columns' in target_table:
            for index, col in enumerate(target_table['columns']):
                if col.get('name') == column_name:
                    return index

        # 如果没有直接传入表，尝试从工作簿数据中查找
        if workbook_data and 'sheets' in workbook_data:
            for sheet in workbook_data['sheets']:
                if 'columns' in sheet:
                    for index, col in enumerate(sheet['columns']):
                        if col.get('name') == column_name:
                            return index

        # 如果还没有找到，尝试从项目数据中加载
        if project_id:
            project_workbook_data = get_project_workbook_data(project_id)
            if project_workbook_data and 'sheets' in project_workbook_data:
                for sheet in project_workbook_data['sheets']:
                    if 'columns' in sheet:
                        for index, col in enumerate(sheet['columns']):
                            if col.get('name') == column_name:
                                return index

        print(f"警告: 未找到列 '{column_name}' 的索引")
        return None

    except Exception as e:
        print(f"查找列索引时发生异常: {str(e)}")
        return None


def find_table_by_name(workbook_data, table_name):
    """根据表名查找表"""
    if not workbook_data or 'sheets' not in workbook_data:
        return None

    for sheet in workbook_data['sheets']:
        if sheet.get('name') == table_name:
            return sheet
    return None


def find_column_by_name(table, column_name):
    """根据列名查找列定义"""
    if not table or 'columns' not in table:
        return None

    for col in table['columns']:
        if col.get('name') == column_name:
            return col
    return None


def find_column_index_by_name(table, column_name):
    """根据列名查找列索引"""
    if not table or 'columns' not in table:
        return None

    for index, col in enumerate(table['columns']):
        if col.get('name') == column_name:
            return index
    return None


def save_merged_workbook_data(project_id, workbook_data):
    """保存合并后的工作簿数据到同一个Excel文件"""
    try:
        print("=== 开始保存合并后的工作簿数据 ===")

        # 准备项目目录
        project_dir = DataProjectUtils.prepare_project_directory(project_id, config)

        # 获取项目最新的Excel文件路径（覆盖原文件）
        excel_file_path = DataProjectUtils.get_latest_excel_file(project_dir)

        if not excel_file_path:
            # 如果没有找到现有文件，创建一个新的
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            excel_file_path = os.path.join(project_dir, f"workbook_{timestamp}.xlsx")
            print(f"未找到现有Excel文件，创建新文件: {excel_file_path}")
        else:
            print(f"找到现有Excel文件，将进行覆盖: {excel_file_path}")

        # 将字典数据转换为Excel（覆盖或更新原文件）
        DataProjectUtils.convert_dict_to_excel(workbook_data, excel_file_path)
        print("Excel文件保存成功")

        print(f"合并工作簿数据保存成功: {excel_file_path}")
        return {'success': True, 'file_path': excel_file_path}

    except Exception as e:
        print(f"保存合并工作簿数据失败: {str(e)}")
        return {
            'success': False,
            'message': f'保存合并数据失败: {str(e)}'
        }


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


def get_chart_detail(chart_id):
    """获取图表详情"""
    try:
        print(f"=== 获取图表详情请求 ===")
        print(f"图表ID: {chart_id}")

        chart = ChartData.query.get(chart_id)
        if not chart:
            return jsonify({
                'success': False,
                'message': '图表不存在'
            }), 404

        # 获取图表类型信息
        chart_type = ChartType.query.get(chart.chart_type_id)

        chart_data = {
            'id': chart.id,
            'chart_name': chart.chart_name,
            'chart_type': chart_type.type_name if chart_type else '未知类型',
            'file_path': chart.file_path,
            'create_time': chart.created_at.strftime('%Y-%m-%d %H:%M') if chart.created_at else '未知'
        }

        return jsonify({
            'success': True,
            'chart': chart_data
        }), 200

    except Exception as e:
        print(f"获取图表详情时发生异常: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'获取图表详情失败: {str(e)}'
        }), 500


def update_chart(chart_id):
    """更新图表信息（重命名）"""
    try:
        print(f"=== 更新图表请求 ===")
        print(f"图表ID: {chart_id}")

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': '请求数据不能为空'
            }), 400

        chart_name = data.get('chart_name', '').strip()
        if not chart_name:
            return jsonify({
                'success': False,
                'message': '图表名称不能为空'
            }), 400

        chart = ChartData.query.get(chart_id)
        if not chart:
            return jsonify({
                'success': False,
                'message': '图表不存在'
            }), 404

        # 更新图表名称
        chart.chart_name = chart_name
        db.session.commit()

        print(f"图表重命名成功: ID={chart_id}, 新名称={chart_name}")

        return jsonify({
            'success': True,
            'message': '图表重命名成功',
            'chart': {
                'id': chart.id,
                'name': chart.chart_name
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"更新图表时发生异常: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'更新图表失败: {str(e)}'
        }), 500


def delete_chart(chart_id):
    """删除图表"""
    try:
        print(f"=== 删除图表请求 ===")
        print(f"图表ID: {chart_id}")

        chart = ChartData.query.get(chart_id)
        if not chart:
            return jsonify({
                'success': False,
                'message': '图表不存在'
            }), 404

        chart_name = chart.chart_name

        # 先删除图表-项目关联关系
        ChartProject.query.filter_by(chart_id=chart_id).delete()

        # 删除图表记录
        db.session.delete(chart)
        db.session.commit()

        print(f"图表删除成功: ID={chart_id}, 名称={chart_name}")

        return jsonify({
            'success': True,
            'message': '图表删除成功'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"删除图表时发生异常: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'删除图表失败: {str(e)}'
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

        # 获取项目关联的所有Sheet
        sheet_projects = SheetProject.query.filter_by(project_id=project_id).all()
        sheet_ids = [sp.sheet_id for sp in sheet_projects]

        sheets = Sheet.query.filter(Sheet.id.in_(sheet_ids)).all() if sheet_ids else []

        sheets_list = []
        for sheet in sheets:
            # 获取该Sheet下的Table数量
            table_count = Table.query.filter_by(sheet_id=sheet.id).count()

            sheets_list.append({
                'id': sheet.id,
                'name': sheet.name,
                'file_path': sheet.file_path,
                'table_count': table_count,
                'created_at': sheet.created_at.strftime('%Y-%m-%d %H:%M') if sheet.created_at else '未知'
            })

        print(f"获取到项目 '{project.name}' 下的 {len(sheets_list)} 个Sheet")
        return jsonify({
            'success': True,
            'sheets': sheets_list,
            'count': len(sheets_list)
        }), 200

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
    """根据配置生成图表（完整版）"""
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

        # 验证必填字段
        required_fields = ['project_id', 'chart_type_id', 'sheet_id', 'x_axis', 'y_axis', 'chart_name']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'{field}字段不能为空'
                }), 400

        # 提取参数
        project_id = data['project_id']
        chart_type_id = data['chart_type_id']
        sheet_id = data['sheet_id']
        x_axis = data['x_axis']
        y_axis = data['y_axis']  # 数组
        category = data.get('category')
        chart_name = data['chart_name']

        print(f"开始处理图表生成: 项目ID={project_id}, 图表类型ID={chart_type_id}")

        # 1. 验证项目、Sheet、图表类型是否存在
        project = DataProject.query.get(project_id)
        if not project:
            return jsonify({
                'success': False,
                'message': '项目不存在'
            }), 404

        sheet = Sheet.query.get(sheet_id)
        if not sheet or not sheet.file_path or not os.path.exists(sheet.file_path):
            return jsonify({
                'success': False,
                'message': 'Sheet文件不存在'
            }), 404

        chart_type = ChartType.query.get(chart_type_id)
        if not chart_type:
            return jsonify({
                'success': False,
                'message': '图表类型不存在'
            }), 404

        # 2. 读取Excel数据
        print(f"读取Excel文件: {sheet.file_path}")
        try:
            # 读取所有工作表
            excel_file = pd.ExcelFile(sheet.file_path)
            # 使用第一个工作表（可根据需要扩展为选择特定工作表）
            df = pd.read_excel(sheet.file_path, sheet_name=excel_file.sheet_names[0])
            print(f"成功读取数据，形状: {df.shape}")
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'读取Excel文件失败: {str(e)}'
            }), 500

        # 3. 生成图表
        try:
            # 创建图表对象
            plt = ChartUtils.scatter_chart(
                chart_index=0,  # 临时索引，后面会用数据库ID
                data=df,
                x_axis=x_axis,
                y_axis=y_axis,
                category=category,
                chart_name=chart_name
            )
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'生成图表失败: {str(e)}'
            }), 500

        # 4. 数据库操作 - 开启事务
        try:
            # 创建chart_data记录
            new_chart = ChartData(
                chart_type_id=chart_type_id,
                chart_name=chart_name,
                file_path=None,  # 稍后更新
                created_at=datetime.utcnow()
            )
            db.session.add(new_chart)
            db.session.flush()  # 获取ID但不提交

            chart_id = new_chart.id
            print(f"创建ChartData记录，ID: {chart_id}")

            # 5. 保存图表文件
            chart_file_path = ChartUtils.save_chart(
                plt=plt,
                project_id=project_id,
                chart_type_name=chart_type.type_name,
                chart_name=chart_name,
                chart_id=chart_id
            )

            # 6. 更新chart_data的文件路径
            new_chart.file_path = chart_file_path

            # 7. 创建chart_projects关联记录
            chart_project = ChartProject(
                chart_id=chart_id,
                project_id=project_id,
                created_at=datetime.utcnow()
            )
            db.session.add(chart_project)

            # 提交所有数据库操作
            db.session.commit()

            print("图表生成和保存完成")

            # 8. 返回成功响应
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


def download_chart(chart_id):
    """下载图表文件"""
    try:
        print(f"=== 图表下载请求 ===")
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

        print(f"准备下载图表文件: {chart.file_path}")

        # 获取安全的文件名
        safe_filename = secure_filename(f"{chart.chart_name}.png")

        # 返回文件下载
        return send_file(
            chart.file_path,
            mimetype='image/png',
            as_attachment=True,
            download_name=safe_filename
        )

    except Exception as e:
        print(f"=== 图表下载时发生异常 ===")
        print(f"错误信息: {str(e)}")
        import traceback
        print(f"堆栈跟踪: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': f'图表下载失败: {str(e)}'
        }), 500
