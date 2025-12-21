# app/DataProject/modules.py
from app import db
from datetime import datetime


class DataProject(db.Model):
    """数据项目模型"""
    __tablename__ = 'data_projects'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)

    def __repr__(self):
        return f'<DataProject {self.name}>'

    def to_dict(self):
        """将项目对象转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description
        }


class ProjectUser(db.Model):
    """项目-用户对应关系模型"""
    __tablename__ = 'project_users'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # 用户ID
    project_id = db.Column(db.Integer, nullable=False)  # 项目ID

    def __repr__(self):
        return f'<ProjectUser user_id={self.user_id}, project_id={self.project_id}>'

    def to_dict(self):
        """将关系对象转换为字典"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'project_id': self.project_id
        }


class Sheet(db.Model):
    """Sheet表模型"""
    __tablename__ = 'sheets'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)  # 表名
    file_path = db.Column(db.String(500), nullable=False)  # 表文件地址
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # 更新时间

    def __repr__(self):
        return f'<Sheet {self.name}>'

    def to_dict(self):
        """将Sheet对象转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'file_path': self.file_path,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class SheetProject(db.Model):
    """Sheet-项目对应关系模型"""
    __tablename__ = 'sheet_projects'

    id = db.Column(db.Integer, primary_key=True)
    sheet_id = db.Column(db.Integer, nullable=False)  # 表ID
    project_id = db.Column(db.Integer, nullable=False)  # 项目ID
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间

    def __repr__(self):
        return f'<SheetProject sheet_id={self.sheet_id}, project_id={self.project_id}>'

    def to_dict(self):
        """将关系对象转换为字典"""
        return {
            'id': self.id,
            'sheet_id': self.sheet_id,
            'project_id': self.project_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Table(db.Model):
    """Table表模型"""
    __tablename__ = 'tables'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)  # 页签名
    sheet_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # 更新时间

# ==================== 新增：图表相关模型 ====================
class ChartType(db.Model):
    """需求一：图表类型表"""
    __tablename__ = 'chart_types'

    id = db.Column(db.Integer, primary_key=True)
    type_name = db.Column(db.String(100), nullable=False, unique=True)  # 类型名
    description = db.Column(db.Text)  # 类型描述（可选）
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 创建时间

    def __repr__(self):
        return f'<ChartType {self.type_name}>'

    def to_dict(self):
        """将图表类型对象转换为字典"""
        return {
            'id': self.id,
            'type_name': self.type_name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ChartData(db.Model):
    """需求二：简化版图表数据表（无外键）"""
    __tablename__ = 'chart_data'

    id = db.Column(db.Integer, primary_key=True)
    chart_type_id = db.Column(db.Integer, nullable=False)  # 仅存储类型ID，无外键约束
    chart_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<ChartData {self.chart_name}>'


class ChartProject(db.Model):
    """需求三：简化版图表-项目关系表（无外键）"""
    __tablename__ = 'chart_projects'

    id = db.Column(db.Integer, primary_key=True)
    chart_id = db.Column(db.Integer, nullable=False)  # 仅存储图表ID，无外键约束
    project_id = db.Column(db.Integer, nullable=False)  # 仅存储项目ID，无外键约束
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<ChartProject chart_id={self.chart_id}, project_id={self.project_id}>'

