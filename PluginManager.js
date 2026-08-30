const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

/**
 * PluginManager
 * Scans a plugins directory (same drop-in convention as /themes), loads each
 * plugin's manifest + entry file, and calls activate(hostApi) on it.
 *
 * Plugin folder shape:
 *   /plugins/<plugin-id>/plugin.json   -> manifest
 *   /plugins/<plugin-id>/index.js      -> exports { activate(hostApi), deactivate?() }
 */
class PluginManager {
  constructor() {
    this.bus = new EventEmitter();
    this.plugins = new Map(); // id -> { manifest, mod }
    this.panels = [];         // UI panels registered by plugins
  }

  /**
   * The single object every plugin receives. Keep this small — grow it only
   * when a real plugin needs more, not speculatively.
   */
  _buildHostApi(games) {
    return {
      // event bus — same pattern as the existing gc.button controller events
      on: (event, handler) => this.bus.on(event, handler),
      off: (event, handler) => this.bus.off(event, handler),
      emit: (event, payload) => this.bus.emit(event, payload),

      // read-only game data access
      getGames: () => games,

      // let a plugin ask the host to launch something (goes through your
      // existing launch/UAC logic, plugins never spawn processes directly)
      launchGame: (id) => this.bus.emit('plugin:request-launch', { id }),

      // let a plugin contribute a UI panel (renderer decides how to mount it)
      registerPanel: (panelDef) => {
        this.panels.push(panelDef);
        this.bus.emit('plugin:panel-registered', panelDef);
      },

      // let a plugin push updated HTML into a panel it already registered
      updatePanel: (id, html) => {
        this.bus.emit('plugin:panel-update', { id, html });
      },

      // basic logging so plugin errors are traceable to their source
      log: (...args) => console.log('[plugin]', ...args),
    };
  }

  loadAll(pluginsDir, { games = [] } = {}) {
    if (!fs.existsSync(pluginsDir)) return;

    const hostApi = this._buildHostApi(games);

    for (const dir of fs.readdirSync(pluginsDir)) {
      const pluginPath = path.join(pluginsDir, dir);
      if (!fs.statSync(pluginPath).isDirectory()) continue;

      const manifestPath = path.join(pluginPath, 'plugin.json');
      if (!fs.existsSync(manifestPath)) {
        console.warn(`[plugins] Skipping "${dir}": no plugin.json`);
        continue;
      }

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const entry = path.join(pluginPath, manifest.main || 'index.js');
        const mod = require(entry);

        mod.activate?.(hostApi);
        this.plugins.set(manifest.id || dir, { manifest, mod });
        console.log(`[plugins] Loaded "${manifest.name || dir}"`);
      } catch (err) {
        // one bad plugin should never take down the launcher
        console.error(`[plugins] Failed to load "${dir}":`, err.message);
      }
    }
  }

  unloadAll() {
    for (const [id, { mod }] of this.plugins) {
      try {
        mod.deactivate?.();
      } catch (err) {
        console.error(`[plugins] Error deactivating "${id}":`, err.message);
      }
    }
    this.plugins.clear();
    this.panels = [];
  }
}

module.exports = PluginManager;
