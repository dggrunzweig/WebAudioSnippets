// A hyper tan distortion curve
// ceiling -> max allowable output volume
// boost_dB -> a boosting factor in decibels, the higher it is the more easily
// the signal will distort
import { clamp, db2mag } from './Utilities.js';
// curve_size -> the resolution of the curve, default is 512
export function HyperTanDistortionCurve(ceiling_dB = 0, boost_dB = 3, curve_size = 512) {
    const curve = new Float32Array(curve_size);
    // a lower ceiling will result in the signal breaking up at lower volumes
    const scalar = db2mag(ceiling_dB);
    const scalar_boost = db2mag(boost_dB);
    for (let i = 0; i < curve_size; i++) {
        // from -1 to 1
        const x = (i * 2) / (curve_size - 1) - 1;
        curve[i] = scalar * Math.tanh(scalar_boost * x);
    }
    return curve;
}
export function HardClipCurve(ceiling_dB = 0, boost_dB = 0, curve_size = 512) {
    const curve = new Float32Array(curve_size);
    // a lower ceiling will result in the signal breaking up at lower volumes
    const ceiling_lin = db2mag(ceiling_dB);
    const boost_lin = db2mag(boost_dB);
    for (let i = 0; i < curve_size; i++) {
        // from -1 to 1
        const x = (i * 2) / (curve_size - 1) - 1;
        const y = boost_lin * x;
        curve[i] = clamp(y, -ceiling_lin, ceiling_lin);
    }
    return curve;
}
export function BitCrushCurve(bit_depth = 32, curve_size = 512) {
    const curve = new Float32Array(curve_size);
    const max_value = Math.pow(2, bit_depth) - 1.;
    for (let i = 0; i < curve_size; i++) {
        // from -1 to 1
        const x = (i * 2) / (curve_size - 1) - 1;
        // get quantized int representation and convert back to float
        curve[i] = Math.round(x * max_value) / max_value;
    }
    return curve;
}
