/* global THREE */
'use strict';

function TextureManager() {
  if (!TextureManager.instance) {
    TextureManager.instance = this;
    this.textures = [];
    this.loadingTextures = [];
    this.loadingCubeTextureObjects = [];
    this.streamingMode = false;
  }
  return TextureManager.instance;
};

TextureManager.prototype = {
  constructor: TextureManager,

  setStreamingMode: function(enabled) {
    this.streamingMode = enabled;
  },

  getTexture: function(name) {
    return this.textures[name];
  },

  loadOrRetrieveTexture: function(name, texture, cubeTextureIndex) {
    console.assert(typeof name === 'string', 'TextureManager.loadOrRetrieveTexture: name is not a string.');
    if (name === undefined || name === '')
      return null;

    if (this.textures[name])
      return this.textures[name];

    if (texture instanceof THREE.CubeTexture) {
      var missingImages;
      if (this.loadingCubeTextureObjects[texture]) {
        missingImages = this.loadingCubeTextureObjects[texture];
        if (missingImages[name])
          missingImages[name].push(cubeTextureIndex);
        else
          missingImages[name] = [cubeTextureIndex];
      } else {
        missingImages = {};
        missingImages[name] = [cubeTextureIndex];
        this.loadingCubeTextureObjects[texture] = missingImages;
      }
    }

    if (this.loadingTextures[name]) {
      this.loadingTextures[name].objects.push(texture);
      return null; // texture is already loading
    }

    console.log('loadOrRetrieveTexture ' + name);
    this.loadingTextures[name] = {data: null, objects: [texture]};

    // load from url.
    var loader = new THREE.ImageLoader();
    loader.load(
      name,
      (image) => {
        this.loadingTextures[name].data = image;
        this._onImageLoaded(name);
      },
      undefined, // onProgress callback
      (err) => { // onError callback
        if (!this.streamingMode)
          console.error('An error happened when loading the texure "' + name + '": ' + err);
        // else image could be received later
      }
    );
    return null;
  },

  loadTexture: function(uri, name) {
    var image = new Image();
    if (this.loadingTextures[name])
      this.loadingTextures[name].data = image;
    else
      this.loadingTextures[name] = {data: image, objects: []};
    image.src = '';
    image.onload = () => { this._onImageLoaded(name); };
    image.src = uri;
  },

  _onImageLoaded: function(name) {
    this.textures[name] = this.loadingTextures[name].data;
    var textures = this.loadingTextures[name].objects;
    for (var i = 0; i < textures.length; i++) {
      if (textures[i] instanceof THREE.CubeTexture) {
        var missingImages = this.loadingCubeTextureObjects[textures[i]];
        console.log(missingImages);
        var indices = missingImages[name];
        for (var j = 0; j < indices.length; j++)
          textures[i].images[j] = this.textures[name];
        delete missingImages[name];
        if (Object.keys(missingImages).length === 0) {
          textures[i].needsUpdate = true;
          delete this.loadingCubeTextureObjects[textures[i]];
        }
      } else {
        textures[i].image = this.textures[name];
        // JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
        var isJPEG = name.search(/\.jpe?g($|\?)/i) > 0 || name.search(/^data:image\/jpeg/) === 0;
        textures[i].format = isJPEG ? THREE.RGBFormat : THREE.RGBAFormat;
        textures[i].needsUpdate = true;
      }
    }
    delete this.loadingTextures[name];
  }
};
