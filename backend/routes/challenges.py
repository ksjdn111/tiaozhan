from flask import Blueprint

challenges_bp = Blueprint('challenges', __name__)

@challenges_bp.route('/today', methods=['GET'])
def get_today():
    return {'code': 0, 'message': '待实现'}

@challenges_bp.route('/today/complete', methods=['POST'])
def complete_today():
    return {'code': 0, 'message': '待实现'}

@challenges_bp.route('/today/skip', methods=['POST'])
def skip_today():
    return {'code': 0, 'message': '待实现'}

@challenges_bp.route('/history', methods=['GET'])
def get_history():
    return {'code': 0, 'message': '待实现'}
