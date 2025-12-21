from flask import Blueprint
from .html_views import register, index
from .func_views import user_register, get_user_list

# 创建用户蓝图
user_bp = Blueprint('user', __name__, url_prefix='/user')

# 页面路由（前端页面）
user_bp.route('/', methods=['GET'])(index)
user_bp.route('/register', methods=['GET'])(register)

# API路由（后端逻辑）
user_bp.route('/api/register', methods=['POST'])(user_register)
user_bp.route('/api/list', methods=['GET'])(get_user_list)