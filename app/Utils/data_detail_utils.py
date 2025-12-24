import pandas as pd

from app.Utils.FilsSystemUtils import FilsSystemUtils


class ExcelExec:
    @classmethod
    def get_table_sheets(cls, file_path):
        excel_file = pd.ExcelFile(file_path)
        return excel_file.sheet_names

    @classmethod
    def get_table_sheet_columns(cls, file_path, sheet_name):
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        return df.columns.values.tolist()

    @classmethod
    def join_excels(cls, param_data, project_id, excel_file_path):
        """
        合并数据

        参数:
            param_data: 包含以下键的字典:
                - targetTableName: 目标表名
                - sourceTableNames: 源表名列表
                - requiredColumns: 需要检查的列名列表
                - matchColumns: 匹配列名列表
                - mergeColumns: 需要合并的列配置列表
            project_id: 项目ID
            excel_file_path: Excel文件路径

        返回:
            bool: 合并成功返回True，否则返回False
        """
        # 检查文件是否存在
        file_check_res = FilsSystemUtils.check_file_dir_exists(excel_file_path)
        if not file_check_res:
            print("文件不存在")
            return False

        # 检查目标表是否存在
        target_table = param_data.get('targetTableName')
        if not cls.check_table_sheets(excel_file_path, target_table):
            print(f"目标表 {target_table} 不存在")
            return False

        # 检查源表是否存在
        source_tables = param_data.get('sourceTableNames', [])
        for sheet_name in source_tables:
            if not cls.check_table_sheets(excel_file_path, sheet_name):
                print(f"源表 {sheet_name} 不存在")
                return False

        # 检查目标表的列是否存在
        required_columns = param_data.get('requiredColumns', [])
        if required_columns:
            target_check, missing = cls.check_sheet_column(excel_file_path, target_table,
                                                           param_data.get('matchColumns'))
            if not target_check:
                print(f"目标表 {target_table} 缺失列: {missing}")
                return False

        # 检查源表的列是否存在
        for sheet_name in source_tables:
            if required_columns:
                source_check, missing = cls.check_sheet_column(excel_file_path, sheet_name, required_columns)
                if not source_check:
                    print(f"源表 {sheet_name} 缺失列: {missing}")
                    return False

        # 执行合并表
        try:
            return cls.merge_tables(excel_file_path, param_data)
        except Exception as e:
            print(f"合并表格时出错: {str(e)}")
            return False

    @classmethod
    def merge_tables(cls, excel_file_path, param_data):
        """
        合并表格数据

        参数:
            excel_file_path: Excel文件路径
            param_data: 参数配置

        返回:
            bool: 合并成功返回True，否则返回False
        """
        try:
            # 读取目标表
            target_table_name = param_data['targetTableName']
            target_df = pd.read_excel(excel_file_path, sheet_name=target_table_name)

            # 获取匹配列和合并列配置
            match_columns = param_data.get('matchColumns', [])
            merge_columns_config = param_data.get('mergeColumns', [])

            # 处理每个源表
            for source_table_name in param_data.get('sourceTableNames', []):
                # 读取源表
                source_df = pd.read_excel(excel_file_path, sheet_name=source_table_name)

                # 获取该源表需要合并的列
                source_merge_columns = cls.get_merge_columns_for_table(merge_columns_config, source_table_name)

                if not source_merge_columns:
                    print(f"源表 {source_table_name} 没有配置需要合并的列")
                    continue

                # 检查匹配列是否存在
                for col in match_columns:
                    if col not in target_df.columns:
                        raise ValueError(f"目标表 {target_table_name} 中不存在匹配列: {col}")
                    if col not in source_df.columns:
                        raise ValueError(f"源表 {source_table_name} 中不存在匹配列: {col}")

                # 检查合并列是否存在
                for col in source_merge_columns:
                    if col not in source_df.columns:
                        raise ValueError(f"源表 {source_table_name} 中不存在合并列: {col}")

                # 执行合并
                target_df = cls.perform_merge(target_df, source_df, match_columns, source_merge_columns,
                                              source_table_name)

            # 保存合并后的数据
            with pd.ExcelWriter(excel_file_path, mode='a', if_sheet_exists='replace') as writer:
                target_df.to_excel(writer, sheet_name=target_table_name, index=False)

            print(f"表格合并完成，目标表: {target_table_name}")
            return True

        except Exception as e:
            print(f"合并表格时出错: {str(e)}")
            return False

    @classmethod
    def get_merge_columns_for_table(cls, merge_columns_config, table_name):
        """
        获取指定表需要合并的列

        参数:
            merge_columns_config: 合并列配置
            table_name: 表名

        返回:
            list: 需要合并的列名列表
        """
        for config in merge_columns_config:
            if config.get('tableName') == table_name:
                return config.get('columns', [])
        return []

    @classmethod
    def perform_merge(cls, target_df, source_df, match_columns, merge_columns, source_table_name):
        """
        执行具体的合并操作

        参数:
            target_df: 目标数据框
            source_df: 源数据框
            match_columns: 匹配列
            merge_columns: 合并列
            source_table_name: 源表名

        返回:
            DataFrame: 合并后的数据框
        """
        # 确保匹配列数据类型一致
        for col in match_columns:
            target_df[col] = target_df[col].astype(str)
            source_df[col] = source_df[col].astype(str)

        # 重命名合并列，避免列名冲突
        renamed_columns = {col: f"{source_table_name}_{col}" for col in merge_columns}
        source_renamed = source_df[match_columns + merge_columns].rename(columns=renamed_columns)

        # 执行左连接合并
        merged_df = pd.merge(
            target_df,
            source_renamed,
            on=match_columns,
            how='left',
            suffixes=('', f'_{source_table_name}')
        )

        print(f"从表 {source_table_name} 合并了 {len(merged_df)} 行数据")
        print(f"合并的列: {list(renamed_columns.values())}")

        return merged_df

    @classmethod
    def check_table_sheets(cls, excel_file_path, sheet_name):
        """
        检查Excel文件中是否存在指定的工作表

        参数:
            excel_file_path: Excel文件路径
            sheet_name: 要检查的工作表名称

        返回:
            bool: 如果工作表存在返回True，否则返回False
        """
        try:
            # 使用ExcelFile读取文件但不加载数据
            with pd.ExcelFile(excel_file_path) as xls:
                # 检查工作表是否存在
                if sheet_name in xls.sheet_names:
                    return True
                return False
        except FileNotFoundError:
            raise FileNotFoundError(f"Excel文件不存在: {excel_file_path}")
        except Exception as e:
            raise Exception(f"读取Excel文件出错: {str(e)}")

    @classmethod
    def check_sheet_column(cls, excel_file_path, sheet_name, columns):
        """
        检查Excel工作表中是否存在指定的列

        参数:
            excel_file_path: Excel文件路径
            sheet_name: 要检查的工作表名称
            columns: 要检查的列名列表

        返回:
            bool: 如果所有列都存在返回True，否则返回False
            list: 不存在的列名列表
        """
        try:
            # 读取指定工作表
            df = pd.read_excel(excel_file_path, sheet_name=sheet_name)

            # 获取工作表中实际存在的列名
            existing_columns = set(df.columns)

            # 检查所有指定的列是否存在
            missing_columns = [col for col in columns if col not in existing_columns]

            if missing_columns:
                return False, missing_columns
            return True, []

        except FileNotFoundError:
            raise FileNotFoundError(f"Excel文件不存在: {excel_file_path}")
        except ValueError as e:
            if "Worksheet named" in str(e):
                raise ValueError(f"工作表 '{sheet_name}' 不存在")
            raise Exception(f"读取Excel文件出错: {str(e)}")
        except Exception as e:
            raise Exception(f"检查列时出错: {str(e)}")
