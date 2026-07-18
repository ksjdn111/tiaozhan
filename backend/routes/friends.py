from flask import Blueprint, request, jsonify
from services.supabase_client import get_auth_supabase
from utils.auth import get_current_user

friends_bp = Blueprint('friends', __name__)


@friends_bp.route('/request', methods=['POST'])
def send_request():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    target_id = data.get('target_user_id')
    if not target_id:
        return jsonify({'code': 1, 'message': '缺少目标用户'}), 400
    if str(target_id) == str(user_id):
        return jsonify({'code': 1, 'message': '不能添加自己'}), 400

    supabase = get_auth_supabase()

    existing = supabase.from_('friends').select('*').or_(
        f'requester_id.eq.{user_id},addressee_id.eq.{user_id}'
    ).or_(
        f'requester_id.eq.{target_id},addressee_id.eq.{target_id}'
    ).execute()

    for f in existing.data:
        ids = {f['requester_id'], f['addressee_id']}
        if str(user_id) in ids and str(target_id) in ids:
            if f['status'] == 'accepted':
                return jsonify({'code': 1, 'message': '已经是好友了'}), 400
            if f['status'] == 'pending':
                return jsonify({'code': 1, 'message': '已经发送过请求了'}), 400

    supabase.from_('friends').insert({
        'requester_id': str(user_id),
        'addressee_id': str(target_id),
        'status': 'pending'
    }).execute()

    return jsonify({'code': 0, 'message': '好友请求已发送'})


@friends_bp.route('/respond', methods=['POST'])
def respond_request():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    request_id = data.get('request_id')
    accept = data.get('accept', True)

    supabase = get_auth_supabase()
    req = supabase.from_('friends').select('*').eq('id', request_id).single().execute()
    if not req.data:
        return jsonify({'code': 1, 'message': '请求不存在'}), 404
    if str(req.data['addressee_id']) != str(user_id):
        return jsonify({'code': 1, 'message': '无权操作'}), 403

    status = 'accepted' if accept else 'rejected'
    supabase.from_('friends').update({'status': status}).eq('id', request_id).execute()

    return jsonify({'code': 0, 'message': '已接受' if accept else '已拒绝'})


@friends_bp.route('/list', methods=['GET'])
def get_friends():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_auth_supabase()
    sent = supabase.from_('friends').select(
        '*, profile:addressee_id(username, avatar_url, bio)'
    ).eq('requester_id', user_id).eq('status', 'accepted').execute()
    received = supabase.from_('friends').select(
        '*, profile:requester_id(username, avatar_url, bio)'
    ).eq('addressee_id', user_id).eq('status', 'accepted').execute()

    friends_list = []
    for f in sent.data:
        p = f.get('profile', {})
        friends_list.append({
            'friend_id': f['addressee_id'],
            'username': p.get('username', ''),
            'avatar_url': p.get('avatar_url', ''),
            'bio': p.get('bio', ''),
            'since': f['created_at']
        })
    for f in received.data:
        p = f.get('profile', {})
        friends_list.append({
            'friend_id': f['requester_id'],
            'username': p.get('username', ''),
            'avatar_url': p.get('avatar_url', ''),
            'bio': p.get('bio', ''),
            'since': f['created_at']
        })

    return jsonify({'code': 0, 'data': friends_list})


@friends_bp.route('/requests', methods=['GET'])
def get_requests():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_auth_supabase()
    result = supabase.from_('friends').select(
        'id, requester_id, created_at, profile:requester_id(username, avatar_url)'
    ).eq('addressee_id', user_id).eq('status', 'pending').execute()

    return jsonify({'code': 0, 'data': result.data})


@friends_bp.route('/search', methods=['GET'])
def search_users():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'code': 0, 'data': []})

    supabase = get_auth_supabase()
    result = supabase.from_('profiles').select('id, username, avatar_url, bio').neq(
        'id', user_id
    ).ilike('username', f'%{q}%').limit(20).execute()

    return jsonify({'code': 0, 'data': result.data})


@friends_bp.route('/messages/<uuid:friend_id>', methods=['GET'])
def get_messages(friend_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    friend_id_str = str(friend_id)
    supabase = get_auth_supabase()
    result = supabase.from_('messages').select('*').or_(
        f'sender_id.eq.{user_id},receiver_id.eq.{user_id}'
    ).or_(
        f'sender_id.eq.{friend_id_str},receiver_id.eq.{friend_id_str}'
    ).order('created_at').execute()

    msgs = []
    for m in result.data:
        msgs.append({
            'id': m['id'],
            'sender_id': m['sender_id'],
            'content': m['content'],
            'created_at': m['created_at'],
            'is_me': str(m['sender_id']) == str(user_id)
        })

    return jsonify({'code': 0, 'data': msgs})


@friends_bp.route('/messages/send', methods=['POST'])
def send_message():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    receiver_id = data.get('receiver_id')
    content = data.get('content', '').strip()

    if not receiver_id or not content:
        return jsonify({'code': 1, 'message': '参数不完整'}), 400
    if len(content) > 1000:
        return jsonify({'code': 1, 'message': '消息最长1000个字符'}), 400

    supabase = get_auth_supabase()
    supabase.from_('messages').insert({
        'sender_id': str(user_id),
        'receiver_id': str(receiver_id),
        'content': content
    }).execute()

    return jsonify({'code': 0, 'message': '发送成功'})


@friends_bp.route('/conversations', methods=['GET'])
def get_conversations():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_auth_supabase()
    msgs = supabase.from_('messages').select('*').or_(
        f'sender_id.eq.{user_id},receiver_id.eq.{user_id}'
    ).order('created_at', desc=True).execute()

    conversations = {}
    for m in msgs.data:
        other_id = str(m['receiver_id']) if str(m['sender_id']) == str(user_id) else str(m['sender_id'])
        if other_id not in conversations:
            conversations[other_id] = {
                'other_id': other_id,
                'last_message': m['content'],
                'last_time': m['created_at']
            }

    other_ids = list(conversations.keys())
    if other_ids:
        profiles = supabase.from_('profiles').select('id, username, avatar_url').in_('id', other_ids).execute()
        for p in profiles.data:
            pid = str(p['id'])
            if pid in conversations:
                conversations[pid]['username'] = p.get('username', '')
                conversations[pid]['avatar_url'] = p.get('avatar_url', '')

    return jsonify({'code': 0, 'data': list(conversations.values())})
