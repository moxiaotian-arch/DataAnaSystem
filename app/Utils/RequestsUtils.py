from flask import jsonify


class RequestsUtils:
    @classmethod
    def make_response(
            cls,
            status_code=200,
            msg="",
            data=None,
            success=True
    ):
        res = {
            "success": success,
            "msg": msg,
            "data": data
        }
        return jsonify(res), status_code
