export function db2mag(db_value) {
    return Math.pow(10, db_value / 20);
}
export function mag2db(magnitude_value) {
    if (magnitude_value == 0)
        return -200;
    if (magnitude_value < 0)
        return NaN;
    return 20 * Math.log10(magnitude_value);
}
export function GetMaxAbsValue(array) {
    let min = 100;
    let max = -100;
    for (let i = 0; i < array.length; ++i) {
        min = Math.min(min, array[i]);
        max = Math.max(max, array[i]);
    }
    return Math.max(max, Math.abs(min));
}
export function GetRMS(array) {
    let sum = 0;
    for (let i = 0; i < array.length; ++i) {
        sum += array[i] * array[i];
    }
    let rms = sum / array.length;
    return Math.sqrt(rms);
}
export function createAudioBuffer(n_channels, n_frames, sample_rate) {
    // create a buffer
    return new AudioBuffer({
        numberOfChannels: n_channels,
        length: n_frames,
        sampleRate: sample_rate,
    });
}
export function createBiquadFilter(ctx, type, frequency, Q, gain_dB) {
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    if (type === 'lowshelf' || type === 'highshelf')
        filter.gain.value = gain_dB;
    return filter;
}
export function createGain(ctx, initial_gain = 1.0) {
    const gain = ctx.createGain();
    gain.gain.value = initial_gain;
    return gain;
}
export function createOscillator(ctx, type, frequency, detune) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    return osc;
}
export function createStereoPanner(ctx, pan) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    return panner;
}
export function createBufferSource(ctx, buffer, playback_rate, loop) {
    const bs = ctx.createBufferSource();
    bs.buffer = buffer;
    bs.playbackRate.value = playback_rate;
    bs.loop = loop;
    return bs;
}
export function CreateNoiseOscillator(ctx, gain_dB = 0, duration = 2) {
    // 2 second noise loop
    const n_frames = ctx.sampleRate * duration;
    // create a buffer
    const buffer = createAudioBuffer(1, n_frames, ctx.sampleRate);
    // Fill the buffer with white noise;
    // just random values between -1.0 and 1.0
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n_frames; i++) {
        // random values between -1 and 1
        data[i] = Math.random() * 2 - 1;
        data[i] *= db2mag(gain_dB);
    }
    return createBufferSource(ctx, buffer, 1.0, true);
}
export function createCompressor(ctx, thresh_db, knee_db, ratio, attack_s, release_s) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = thresh_db;
    comp.knee.value = knee_db;
    comp.ratio.value = ratio;
    comp.attack.value = attack_s;
    comp.release.value = release_s;
    return comp;
}
export function createDigitalDelay(ctx, delay_time, feedback_db) {
    const input = createGain(ctx, 1.0);
    const out = createGain(ctx, 1.0);
    const delay = ctx.createDelay(Math.max(1.0, delay_time));
    delay.delayTime.value = delay_time;
    const fb = createGain(ctx, db2mag(feedback_db));
    input.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(out);
    return { input: input, delay: delay, fb: fb, output: out };
}
export function createWaveShaper(ctx, table, oversample = '4x') {
    const bc = ctx.createWaveShaper();
    bc.curve = table;
    bc.oversample = oversample;
    return bc;
}
export function createAudioContext() {
    // initialize audio
    const audio_ctx = new window.AudioContext();
    // immediately suspend
    audio_ctx.suspend();
    return audio_ctx;
}
export function CreateBufferFromFile(context, url) {
    return new Promise(function (resolve, reject) {
        const request = new XMLHttpRequest();
        request.open('GET', url);
        request.responseType = 'arraybuffer';
        request.onload = function () {
            if (request.response == null)
                reject(null);
            let undecodedAudio = request.response;
            context.decodeAudioData(undecodedAudio, (data) => {
                resolve(data);
            });
        };
        request.send();
    });
}
// Function takes some time to happen so it uses a promise.
// When calling, implement in the following fashion
// CreateLiveInputNode(audio_ctx).then((return_val) => {
//     let input_node = return_val;
//     <remaining graph setup>
// });
// turn off aec will turn off the aec, which is useful for using a loopback like
// blackhole this feature is only supported on firefox bug report in chrome:
// https://bugs.chromium.org/p/chromium/issues/detail?id=796964
export function CreateLiveInputNode(ctx, turn_off_aec = false) {
    return new Promise(function (resolve, reject) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
                .getUserMedia({ audio: true })
                // Success callback
                .then((stream) => {
                const track = stream.getAudioTracks()[0];
                let current_settings = track.getSettings();
                current_settings.echoCancellation = !turn_off_aec;
                track.applyConstraints(current_settings)
                    .then(() => {
                    console.log(stream.getAudioTracks()[0].getSettings());
                    console.log('creating live input node');
                    resolve(ctx.createMediaStreamSource(stream));
                })
                    .catch(() => { console.log('failed to apply constraints'); });
            })
                // Error callback
                .catch((err) => {
                console.error(`The following getUserMedia error occurred: ${err}`);
                reject(null);
            });
        }
        else {
            console.log('getUserMedia not supported on your browser!');
            reject(null);
        }
    });
}
// exponentially ramp to value, saves some characters
export function RampToValue(param, start_time, value, duration) {
    param.setTargetAtTime(value, start_time, duration);
}
export function ReverseAudioBuffer(buffer) {
    const n_channels = buffer.numberOfChannels;
    const n_frames = buffer.length;
    const fs = buffer.sampleRate;
    const rev_buffer = createAudioBuffer(n_channels, n_frames, fs);
    for (let c = 0; c < n_channels; ++c) {
        const ch_r = rev_buffer.getChannelData(c);
        const ch_f = buffer.getChannelData(c);
        for (let i = 0; i < n_frames / 2; ++i) {
            ch_r[i] = ch_f[n_frames - 1 - i];
            ch_r[n_frames - 1 - i] = ch_f[i];
        }
    }
    return rev_buffer;
}
export function NormalizeAudioBuffer(buffer) {
    const n_channels = buffer.numberOfChannels;
    const n_frames = buffer.length;
    const fs = buffer.sampleRate;
    const norm_buffer = createAudioBuffer(n_channels, n_frames, fs);
    let max = 0.001; // -60 db
    // find max value
    for (let c = 0; c < n_channels; ++c) {
        max = Math.max(max, GetMaxAbsValue(buffer.getChannelData(c)));
    }
    // normalize
    const scale = Math.min(1 / max, db2mag(24)); // max of 24db boost allowed
    for (let c = 0; c < n_channels; ++c) {
        const i_c = buffer.getChannelData(c);
        const n_c = norm_buffer.getChannelData(c);
        for (let i = 0; i < n_frames; ++i) {
            n_c[i] = i_c[i] * scale;
        }
    }
    return norm_buffer;
}
export function CropAudioBuffer(buffer, start_sample, end_sample) {
    const n_channels = buffer.numberOfChannels;
    end_sample = Math.min(buffer.length - 1, end_sample);
    start_sample = Math.max(start_sample, 0);
    if (start_sample > end_sample) {
        const temp = start_sample;
        start_sample = end_sample;
        end_sample = temp;
    }
    const n_frames = end_sample - start_sample;
    const fs = buffer.sampleRate;
    const cropped_buffer = createAudioBuffer(n_channels, n_frames, fs);
    for (let c = 0; c < n_channels; ++c) {
        const ch_c = cropped_buffer.getChannelData(c);
        const ch_o = buffer.getChannelData(c);
        for (let i = start_sample, c = 0; i < end_sample; ++i, ++c) {
            ch_c[c] = ch_o[i];
        }
    }
    return cropped_buffer;
}
export function NoteToPitch(note, octave, custom_root_hz) {
    octave = clamp(octave, 0, 8); // limit range to 0-8
    octave = Math.floor(octave); // no fractional octaves
    const C0 = custom_root_hz == undefined ?
        16.35 :
        custom_root_hz; // Assuming A = 440
    // gives you a C in whatever octave is specified
    const octave_shift = C0 * (Math.pow(2, octave));
    switch (note) {
        case 'C':
            return octave_shift;
        case 'C#':
            return octave_shift * Math.pow(2, (1 / 12));
        case 'D':
            return octave_shift * Math.pow(2, (2 / 12));
        case 'D#':
            return octave_shift * Math.pow(2, (3 / 12));
        case 'E':
            return octave_shift * Math.pow(2, (4 / 12));
        case 'F':
            return octave_shift * Math.pow(2, (5 / 12));
        case 'F#':
            return octave_shift * Math.pow(2, (6 / 12));
        case 'G':
            return octave_shift * Math.pow(2, (7 / 12));
        case 'G#':
            return octave_shift * Math.pow(2, (8 / 12));
        case 'A':
            return octave_shift * Math.pow(2, (9 / 12));
        case 'A#':
            return octave_shift * Math.pow(2, (10 / 12));
        case 'B':
            return octave_shift * Math.pow(2, (11 / 12));
        default:
            console.log('NoteToPitch: Unknown Note Provided');
            return octave_shift;
    }
}
export function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}
export function envelop(t, attack, release) {
    if (t <= attack) {
        // e^0.7 = 2
        return Math.min(Math.exp(0.7 * t / attack) - 1, 1);
    }
    else {
        // e^-4 = -35 dB
        return Math.exp(-4 * (t - attack) / release);
    }
}
// division should be the following format
// whole note = 1
// half note = 1/2
// quarter note = 1/4
// eighth note = 1/8
// etc
export function BPMToTime(BPM, division) {
    const inv_div = 1 / division;
    return (60.0 / (BPM * inv_div / 4));
}
// Function to load an Audio Worklet module
function loadAudioWorkletModule(audio_ctx, moduleURL) {
    return new Promise((resolve, reject) => {
        // Use the audio context's audioWorklet property to load the module
        audio_ctx.audioWorklet.addModule(moduleURL)
            .then(() => {
            // console.log(`Audio Worklet module loaded successfully from
            // ${moduleURL}`);
            resolve();
        })
            .catch((error) => {
            console.error(`Error loading Audio Worklet module from ${moduleURL}`, error);
            reject(error);
        });
    });
}
// load multiple modules
export function LoadMultipleWorkletModules(audio_ctx, urls) {
    return urls.reduce((previousPromise, moduleURL) => {
        return previousPromise.then(() => {
            return loadAudioWorkletModule(audio_ctx, moduleURL);
        });
    }, Promise.resolve());
}
;
export function zeros(len) {
    return new Array(len).fill(0);
}
export function ones(len) {
    return new Array(len).fill(1);
}
