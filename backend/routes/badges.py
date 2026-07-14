from flask import Blueprint

badges_bp = Blueprint('badges', __name__)

@badges_bp.route('', methods=['GET'])
def get_badges():
    return {'code': 0, 'message': '待实现'}

@badges_bp.route('/user', methods=['GET'])
def get_user_badges():
    return {'code': 0, 'message': '待实现'}

@badges_bp.route('/stats', methods=['GET'])
def get_stats():
    return {'code': 0, 'message': '待实现'}
