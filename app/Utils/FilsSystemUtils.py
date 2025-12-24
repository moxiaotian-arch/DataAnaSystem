import os


class FilsSystemUtils:
    @classmethod
    def check_file_dir_exists(cls, file_path):
        res = os.path.exists(file_path)
        return res
