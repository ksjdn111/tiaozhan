from flask import Blueprint, request, jsonify
from datetime import date, timedelta
from services.supabase_client import get_auth_supabase
from utils.auth import get_current_user

challenges_bp = Blueprint('challenges', __name__)

@challenges_bp.route('/today', methods=['GET'])
def get_today_challenge():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_auth_supabase()
    today = date.today().isoformat()

    # 1. Return pending challenge for today if exists
    pending = supabase.from_('daily_challenges').select(
        '*, challenge:challenge_id(*)'
    ).eq('user_id', user_id).eq('date', today).eq('status', 'pending').execute()

    if pending.data:
        return jsonify({'code': 0, 'data': pending.data[0]})

    # 2. Get all challenge IDs this user has ever used
    used = supabase.from_('daily_challenges').select(
        'challenge_id'
    ).eq('user_id', user_id).execute()
    used_ids = list(set(c['challenge_id'] for c in used.data))

    # 3. Pick a random unused challenge
    all_challenges = supabase.from_('challenges').select('*').execute().data
    available = [c for c in all_challenges if c['id'] not in used_ids]

    import random
    chosen = random.choice(available) if available else random.choice(all_challenges)

    dc = supabase.from_('daily_challenges').insert({
        'user_id': user_id,
        'challenge_id': chosen['id'],
        'date': today,
        'status': 'pending'
    }).execute()

    result = supabase.from_('daily_challenges').select(
        '*, challenge:challenge_id(*)'
    ).eq('id', dc.data[0]['id']).single().execute()

    return jsonify({'code': 0, 'data': result.data})

@challenges_bp.route('/complete', methods=['POST'])
def complete_challenge():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    dc_id = data.get('daily_challenge_id')
    note = data.get('note', '')
    photo_url = data.get('photo_url', '')

    supabase = get_auth_supabase()
    update = {'status': 'done'}
    if note:
        update['note'] = note
    if photo_url:
        update['photo_url'] = photo_url

    supabase.from_('daily_challenges').update(update).eq(
        'id', dc_id
    ).eq('user_id', user_id).execute()

    return jsonify({'code': 0, 'message': '挑战完成！'})

@challenges_bp.route('/skip', methods=['POST'])
def skip_challenge():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    dc_id = data.get('daily_challenge_id')

    supabase = get_auth_supabase()
    supabase.from_('daily_challenges').update({'status': 'skipped'}).eq(
        'id', dc_id
    ).eq('user_id', user_id).execute()

    return jsonify({'code': 0, 'message': '已跳过'})

@challenges_bp.route('/history', methods=['GET'])
def get_history():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 20, type=int)

    supabase = get_auth_supabase()
    offset = (page - 1) * size
    result = supabase.from_('daily_challenges').select(
        '*, challenge:challenge_id(*)'
    ).eq('user_id', user_id).order('date', desc=True).range(offset, offset + size - 1).execute()

    return jsonify({'code': 0, 'data': result.data})
