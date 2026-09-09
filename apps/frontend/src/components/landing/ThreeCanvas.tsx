import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeCanvasProps {
  className?: string;
  particleColor?: number;
  interactive?: boolean;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  className = 'absolute inset-0 w-full h-full pointer-events-none',
  particleColor = 0xf97316,
  interactive = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 45;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── 1. Floating Gold/Amber Silk Thread Particles ───────────────────────
    const particleCount = 140;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      scales[i] = Math.random() * 2.5 + 1.2;
      speeds[i] = Math.random() * 0.015 + 0.005;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Custom circle particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(249, 115, 22, 0.8)');
      gradient.addColorStop(0.7, 'rgba(249, 115, 22, 0.2)');
      gradient.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 2.2,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: particleColor,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ── 2. Undulating Silk Ribbon / Cloth Waves ──────────────────────────
    const ribbonCount = 3;
    const ribbons: THREE.Mesh[] = [];

    for (let r = 0; r < ribbonCount; r++) {
      const planeGeo = new THREE.PlaneGeometry(85, 25, 40, 20);
      const planeMat = new THREE.MeshBasicMaterial({
        color: r === 0 ? 0xf97316 : r === 1 ? 0xfbbf24 : 0x3b82f6,
        wireframe: true,
        transparent: true,
        opacity: r === 0 ? 0.08 : 0.04,
      });

      const mesh = new THREE.Mesh(planeGeo, planeMat);
      mesh.position.y = -10 + r * 6;
      mesh.position.z = -15 + r * 5;
      mesh.rotation.x = Math.PI / 3.5;
      mesh.rotation.z = -Math.PI / 12 + r * 0.05;
      scene.add(mesh);
      ribbons.push(mesh);
    }

    // ── Mouse Interactivity ──────────────────────────────────────────────
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      mouseX = (event.clientX - windowHalfX) * 0.0008;
      mouseY = (event.clientY - windowHalfY) * 0.0008;
    };

    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera parallax
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      camera.position.x = targetX * 18;
      camera.position.y = -targetY * 14;
      camera.lookAt(scene.position);

      // Rotate particle cloud gently
      particles.rotation.y = elapsedTime * 0.04;
      particles.rotation.x = Math.sin(elapsedTime * 0.02) * 0.05;

      // Animate ribbon wave vertices
      ribbons.forEach((ribbon, rIdx) => {
        const geo = ribbon.geometry as THREE.PlaneGeometry;
        const posAttr = geo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const u = posAttr.getX(i);
          const v = posAttr.getY(i);
          const z =
            Math.sin(u * 0.12 + elapsedTime * 1.2 + rIdx) * 2.8 +
            Math.cos(v * 0.15 + elapsedTime * 0.8) * 1.8;
          posAttr.setZ(i, z);
        }
        posAttr.needsUpdate = true;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, [particleColor, interactive]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
};
