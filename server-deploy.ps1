# 服务器部署脚本 - 在 Tencent Cloud 服务器上以管理员身份运行

$GITCODE_URL = "https://gitcode.com/ksjdn/tiaozhan.git"
$APP_DIR = "C:\tiaozhan"
$BACKEND_DIR = "$APP_DIR\backend"
$FRONTEND_DIR = "$APP_DIR\frontend"

Write-Host "=== 开始部署 tiaozhan ===" -ForegroundColor Cyan

# 1. Git pull or clone
if (Test-Path "$APP_DIR\.git") {
    Set-Location $APP_DIR
    git pull $GITCODE_URL main
} else {
    git clone $GITCODE_URL $APP_DIR
}
Write-Host "[1/5] 代码更新完成" -ForegroundColor Green

# 2. 停止后端
Stop-ScheduledTask -TaskName "tiaozhan-backend" -ErrorAction SilentlyContinue
Write-Host "[2/5] 后端已停止" -ForegroundColor Green

# 3. 安装后端依赖
Set-Location $BACKEND_DIR
pip install -r requirements.txt 2>&1 | Out-Null
Write-Host "[3/5] 后端依赖已安装" -ForegroundColor Green

# 4. 重启后端
Start-ScheduledTask -TaskName "tiaozhan-backend"
Write-Host "[4/5] 后端已启动" -ForegroundColor Green

# 5. 重建并重启前端
Set-Location $FRONTEND_DIR
npm install 2>&1 | Out-Null
npm run build
Stop-ScheduledTask -TaskName "tiaozhan-frontend" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName "tiaozhan-frontend"
Write-Host "[5/5] 前端已重建并重启" -ForegroundColor Green

Write-Host "=== 部署完成 ===" -ForegroundColor Cyan
Write-Host "访问: http://119.29.221.173:19191" -ForegroundColor Yellow
