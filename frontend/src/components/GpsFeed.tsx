import React, { useEffect, useState } from "react";
import { parseCoords } from "./utils/gpsUtils";

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
