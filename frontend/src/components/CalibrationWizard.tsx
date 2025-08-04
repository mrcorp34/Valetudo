import React from "react";

interface CalibrationWizardProps {
    calibStep: number;
    setCalibStep: (step: number) => void;
    calibPoints: Array<{ x: number; y: number; z: number }>;
    setCalibPoints: (points: Array<{ x: number; y: number; z: number }>) => void;
    lastCoords: { x?: number; y?: number; z?: number };
    mockMode: boolean;
    mockCalibPoints: Array<{ x: number; y: number; z: number }>;
}

export const CALIBRATION_STEPS = [
    {
        label: 'Donji levi ugao (između double out linije i osnovne linije)',
        desc: 'Postavite robota u donji levi ugao terena, između double out linije i osnovne linije.'
    },
    {
        label: 'T-linija i linija između servis boxova',
        desc: 'Postavite robota na preseku T-linije i linije između servis boxova.'
    },
    {
        label: 'Leva out linija + base linija',
        desc: 'Postavite robota na preseku leve out linije i osnovne linije.'
    }
];

const CalibrationWizard: React.FC<CalibrationWizardProps> = ({
    calibStep,
    setCalibStep,
    calibPoints,
    setCalibPoints,
    lastCoords,
    mockMode,
    mockCalibPoints
}) => {
    return calibStep < CALIBRATION_STEPS.length ? (
        <div style={{ background: '#ffe', borderRadius: 8, padding: 16, marginBottom: 24, boxShadow: '0 2px 8px #0002' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Kalibracija ({calibStep + 1}/{CALIBRATION_STEPS.length})
            </div>
            <div style={{ marginBottom: 8 }}>{CALIBRATION_STEPS[calibStep].desc}</div>
            <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#333' }}>Trenutne GPS koordinate: </span>
                <span style={{ color: '#0a0', fontWeight: 'bold' }}>
                    {lastCoords.x !== undefined && lastCoords.y !== undefined && lastCoords.z !== undefined ?
                        `(${lastCoords.x.toFixed(6)}, ${lastCoords.y.toFixed(6)}, ${lastCoords.z.toFixed(2)})` : 'N/A'}
                </span>
            </div>
            <button
                style={{ padding: '8px 24px', fontWeight: 'bold', background: '#0a0', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                disabled={lastCoords.x === undefined || lastCoords.y === undefined || lastCoords.z === undefined}
                onClick={() => {
                    if (lastCoords.x !== undefined && lastCoords.y !== undefined && lastCoords.z !== undefined) {
                        if (mockMode) {
                            setCalibPoints([...calibPoints, mockCalibPoints[calibStep]]);
                        } else {
                            setCalibPoints([...calibPoints, { x: lastCoords.x, y: lastCoords.y, z: lastCoords.z }]);
                        }
                        setCalibStep(calibStep + 1);
                    }
                }}
            >Done</button>
        </div>
    ) : (
        <div style={{ background: '#e0ffe0', borderRadius: 8, padding: 16, marginBottom: 24, boxShadow: '0 2px 8px #0002' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Kalibracija završena!</div>
            <div>Referentne tačke su sačuvane. Robot marker će se pojavljivati na terenu prema GPS poziciji.</div>
        </div>
    );
};

export default CalibrationWizard;
