## 启动项目

```bash
python run.py
```

## 目录规划

├── app/ # 核心应用包（通过应用工厂模式构建）
│ ├── __init__.py # 应用工厂函数 `create_app` 所在地
│ ├── core/ # 核心组件目录
│ │ ├── __init__.py
│ │ ├── config.py # 配置类（如DevelopmentConfig, ProductionConfig）
│ │ ├── extensions.py # 初始化扩展实例，如db = SQLAlchemy()
│ │ └── utils.py # 工具函数
│ └── modules/ # 功能模块（蓝图）目录
│ ├── __init__.py
│ ├── data_analysis/ # "数据分析"功能蓝图
│ │ ├── __init__.py # 在此文件中创建蓝图：bp_analysis = Blueprint('analysis', __name__)
│ │ ├── routes.py # 或 views.py，在此文件中从 . 导入 bp_analysis，并定义路由
│ │ ├── models.py # 与此模块相关的数据模型
│ │ └── templates/ # 此蓝图的专属模板（可选）
│ │ └── data_analysis/
│ │ └── dashboard.html
│ └── user/ # 示例：另一个"用户管理"功能蓝图
│ ├── __init__.py
│ ├── routes.py
│ └── models.py
├── migrations/ # Flask-Migrate 生成的数据库迁移脚本目录
├── tests/ # 单元测试
├── instance/ # 实例文件夹，存放敏感配置（如`config.py`）和临时数据库（可选）
├── requirements.txt # 项目依赖
├── .env # 环境变量（务必加入.gitignore）
├── .gitignore
└── run.py # 应用启动入口（开发环境使用）

## 数据库迁移
```bash
# 1. 初始化迁移环境
python dbmanager.py init

# 2. 生成迁移脚本
python dbmanager.py makemigrations "初始化数据库"

# 3. 应用迁移到数据库
python dbmanager.py upgrade
```

## 开发指导

### APP管理

#### 新增APP

1、在app/下新建app的目录，如 app/DataProject
2、app/DataProject新增app/DataProjetct/urls.py
3、在urls下新增如下代码

```python
from flask import Blueprint

# 创建App蓝图
data_project_bp = Blueprint('DataProject', __name__)
```

4、 在 app/__init__.py 的 register_blueprints 方法中导入新建的蓝图并进行注册，如下

```python

```

