import os
import logging
from flask import Flask
from flask_migrate import Migrate
from sqlalchemy import exc

from app.core.config import config

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建扩展实例
db = None
migrate = None

def create_app():
    global db, migrate
    app = Flask(__name__,
                template_folder='templates',  # 模板目录
                static_folder='static',  # 静态文件目录
                static_url_path='/static')

    # 直接加载配置类
    app.config.from_object(config)
    app.debug = config.DEBUG

    # 初始化扩展
    from flask_sqlalchemy import SQLAlchemy
    from flask_migrate import Migrate

    db = SQLAlchemy()

    # 初始化数据库
    init_db(app, db)

    # 初始化 Flask-Migrate
    migrate = Migrate(app, db)

    # 确保模型被导入
    from app.DataProject.modules import (
        DataProject, ProjectUser, Sheet, SheetProject, Table)

    # 注册蓝图（从独立的urls模块导入）
    register_blueprints(app)

    # 健康检查端点
    @app.route('/health')
    def health_check():
        """健康检查端点"""
        try:
            # 测试数据库连接
            db.engine.connect()
            return {
                'status': 'healthy',
                'database': 'connected',
                'debug_mode': app.debug
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'database': 'disconnected',
                'error': str(e)
            }, 500

    logger.info(f"🚀 Flask应用创建成功，调试模式: {app.debug}")
    return app

def init_db(app, db_instance):
    """初始化数据库并测试连接"""
    try:
        db_instance.init_app(app)

        with app.app_context():
            db_instance.engine.connect()
            logger.info("✅ 数据库连接测试成功")

            if app.config.get('DEBUG'):
                db_instance.create_all()
                logger.info("✅ 数据库表创建完成")

    except exc.OperationalError as e:
        logger.error(f"❌ 数据库连接失败: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"❌ 数据库初始化异常: {str(e)}")
        raise

def register_blueprints(app):
    """从独立文件注册蓝图"""
    from app.all_urls import register_urls
    register_urls(app)