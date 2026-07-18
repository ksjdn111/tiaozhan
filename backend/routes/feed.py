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

    dc_ids = [item['id'] for item in result.data]

    # Bulk liked_by_me
    my_likes = supabase.from_('likes').select('daily_challenge_id').eq(
        'user_id', user_id
    ).in_('daily_challenge_id', dc_ids).execute() if dc_ids else []
    liked_ids = set(l['daily_challenge_id'] for l in (my_likes.data or []))

    # Bulk comment counts
    comment_counts = {}
    if dc_ids:
        for dc_id in dc_ids:
            cc = supabase.from_('comments').select('id', count='exact').eq('daily_challenge_id', dc_id).execute()
            comment_counts[dc_id] = cc.count

    for item in result.data:
        item['liked_by_me'] = item['id'] in liked_ids
        item['like_count'] = len(item.get('likes', []))
        item['comment_count'] = comment_counts.get(item['id'], 0)

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

    # Check if current user is friends with the post author
    is_friend = False
    friendship = supabase.from_('friends').select('requester_id, addressee_id, status').or_(
        f'requester_id.eq.{user_id},addressee_id.eq.{user_id}'
    ).execute()
    for f in friendship.data or []:
        ids = {str(f['requester_id']), str(f['addressee_id'])}
        if str(user_id) in ids and str(item['user_id']) in ids and f['status'] == 'accepted':
            is_friend = True
            break
    item['is_friend'] = is_friend
    item['is_self'] = str(item['user_id']) == str(user_id)

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
