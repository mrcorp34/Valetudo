import React, { useRef, useEffect } from "react";
import * as THREE from "three";

interface ThreeCourtSceneProps {
    showWave: boolean;
    calibPoints: Array<{ x: number, y: number, z: number }>;
    lastCoords: { x?: number, y?: number, z?: number };
}

const ThreeCourtScene: React.FC<ThreeCourtSceneProps> = ({
    showWave,
    calibPoints,
    lastCoords,
}) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const robotMarkerRef = useRef<THREE.Mesh | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    useEffect(() => {
        // Dimenzije terena
        const fieldWidth = 540 * 1.1;
        const fieldHeight = 360 * 1.1;

        // Dodaj scene i camera
        const width = mountRef.current?.clientWidth || 800;
        const height = mountRef.current?.clientHeight || 600;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
        camera.position.set(0, 0, 1200);
        sceneRef.current = scene;
        cameraRef.current = camera;

        let field: THREE.Mesh;
        if (!showWave) {
            // Klasičan narandžasti pravougaonik
            const fieldGeometry = new THREE.PlaneGeometry(fieldWidth, fieldHeight);
            const fieldMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500 });
            field = new THREE.Mesh(fieldGeometry, fieldMaterial);
            scene.add(field);
        } else {
            // Talasasta površina (sinusoidna) sa bojom po visini
            const segmentsW = 60;
            const segmentsH = 30;
            const geometry = new THREE.PlaneGeometry(fieldWidth, fieldHeight, segmentsW, segmentsH);
            const amplitude = fieldHeight * 0.03;
            const colors = [];
            let minZ = Infinity, maxZ = -Infinity;
            for (let i = 0; i < geometry.attributes.position.count; i++) {
                const x = geometry.attributes.position.getX(i);
                const y = geometry.attributes.position.getY(i);
                const z = Math.sin(x / 60) * Math.cos(y / 60) * amplitude;
                geometry.attributes.position.setZ(i, z);
                if (z < minZ) { minZ = z; }
                if (z > maxZ) { maxZ = z; }
            }
            for (let i = 0; i < geometry.attributes.position.count; i++) {
                const z = geometry.attributes.position.getZ(i);
                const t = (z - minZ) / (maxZ - minZ);
                const low = { r: 179 / 255, g: 92 / 255, b: 0 };
                const high = { r: 1, g: 0.95, b: 0.8 };
                const r = low.r + (high.r - low.r) * t;
                const g = low.g + (high.g - low.g) * t;
                const b = low.b + (high.b - low.b) * t;
                colors.push(r, g, b);
            }
            geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
            geometry.computeVertexNormals();
            const material = new THREE.MeshPhongMaterial({
                vertexColors: true,
                flatShading: true,
                shininess: 40,
                transparent: true,
                opacity: 0.7,
            });
            field = new THREE.Mesh(geometry, material);
        }

        // Bele linije (pravougaonici i centar)
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const lines: THREE.Line[] = [];

        const singlesTop = 130;
        const singlesBottom = -130;
        const singlesLeft = -270;
        const singlesRight = 270;
        const outerRect = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(singlesLeft, singlesBottom, 1),
            new THREE.Vector3(singlesRight, singlesBottom, 1),
            new THREE.Vector3(singlesRight, singlesTop, 1),
            new THREE.Vector3(singlesLeft, singlesTop, 1),
            new THREE.Vector3(singlesLeft, singlesBottom, 1),
        ]);
        lines.push(new THREE.Line(outerRect, lineMaterial));

        const doublesMargin = 47;
        const doublesTop = singlesTop + doublesMargin;
        const doublesBottom = singlesBottom - doublesMargin;
        const doublesRect = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(singlesLeft, doublesBottom, 1),
            new THREE.Vector3(singlesRight, doublesBottom, 1),
            new THREE.Vector3(singlesRight, doublesTop, 1),
            new THREE.Vector3(singlesLeft, doublesTop, 1),
            new THREE.Vector3(singlesLeft, doublesBottom, 1),
        ]);
        lines.push(new THREE.Line(doublesRect, lineMaterial));

        const topDoublesLine = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(singlesLeft, doublesTop, 2),
            new THREE.Vector3(singlesRight, doublesTop, 2),
        ]);
        lines.push(new THREE.Line(topDoublesLine, lineMaterial));
        const bottomDoublesLine = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(singlesLeft, doublesBottom, 2),
            new THREE.Vector3(singlesRight, doublesBottom, 2),
        ]);
        lines.push(new THREE.Line(bottomDoublesLine, lineMaterial));

        const centerLine = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -130, 2),
            new THREE.Vector3(0, 130, 2),
        ]);
        lines.push(new THREE.Line(centerLine, lineMaterial));

        const leftService = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-135, -130, 2),
            new THREE.Vector3(-135, 130, 2),
        ]);
        lines.push(new THREE.Line(leftService, lineMaterial));
        const rightService = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(135, -130, 2),
            new THREE.Vector3(135, 130, 2),
        ]);
        lines.push(new THREE.Line(rightService, lineMaterial));

        const tLine = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-135, 0, 2),
            new THREE.Vector3(135, 0, 2),
        ]);
        lines.push(new THREE.Line(tLine, lineMaterial));

        lines.forEach((line) => scene.add(line));
        scene.add(field);

        // --- Teniska mreža sa stubovima (ispravno orijentisana) ---
        const netLength = 360;
        const netHeight = 40;
        const netX = 0;
        const netZ = 5;

        const postRadius = 4;
        const postHeight = netHeight + 10;
        const postGeometry = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
        const postMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftPost = new THREE.Mesh(postGeometry, postMaterial);
        leftPost.position.set(netX, -180, netZ + 20);
        leftPost.rotation.x = Math.PI / 2;
        const rightPost = new THREE.Mesh(postGeometry, postMaterial);
        rightPost.position.set(netX, 180, netZ + 20);
        rightPost.rotation.x = Math.PI / 2;
        scene.add(leftPost);
        scene.add(rightPost);

        const netGeometry = new THREE.PlaneGeometry(netLength, netHeight, 18, 6);
        const netMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });
        const netMesh = new THREE.Mesh(netGeometry, netMaterial);
        netMesh.position.set(netX, 0, netHeight / 2 + netZ);
        netMesh.rotation.x = Math.PI / 2;
        netMesh.rotation.y = Math.PI / 2;
        scene.add(netMesh);

        const netLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.7, transparent: true });
        for (let i = -180; i <= 180; i += 15) {
            const vertGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(netX, i, netZ),
                new THREE.Vector3(netX, i, netZ + netHeight),
            ]);
            scene.add(new THREE.Line(vertGeom, netLineMaterial));
        }
        for (let j = 0; j <= netHeight; j += 8) {
            const z = netZ + j;
            const horizGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(netX, -180, z),
                new THREE.Vector3(netX, 180, z),
            ]);
            scene.add(new THREE.Line(horizGeom, netLineMaterial));
        }

        // Svetlo za talasastu površinu
        if (showWave) {
            const light = new THREE.DirectionalLight(0xffffff, 1.1);
            light.position.set(0, 0, 1000);
            scene.add(light);
            const amb = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(amb);
        }

        // --- Robot marker (crvena sfera) ---
        function mapGpsToField(gps: { x?: number, y?: number, z?: number }) {
            function gpsToMeters(lat: number, lon: number, originLat: number, originLon: number) {
                const dLat = (lat - originLat) * 111320;
                const dLon = (lon - originLon) * 111320 * Math.cos(originLat * Math.PI / 180);
                return { x: dLon, y: dLat };
            }
            if (calibPoints.length < 3 || gps.x === undefined || gps.y === undefined) {
                return null;
            }
            const fieldRef = [
                { x: -270, y: -130 },
                { x: 0, y: 0 },
                { x: 270, y: 130 },
            ];
            const origin = { lat: calibPoints[0].y, lon: calibPoints[0].x };
            const gpsRef = calibPoints.map((p) => gpsToMeters(p.y, p.x, origin.lat, origin.lon));
            const meters = gpsToMeters(gps.y, gps.x, origin.lat, origin.lon);
            function barycentric(
                p: { x: number, y: number },
                a: { x: number, y: number },
                b: { x: number, y: number },
                c: { x: number, y: number }
            ) {
                const detT = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
                const l1 = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / detT;
                const l2 = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / detT;
                const l3 = 1 - l1 - l2;
                return { l1: l1, l2: l2, l3: l3 };
            }
            const bary = barycentric(meters, gpsRef[0], gpsRef[1], gpsRef[2]);
            const x = bary.l1 * fieldRef[0].x + bary.l2 * fieldRef[1].x + bary.l3 * fieldRef[2].x;
            const y = bary.l1 * fieldRef[0].y + bary.l2 * fieldRef[1].y + bary.l3 * fieldRef[2].y;
            return { x: x, y: y };
        }

        if (!robotMarkerRef.current && calibPoints.length === 3) {
            const markerGeometry = new THREE.SphereGeometry(24, 32, 32);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff2222 });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(0, 0, 100);
            scene.add(marker);
            robotMarkerRef.current = marker;
        }
        if (robotMarkerRef.current && calibPoints.length !== 3) {
            scene.remove(robotMarkerRef.current);
            robotMarkerRef.current = null;
        }

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setClearColor(0x222222);
        renderer.setSize(width, height);
        const canvas = renderer.domElement;

        // Resize handler
        const handleResize = () => {
            const width = mountRef.current?.clientWidth || 800;
            const height = mountRef.current?.clientHeight || 600;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", handleResize);

        // Zoom
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const zoomSpeed = 0.2;
            const delta = event.deltaY;
            let newZ = camera.position.z + delta * zoomSpeed;
            newZ = Math.max(400, Math.min(5000, newZ));
            camera.position.z = newZ;
        };
        canvas.addEventListener("wheel", onWheel, { passive: false });

        if (mountRef.current) {
            mountRef.current.innerHTML = "";
            mountRef.current.appendChild(canvas);
        }

        // Rotacija mišem
        let isDragging = false;
        let previousX = 0;
        let previousY = 0;
        let dragButton = 0;

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
            if (!isDragging) { return; }
            const deltaX = event.clientX - previousX;
            const deltaY = event.clientY - previousY;
            previousX = event.clientX;
            previousY = event.clientY;
            if (dragButton === 0) {
                scene.rotation.y += deltaX * 0.01;
                scene.rotation.x += deltaY * 0.01;
            } else if (dragButton === 1) {
                scene.position.x += deltaX;
                scene.position.y -= deltaY;
            } else if (dragButton === 2) {
                scene.rotation.z += deltaX * 0.01;
            }
        };

        canvas.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("mousemove", onMouseMove);

        rendererRef.current = renderer;
        const animate = () => {
            if (
                robotMarkerRef.current &&
                calibPoints.length === 3 &&
                lastCoords.x !== undefined &&
                lastCoords.y !== undefined
            ) {
                const pos = mapGpsToField(lastCoords);
                if (pos) {
                    robotMarkerRef.current.position.set(pos.x, pos.y, 100);
                }
            }
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
            window.removeEventListener("resize", handleResize);
            if (robotMarkerRef.current && sceneRef.current) {
                sceneRef.current.remove(robotMarkerRef.current);
                robotMarkerRef.current = null;
            }
        };
    }, [showWave, calibPoints, lastCoords]);

    return <div ref={mountRef} style={{ width: "100%", height: "70vh", minHeight: 300 }} />;
};

export default ThreeCourtScene;
