# 部署脚本 - 在服务器上运行
# 此脚本需要您在服务器上手动执行

Write-Host "=== 部署开始 ===" -ForegroundColor Cyan

# 1. 从 GitHub 拉取最新代码 (需要在能访问 GitHub 的机器上先 push)
# 如果不能 push, 手动将文件同步到服务器对应目录

$SERVER_PATH = "C:\tiaozhan"

# 2. 后端部署
Write-Host "[1/3] 更新后端..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "${SERVER_PATH}\..\yidongshixun\backend\*" "${SERVER_PATH}\backend\"
# 重启后端
Stop-ScheduledTask -TaskName "tiaozhan-backend" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName "tiaozhan-backend"
Write-Host "  后端已重启" -ForegroundColor Green

# 3. 执行数据库迁移 (在服务器上需要先停止后端)
Write-Host "[2/3] 数据库迁移..." -ForegroundColor Yellow
Write-Host "  请在 Supabase SQL Editor 中执行 backend\schema.sql 中的 ALTER TABLE ADD COLUMN 语句" -ForegroundColor Yellow

# 4. 前端部署
Write-Host "[3/3] 更新前端..." -ForegroundColor Yellow
Copy-Item -Recurse -Force "${SERVER_PATH}\..\yidongshixun\frontend\src\*" "${SERVER_PATH}\frontend\src\"
Copy-Item -Force "${SERVER_PATH}\..\yidongshixun\frontend\package.json" "${SERVER_PATH}\frontend\package.json"
Copy-Item -Force "${SERVER_PATH}\..\yidongshixun\frontend\package-lock.json" "${SERVER_PATH}\frontend\package-lock.json"

# 重建前端
Set-Location "${SERVER_PATH}\frontend"
npm run build
# 重启前端
Stop-ScheduledTask -TaskName "tiaozhan-frontend" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName "tiaozhan-frontend"
Write-Host "  前端已重建并重启" -ForegroundColor Green

Write-Host "=== 部署完成 ===" -ForegroundColor Cyan
