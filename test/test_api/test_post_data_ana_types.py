import requests
import json


def test_data_ana_types():
    """测试数据分析类型相关接口"""

    # 基础URL - 根据实际部署环境调整
    base_url = "http://localhost:5000/data"

    # 测试数据
    test_type_data = {
        "type_name": "数据分析",
        "description": "对表数据的数值进行分析处理，如均值，最大值，最小值，总和等"
    }

    print("=== 开始测试数据分析类型功能 ===")

    try:
        # 测试1: 获取数据分析类型列表
        print("\n1. 测试获取数据分析类型列表")
        get_url = f"{base_url}/api/projects/data_ana_types"
        response = requests.get(get_url)
        print(f"GET请求URL: {get_url}")
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.text}")

        # 测试2: 新增数据分析类型
        print("\n2. 测试新增数据分析类型")
        post_url = f"{base_url}/api/projects/data_ana_types"
        headers = {'Content-Type': 'application/json'}
        response = requests.post(post_url, json=test_type_data, headers=headers)
        print(f"POST请求URL: {post_url}")
        print(f"请求数据: {json.dumps(test_type_data, ensure_ascii=False)}")
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.text}")

        # 如果创建成功，获取创建的数据
        if response.status_code == 201:
            created_data = response.json()
            if created_data.get('success'):
                created_id = created_data['data']['id']
                print(f"✅ 数据分析类型创建成功，ID: {created_id}")

                # 测试3: 再次获取列表确认数据已添加
                print("\n3. 验证数据已添加到列表")
                response = requests.get(get_url)
                if response.status_code == 200:
                    list_data = response.json()
                    if list_data.get('success'):
                        types_list = list_data.get('data', [])
                        print(f"当前数据分析类型数量: {len(types_list)}")
                        # 查找刚创建的类型
                        new_type = next((t for t in types_list if t.get('id') == created_id), None)
                        if new_type:
                            print("✅ 新创建的数据分析类型在列表中可查")
                        else:
                            print("❌ 新创建的数据分析类型未在列表中找到")

        # 测试4: 测试重复名称验证
        print("\n4. 测试重复名称验证")
        response = requests.post(post_url, json=test_type_data, headers=headers)
        print(f"重复创建请求状态码: {response.status_code}")
        if response.status_code == 400:
            error_data = response.json()
            if '已存在' in error_data.get('message', ''):
                print("✅ 重复名称验证功能正常")

        # 测试5: 测试必填字段验证
        print("\n5. 测试必填字段验证")
        invalid_data = {"description": "缺少类型名称"}
        response = requests.post(post_url, json=invalid_data, headers=headers)
        print(f"无效数据请求状态码: {response.status_code}")
        if response.status_code == 400:
            print("✅ 必填字段验证功能正常")

    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器，请确保Flask应用正在运行")
    except Exception as e:
        print(f"❌ 测试过程中发生错误: {str(e)}")


if __name__ == '__main__':
    test_data_ana_types()
    print("\n=== 测试完成 ===")