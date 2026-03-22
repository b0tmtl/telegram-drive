# Telegram Drive

Use your personal Telegram account as unlimited cloud storage. Files larger than 1.9 GB are automatically split into chunks on upload and seamlessly reassembled on download.

## How it works

- Authenticates as **your Telegram user account** (not a bot) via MTProto — giving access to the full 2 GB per file limit
- Files are uploaded to your **Saved Messages** chat as documents
- A **manifest** (pinned message in Saved Messages) tracks every file's metadata and chunk message IDs
- Virtual folders are supported via path prefixes in the manifest
- Chunked files show a `N parts` badge and download/reassemble transparently

## Requirements

- [Node.js](https://nodejs.org) v18+
- A Telegram account
- A Telegram **App api_id** and **api_hash** from [my.telegram.org/apps](https://my.telegram.org/apps)

## Getting started

```bash
# 1. Clone and install root deps
git clone https://github.com/YOUR_USERNAME/telegram-drive.git
cd telegram-drive
npm install

# 2. Install renderer deps
cd renderer
npm install
cd ..

# 3. Run in development mode
npm start
```

On first launch:
1. Enter your **api_id** and **api_hash** from my.telegram.org/apps
2. Enter your phone number (with country code)
3. Enter the code sent to your Telegram app
4. (Optional) Enter your 2FA cloud password if enabled

Your session is saved to `~/.telegram-drive-session` so you only need to log in once.

## Building

```bash
# Windows
npm run build:win

# macOS
npm run build:mac
```

## Project structure

```
telegram-drive/
├── main/
│   ├── index.js      # Electron entry point
│   ├── preload.js    # IPC bridge to renderer
│   ├── telegram.js   # GramJS MTProto client, chunking, manifest
│   ├── keychain.js   # Secure credential storage
│   └── files.js      # Local filesystem operations
└── renderer/
    └── src/
        ├── App.jsx
        ├── store/index.js
        ├── utils/index.js
        └── components/
            ├── Setup.jsx          # 3-step auth flow
            ├── Titlebar.jsx
            ├── TelegramPanel.jsx  # Remote file browser
            ├── LocalPanel.jsx     # Local file browser
            ├── FileItem.jsx
            ├── TransferQueue.jsx  # Activity sidebar with progress bars
            └── Toast.jsx
```

## Limits

| Limit | Value |
|-------|-------|
| Max chunk size | 1.9 GB |
| Max single file | Unlimited (auto-chunked) |
| Storage | As much as Telegram allows (effectively unlimited for Saved Messages) |
| Files are permanent | Yes — as long as you don't delete the messages |

## License

MIT
