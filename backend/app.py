from flask import Flask
from flask_cors import CORS
from config import FLASK_PORT
from routes.auth import auth_bp
from routes.challenges import challenges_bp
from routes.feed import feed_bp
from routes.badges import badges_bp
from routes.friends import friends_bp

app = Flask(__name__)
CORS(app)

@app.errorhandler(Exception)
def handle_error(e):
    return {'code': 1, 'message': str(e)}, 500

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(challenges_bp, url_prefix='/api/challenge')
app.register_blueprint(feed_bp, url_prefix='/api/feed')
app.register_blueprint(badges_bp, url_prefix='/api/badges')
app.register_blueprint(friends_bp, url_prefix='/api/friends')

@app.route('/api/health')
def health():
    return {'code': 0, 'message': 'ok'}

@app.route('/api/debug-stats')
def debug_stats():
    from services.supabase_client import get_supabase
    from datetime import date, timedelta
    s = get_supabase()
    users = s.from_('daily_challenges').select('user_id').eq('status','done').execute()
    seen = set()
    results = []
    for r in (users.data or []):
        uid = str(r['user_id'])
        if uid not in seen:
            seen.add(uid)
            recs = s.from_('daily_challenges').select('date').eq('user_id',uid).eq('status','done').execute()
            ds = set()
            for rec in (recs.data or []):
                d = rec['date']
                ds.add(d[:10] if isinstance(d,str) else d.isoformat()[:10])
            done = sorted(ds, reverse=True)
            streak = 0
            for i in range(len(done)):
                if done[i] == (date.today() - timedelta(days=i)).isoformat():
                    streak += 1
                else:
                    break
            results.append({'user_id': uid, 'done': len(recs.data or []), 'dates': done, 'streak': streak})
    return {'code': 0, 'data': results}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=FLASK_PORT, debug=True)
