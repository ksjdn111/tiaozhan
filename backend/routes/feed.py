from flask import Blueprint, request, jsonify
from services.supabase_client import get_auth_supabase
from utils.auth import get_current_user

feed_bp = Blueprint('feed', __name__)

@feed_bp.route('/list', methods=['GET'])
def get_feed():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 20, type=int)

    supabase = get_auth_supabase()
    offset = (page - 1) * size
    result = supabase.from_('daily_challenges').select(
        '*, challenge:challenge_id(*), profile:user_id(username, avatar_url), likes:likes(count)'
    ).eq('status', 'done').order('created_at', desc=True).range(offset, offset + size - 1).execute()

    for item in result.data:
        my_like = supabase.from_('likes').select('id').eq(
            'user_id', user_id
        ).eq('daily_challenge_id', item['id']).execute()
        item['liked_by_me'] = len(my_like.data) > 0
        item['like_count'] = len(item.get('likes', []))

    return jsonify({'code': 0, 'data': result.data})

@feed_bp.route('/like', methods=['POST'])
def toggle_like():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    dc_id = data.get('daily_challenge_id')

    supabase = get_auth_supabase()
    existing = supabase.from_('likes').select('id').eq(
        'user_id', user_id
    ).eq('daily_challenge_id', dc_id).execute()

    if existing.data:
        supabase.from_('likes').delete().eq('id', existing.data[0]['id']).execute()
        return jsonify({'code': 0, 'message': '取消点赞', 'liked': False})
    else:
        supabase.from_('likes').insert({
            'user_id': user_id,
            'daily_challenge_id': dc_id
        }).execute()
        return jsonify({'code': 0, 'message': '点赞成功', 'liked': True})


@feed_bp.route('/detail/<int:dc_id>', methods=['GET'])
def get_detail(dc_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_auth_supabase()
    dc = supabase.from_('daily_challenges').select(
        '*, challenge:challenge_id(*), profile:user_id(username, avatar_url, bio)'
    ).eq('id', dc_id).single().execute()

    if not dc.data:
        return jsonify({'code': 1, 'message': '不存在'}), 404

    item = dc.data
    my_like = supabase.from_('likes').select('id').eq(
        'user_id', user_id
    ).eq('daily_challenge_id', dc_id).execute()
    item['liked_by_me'] = len(my_like.data) > 0
    likes_count = supabase.from_('likes').select('id', count='exact').eq(
        'daily_challenge_id', dc_id
    ).execute()
    item['like_count'] = likes_count.count

    comments = supabase.from_('comments').select(
        '*, profile:user_id(username, avatar_url)'
    ).eq('daily_challenge_id', dc_id).order('created_at').execute()
    item['comments'] = comments.data if comments.data else []

    return jsonify({'code': 0, 'data': item})


@feed_bp.route('/comment', methods=['POST'])
def add_comment():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    dc_id = data.get('daily_challenge_id')
    content = data.get('content', '').strip()

    if not dc_id or not content:
        return jsonify({'code': 1, 'message': '参数不完整'}), 400
    if len(content) > 500:
        return jsonify({'code': 1, 'message': '评论最长500个字符'}), 400

    supabase = get_auth_supabase()
    supabase.from_('comments').insert({
        'user_id': str(user_id),
        'daily_challenge_id': dc_id,
        'content': content
    }).execute()

    return jsonify({'code': 0, 'message': '评论成功'})
