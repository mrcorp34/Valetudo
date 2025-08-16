import React, { useEffect, useState } from "react";
import GpsFeed from "./GpsFeed";
import CalibrationWizard, { CALIBRATION_STEPS } from "./CalibrationWizard";
import ThreeCourtScene from "./ThreeCourtScene";

const SandMeScanPage: React.FC = () => {
    const [showWave, setShowWave] = useState(false);
    const [calibStep, setCalibStep] = useState(0);
    const [calibPoints, setCalibPoints] = useState<Array<{x: number, y: number, z: number}>>([]);
    const [lastCoords, setLastCoords] = useState<{x?: number, y?: number, z?: number}>({});
    const [mockMode, setMockMode] = useState(false);
    const [mockIntervalId, setMockIntervalId] = useState<NodeJS.Timeout | null>(null);
    // Predefinisane mock GPS tačke za kalibraciju
    const mockCalibPoints = React.useMemo(() => [
        { x: 20.000000, y: 44.000000, z: 100.0 }, // donji levi
        { x: 20.011885, y: 44.005485, z: 100.0 }, // centar
        { x: 20.023770, y: 44.011000, z: 100.0 }  // gornji desni
    ], []);

    // Helper to get latest GPS coords from GpsFeed
    const handleGpsCoords = (coords: {x?: number, y?: number, z?: number}) => {
        if (!mockMode) {
            setLastCoords(coords);
        }
    };

    // Mock robot movement logic
    useEffect(() => {
        if (mockMode && calibStep >= CALIBRATION_STEPS.length) {
            // Start interval for robot movement
            if (!mockIntervalId) {
                const id = setInterval(() => {
                    const base = mockCalibPoints[1]; // centar
                    // Raspon pomeranja po X i Y (longitude i latitude)
                    const dx = (Math.random() - 0.5) * 0.02; // X (longitude)
                    const dy = (Math.random() - 0.5) * 0.02; // Y (latitude) - sada veći raspon
                    setLastCoords({ x: base.x + dx, y: base.y + dy, z: base.z });
                }, 1000);
                setMockIntervalId(id);
            }
        } else {
            // Stop interval if not in mock mode or calibration not finished
            if (mockIntervalId) {
                clearInterval(mockIntervalId);
                setMockIntervalId(null);
            }
        }
        return () => {
            if (mockIntervalId) {
                clearInterval(mockIntervalId);
            }
        };
    }, [mockMode, calibStep, mockCalibPoints, mockIntervalId]);

    // Handle calibration in mock mode
    useEffect(() => {
        if (mockMode && calibStep < CALIBRATION_STEPS.length) {
            setLastCoords(mockCalibPoints[calibStep]);
        }
    }, [mockMode, calibStep, mockCalibPoints]);



    return (
        <div style={{ padding: 24, position: 'relative' }}>
            <h1>Sand Me Scan</h1>
            {/* Mock mode toggle */}
            <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
                <label style={{ background: '#eef', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', boxShadow: '0 2px 8px #0002', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={mockMode}
                        onChange={e => {
                            setMockMode(e.target.checked);
                            setCalibStep(0);
                            setCalibPoints([]);
                        }}
                        style={{ marginRight: 8 }}
                    />
                    Mock GPS
                </label>
            </div>
            {/* Calibration Wizard extracted to its own component */}
            <CalibrationWizard
                calibStep={calibStep}
                setCalibStep={setCalibStep}
                calibPoints={calibPoints}
                setCalibPoints={setCalibPoints}
                lastCoords={lastCoords}
                mockMode={mockMode}
                mockCalibPoints={mockCalibPoints}
            />
            <ThreeCourtScene
                showWave={showWave}
                calibPoints={calibPoints}
                lastCoords={lastCoords}
            />
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
            {/* Pass GPS coords to GpsFeed and get updates */}
            {!mockMode && <GpsFeed onCoords={handleGpsCoords} />}
        </div>
    );
};

export default SandMeScanPage;
