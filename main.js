import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
// import * as THREE from './build/three.module';

// import * as THREE from 'three';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
// import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.122/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.122/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.122/examples/jsm/postprocessing/UnrealBloomPass.js';

class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
};

class BasicCharacterController {
  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this._velocity = new THREE.Vector3(0, 0, 0);

    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new CharacterFSM(
      new BasicCharacterControllerProxy(this._animations));

    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/LILI/');
      loader.load('LILOPAC.fbx', (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });

      this._target = fbx;
      this._params.scene.add(this._target);
      this._target.position.set(-15, 0, 0);

      this._mixer = new THREE.AnimationMixer(this._target);

      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._stateMachine.SetState('idle');
      };

      const _OnLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);

        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };

      const loader = new FBXLoader(this._manager);
      loader.setPath('./resources/LILI/');
      loader.load('idle.fbx', (a) => { _OnLoad('idle', a); });
    });


  }

  Update(timeInSeconds) {
    if (!this._target) {
      return;
    }

    this._stateMachine.Update(timeInSeconds, this._input);

    const velocity = this._velocity;
    const frameDecceleration = new THREE.Vector3(
      velocity.x * this._decceleration.x,
      velocity.y * this._decceleration.y,
      velocity.z * this._decceleration.z
    );
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
      Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
    if (this._input._keys.shift) {
      acc.multiplyScalar(2.0);
    }

    if (this._input._keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }
    if (this._input._keys.left) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
      _R.multiply(_Q);
    }
    if (this._input._keys.right) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
      _R.multiply(_Q);
    }
 

    controlObject.quaternion.copy(_R);

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    sideways.multiplyScalar(velocity.x * timeInSeconds);
    forward.multiplyScalar(velocity.z * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    oldPosition.copy(controlObject.position);

    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
};

class BasicCharacterControllerInput {
  constructor(animations) {
  this._controllerProxy = new BasicCharacterControllerProxy(animations);
  this._Init();
  }

  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
      dance: false,
      strip: false
    };

    document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);


    const stripButton = document.getElementById('stripButton');
    stripButton.addEventListener('mousedown', () => this._onMouseDown('strip'), false);
    stripButton.addEventListener('mouseup', () => this._onMouseUp('strip'), false);

    const danceButton = document.getElementById('danceButton');
    danceButton.addEventListener('mousedown', () => this._onMouseDown('dance'), false);
    danceButton.addEventListener('mouseup', () => this._onMouseUp('dance'), false);

    const spaceButton = document.getElementById('spaceButton');
    spaceButton.addEventListener('mousedown', () => this._onMouseDown('space'), false);
    spaceButton.addEventListener('mouseup', () => this._onMouseUp('space'), false);

    const forwardButton = document.getElementById('forwardButton');
    forwardButton.addEventListener('mousedown', () => this._onMouseDown('forward'), false);
    forwardButton.addEventListener('mouseup', () => this._onMouseUp('forward'), false);

    const backwardButton = document.getElementById('backwardButton');
    backwardButton.addEventListener('mousedown', () => this._onMouseDown('backward'), false);
    backwardButton.addEventListener('mouseup', () => this._onMouseUp('backward'), false);

    const leftButton = document.getElementById('leftButton');
    leftButton.addEventListener('mousedown', () => this._onMouseDown('left'), false);
    leftButton.addEventListener('mouseup', () => this._onMouseUp('left'), false);

    const rightButton = document.getElementById('rightButton');
    rightButton.addEventListener('mousedown', () => this._onMouseDown('right'), false);
    rightButton.addEventListener('mouseup', () => this._onMouseUp('right'), false);
  }

  
  _onMouseDown(animation) {
    this._keys[animation] = true;
    }
    
    _onMouseUp(animation) {
    this._keys[animation] = false;
    }
  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: // w
        this._keys.forward = true;
        break;
      case 65: // a
        this._keys.left = true;
        break;
      case 83: // s
        this._keys.backward = true;
        break;
      case 68: // d
        this._keys.right = true;
        break;
      case 32: // SPACE
        this._keys.space = true;
        break;
      case 16: // SHIFT
        this._keys.shift = true;
        break;
      case 84: // t
        this._keys.dance = true;
        break;
        case 82: // r
        this._keys.strip = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.keyCode) {
      case 87: // w
        this._keys.forward = false;
        break;
      case 65: // a
        this._keys.left = false;
        break;
      case 83: // s
        this._keys.backward = false;
        break;
      case 68: // d
        this._keys.right = false;
        break;
      case 32: // SPACE
        this._keys.space = false;
        break;
      case 16: // SHIFT
        this._keys.shift = false;
        break;
      case 84: // t
        this._keys.dance = false;
        break;
        case 82: // r
        this._keys.strip = true;
        break;
    }
  }

};

class FiniteStateMachine {
  constructor() {
    this._states = {};
    this._currentState = null;
  }

  _AddState(name, type) {
    this._states[name] = type;
  }

  SetState(name) {
    const prevState = this._currentState;

    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);

    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
};

class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }

  _Init() {
    this._AddState('idle', IdleState);
  }
};

class State {
  constructor(parent) {
    this._parent = parent;
  }

  Enter() { }
  Exit() { }
  Update() { }
};

class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'idle';
  }

  Enter(prevState) {
    const idleAction = this._parent._proxy._animations['idle'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true);
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState('walk');
    } else if (input._keys.dance) {
      this._parent.SetState('twerk');
    } else if (input._keys.space) { // Добавленное состояние
      this._parent.SetState('dance');
    } else if (input._keys.strip) { // Добавленное состояние
      this._parent.SetState('strip');
    }
  }
};

class Scene {
  constructor() {
    this._Initialize();
  }

  _Initialize() {

    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
  });
  this._threejs.outputEncoding = THREE.sRGBEncoding;
  this._threejs.shadowMap.enabled = true;
  this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
  this._threejs.setPixelRatio(window.devicePixelRatio);

  // Инициализируем размеры рендерера
  this._threejs.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(this._threejs.domElement);

  // Создаем сцену
  this._scene = new THREE.Scene();

    // Создаем камеру
    const fov = 50;
    const aspect = window.innerWidth / window.innerHeight;  // используем текущее соотношение
    const near = 1.0;
    const far = 100.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(-35, 13, 20);

        // Создаем композер эффектов
        this._composer = new EffectComposer(this._threejs);
        this._composer.addPass(new RenderPass(this._scene, this._camera));
    // this._composer.addPass(new UnrealBloomPass({ x: 1024, y: 1024 }, 0.3, 0.1, 0.55));
            // Вызываем _OnWindowResize() после инициализации камеры
    this._OnWindowResize();

        // Добавляем обработчик изменения размера окна
        window.addEventListener('resize', () => {
          this._OnWindowResize();
      }, false);

    let light = new THREE.DirectionalLight(0x008cff, 0.04);
    light.position.set(1152, 1500, 2500);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 50;
    light.shadow.camera.right = -50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    this._scene.add(light);
    // let lightHelper = new THREE.DirectionalLightHelper(light, 5);
    // this._scene.add(lightHelper);

    let light2 = new THREE.DirectionalLight(0xff4400, 0.04);
    light2.position.set(40, 30, -100);
    this._scene.add(light2);
    // let light2Helper = new THREE.DirectionalLightHelper(light2, 5);
    // this._scene.add(light2Helper);
    // let amblight = new THREE.AmbientLight(0xFFFFFF, 0.1);
    // this._scene.add(amblight);
    let hemlight = new THREE.HemisphereLight( 0xffffbb, 1 );
    this._scene.add( hemlight );
    this._cloudParticles = [];

    const controls = new OrbitControls(
      this._camera, this._threejs.domElement);
    controls.target.set(0, 10, 0);
    controls.update();

    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      './resources/posx.jpg',
      './resources/negx.jpg',
      './resources/posy.jpg',
      './resources/negy.jpg',
      './resources/posz.jpg',
      './resources/negz.jpg',
    ]);
    texture.encoding = THREE.sRGBEncoding;
    this._scene.background = texture;

    texture.mapping = THREE.CubeReflectionMapping;

    const textureLoader = new THREE.TextureLoader();
    const texture666 = textureLoader.load('/game-main/resources/giphy.gif');
    texture666.wrapS = THREE.ClampToEdgeWrapping;
    texture666.wrapT = THREE.ClampToEdgeWrapping;

    const material = new THREE.MeshPhysicalMaterial({
      envMap: texture,
      map: texture666,
      metalness: 0.8,
      roughness: 0.3,
      opacity: 0.9 
    });

    const ellipsoidGeometry = new THREE.SphereGeometry(25, 22, 33);
    ellipsoidGeometry.rotateZ(Math.PI / 2);
    ellipsoidGeometry.rotateY(Math.PI / 2); // Поворот по оси Y на 90 градусов
    ellipsoidGeometry.scale(1, 0.01, 1);

    const ellipsoidMesh = new THREE.Mesh(ellipsoidGeometry, material);
    this._scene.add(ellipsoidMesh);
    ellipsoidMesh.position.set(0, 0, -10);

    // const ring = new THREE.RingGeometry(13, 12, 222);
    // const material3 = new THREE.MeshBasicMaterial({ color: 0xe777ff, side: THREE.DoubleSide });
    // const ringy = new THREE.Mesh(ring, material3);
    // this._scene.add(ringy);
    // ringy.position.set(0, 10, -33);

    const ring2 = new THREE.RingGeometry(18, 17, 222);
    const material4 = new THREE.MeshBasicMaterial({ color: 0xff45f6, side: THREE.DoubleSide });
    const ringy2 = new THREE.Mesh(ring2, material4);
    this._scene.add(ringy2);
    ringy2.position.set(0, 10, -30);

    const ring3 = new THREE.RingGeometry(23, 22, 222);
    const material5 = new THREE.MeshBasicMaterial({ color: 0xffa442, side: THREE.DoubleSide });
    const ringy3 = new THREE.Mesh(ring3, material5);
    this._scene.add(ringy3);
    ringy3.position.set(0, 10, -27);

    const height = 0.2;
    const radius = 25;
    const segments = 77;

    const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, height, segments, 1, true);
    const materialC = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const cylinderMesh = new THREE.Mesh(cylinderGeometry, materialC);
    cylinderMesh.position.set(0, 1.5, -10); 
    this._scene.add(cylinderMesh);

    const button2 = document.getElementById("articlespos");
    button2.addEventListener("click", function () {
      this._camera.position.set(10, 22, 50);
    }.bind(this)); 

    const button = document.getElementById("marketpos");
    button.addEventListener("click", function () {
      this._camera.position.set(-40, 23, 50);
    }.bind(this));

    const button4 = document.getElementById("homepos");
    button4.addEventListener("click", function () {
      this._camera.position.set(- 20, 13, 50);
    }.bind(this));

    this._mixers = [];
    this._previousRAF = null;

    this._LoadAnimatedModel();
    this._RAF();
  }

  _LoadAnimatedModel() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    }
    this._controls = new BasicCharacterController(params);
  }

  _LoadAnimatedModelAndPlay(path, modelFile, animFile, offset) {
    const loader = new FBXLoader();
    loader.setPath(path);
    loader.load(modelFile, (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });
      fbx.position.copy(offset);

      const anim = new FBXLoader();
      anim.setPath(path);
      anim.load(animFile, (anim) => {
        const m = new THREE.AnimationMixer(fbx);
        this._mixers.push(m);
        const idle = m.clipAction(anim.animations[0]);
        idle.play();
      });
      this._scene.add(fbx);
    });
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    // Устанавливаем положение камеры в зависимости от ширины экрана
    if (window.innerWidth <= 800) {
      // Пример изменения позиции камеры для маленьких экранов
      this._camera.position.set(-55, 15, 15); // Установите желаемое новое положение
  } else {
      // Возвращаем камеру на исходные позиции для больших экранов
      this._camera.position.set(-35, 13, 20); // Исходное положение
  }
  }
  _Animate(t) {
    this._cloudParticles.forEach(p => {
      p.rotation.z -= 0.00001;
    });

    requestAnimationFrame((t) => {
      this._Animate(t); 
    });
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      this._composer.render();

      this._Animate(t);

      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    if (this._mixers) {
      this._mixers.map(m => m.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }
  }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new Scene();
});
