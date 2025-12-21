import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """配置类，所有配置直接写死"""
    SECRET_KEY = 'dev-secret-key-change-in-production'
    DEBUG = True
    TESTING = False

    # 数据库配置直接写死
    DB_USER = 'root'
    DB_PASSWORD = '520715lbs'
    DB_HOST = 'localhost'
    DB_PORT = '3306'
    DB_NAME = 'data_ana_sys_project'

    # 数据库连接URI直接写死
    SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False

    # 数据表存放路径
    SHEET_DATA_DIR = os.path.join(basedir, '..', 'src_Data', 'SheetData')

    # 上传数据表缓存路径
    UPLOAD_FOLDER = os.path.join(basedir, '..', 'src_Data', 'TempDir', "TempUploadDir")

    # 数据图存放跟路径
    CHART_SAVE_ROOT_DIR = os.path.join(basedir, '..', 'src_Data', 'ChartData')

# 创建配置实例
config = Config()

# 确保数据目录存在
def ensure_data_dirs():
    """确保数据目录存在"""
    os.makedirs(config.SHEET_DATA_DIR, exist_ok=True)
    os.makedirs(config.CHART_SAVE_ROOT_DIR, exist_ok=True)

# 应用启动时调用
ensure_data_dirs()