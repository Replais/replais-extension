import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'ReplAIs',
  description: 'Context-aware AI replies anywhere you type.',
  version: '0.0.1',
  action: {
    default_popup: 'src/popup/index.html',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module'
  },
//   icons: {
//     "128": "icon-128.png"
//   },
  permissions: [
    "storage",
    "activeTab",
    "scripting",
    "contextMenus",
    "clipboardRead"
  ],
  host_permissions: [
    "<all_urls>"
  ],
  commands: {
    suggest_reply: {
      description: "Suggest a reply with ReplAIs",
      suggested_key: {
        default: "Ctrl+Shift+Period",
        mac: "Command+Shift+Period"
      }
    }
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: [],
      matches: ["<all_urls>"]
    }
  ]
});