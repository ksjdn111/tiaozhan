from flask import Blueprint, request, jsonify
from services.supabase_client import get_auth_supabase
from utils.auth import get_current_user
import json

feed_bp = Blueprint('feed', __name__)

def _merge_custom_note(item):
    if not item or not isinstance(item, dict):
        return item
    note = item.get('note')
    if note and isinstance(note, str) and note.startswith('{'):
        try:
            custom = json.loads(note)
            if custom.get('custom'):
                chal = item.get('challenge') or {}
                chal['title'] = custom.get('title', chal.get('title', ''))
                chal['description'] = custom.get('description', chal.get('description', ''))
                chal['category'] = custom.get('category', chal.get('category', ''))
                chal['difficulty'] = custom.get('difficulty', chal.get('difficulty', 3))
                chal['creator_id'] = custom.get('creator_id', chal.get('creator_id'))
                item['challenge'] = chal
                item['_is_custom'] = True
                item['_user_note'] = custom.get('user_note', '')
        except (json.JSONDecodeError, TypeError):
            pass
    return item

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
        _merge_custom_note(item)

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
    for c in item['comments']:
        if 'photo_url' not in c:
            c['photo_url'] = ''

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
    _merge_custom_note(item)

    return jsonify({'code': 0, 'data': item})


@feed_bp.route('/comment-like', methods=['POST'])
def comment_like():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401
    data = request.get_json()
    comment_id = data.get('comment_id')
    if not comment_id:
        return jsonify({'code': 1, 'message': '缺少comment_id'}), 400
    supabase = get_auth_supabase()
    existing = supabase.from_('comment_likes').select('id').eq('comment_id', comment_id).eq('user_id', user_id).execute()
    curr = supabase.from_('comments').select('like_count').eq('id', comment_id).execute()
    curr_likes = curr.data[0]['like_count'] if curr.data else 0
    if existing.data:
        supabase.from_('comment_likes').delete().eq('id', existing.data[0]['id']).execute()
        supabase.from_('comments').update({'like_count': max(0, curr_likes - 1)}).eq('id', comment_id).execute()
        return jsonify({'code': 0, 'liked': False})
    else:
        supabase.from_('comment_likes').insert({'comment_id': comment_id, 'user_id': user_id}).execute()
        supabase.from_('comments').update({'like_count': curr_likes + 1}).eq('id', comment_id).execute()
        return jsonify({'code': 0, 'liked': True})


@feed_bp.route('/my-comments', methods=['GET'])
def my_comments():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401
    supabase = get_auth_supabase()
    result = supabase.from_('comments').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(50).execute()
    return jsonify({'code': 0, 'data': result.data or []})


@feed_bp.route('/delete-post/<int:dc_id>', methods=['DELETE'])
def delete_post(dc_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401
    supabase = get_auth_supabase()
    post = supabase.from_('daily_challenges').select('user_id').eq('id', dc_id).single().execute()
    if not post.data or str(post.data['user_id']) != str(user_id):
        return jsonify({'code': 1, 'message': '无权删除'}), 403
    supabase.from_('daily_challenges').delete().eq('id', dc_id).execute()
    return jsonify({'code': 0, 'message': '已删除'})


@feed_bp.route('/my-posts', methods=['GET'])
def my_posts():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401
    supabase = get_auth_supabase()
    result = supabase.from_('daily_challenges').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(50).execute()
    posts = []
    for row in result.data or []:
        item = dict(row)
        item['profile'] = None
        _merge_custom_note(item)
        posts.append(item)
    return jsonify({'code': 0, 'data': posts})


@feed_bp.route('/delete-comment/<int:comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401
    supabase = get_auth_supabase()
    comment = supabase.from_('comments').select('user_id').eq('id', comment_id).single().execute()
    if not comment.data or str(comment.data['user_id']) != str(user_id):
        return jsonify({'code': 1, 'message': '无权删除'}), 403
    supabase.from_('comments').delete().eq('id', comment_id).execute()
    return jsonify({'code': 0, 'message': '已删除'})


@feed_bp.route('/comment', methods=['POST'])
def add_comment():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    dc_id = data.get('daily_challenge_id')
    content = data.get('content', '').strip()
    parent_id = data.get('parent_id')

    if not dc_id or not content:
        return jsonify({'code': 1, 'message': '参数不完整'}), 400
    if len(content) > 500:
        return jsonify({'code': 1, 'message': '评论最长500个字符'}), 400

    supabase = get_auth_supabase()
    insert_data = {
        'user_id': str(user_id),
        'daily_challenge_id': dc_id,
        'content': content
    }
    if parent_id:
        insert_data['parent_id'] = parent_id
    photo_url = data.get('photo_url')
    if photo_url:
        insert_data['photo_url'] = photo_url
    supabase.from_('comments').insert(insert_data).execute()

    return jsonify({'code': 0, 'message': '评论成功'})


@feed_bp.route('/my-likes', methods=['GET'])
def my_likes():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401
    supabase = get_auth_supabase()
    likes = supabase.from_('likes').select('daily_challenge_id, created_at').eq('user_id', user_id).order('created_at', desc=True).limit(50).execute()
    dc_ids = [l['daily_challenge_id'] for l in (likes.data or [])]
    posts = []
    for dc_id in dc_ids:
        dc = supabase.from_('daily_challenges').select('id, challenge:challenge_id(title), note, photo_url, created_at').eq('id', dc_id).single().execute()
        if dc.data:
            item = dict(dc.data)
            _merge_custom_note(item)
            item['liked_at'] = next((l['created_at'] for l in (likes.data or []) if l['daily_challenge_id'] == dc_id), '')
            posts.append(item)
    return jsonify({'code': 0, 'data': posts})


@feed_bp.route('/notifications', methods=['GET'])
def get_notifications():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_auth_supabase()

    # Get user's daily challenge IDs
    dc_ids_resp = supabase.from_('daily_challenges').select('id').eq('user_id', user_id).execute()
    dc_ids = [d['id'] for d in (dc_ids_resp.data or [])]

    notifications = []

    if dc_ids:
        # Likes received
        likes = supabase.from_('likes').select(
            'id, created_at, user_id, daily_challenge_id, profile:user_id(username, avatar_url)'
        ).in_('daily_challenge_id', dc_ids).order('created_at', desc=True).limit(20).execute()
        for l in (likes.data or []):
            dc = supabase.from_('daily_challenges').select('id, challenge:challenge_id(title)').eq('id', l['daily_challenge_id']).single().execute()
            notifications.append({
                'type': 'like',
                'user': l.get('profile', {}),
                'daily_challenge_id': l['daily_challenge_id'],
                'challenge_title': dc.data.get('challenge', {}).get('title', '') if dc.data else '',
                'created_at': l['created_at']
            })

        # Comments received
        comments = supabase.from_('comments').select(
            'id, created_at, user_id, daily_challenge_id, content, profile:user_id(username, avatar_url)'
        ).in_('daily_challenge_id', dc_ids).neq('user_id', user_id).order('created_at', desc=True).limit(20).execute()
        for c in (comments.data or []):
            dc = supabase.from_('daily_challenges').select('id, challenge:challenge_id(title)').eq('id', c['daily_challenge_id']).single().execute()
            notifications.append({
                'type': 'comment',
                'user': c.get('profile', {}),
                'daily_challenge_id': c['daily_challenge_id'],
                'challenge_title': dc.data.get('challenge', {}).get('title', '') if dc.data else '',
                'content': c['content'],
                'created_at': c['created_at']
            })

    # Sort by time desc
    notifications.sort(key=lambda n: n['created_at'], reverse=True)

    return jsonify({'code': 0, 'data': notifications[:30]})
