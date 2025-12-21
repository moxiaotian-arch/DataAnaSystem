# dbmanager.py
import sys
import os
from app import create_app, db
from flask_migrate import Migrate, upgrade, migrate, init  # 导入正确的命令


def run_command():
    # 先创建应用实例
    app = create_app()

    # 确保模型被导入，这样迁移才能检测到
    from app.DataProject.modules import DataProject, ProjectUser, Sheet, SheetProject

    if len(sys.argv) < 2:
        print("可用命令: init, makemigrations, migrate, upgrade")
        return

    command = sys.argv[1]

    # 在应用上下文中执行命令
    with app.app_context():
        # 初始化 Migrate
        migrate_instance = Migrate(app, db)

        if command == 'init':
            try:
                # 删除旧的迁移文件夹（如果存在）
                migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
                if os.path.exists(migrations_dir):
                    import shutil
                    shutil.rmtree(migrations_dir)

                # 初始化迁移环境
                init()
                print("✅ 迁移环境初始化完成")
            except Exception as e:
                print(f"❌ 初始化失败: {e}")

        elif command == 'makemigrations':
            try:
                if len(sys.argv) > 2:
                    message = sys.argv[2]
                    migrate(message=message)
                else:
                    migrate()
                print("✅ 迁移脚本生成完成")
            except Exception as e:
                print(f"❌ 迁移脚本生成失败: {e}")

        elif command == 'upgrade':
            try:
                upgrade()
                print("✅ 数据库升级完成")
            except Exception as e:
                print(f"❌ 数据库升级失败: {e}")

        else:
            print(f"未知命令: {command}")
            print("可用命令: init, makemigrations, upgrade")


if __name__ == '__main__':
    run_command()