import TapeDelay from "../js/TapeDelay.js";
import { createAudioContext, createBufferSource, CreateBufferFromFile, BPMToTime, createGain, db2mag } from '../js/Utilities.js';

const start_button = document.getElementById('start_button');
const time = document.getElementById('time');
const feedback = document.getElementById('feedback');
const wobble_depth = document.getElementById('wobble_depth');
const wobble_rate = document.getElementById('wobble_rate');
const width = document.getElementById('width');
const eq_low = document.getElementById('eq_low');
const eq_high = document.getElementById('eq_high');
const use_bpm = document.getElementById('UseBPM');
let started = false;
let loaded = false;
let playing = false;
let file_buffer;
let file_player;

const ctx = createAudioContext();
const tape_delay = new TapeDelay(ctx, parseFloat(time.value), parseFloat(feedback.value), parseFloat(wobble_rate.value), parseFloat(wobble_depth.value));
tape_delay.setWidth(parseFloat(width.value));

tape_delay.connect(ctx.destination);
CreateBufferFromFile(ctx, "Dub_Sequence.wav").then((buffer) => {
  file_buffer = buffer;
  loaded = true;
})
const direct_gain = createGain(ctx, db2mag(-6));
direct_gain.connect(ctx.destination);
tape_delay.setOutputGain(-6);

time.oninput = () => {
  let time_val = parseFloat(time.value);
  if (use_bpm.checked) {
    // create a fraction from 1/16 - 1/2 
    // (all 1/16th note time durations from 1/16th to 8/16th);
    let step = Math.floor(8 * time_val) / 16 + 0.01;
    const loop_bpm = 90; // known from writing loop
    time_val = BPMToTime(loop_bpm, step);
  }
  tape_delay.setTime(time_val);
};

feedback.oninput = () => {
  tape_delay.setFeedback(parseFloat(feedback.value));
};

wobble_rate.oninput = () => {
  tape_delay.setWobbleRate(parseFloat(wobble_rate.value));
};

wobble_depth.oninput = () => {
  tape_delay.setWobbleDepth(parseFloat(wobble_depth.value));
};

width.oninput = () => {
  tape_delay.setWidth(parseFloat(width.value));
}

const update_eq = () => {
  tape_delay.setEQ(parseFloat(eq_low.value), parseFloat(eq_high.value));
}
eq_low.oninput = () => {
  update_eq();
}
eq_high.oninput = () => {
  update_eq();
}

start_button.onclick = () => {
  if (loaded) {
    if (ctx.state == "suspended") {
      ctx.resume();
    }
    if (!started) {
      tape_delay.start();
      started = true;
    }
    playing = !playing;
    if (playing) {
      file_player = createBufferSource(ctx, file_buffer, 1.0, true);
      file_player.connect(tape_delay.input);
      file_player.connect(direct_gain);
      file_player.start();
    } else {
      file_player.stop();
      file_player.disconnect();
    }
  }


}