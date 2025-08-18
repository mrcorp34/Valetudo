import React, { useEffect, useState } from "react";

// Inline parseCoords utility (was previously in gpsUtils)
function parseCoords(line: string): { x?: number, y?: number, z?: number } {
    // Primeri podržanih formata:
    // 1. "43.123456, 20.987654, 123.45"
    // 2. "lat:43.123456 lon:20.987654 alt:123.45"
    // 3. "GPS: 43.123456 20.987654 123.45"
    // 4. "NMEA: $GPGGA,...."
    // 5. "x=43.123456 y=20.987654 z=123.45"
    // 6. "43.123456 20.987654 123.45"
    // 7. "lat=43.123456,lon=20.987654,alt=123.45"

    // Najpre pokušaj da parsiraš kao CSV ili razmakom odvojene brojeve
    const csvMatch = line.match(/(-?\d+\.\d+)[, ]+(-?\d+\.\d+)[, ]+(-?\d+\.?\d*)/);
    if (csvMatch) {
        return {
            x: parseFloat(csvMatch[1]),
            y: parseFloat(csvMatch[2]),
            z: parseFloat(csvMatch[3])
        };
    }
    // Klasični key-value formati
    const kvMatch = line.match(/lat[:=](-?\d+\.\d+)[, ]+lon[:=](-?\d+\.\d+)[, ]+alt[:=](-?\d+\.?\d*)/i);
    if (kvMatch) {
        return {
            x: parseFloat(kvMatch[1]),
            y: parseFloat(kvMatch[2]),
            z: parseFloat(kvMatch[3])
        };
    }
    const kv2Match = line.match(/x[:=](-?\d+\.\d+)[, ]+y[:=](-?\d+\.\d+)[, ]+z[:=](-?\d+\.?\d*)/i);
    if (kv2Match) {
        return {
            x: parseFloat(kv2Match[1]),
            y: parseFloat(kv2Match[2]),
            z: parseFloat(kv2Match[3])
        };
    }
    // NMEA GGA string (samo osnovna podrška)
    function nmeaToDec(raw: string, hem: string) {
        if (!raw || !hem) { return undefined; }
        // NMEA: ddmm.mmmm
        const dotIdx = raw.indexOf(".");
        if (dotIdx < 0) { return undefined; }
        const degLen = dotIdx - 2;
        const deg = parseInt(raw.slice(0, degLen));
        const min = parseFloat(raw.slice(degLen));
        let dec = deg + min / 60;
        if (hem === "S" || hem === "W") { dec = -dec; }
        return dec;
    }
    if (line.startsWith("$GPGGA")) {
        // Primer: $GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47
        const parts = line.split(",");
        if (parts.length > 9) {
            // Latitude
            const latRaw = parts[2];
            const latHem = parts[3];
            const lonRaw = parts[4];
            const lonHem = parts[5];
            const altRaw = parts[9];
            const x = nmeaToDec(latRaw, latHem);
            const y = nmeaToDec(lonRaw, lonHem);
            const z = parseFloat(altRaw);
            return { x: x, y: y, z: z };
        }
    }
    return {};
}

export interface GpsFeedProps {
    onCoords?: (coords: {x?: number, y?: number, z?: number}) => void;
}

const GpsFeed: React.FC<GpsFeedProps> = ({ onCoords }) => {
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
                if (onCoords) {
                    onCoords(c);
                }
            }
        };
        return () => ws.close();
    }, [onCoords]);
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

export default GpsFeed;
