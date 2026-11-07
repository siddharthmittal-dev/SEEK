import { useEffect, useRef } from "react";
import * as THREE from "three";
export default function Orbit() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 8);
    const group = new THREE.Group();
    scene.add(group);
    const material = new THREE.LineBasicMaterial({
      color: 0x6b6253,
      transparent: true,
      opacity: 0.55,
    });
    for (let i = 0; i < 5; i++) {
      const points = [];
      for (let n = 0; n <= 160; n++) {
        const t = (n / 160) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(t) * (1.4 + i * 0.13),
            Math.sin(t) * (1.4 + i * 0.13),
            0,
          ),
        );
      }
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        material,
      );
      ring.rotation.set(i * 0.5, 0.45 + i * 0.42, 0.2);
      group.add(ring);
    }
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xe8b66b });
    const dotGeo = new THREE.SphereGeometry(0.045, 12, 12);
    for (let i = 0; i < 8; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat);
      const a = (i / 8) * Math.PI * 2;
      dot.position.set(Math.cos(a) * 1.9, Math.sin(a) * 1.5, Math.sin(a * 2));
      group.add(dot);
    }
    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(host);
    let id = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      group.rotation.y += reduced ? 0 : 0.0018;
      group.rotation.z = 0.18;
      renderer.render(scene, camera);
      if (!reduced) id = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(id);
      obs.disconnect();
      group.traverse((x) => {
        if (x instanceof THREE.Line) x.geometry.dispose();
      });
      material.dispose();
      dotMat.dispose();
      dotGeo.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return <div className="orbit" ref={ref} aria-hidden="true" />;
}
