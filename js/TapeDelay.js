import { HyperTanDistortionCurve } from './SaturationDesigner.js';
import { clamp, createBiquadFilter, createGain, createStereoPanner, createWaveShaper, db2mag, RampToValue } from './Utilities.js';
class TapeDelay {
    constructor(context, time, feedback_dB = -9, wobble_rate_hz = 1, wobble_depth = 0.1, eq_low_gain_dB = -1, eq_high_gain_dB = -2) {
        Object.defineProperty(this, "ctx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "input", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // input
        Object.defineProperty(this, "o", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // output gain
        Object.defineProperty(this, "dt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // delay time
        Object.defineProperty(this, "delay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // delay line
        Object.defineProperty(this, "fb", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // feedback
        Object.defineProperty(this, "p_l", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // panner left, create width
        Object.defineProperty(this, "p_r", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // panner right, create width
        Object.defineProperty(this, "ap_l", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // creates time offset bw left and right ear
        Object.defineProperty(this, "ap_r", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // creates time offset bw left and right ear
        Object.defineProperty(this, "wr", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // wobble rate
        Object.defineProperty(this, "wd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // wobble depth
        Object.defineProperty(this, "eq_low", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // EQ for low frequencies in feedback loop
        Object.defineProperty(this, "eq_high", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // EQ for high frequencies in feedback loop
        Object.defineProperty(this, "timer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // Timer for delay line modulation
        this.ctx = context;
        // input gain and output gain
        this.input = context.createGain();
        // output gain
        this.o = context.createGain();
        // Delay Line components
        this.dt = time;
        this.delay =
            context.createDelay(Math.max(1.5, time + 0.1)); // time + wobble room
        this.fb = createGain(context, db2mag(feedback_dB));
        // Tone Controls for feedback loop
        this.eq_low =
            createBiquadFilter(context, 'lowshelf', 350, 1.0, eq_low_gain_dB);
        this.eq_high =
            createBiquadFilter(context, 'highshelf', 4000, 1.0, eq_high_gain_dB);
        // Feedback loop effects
        // saturator
        const saturator = createWaveShaper(context, HyperTanDistortionCurve(-1, 0));
        // diffusion / phase smearing of signal with each loop
        const diffusion = createBiquadFilter(context, 'allpass', 500, 1.0, 0.0);
        // connect
        // eq and compress before going into delay line
        this.input.connect(this.eq_low)
            .connect(this.eq_high)
            .connect(saturator)
            .connect(diffusion)
            .connect(this.delay);
        this.delay.connect(this.fb).connect(this.eq_low); // fb loop
        this.delay.connect(this.o);
        // Panning and stereo width
        this.p_l = createStereoPanner(context, -1);
        this.p_r = createStereoPanner(context, 1);
        this.ap_l = createBiquadFilter(context, 'allpass', 2100, 1.0, 0.0);
        this.ap_r = createBiquadFilter(context, 'allpass', 2100, 1.0, 0.0);
        this.o.connect(this.ap_l).connect(this.p_l);
        this.o.connect(this.ap_r).connect(this.p_r);
        // set wobble settings
        this.setWobbleDepth(wobble_depth);
        this.setWobbleRate(wobble_rate_hz);
    }
    setTime(time) {
        this.dt = time;
        this.update_delay();
    }
    setFeedback(feedback_dB) {
        this.fb.gain.setTargetAtTime(db2mag(feedback_dB), 0, 0.1);
    }
    setWobbleDepth(wd) {
        // wobble depth input is from 0 to 1
        // max depth is 40 ms
        this.wd = clamp(wd, 0, 1) * 0.04;
        this.update_delay();
    }
    setWobbleRate(wr) {
        // max rate is 10 Hz
        this.wr = clamp(wr, 0.1, 10);
        this.update_delay();
    }
    setOutputGain(gain_dB) {
        RampToValue(this.o.gain, 0, db2mag(gain_dB), 0.01);
    }
    setWidth(width) {
        width = clamp(width, 0, 1);
        this.p_l.pan.setTargetAtTime(-width, 0, 0.1);
        this.p_r.pan.setTargetAtTime(width, 0, 0.1);
        // the all pass filter creates phase distortion which creates small time
        // variations between left to right channel Apparent Source Width is
        // strongly correlated with phase correlation
        this.ap_l.frequency.setTargetAtTime(100 + (1. - width) * 2000, 0, 0.1);
    }
    setEQ(low_gain_dB, high_gain_dB) {
        this.eq_low.gain.setTargetAtTime(low_gain_dB, 0, 0.1);
        this.eq_high.gain.setTargetAtTime(high_gain_dB, 0, 0.1);
    }
    connect(node) {
        this.p_l.connect(node);
        this.p_r.connect(node);
    }
    update_delay() {
        clearInterval(this.timer);
        const ct = this.ctx.currentTime;
        this.delay.delayTime.cancelScheduledValues(ct);
        this.delay.delayTime.setTargetAtTime(this.dt, ct + 0.01, 0.2);
        const tla = 1.0; // timer look ahead
        let t = ct + 0.1 + tla;
        let d_l = this.dt;
        this.timer = setInterval(() => {
            [d_l, t] = this.delayline_modulation(t, d_l, tla);
        }, tla * 1000); // call timer twice per look ahead period
    }
    delayline_modulation(t, d_l, tla) {
        // modulate the delay line
        const tp = 1 / this.wr; // wobble rate period
        const ct = this.ctx.currentTime;
        while (t < (ct + tla)) {
            // new delay time
            const d = this.dt + Math.random() * this.wd;
            this.delay.delayTime.setValueCurveAtTime([d_l, d], t, tp - 0.05);
            d_l = d;
            t += tp;
        }
        this.delay.delayTime.cancelScheduledValues(t);
        return [d_l, t];
    }
    start() {
        // modulate the delay line
        this.update_delay();
    }
}
export default TapeDelay;
