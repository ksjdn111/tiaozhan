from flask import Blueprint

feed_bp = Blueprint('feed', __name__)

@feed_bp.route('', methods=['GET'])
def get_feed():
    return {'code': 0, 'message': '待实现'}

@feed_bp.route('/like', methods=['POST'])
def like():
    return {'code': 0, 'message': '待实现'}
