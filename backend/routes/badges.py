from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase
from utils.auth import get_current_user

badges_bp = Blueprint('badges', __name__)

@badges_bp.route('/list', methods=['GET'])
def get_badges_list():
    supabase = get_supabase()
    result = supabase.from_('badges').select('*').execute()
    return jsonify({'code': 0, 'data': result.data})

@badges_bp.route('/user', methods=['GET'])
def get_user_badges():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_supabase()
    result = supabase.from_('user_badges').select(
        '*, badge:badge_id(*)'
    ).eq('user_id', user_id).execute()

    return jsonify({'code': 0, 'data': result.data})

@badges_bp.route('/stats', methods=['GET'])
def get_stats():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_supabase()
    total = supabase.from_('daily_challenges').select('id', count='exact').eq('user_id', user_id).execute()
    completed = supabase.from_('daily_challenges').select('id', count='exact').eq('user_id', user_id).eq('status', 'done').execute()
    likes_received = supabase.from_('likes').select('id', count='exact').execute()

    return jsonify({
        'code': 0,
        'data': {
            'total_days': total.count,
            'total_completed': completed.count,
            'total_likes_received': likes_received.count,
        }
    })
