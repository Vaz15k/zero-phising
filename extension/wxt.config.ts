import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],

  manifest: {
    name: 'ZeroPhishing',
    description: 'Proteção contra phishing, malware e controle de acesso em tempo real.',
    version: '0.1.0',

    permissions: [
      'storage',
      'tabs',
      'webNavigation',
      'declarativeNetRequest',
      'notifications',
    ],

    host_permissions: [
      '<all_urls>',
    ],

    icons: {
      16:  'icon/16.png',
      32:  'icon/32.png',
      48:  'icon/48.png',
      96:  'icon/96.png',
      128: 'icon/128.png',
    },

    action: {
      default_popup: 'popup/index.html',
      default_icon: {
        16:  'icon/16.png',
        32:  'icon/32.png',
        48:  'icon/48.png',
        128: 'icon/128.png',
      },
    },

    options_ui: {
      page: 'options/index.html',
      open_in_tab: true,
    },

    declarative_net_request: {
      rule_resources: [{
        id: 'blocked',
        enabled: true,
        path: 'rules/blocked.json',
      }],
    },
  },
});
