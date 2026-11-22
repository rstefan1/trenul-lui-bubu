/**
 * @file Recordings that loop without a seam.
 *
 * An MP3 has a little silence at both ends (encoder padding), and the end
 * of a recording never quite matches its beginning: played in a loop, it
 * would hitch or click at every turn. Prepared once with makeSeamless, it
 * loops smoothly.
 */

/** Samples quieter than this at both ends count as the MP3's padding. */
const SILENCE = 0.003;

/**
 * A copy of a recording that loops without a seam: the padding at both
 * ends is trimmed and the end is blended into the beginning (equal power).
 * @param {BaseAudioContext} ctx
 * @param {AudioBuffer} src
 * @param {number} [blendSeconds=0.04]  how long the blend is: just enough to
 *   hide the joint for an even sound (the train); longer for a sound that
 *   changes all the time (a crowd, the wind), so the joint cannot be heard
 * @returns {AudioBuffer}
 */
export function makeSeamless(ctx, src, blendSeconds = 0.04) {
  const channels = Array.from({ length: src.numberOfChannels }, (_, c) => src.getChannelData(c));
  const loud = (/** @type {number} */ i) => channels.some(d => Math.abs(d[i]) > SILENCE);
  let start = 0;
  while (start < src.length - 1 && !loud(start)) start++;
  let end = src.length - 1;
  while (end > start && !loud(end)) end--;
  const usable = end - start + 1;
  const blend = Math.min(Math.round(blendSeconds * src.sampleRate), Math.floor(usable / 4));
  const length = usable - blend;
  if (blend < 2 || length < 2) return src;
  const out = ctx.createBuffer(src.numberOfChannels, length, src.sampleRate);
  channels.forEach((d, c) => {
    const o = out.getChannelData(c);
    for (let i = 0; i < length; i++) o[i] = d[start + i];
    // the tail (just after the loop's end) fades out over the head, which fades in
    for (let i = 0; i < blend; i++) {
      const k = i / blend;
      o[i] = d[start + i] * Math.sqrt(k) + d[start + length + i] * Math.sqrt(1 - k);
    }
  });
  return out;
}
