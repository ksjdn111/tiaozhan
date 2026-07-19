from flask import Blueprint, request, jsonify
from services.supabase_client import get_auth_supabase, get_supabase
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

    from datetime import date, timedelta

    def _get_dates(records):
        ds = set()
        for r in (records or []):
            d = r.get('date', r) if isinstance(r, dict) else r
            if isinstance(d, str):
                ds.add(d[:10])
            else:
                ds.add(d.isoformat()[:10])
        return sorted(ds, reverse=True)

    s = get_supabase()
    all_records = s.from_('daily_challenges').select('date').eq('user_id', user_id).execute()
    done_records = s.from_('daily_challenges').select('date').eq('user_id', user_id).eq('status', 'done').execute()

    all_dates = _get_dates(all_records.data)
    done_dates = _get_dates(done_records.data)

    # Distinct day counts
    total_days = len(all_dates)
    total_completed = len(done_dates)

    # Streak calculation using string comparison
    streak = 0
    for i in range(len(done_dates)):
        expected = (date.today() - timedelta(days=i)).isoformat()
        if done_dates[i] == expected:
            streak += 1
        else:
            break

    user_dc_ids = s.from_('daily_challenges').select('id').eq('user_id', user_id).execute()
    ids = [d['id'] for d in user_dc_ids.data]
    likes_received = 0
    if ids:
        resp = s.from_('likes').select('id', count='exact').in_('daily_challenge_id', ids).execute()
        likes_received = resp.count

    return jsonify({
        'code': 0,
        'data': {
            'total_days': total_days,
            'total_completed': total_completed,
            'total_likes_received': likes_received,
            'streak': streak,
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
