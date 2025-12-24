import pandas as pd

if __name__ == '__main__':
    file_path = 'D:\\Code\\MyRepo\\DataAnaSystem\\DataAnaSystem\\app\\core\\..\\src_Data\\SheetData\\4\\workbook_data.xlsx'

    # 加载Excel文件
    excel_file = pd.ExcelFile(file_path)

    # 查看所有工作表的名称
    print(excel_file.sheet_names)