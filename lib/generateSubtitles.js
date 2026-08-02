// mediabunny／transformers.js 都只在函式裡動態 import，不放在檔案最上面——
// 這個檔案是從 MediaAttachPreview.js 靜態 import 進來的，而 Feed.js／
// ProfileView.js 是一般會 SSR 的頁面（不像 VideoEditor 是 dynamic(ssr:false)
// 載入），如果在最上面用 static import，這兩個瀏覽器導向的重量級套件會被
// 一起打包進 Node.js 的 SSR bundle，很可能在伺服器端執行時噴錯。動態 import
// 保證這兩個套件只會在使用者真的按下「生成字幕」時、在瀏覽器裡才載入。

// 完全在瀏覽器裡跑（transformers.js 包 Whisper 的 ONNX 版本），不用另外架
// 伺服器——這個專案是 Vercel 無伺服器架構，跑不動要吃 CPU/GPU 的 Python
// Whisper，瀏覽器端是唯一跟現有架構相容的做法。whisper-tiny 是體積最小的
// 多語言模型（量化後幾十 MB），換 small/base 準確度更好但下載更久，先用
// tiny 讓第一次使用的下載體驗不要太痛苦。模型只會下載一次，瀏覽器快取後
// 之後生成字幕不用再重新下載。
const WHISPER_MODEL = "Xenova/whisper-tiny";
const TARGET_SAMPLE_RATE = 16000;

// transformers.js 打包了 onnxruntime-web 的 emscripten 產物（一大包已經
// minify 過的 wasm 膠水程式碼），webpack 想把它當一般 JS 模組解析時會直接
// 噴 Syntax Error（bundler 相容性是這類「瀏覽器跑 AI 模型」套件很常見的
// 痛點）。用 webpackIgnore 註解叫 webpack 完全不要碰這個 import，改成瀏覽器
// 原生的動態 import，從 CDN 載入真正執行——package.json 裡雖然還是有裝
// @huggingface/transformers（本機開發/型別用），但實際執行是走這條路，不會
// 進 Vercel 的 build。
let transcriberPromise = null;
function getTranscriber(onProgress) {
  if (!transcriberPromise) {
    transcriberPromise = import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm").then(({ pipeline }) =>
      pipeline("automatic-speech-recognition", WHISPER_MODEL, {
        progress_callback: onProgress,
      })
    );
  }
  return transcriberPromise;
}

function downmixToMono(audioBuffer) {
  const { numberOfChannels, length } = audioBuffer;
  const out = new Float32Array(length);
  if (numberOfChannels === 1) {
    out.set(audioBuffer.getChannelData(0));
    return out;
  }
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) out[i] += data[i] / numberOfChannels;
  }
  return out;
}

// Whisper 只吃 16kHz——線性內插重新取樣，不用另外開 OfflineAudioContext
// 繞一圈（那個要等瀏覽器排程，這個直接算，量大也不會太慢）。
function resampleTo16k(samples, sourceSampleRate) {
  if (!sourceSampleRate || sourceSampleRate === TARGET_SAMPLE_RATE) return samples;
  const ratio = sourceSampleRate / TARGET_SAMPLE_RATE;
  const newLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const i0 = Math.floor(srcIndex);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = srcIndex - i0;
    out[i] = samples[i0] * (1 - frac) + samples[i1] * frac;
  }
  return out;
}

async function extractMono16k(file) {
  const { Input, BlobSource, ALL_FORMATS, AudioBufferSink } = await import("mediabunny");
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const audioTracks = await input.getAudioTracks();
  const audioTrack = audioTracks[0];
  if (!audioTrack) {
    throw new Error("這支影片沒有聲音軌，無法生成字幕");
  }
  const sink = new AudioBufferSink(audioTrack);
  const chunks = [];
  let totalLength = 0;
  let sourceSampleRate = null;
  for await (const { buffer } of sink.buffers()) {
    sourceSampleRate = buffer.sampleRate;
    const mono = downmixToMono(buffer);
    chunks.push(mono);
    totalLength += mono.length;
  }
  input.dispose?.();
  if (!chunks.length) throw new Error("沒有讀到聲音資料");
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const c of chunks) { merged.set(c, offset); offset += c.length; }
  return resampleTo16k(merged, sourceSampleRate);
}

// onProgress({ stage: "model"|"decode"|"transcribe", ...modelProgressFields }）
export async function generateSubtitles(file, onProgress) {
  const transcriberPromiseHandle = getTranscriber(p => onProgress?.({ stage: "model", ...p }));
  onProgress?.({ stage: "decode" });
  const audio = await extractMono16k(file);
  const transcriber = await transcriberPromiseHandle;
  onProgress?.({ stage: "transcribe" });
  const result = await transcriber(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
  });
  const chunks = result?.chunks || [];
  return chunks
    .map(c => ({
      start: c.timestamp?.[0] ?? 0,
      end: c.timestamp?.[1] ?? (c.timestamp?.[0] ?? 0) + 3,
      text: (c.text || "").trim(),
    }))
    .filter(s => s.text);
}
