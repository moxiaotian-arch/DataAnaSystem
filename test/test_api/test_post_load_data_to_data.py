import pytest
import requests
import pandas as pd
from io import BytesIO


class TestSheetDataImport:

    def setup_method(self):
        """测试前准备"""
        self.base_url = "http://localhost:5000"
        self.test_sheet_id = 12

    def test_successful_import(self):
        """测试成功导入"""
        # 准备测试文件
        df1 = pd.DataFrame({'A': [1, 2], 'B': [3, 4]})
        df2 = pd.DataFrame({'X': [5, 6], 'Y': [7, 8]})

        with pd.ExcelWriter('test_upload.xlsx') as writer:
            df1.to_excel(writer, sheet_name='Sheet1', index=False)
            df2.to_excel(writer, sheet_name='Sheet2', index=False)

        # 发送请求
        files = {'file': open('test_upload.xlsx', 'rb')}
        response = requests.post(
            f"{self.base_url}/data/api/tables/{self.test_sheet_id}/load_sheet_data_to_data",
            files=files
        )

        # 验证响应
        assert response.status_code == 200
        result = response.json()
        assert result['success'] == True
        assert result['msg'] == 'Sheet数据导入成功'

        # 清理
        # import os
        # os.remove('test_upload.xlsx')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
