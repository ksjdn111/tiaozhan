from flask import Flask
from flask_cors import CORS
from config import FLASK_PORT
from routes.auth import auth_bp
from routes.challenges import challenges_bp
from routes.feed import feed_bp
from routes.badges import badges_bp

app = Flask(__name__)
CORS(app)

@app.errorhandler(Exception)
def handle_error(e):
    return {'code': 1, 'message': str(e)}, 500

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(challenges_bp, url_prefix='/api/challenge')
app.register_blueprint(feed_bp, url_prefix='/api/feed')
app.register_blueprint(badges_bp, url_prefix='/api/badges')

@app.route('/api/health')
def health():
    return {'code': 0, 'message': 'ok'}

@app.route('/api/debug-auth')
def debug_auth():
    from utils.auth import get_current_user
    uid = get_current_user()
    auth = request.headers.get('Authorization', '')[:50]
    return {'code': 0, 'user_id': uid, 'auth_header': auth}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=FLASK_PORT, debug=True)
