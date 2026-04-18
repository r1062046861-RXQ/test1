# 腾讯云 EdgeOne Pages 发布说明

本项目已经补好了 EdgeOne CLI 发布依赖与脚本。

## 已准备好的命令

在 `C:\Users\C2H6O\Desktop\wechatgame\game` 目录下：

```bash
npm run edgeone:login
npm run edgeone:whoami
npm run edgeone:deploy
npm run edgeone:preview
```

含义：

- `edgeone:login`：登录腾讯云 EdgeOne
- `edgeone:whoami`：确认当前登录身份
- `edgeone:deploy`：构建后发布到生产环境
- `edgeone:preview`：构建后发布到预览环境

## 当前发布目录

- 构建产物目录：`./dist`
- 项目名：`yaoling-wushuang-web`

## 重要限制

根据腾讯官方 EdgeOne Pages 文档：

- 如果你要覆盖 **中国大陆访问**
- 但又 **没有自定义域名 / 没有备案**

那么系统生成的可访问链接只适合 **临时预览**，不是长期稳定公开域名。

也就是说：

- **现在可以先发一个临时可访问链接做测试**
- **如果要长期公开给大陆玩家稳定访问，后续仍然需要自定义域名 + ICP 备案**

## 真正执行发布前你需要做的事

1. 注册腾讯云账号
2. 完成实名认证
3. 在本机执行一次：

```bash
npm run edgeone:login
```

登录完成后，就可以继续执行：

```bash
npm run edgeone:deploy
```

## 我已经完成的准备

- 已安装 `edgeone` CLI 依赖
- 已确认 CLI 可在本机运行
- 已补充一键构建发布脚本
- 当前项目可直接进入 EdgeOne Pages 直传流程
