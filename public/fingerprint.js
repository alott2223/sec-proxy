// Advanced client-side fingerprinting
class DeviceFingerprint {
  constructor() {
    this.components = {};
  }

  async generate() {
    await this.collectComponents();
    return this.hash(JSON.stringify(this.components));
  }

  async collectComponents() {
    // Screen information
    this.components.screen = {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: screen.orientation ? screen.orientation.type : null
    };

    // Navigator information
    this.components.navigator = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      vendor: navigator.vendor,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    };

    // Timezone
    this.components.timezone = {
      offset: new Date().getTimezoneOffset(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // Canvas fingerprint
    this.components.canvas = await this.getCanvasFingerprint();

    // WebGL fingerprint
    this.components.webgl = await this.getWebGLFingerprint();

    // Fonts
    this.components.fonts = await this.detectFonts();

    // Audio context
    this.components.audio = await this.getAudioFingerprint();

    // Plugins
    this.components.plugins = this.getPlugins();

    // Local storage and session storage availability
    this.components.storage = {
      localStorage: this.testStorage('localStorage'),
      sessionStorage: this.testStorage('sessionStorage'),
      indexedDB: !!window.indexedDB
    };

    // Media devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.components.mediaDevices = {
          count: devices.length,
          types: devices.map(d => d.kind).sort()
        };
      } catch (e) {
        this.components.mediaDevices = { error: 'permission_denied' };
      }
    }

    return this.components;
  }

  async getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 200;
      canvas.height = 50;
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('DeviceID 🔒', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('DeviceID 🔒', 4, 17);
      
      return this.hash(canvas.toDataURL());
    } catch (e) {
      return 'unsupported';
    }
  }

  async getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return 'unsupported';
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
      };
    } catch (e) {
      return 'unsupported';
    }
  }

  async detectFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
      'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
    ];
    
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const baseFontWidths = {};
    baseFonts.forEach(font => {
      ctx.font = testSize + ' ' + font;
      baseFontWidths[font] = ctx.measureText(testString).width;
    });
    
    const detectedFonts = [];
    testFonts.forEach(font => {
      let detected = false;
      baseFonts.forEach(baseFont => {
        ctx.font = testSize + ' ' + font + ', ' + baseFont;
        const width = ctx.measureText(testString).width;
        if (width !== baseFontWidths[baseFont]) {
          detected = true;
        }
      });
      if (detected) detectedFonts.push(font);
    });
    
    return detectedFonts;
  }

  async getAudioFingerprint() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return 'unsupported';
      
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
      
      gainNode.gain.value = 0;
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start(0);
      
      const fingerprint = new Promise((resolve) => {
        scriptProcessor.onaudioprocess = function(bins) {
          const output = new Float32Array(analyser.frequencyBinCount);
          analyser.getFloatFrequencyData(output);
          oscillator.stop();
          scriptProcessor.disconnect();
          resolve(Array.from(output.slice(0, 30)));
        };
      });
      
      const result = await fingerprint;
      context.close();
      return this.hash(JSON.stringify(result));
    } catch (e) {
      return 'unsupported';
    }
  }

  getPlugins() {
    if (!navigator.plugins) return [];
    return Array.from(navigator.plugins).map(p => ({
      name: p.name,
      description: p.description
    }));
  }

  testStorage(type) {
    try {
      const storage = window[type];
      const test = '__storage_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// Export for use in pages
window.DeviceFingerprint = DeviceFingerprint;
