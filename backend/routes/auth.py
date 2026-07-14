from flask import Blueprint

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    return {'code': 0, 'message': '待实现'}

@auth_bp.route('/login', methods=['POST'])
def login():
    return {'code': 0, 'message': '待实现'}

@auth_bp.route('/me', methods=['GET'])
def get_me():
    return {'code': 0, 'message': '待实现'}
