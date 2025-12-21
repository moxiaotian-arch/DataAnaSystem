from flask import render_template

def register():
    """用户注册页面"""
    return render_template('user/register.html')

def index():
    """首页"""
    return render_template('index.html')