/* global THREE, Selector, TextureManager, Viewpoint */
/* global convertStringToVec2, convertStringToVec3, convertStringToQuaternion, convertStringTorgb */
'use strict';

function X3dSceneManager(domElement) {
  this.domElement = domElement;
  this.root = null;
  this.worldInfo = {};
  this.viewpoint = null;
  this.sceneModified = false;
  this.objectsIdCache = {};
}

X3dSceneManager.prototype = {
  constructor: X3dSceneManager,

  init: function() {
    var that = this;
    this.renderer = new THREE.WebGLRenderer({'antialias': true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0xffffff, 1.0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.domElement.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.viewpoint = new Viewpoint();
    this.viewpoint.onCameraParametersChanged = function() {
      if (that.gpuPicker)
        that.gpuPicker.needUpdate = true;
      that.render();
    };

    this.selector = new Selector();
    this.selector.onSelectionChange = function() { that.render(); };

    this.gpuPicker = new THREE.GPUPicker({renderer: this.renderer, debug: false});
    this.gpuPicker.setFilter(function(object) {
      return object instanceof THREE.Mesh &&
             'x3dType' in object.userData &&
             object.userData.isPickable !== false; // true or undefined
    });
    this.gpuPicker.setScene(this.scene);
    this.gpuPicker.setCamera(this.viewpoint.camera);

    this.resize();

    this.destroyWorld();

    var textureManager = new TextureManager();
    textureManager.onTextureLoad = function() { that.render(); };
  },

  render: function() {
    this.renderer.render(this.scene, this.viewpoint.camera);
  },

  resize: function() {
    var width = this.domElement.clientWidth;
    var height = this.domElement.clientHeight;
    this.viewpoint.camera.aspect = width / height;
    this.viewpoint.camera.updateProjectionMatrix();
    this.gpuPicker.resizeTexture(width, height);
    this.renderer.setSize(width, height);
    this.render();
  },

  onSceneUpdate: function() {
    this.sceneModified = true;
    this.render();
  },

  destroyWorld: function() {
    this.selector.clearSelection();
    if (!this.scene)
      return;
    for (var i = this.scene.children.length - 1; i >= 0; i--)
      this.scene.remove(this.scene.children[i]);
    this.objectsIdCache = {};
    this.onSceneUpdate();
    this.render();
  },

  deleteObject: function(id) {
    var object = this.scene.getObjectByName('n' + id);
    if (object) {
      object.parent.remove(object);
      delete this.objectsIdCache[id];
    }
    this.onSceneUpdate();
    this.render();
  },

  loadWorldFile: function(url, onLoad) {
    var that = this;
    this.objectsIdCache = {};
    var loader = new THREE.X3DLoader(this);
    loader.load(url, function(object3d) {
      if (object3d.length > 0) {
        that.scene.add(object3d[0]);
        that.root = object3d[0];
      }
      that._setupLights(loader.directionalLights);
      if (that.gpuPicker) {
        that.gpuPicker.setScene(that.scene);
        that.sceneModified = false;
      }
      that.onSceneUpdate();
      if (onLoad)
        onLoad();
    });
  },

  loadObject: function(x3dObject, parentId) {
    var that = this;
    var parentObject = parentId && parentId !== 0 ? this.scene.getObjectByName('n' + parentId) : null;
    var loader = new THREE.X3DLoader(this);
    var objects = loader.parse(x3dObject);
    if (parentObject)
      objects.forEach(function(o) { parentObject.add(o); });
    else {
      console.assert(objects.length <= 1); // only one root object is supported
      objects.forEach(function(o) { that.scene.add(o); });
      this.root = objects[0];
    }
    this._setupLights(loader.directionalLights);
    this.onSceneUpdate();
  },

  applyPose: function(pose) {
    var id = pose.id;
    for (var key in pose) {
      if (key === 'id')
        continue;
      var newValue = pose[key];
      var object = this._getObjectByCustomId(this.scene, 'n' + id);
      if (!object)
        continue; // error

      if (key === 'translation') {
        if (object instanceof THREE.Texture) {
          var translation = convertStringToVec2(newValue);
          if (object.userData && object.userData.transform) {
            object.userData.transform.translation = translation;
            object.needsUpdate = true;
            this.sceneModified = true;
          }
        } else if (object instanceof THREE.Object3D) {
          var newPosition = convertStringToVec3(newValue);
          // Followed object moved.
          if (this.viewpoint.followedObjectId &&
              (id === this.viewpoint.followedObjectId || // animation case
               ('n' + id) === this.viewpoint.followedObjectId || // streaming case
               object.userData.name === this.viewpoint.followedObjectId)) {
            // If this is the followed object, we save a vector with the translation applied
            // to the object to compute the new position of the viewpoint.
            this.viewpoint.setFollowedObjectDeltaPosition(newPosition, object.position);
          }
          object.position.copy(newPosition);
          this.sceneModified = true;
        }
      } else if (key === 'rotation' && object instanceof THREE.Object3D) { // Transform node
        var quaternion = convertStringToQuaternion(newValue);
        object.quaternion.copy(quaternion);
        this.sceneModified = true;
      } else if ((key === 'diffuseColor' || key === 'baseColor') && object instanceof THREE.Material) {
        var diffuseColor = convertStringTorgb(newValue);
        object.color = diffuseColor;
      } else if (key === 'emissiveColor' && object instanceof THREE.Material) {
        var emissiveColor = convertStringTorgb(newValue);
        object.emissive = emissiveColor;
      }
    }
  },

  pick: function(relativePosition, screenPosition) {
    if (this.sceneModified) {
      this.gpuPicker.setScene(this.scene);
      this.sceneModified = false;
    }

    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPosition, this.viewpoint.camera);
    return this.gpuPicker.pick(relativePosition, raycaster);
  },

  getTopX3dNode: function(node) {
    // If it exists, return the upmost Solid, otherwise the top node.
    var upmostSolid = null;
    while (node) {
      if (node.userData && node.userData.solid)
        upmostSolid = node;
      if (node.parent === this.scene)
        break;
      node = node.parent;
    }
    if (upmostSolid)
      return upmostSolid;
    return node;
  },

  // private functions
  _setupLights: function(directionalLights) {
    if (!this.root)
      return;

    var sceneBox = new THREE.Box3();
    sceneBox.setFromObject(this.root);
    var boxSize = new THREE.Vector3();
    sceneBox.getSize(boxSize);
    var boxCenter = new THREE.Vector3();
    sceneBox.getCenter(boxCenter);
    var halfWidth = boxSize.x / 2 + boxCenter.x;
    var halfDepth = boxSize.z / 2 + boxCenter.z;
    var maxSize = 2 * Math.max(halfWidth, boxSize.y / 2 + boxCenter.y, halfDepth);
    directionalLights.forEach(function(light) {
      light.position.multiplyScalar(maxSize);
      light.shadow.camera.far = Math.max(maxSize, light.shadow.camera.far);
      light.shadow.camera.left = -maxSize;
      light.shadow.camera.right = maxSize;
      light.shadow.camera.top = maxSize;
      light.shadow.camera.bottom = -maxSize;
    });
  },

  _getObjectByCustomId: function(object, id) {
    if (!object)
      return undefined;

    if (this.objectsIdCache[id])
      return this.objectsIdCache[id];

    if (object.name && object.name.includes(id)) {
      this.objectsIdCache[id] = object;
      return object;
    }

    var childObject;
    var childrenLength = object.children ? object.children.length : 0;
    for (var i = 0; i < childrenLength; i++) {
      var child = object.children[i];
      childObject = this._getObjectByCustomId(child, id);
      if (childObject !== undefined)
        return childObject;
    }
    if (object instanceof THREE.Mesh) {
      childObject = this._getObjectByCustomId(object.material, id);
      if (childObject)
        return childObject;
      childObject = this._getObjectByCustomId(object.geometry, id);
      if (childObject)
        return childObject;
    } else if (object instanceof THREE.Material) {
      childObject = this._getObjectByCustomId(object.map, id);
      if (childObject)
        return childObject;
      childObject = this._getObjectByCustomId(object.aoMap, id);
      if (childObject)
        return childObject;
      childObject = this._getObjectByCustomId(object.roughnessMap, id);
      if (childObject)
        return childObject;
      childObject = this._getObjectByCustomId(object.metalnessMap, id);
      if (childObject)
        return childObject;
      childObject = this._getObjectByCustomId(object.normalMap, id);
      if (childObject)
        return childObject;
      childObject = this._getObjectByCustomId(object.emissiveMap, id);
      if (childObject)
        return childObject;
      // only fields set in x3d.js are checked
    }
    return undefined;
  }
};
