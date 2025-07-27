import React, { useRef, useEffect } from "react";
import * as THREE from "three";

const SandMeScanPage: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const width = 900;
        const height = 500;
        const scene = new THREE.Scene();
        // Perspektivna kamera za realističan 3D prikaz
        const aspect = width / height;
        const camera = new THREE.PerspectiveCamera(45, aspect, 1, 3000);
        camera.position.set(0, 0, 1200);
        camera.lookAt(0, 0, 0);

        // Narandžasti pravougaonik (teren)
        const fieldGeometry = new THREE.PlaneGeometry(540, 260);
        const fieldMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500 });
        const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
        scene.add(field);

        // Bele linije (pravougaonici i centar)
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const lines: THREE.Line[] = [];

        // Spoljni okvir
        const outerRect = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-270, -130, 1),
            new THREE.Vector3(270, -130, 1),
            new THREE.Vector3(270, 130, 1),
            new THREE.Vector3(-270, 130, 1),
            new THREE.Vector3(-270, -130, 1)
        ]);
        lines.push(new THREE.Line(outerRect, lineMaterial));

        // Središnja linija
        const centerLine = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -130, 2),
            new THREE.Vector3(0, 130, 2)
        ]);
        lines.push(new THREE.Line(centerLine, lineMaterial));

        // Servis linije
        const leftService = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-135, -130, 2),
            new THREE.Vector3(-135, 130, 2)
        ]);
        lines.push(new THREE.Line(leftService, lineMaterial));
        const rightService = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(135, -130, 2),
            new THREE.Vector3(135, 130, 2)
        ]);
        lines.push(new THREE.Line(rightService, lineMaterial));

        // T-linija (horizontalna linija na sredini terena)
        const tLine = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-135, 0, 2),
            new THREE.Vector3(135, 0, 2)
        ]);
        lines.push(new THREE.Line(tLine, lineMaterial));

        // Dodaj linije u scenu
        lines.forEach(line => scene.add(line));


        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setClearColor(0x222222);
        renderer.setSize(width, height);
        const canvas = renderer.domElement;

        // --- Zoom/odzoom rollerom miša ---
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            // Zoom in/out: menjaj z poziciju kamere
            const zoomSpeed = 0.2;
            const delta = event.deltaY;
            // Ograniči zoom
            let newZ = camera.position.z + delta * zoomSpeed;
            newZ = Math.max(400, Math.min(2500, newZ));
            camera.position.z = newZ;
        };
        canvas.addEventListener("wheel", onWheel, { passive: false });

        if (mountRef.current) {
            mountRef.current.innerHTML = "";
            mountRef.current.appendChild(canvas);
        }

        // --- Rotacija mišem ---
        let isDragging = false;
        let previousX = 0;
        let previousY = 0;

        const onMouseDown = (event: MouseEvent) => {
            isDragging = true;
            previousX = event.clientX;
            previousY = event.clientY;
        };
        const onMouseUp = () => {
            isDragging = false;
        };
        const onMouseMove = (event: MouseEvent) => {
            if (!isDragging) {
                return;
            }
            const deltaX = event.clientX - previousX;
            const deltaY = event.clientY - previousY;
            previousX = event.clientX;
            previousY = event.clientY;
            // Rotiraj oko Y i X ose
            scene.rotation.y += deltaX * 0.01;
            scene.rotation.x += deltaY * 0.01;
        };


        canvas.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("mousemove", onMouseMove);

        // Animacija
        const animate = () => {
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };
        animate();

        return () => {
            renderer.dispose();
            canvas.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("mousemove", onMouseMove);
            canvas.removeEventListener("wheel", onWheel);
        };
    }, []);

    return (
        <div style={{ padding: 24 }}>
            <h1>Sand Me Scan</h1>
            <div ref={mountRef} />
        </div>
    );
};

export default SandMeScanPage;
