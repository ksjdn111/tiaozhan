from flask import Blueprint, request, jsonify
from services.supabase_client import get_auth_supabase
from utils.auth import get_current_user

badges_bp = Blueprint('badges', __name__)

@badges_bp.route('/list', methods=['GET'])
def get_badges_list():
    supabase = get_auth_supabase()
    result = supabase.from_('badges').select('*').execute()
    return jsonify({'code': 0, 'data': result.data})

@badges_bp.route('/user', methods=['GET'])
def get_user_badges():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_auth_supabase()
    result = supabase.from_('user_badges').select(
        '*, badge:badge_id(*)'
    ).eq('user_id', user_id).execute()

    return jsonify({'code': 0, 'data': result.data})

@badges_bp.route('/stats', methods=['GET'])
def get_stats():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_auth_supabase()
    total = supabase.from_('daily_challenges').select('id', count='exact').eq('user_id', user_id).execute()
    completed = supabase.from_('daily_challenges').select('id', count='exact').eq('user_id', user_id).eq('status', 'done').execute()
    user_dc_ids = supabase.from_('daily_challenges').select('id').eq('user_id', user_id).execute()
    ids = [d['id'] for d in user_dc_ids.data]
    likes_received = 0
    if ids:
        likes_received = supabase.from_('likes').select('id', count='exact').in_('daily_challenge_id', ids).execute()
        likes_received = likes_received.count

    return jsonify({
        'code': 0,
        'data': {
            'total_days': total.count,
            'total_completed': completed.count,
            'total_likes_received': likes_received.count,
        }
    })


@badges_bp.route('/user/<uuid:target_id>', methods=['GET'])
def get_user_badges_public(target_id):
    supabase = get_auth_supabase()
    target_id_str = str(target_id)

    all_badges = supabase.from_('badges').select('*').execute().data or []
    earned = supabase.from_('user_badges').select('badge_id').eq('user_id', target_id_str).execute()
    earned_ids = set(b['badge_id'] for b in (earned.data or []))

    result = []
    for badge in all_badges:
        result.append({
            'id': badge['id'],
            'name': badge['name'],
            'icon': badge['icon'],
            'description': badge['description'],
            'earned': badge['id'] in earned_ids
        })

    return jsonify({'code': 0, 'data': result})
