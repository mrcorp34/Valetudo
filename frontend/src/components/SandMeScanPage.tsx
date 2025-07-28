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

        // Narandžasti pravougaonik (teren) - povećan za 10% u svim pravcima
        const fieldWidth = 540 * 1.1; // 594
        const fieldHeight = 360 * 1.1; // 286
        const fieldGeometry = new THREE.PlaneGeometry(fieldWidth, fieldHeight);
        const fieldMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500 });
        const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
        scene.add(field);

        // Bele linije (pravougaonici i centar)
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const lines: THREE.Line[] = [];


        // Spoljni okvir za singl (unutrašnji pravougaonik)
        const singlesTop = 130;
        const singlesBottom = -130;
        const singlesLeft = -270;
        const singlesRight = 270;
        const outerRect = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(singlesLeft, singlesBottom, 1),
            new THREE.Vector3(singlesRight, singlesBottom, 1),
            new THREE.Vector3(singlesRight, singlesTop, 1),
            new THREE.Vector3(singlesLeft, singlesTop, 1),
            new THREE.Vector3(singlesLeft, singlesBottom, 1)
        ]);
        lines.push(new THREE.Line(outerRect, lineMaterial));

        // Dubl linije (parovi) - proširenje po dužini terena
        const doublesMargin = 47; // standardno proširenje za dubl (u px)
        const doublesTop = singlesTop + doublesMargin;
        const doublesBottom = singlesBottom - doublesMargin;
        // Dubl okvir
        const doublesRect = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(singlesLeft, doublesBottom, 1),
            new THREE.Vector3(singlesRight, doublesBottom, 1),
            new THREE.Vector3(singlesRight, doublesTop, 1),
            new THREE.Vector3(singlesLeft, doublesTop, 1),
            new THREE.Vector3(singlesLeft, doublesBottom, 1)
        ]);
        lines.push(new THREE.Line(doublesRect, lineMaterial));

        // Dubl bočne linije (parovi) - horizontalne linije na krajevima dubl terena
        const topDoublesLine = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(singlesLeft, doublesTop, 2),
            new THREE.Vector3(singlesRight, doublesTop, 2)
        ]);
        lines.push(new THREE.Line(topDoublesLine, lineMaterial));
        const bottomDoublesLine = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(singlesLeft, doublesBottom, 2),
            new THREE.Vector3(singlesRight, doublesBottom, 2)
        ]);
        lines.push(new THREE.Line(bottomDoublesLine, lineMaterial));

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

        // --- Teniska mreža sa stubovima (ispravno orijentisana) ---
        // Pozicija mreže: y od -130 do 130, x = 0
        const netLength = 360; // 130*2
        const netHeight = 40;
        const netX = 0;
        const netZ = 5; // malo iznad linija

        // Stubovi (na krajevima mreže, vertikalno)
        const postRadius = 4;
        const postHeight = netHeight + 10;
        const postGeometry = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
        const postMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftPost = new THREE.Mesh(postGeometry, postMaterial);
        leftPost.position.set(netX, -180, netZ+20);
        leftPost.rotation.x = Math.PI / 2; // uspravno
        const rightPost = new THREE.Mesh(postGeometry, postMaterial);
        rightPost.position.set(netX, 180, netZ+20);
        rightPost.rotation.x = Math.PI / 2; // uspravno
        scene.add(leftPost);
        scene.add(rightPost);

        // Mreža (pravougaona površina sa providnošću), rotirana za 90 stepeni oko X ose
        const netGeometry = new THREE.PlaneGeometry(netLength, netHeight, 18, 6);
        const netMaterial = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const netMesh = new THREE.Mesh(netGeometry, netMaterial);
        netMesh.position.set(netX, 0, netHeight / 2 + netZ);
        netMesh.rotation.x = Math.PI / 2; // 90 stepeni oko X ose (vertikalno)
        netMesh.rotation.y = Math.PI / 2; // 90 stepeni oko y ose (vertikalno)
        scene.add(netMesh);

        // Dodaj "linije" na mreži (imitacija žica)
        const netLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.7, transparent: true });
        // Vertikalne žice (duž mreže, po y osi)
        for (let i = -180; i <= 180; i += 15) {
            const vertGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(netX, i, netZ),
                new THREE.Vector3(netX, i, netZ + netHeight)
            ]);
            scene.add(new THREE.Line(vertGeom, netLineMaterial));
        }
        // Horizontalne žice (po visini mreže, po z osi)
        for (let j = 0; j <= netHeight; j += 8) {
            const z = netZ + j;
            const horizGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(netX, -180, z),
                new THREE.Vector3(netX, 180, z)
            ]);
            scene.add(new THREE.Line(horizGeom, netLineMaterial));
        }


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
            newZ = Math.max(400, Math.min(5000, newZ));
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
        let dragButton = 0; // 0: none, 1: left, 2: right

        const onMouseDown = (event: MouseEvent) => {
            isDragging = true;
            previousX = event.clientX;
            previousY = event.clientY;
            dragButton = event.button;
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
            if (dragButton === 0) {
                // left mouse: Y/X
                scene.rotation.y += deltaX * 0.01;
                scene.rotation.x += deltaY * 0.01;
            } else if (dragButton === 1) {
                // middle mouse: translacija
                scene.position.x += deltaX;
                scene.position.y -= deltaY;
            } else if (dragButton === 2) {
                // right mouse: Z
                scene.rotation.z += deltaX * 0.01;
            }
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
