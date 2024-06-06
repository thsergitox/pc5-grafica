import {loadGLTF} from "./libs/loader.js";
import {mockWithVideo} from './libs/camera-mock.js';
const THREE = window.MINDAR.IMAGE.THREE;

document.addEventListener('DOMContentLoaded', () => {
  const start = async() => {
    //mockWithVideo('../../assets/mock-videos/musicband1.mp4');

    const mindarThree = new window.MINDAR.IMAGE.MindARThree({
      container: document.body,
      imageTargetSrc: '/static/assets/targets/targets (2).mind',
    });
    const {renderer, scene, camera} = mindarThree;

    const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
    scene.add(light);

    //const raccoon = await loadGLTF('/static/assets/models/musicband-raccoon/scene.gltf');
    const raccoon = await loadGLTF('/static/assets/models/upch-dia/images (1).gltf');
    raccoon.scene.scale.set(0.009, 0.009, 0.009);
    raccoon.scene.position.set(0, -0.4, 0);

    const titulo = await loadGLTF('/static/assets/models/upch-dia/upch.gltf');
    titulo.scene.scale.set(0.01, 0.01, 0.01);
    titulo.scene.position.set(0, -1.2, 0);

    const anchor = mindarThree.addAnchor(0);
    anchor.group.add(raccoon.scene);
    anchor.group.add(titulo.scene);

    await mindarThree.start();
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
  }
  start();
});
