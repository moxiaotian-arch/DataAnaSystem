from flask import request, jsonify
from app import db
from .modules import User
import hashlib


def user_register():
    """用户注册功能"""
    try:
        # 获取请求数据
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'message': '请求数据不能为空'
            }), 400

        # 验证必填字段
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if field not in data or not data[field].strip():
                return jsonify({
                    'success': False,
                    'message': f'{field}字段不能为空'
                }), 400

        username = data['username'].strip()
        email = data['email'].strip()
        password = data['password'].strip()

        # 检查用户名是否已存在
        if User.query.filter_by(username=username).first():
            return jsonify({
                'success': False,
                'message': '用户名已存在'
            }), 400

        # 检查邮箱是否已存在
        if User.query.filter_by(email=email).first():
            return jsonify({
                'success': False,
                'message': '邮箱已被注册'
            }), 400

        # 简单的密码哈希（生产环境应该使用更安全的方法如bcrypt）
        password_hash = hashlib.md5(password.encode()).hexdigest()

        # 创建新用户
        new_user = User(
            username=username,
            email=email,
            password_hash=password_hash
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': '注册成功',
            'user': new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'注册失败: {str(e)}'
        }), 500


def get_user_list():
    """获取用户列表（用于测试）"""
    try:
        users = User.query.all()
        return jsonify({
            'success': True,
            'users': [user.to_dict() for user in users]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取用户列表失败: {str(e)}'
        }), 500