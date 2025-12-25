# app/urls.py
import logging
from flask import Blueprint, redirect

logger = logging.getLogger(__name__)

def register_urls(app):
    """注册所有蓝图到应用"""

    # 添加根路径路由，重定向到数据项目首页
    @app.route('/')
    def root_redirect():
        """根路径重定向到数据项目首页"""
        return redirect('/data/')

    # 注册用户蓝图
    from app.user.urls import user_bp
    app.register_blueprint(user_bp, url_prefix='/user')
    logger.info("✅ 用户蓝图注册完成")

    # 注册数据项目蓝图
    from app.DataProject.urls import data_project_bp
    app.register_blueprint(data_project_bp, url_prefix='/data')
    logger.info("✅ 数据项目蓝图注册完成")