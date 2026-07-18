-- 用户扩展表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 挑战池
CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5)
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_select" ON challenges FOR SELECT USING (true);

-- 每日挑战
CREATE TABLE IF NOT EXISTS daily_challenges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
  note TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_status ON daily_challenges(status);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_challenges_select" ON daily_challenges FOR SELECT USING (true);
CREATE POLICY "daily_challenges_insert" ON daily_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_challenges_update" ON daily_challenges FOR UPDATE USING (auth.uid() = user_id);

-- 点赞
CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  daily_challenge_id INTEGER NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, daily_challenge_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON likes FOR DELETE USING (auth.uid() = user_id);

-- 徽章定义
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  condition JSONB NOT NULL DEFAULT '{}'
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_select" ON badges FOR SELECT USING (true);

-- 用户徽章
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges_select" ON user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges_insert" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========== 种子数据 ==========

-- 徽章定义
INSERT INTO badges (name, icon, description, condition) VALUES
  ('初次挑战', '🏅', '完成第一个挑战', '{"completed": 1}'),
  ('连续3天', '🔥', '连续完成3天挑战', '{"streak": 3}'),
  ('连续7天', '💪', '连续完成7天挑战', '{"streak": 7}'),
  ('连续30天', '🌟', '连续完成30天挑战', '{"streak": 30}'),
  ('社交达人', '👥', '获得10个赞', '{"likes_received": 10}'),
  ('人气之星', '⭐', '获得50个赞', '{"likes_received": 50}'),
  ('全能选手', '🎯', '完成所有类别挑战各一次', '{"all_categories": true}'),
  ('运动健将', '🏃', '完成10个运动类挑战', '{"category": "运动", "count": 10}'),
  ('美食家', '🍳', '完成10个美食类挑战', '{"category": "美食", "count": 10}'),
  ('学霸', '📚', '完成10个学习类挑战', '{"category": "学习", "count": 10}'),
  ('创意大师', '🎨', '完成10个创意类挑战', '{"category": "创意", "count": 10}'),
  ('自律达人', '⏰', '累计完成100个挑战', '{"completed": 100}')
ON CONFLICT DO NOTHING;

-- 挑战池
INSERT INTO challenges (title, description, category, difficulty) VALUES
  -- 运动类
  ('晨跑15分钟', '早起去户外慢跑15分钟，感受清晨的空气', '运动', 2),
  ('30个俯卧撑', '完成30个俯卧撑，分组完成也可以', '运动', 2),
  ('拉伸10分钟', '做一套全身拉伸动作，放松肌肉', '运动', 1),
  ('跳操20分钟', '跟着视频跳20分钟有氧操', '运动', 3),
  ('散步30分钟', '放下手机，出门散步30分钟', '运动', 1),
  ('靠墙静蹲', '靠墙静蹲1分钟，做3组', '运动', 3),
  ('跳绳500个', '跳绳500个，可以分次完成', '运动', 3),
  ('瑜伽冥想', '做15分钟瑜伽或冥想练习', '运动', 2),

  -- 美食类
  ('学做一道新菜', '尝试做一道从未做过的菜', '美食', 3),
  ('自制健康早餐', '做一顿营养均衡的早餐', '美食', 2),
  ('打卡一家新店', '去一家没去过的餐厅或咖啡馆', '美食', 2),
  ('戒糖一天', '今天不喝含糖饮料，不吃甜食', '美食', 3),
  ('做一份水果沙拉', '用至少3种水果做沙拉', '美食', 1),
  ('尝试一种新食材', '买一种没吃过的食材并烹饪', '美食', 3),

  -- 学习类
  ('读30分钟书', '安静地读30分钟书', '学习', 1),
  ('背10个单词', '学习10个新的外语单词', '学习', 1),
  ('写一篇日记', '记录今天的想法和感受', '学习', 2),
  ('学习一个技能视频', '看一个教程视频并做笔记', '学习', 2),
  ('整理知识笔记', '整理最近学到的知识点', '学习', 2),
  ('练习字帖', '练字15分钟', '学习', 1),
  ('读一篇深度文章', '阅读一篇长文并总结要点', '学习', 2),

  -- 创意类
  ('画一幅小画', '画一幅简单的画，不拘泥于形式', '创意', 2),
  ('拍一张好照片', '留意生活中的美，拍一张满意的照片', '创意', 1),
  ('写一首短诗', '写一首关于今天的小诗', '创意', 3),
  ('DIY手工', '用身边的材料做一个小手工', '创意', 3),
  ('拍一段短视频', '记录生活中的有趣瞬间', '创意', 2),
  ('做一件手工艺品', '折纸、编织等任何手工', '创意', 3),

  -- 生活/其他
  ('整理房间', '收拾一个角落或桌面', '生活', 1),
  ('给朋友发消息', '联系一个久未联系的朋友', '生活', 1),
  ('早睡1小时', '比平时早睡1小时', '生活', 2),
  ('断网2小时', '远离电子设备2小时', '生活', 3),
  ('做一件好事', '帮助一个身边的人', '生活', 1),
  ('写一份感恩清单', '写下5件今天值得感恩的事', '生活', 1),
  ('整理手机相册', '清理手机里不需要的照片', '生活', 1),
   ('计划下周目标', '制定下周的三个小目标', '生活', 2)
ON CONFLICT DO NOTHING;

-- ========== 新增功能：自定义挑战、评论、好友、聊天 ==========

-- profiles 加 bio 字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- challenges 加 creator_id（NULL = 系统挑战）
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  daily_challenge_id INTEGER NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_dc ON comments(daily_challenge_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = user_id);

-- 好友关系表
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(requester_id);
CREATE INDEX IF NOT EXISTS idx_friends_addressee ON friends(addressee_id);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friends_select" ON friends FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friends_insert" ON friends FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "friends_update" ON friends FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 私信表
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
