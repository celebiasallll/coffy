// LazyAssetLoader: Varlıkları ihtiyaç anında yükler ve cache'ler
export default class LazyAssetLoader {
  constructor() {
    this.textures = {};
    this.models = {};
    this.sounds = {};
  }

  loadTexture(path, onLoad) {
    if (this.textures[path]) {
      onLoad(this.textures[path]);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(path, (texture) => {
      this.textures[path] = texture;
      onLoad(texture);
    });
  }

  loadModel(path, loaderClass, onLoad) {
    if (this.models[path]) {
      onLoad(this.models[path]);
      return;
    }
    const loader = new loaderClass();
    loader.load(path, (model) => {
      this.models[path] = model;
      onLoad(model);
    });
  }

  loadSound(path, audioListener, onLoad) {
    if (this.sounds[path]) {
      onLoad(this.sounds[path]);
      return;
    }
    const audioLoader = new THREE.AudioLoader();
    const sound = new THREE.Audio(audioListener);
    audioLoader.load(path, (buffer) => {
      sound.setBuffer(buffer);
      this.sounds[path] = sound;
      onLoad(sound);
    });
  }
} 