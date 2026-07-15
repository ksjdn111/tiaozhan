from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase
from utils.auth import get_current_user

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    username = data.get('username')

    if not all([email, password, username]):
        return jsonify({'code': 1, 'message': '缺少必填字段'}), 400

    supabase = get_supabase()
    auth_res = supabase.auth.sign_up({'email': email, 'password': password})
    if auth_res.user is None:
        return jsonify({'code': 1, 'message': '注册失败'}), 400

    user_id = auth_res.user.id
    supabase.from_('profiles').insert({
        'id': user_id,
        'username': username
    }).execute()

    return jsonify({'code': 0, 'message': '注册成功,请查看邮箱验证码'})

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({'code': 1, 'message': '缺少必填字段'}), 400

    supabase = get_supabase()
    auth_res = supabase.auth.sign_in_with_password({'email': email, 'password': password})
    if auth_res.user is None:
        return jsonify({'code': 1, 'message': '邮箱或密码错误'}), 401

    return jsonify({
        'code': 0,
        'data': {
            'access_token': auth_res.session.access_token,
            'user_id': auth_res.user.id,
            'email': auth_res.user.email
        }
    })

@auth_bp.route('/profile', methods=['GET'])
def get_profile():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    supabase = get_supabase()
    profile = supabase.from_('profiles').select('*').eq('id', user_id).single().execute()
    return jsonify({'code': 0, 'data': profile.data})

@auth_bp.route('/profile', methods=['PUT'])
def update_profile():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'code': 1, 'message': '未授权'}), 401

    data = request.get_json()
    update_data = {}
    if 'username' in data:
        update_data['username'] = data['username']
    if 'avatar_url' in data:
        update_data['avatar_url'] = data['avatar_url']

    supabase = get_supabase()
    supabase.from_('profiles').update(update_data).eq('id', user_id).execute()
    return jsonify({'code': 0, 'message': '更新成功'})
