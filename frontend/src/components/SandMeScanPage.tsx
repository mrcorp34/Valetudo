import React, { useRef, useEffect, useState } from "react";

const parseCoords = (line: string): {x?: number, y?: number, z?: number} => {
    // Example: parse NMEA GGA or custom format: "$GPGGA,lat,lon,alt,..."
    // Try to extract lat/lon/alt from NMEA or "X,Y,Z" ascii
    if (line.startsWith('$GPGGA')) {
        const parts = line.split(',');
        // NMEA: $GPGGA,time,lat,N,lon,E,fix,sats,hdop,alt,...
        const latRaw = parts[2];
        const latDir = parts[3];
        const lonRaw = parts[4];
        const lonDir = parts[5];
        const altRaw = parts[9];
        // Convert lat/lon from ddmm.mmmm to decimal degrees
        const parseNmeaCoord = (raw: string, dir: string) => {
            if (!raw) { return undefined; }
            const deg = parseFloat(raw.slice(0, raw.indexOf('.') - 2));
            const min = parseFloat(raw.slice(raw.indexOf('.') - 2));
            let val = deg + min / 60;
            if (dir === 'S' || dir === 'W') { val *= -1; }
            return val;
        };
        const lat = parseNmeaCoord(latRaw, latDir);
        const lon = parseNmeaCoord(lonRaw, lonDir);
        const alt = altRaw ? parseFloat(altRaw) : undefined;
        return { x: lon, y: lat, z: alt };
    }
    // Try "X,Y,Z" ascii line
    const m = line.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
        return { x: parseFloat(m[1]), y: parseFloat(m[2]), z: parseFloat(m[3]) };
    }
    return {};
};

const GpsFeed: React.FC = () => {
    const [lines, setLines] = useState<string[]>([]);
    const [status, setStatus] = useState<'connecting'|'open'|'error'|'closed'>('connecting');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [coords, setCoords] = useState<{x?: number, y?: number, z?: number}>({});
    useEffect(() => {
        const ws = new window.WebSocket('ws://localhost:8089');
        ws.onopen = () => {
            setStatus('open');
        };
        ws.onerror = (e) => {
            setStatus('error');
            setErrorMsg('WebSocket connection error. Server might not be running or port is blocked.');
        };
        ws.onclose = () => {
            setStatus('closed');
        };
        ws.onmessage = (event) => {
            setLines(prev => [event.data, ...prev].slice(0, 50));
            const c = parseCoords(event.data);
            if (c.x !== undefined && c.y !== undefined && c.z !== undefined) {
                setCoords(c);
            }
        };
        return () => ws.close();
    }, []);
    return (
        <>
            <div style={{ color: '#fff', marginBottom: 8, fontFamily: 'monospace', fontWeight: 'bold' }}>
                Koordinate: <span style={{ color: '#0ff', fontWeight: 'normal' }}>
                    {coords.x !== undefined && coords.y !== undefined && coords.z !== undefined ?
                        `(${coords.x.toFixed(6)}, ${coords.y.toFixed(6)}, ${coords.z.toFixed(2)})` :
                        'N/A'}
                </span>
            </div>
            <div style={{ marginTop: 32, background: '#222', color: '#0f0', padding: 12, borderRadius: 8, fontFamily: 'monospace', maxHeight: 300, overflowY: 'auto' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>GPS Feed (COM3):</div>
                {status === 'connecting' && <div style={{ color: '#888' }}>Povezivanje...</div>}
                {status === 'error' && <div style={{ color: '#f00' }}>Greška: {errorMsg}</div>}
                {status === 'closed' && <div style={{ color: '#888' }}>Veza zatvorena.</div>}
                {status === 'open' && lines.length === 0 && <div style={{ color: '#888' }}>Nema podataka...</div>}
                {status === 'open' && lines.length > 0 && lines.map((line, i) => <div key={i}>{line}</div>)}
            </div>
        </>
    );
};
import * as THREE from "three";

const SandMeScanPage: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [showWave, setShowWave] = useState(false);

    useEffect(() => {
        // Prilagodi veličinu scene veličini prozora
        const getSize = () => {
            const container = mountRef.current;
            if (container) {
                return {
                    width: container.clientWidth || window.innerWidth,
                    height: container.clientHeight || window.innerHeight * 0.7
                };
            }
            return { width: window.innerWidth, height: window.innerHeight * 0.7 };
        };
        const { width, height } = getSize();
        const scene = new THREE.Scene();
        // Perspektivna kamera za realističan 3D prikaz
        const aspect = width / height;
        const camera = new THREE.PerspectiveCamera(45, aspect, 1, 3000);
        camera.position.set(0, 0, 1200);
        camera.lookAt(0, 0, 0);

        // Dimenzije terena
        const fieldWidth = 540 * 1.1; // 594
        const fieldHeight = 360 * 1.1; // 396

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
            // +-3% od visine kao amplitude
            const amplitude = fieldHeight * 0.03;
            // Pripremi array za boje
            const colors = [];
            let minZ = Infinity, maxZ = -Infinity;
            // Prvo izračunaj sve Z i pronađi min/max
            for (let i = 0; i < geometry.attributes.position.count; i++) {
                const x = geometry.attributes.position.getX(i);
                const y = geometry.attributes.position.getY(i);
                const z = Math.sin(x / 60) * Math.cos(y / 60) * amplitude;
                geometry.attributes.position.setZ(i, z);
                if (z < minZ) { minZ = z; }
                if (z > maxZ) { maxZ = z; }
            }
            // Sada dodeli boje po visini
            for (let i = 0; i < geometry.attributes.position.count; i++) {
                const z = geometry.attributes.position.getZ(i);
                // Normalizuj z u [0,1]
                const t = (z - minZ) / (maxZ - minZ);
                // Svetlija narandžasta za visoke, tamnija za niske
                // npr. od #b35c00 (tamno) do #fff2cc (svetlo)
                // Interpolacija RGB
                const low = { r: 179/255, g: 92/255, b: 0 };
                const high = { r: 1, g: 0.95, b: 0.8 };
                const r = low.r + (high.r - low.r) * t;
                const g = low.g + (high.g - low.g) * t;
                const b = low.b + (high.b - low.b) * t;
                colors.push(r, g, b);
            }
            geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            geometry.computeVertexNormals();
            const material = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 40, transparent: true, opacity: 0.7 });
            field = new THREE.Mesh(geometry, material);

            // Dodaj prvo linije, pa tek onda talasastu površinu (da linije budu iznad)
        }

        // Dodaj svetlo za bolji efekat talasaste površine
        if (showWave) {
            const light = new THREE.DirectionalLight(0xffffff, 1.1);
            light.position.set(0, 0, 1000);
            scene.add(light);
            const amb = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(amb);
        }

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

        // Dodaj talasastu površinu tek nakon linija, da linije budu iznad
        if (showWave) {
            scene.add(field);
        }

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

        // Resize handler
        const handleResize = () => {
            const { width, height } = getSize();
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        window.addEventListener("resize", handleResize);

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
            window.removeEventListener("resize", handleResize);
        };
    }, [showWave]);

    return (
        <div style={{ padding: 24 }}>
            <h1>Sand Me Scan</h1>
            <div ref={mountRef} style={{ width: "100%", height: "70vh", minHeight: 300 }} />
            <div style={{ marginTop: 16 }}>
                <label>
                    <input
                        type="checkbox"
                        checked={showWave}
                        onChange={e => setShowWave(e.target.checked)}
                        style={{ marginRight: 8 }}
                    />
                    Prikaži talasastu površinu
                </label>
            </div>
            <GpsFeed />
        </div>
    );
};

export default SandMeScanPage;
