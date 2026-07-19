from flask import Blueprint, request, jsonify
from datetime import date, timedelta
from services.supabase_client import get_auth_supabase
from utils.auth import get_current_user

challenges_bp = Blueprint('challenges', __name__)

def _check_badges(supabase, user_id):
    """Check and award any newly earned badges. Returns list of new badges."""
    all_badges = supabase.from_('badges').select('*').execute().data
    earned = supabase.from_('user_badges').select('badge_id').eq('user_id', user_id).execute()
    earned_ids = set(b['badge_id'] for b in earned.data)

    # Stats needed for checks
    done = supabase.from_('daily_challenges').select('id, date, challenge:challenge_id(category)'
    ).eq('user_id', user_id).eq('status', 'done').order('date', desc=True).execute()
    done_records = done.data
    total_completed = len(done_records)

    # Streak calculation (string-based, handles string/date from Supabase)
    streak = 0
    if done_records:
        dates_set = set()
        for r in done_records:
            d = r['date']
            if isinstance(d, str):
                dates_set.add(d[:10])
            else:
                dates_set.add(d.isoformat()[:10])
        dates = sorted(dates_set, reverse=True)
        today_str = date.today().isoformat()
        for i in range(len(dates)):
            expected = (date.today() - timedelta(days=i)).isoformat()
            if dates[i] == expected:
                streak += 1
            else:
                break

    # Likes received
    dc_ids = [r['id'] for r in done_records]
    likes_received = 0
    if dc_ids:
        lr = supabase.from_('likes').select('id', count='exact').in_('daily_challenge_id', dc_ids).execute()
        likes_received = lr.count

    # Category counts
    cat_counts = {}
    for r in done_records:
        cat = r.get('challenge', {}).get('category')
        if cat:
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
    all_cats_done = set(cat_counts.keys()) == {'运动', '美食', '学习', '创意', '生活'}

    new_badges = []
    for badge in all_badges:
        if badge['id'] in earned_ids:
            continue
        cond = badge.get('condition', {})
        award = False

        if 'completed' in cond:
            award = total_completed >= cond['completed']
        elif 'streak' in cond:
            award = streak >= cond['streak']
        elif 'likes_received' in cond:
            award = likes_received >= cond['likes_received']
        elif 'all_categories' in cond:
            award = all_cats_done
        elif 'category' in cond:
            award = cat_counts.get(cond['category'], 0) >= cond['count']

        if award:
            supabase.from_('user_badges').insert({
                'user_id': user_id,
                'badge_id': badge['id']
            }).execute()
            new_badges.append(badge)

    return new_badges


@challenges_bp.route('/today', methods=['GET'])
def get_today_challenge():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_auth_supabase()
    today = date.today().isoformat()

    pending = supabase.from_('daily_challenges').select(
        '*, challenge:challenge_id(*)'
    ).eq('user_id', user_id).eq('date', today).eq('status', 'pending').execute()

    if pending.data:
        return jsonify({'code': 0, 'data': pending.data[0]})

    used = supabase.from_('daily_challenges').select('challenge_id').eq('user_id', user_id).execute()
    used_ids = list(set(c['challenge_id'] for c in used.data))

    all_challenges = supabase.from_('challenges').select('*').execute().data
    available = [c for c in all_challenges if c['id'] not in used_ids]

    import random
    chosen = random.choice(available) if available else random.choice(all_challenges)

    dc = supabase.from_('daily_challenges').insert({
        'user_id': user_id, 'challenge_id': chosen['id'],
        'date': today, 'status': 'pending'
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

    new_badges = _check_badges(supabase, user_id)

    return jsonify({
        'code': 0,
        'message': '挑战完成！',
        'new_badges': new_badges
    })


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


@challenges_bp.route('/custom', methods=['POST'])
def create_custom_challenge():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category = data.get('category', '').strip()
    difficulty = data.get('difficulty', 3)

    if not title or not description or not category:
        return jsonify({'code': 1, 'message': '标题、描述和分类不能为空'}), 400

    if len(title) > 100:
        return jsonify({'code': 1, 'message': '标题最长100个字符'}), 400

    supabase = get_auth_supabase()
    chal = supabase.from_('challenges').insert({
        'title': title, 'description': description,
        'category': category, 'difficulty': difficulty,
        'creator_id': str(user_id)
    }).execute()

    return jsonify({'code': 0, 'message': '自定义挑战创建成功', 'data': chal.data[0] if chal.data else None})


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
