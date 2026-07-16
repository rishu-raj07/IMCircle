// PART-17: lightweight feed rhythm balancer.
//
// Given the feed items already fetched/paginated by the existing feed API
// (in their existing server-decided order), this nudges the array so the
// same content "rhythm" type doesn't repeat 3+ times in a row (e.g. three
// media-heavy posts stacked back to back). It never drops, duplicates, or
// re-fetches anything, and never reorders across a pagination boundary in a
// way that matters — it's a pure, synchronous reorder of the array that's
// about to render, so upstream cursor/pagination logic is untouched.
function getRhythmType(item) {
  const type = item?.type || "post";
  if (type !== "post") return type;

  const media = item?.media || item?.post?.media || item?.data?.media;
  if (Array.isArray(media) && media.length > 0) return "post-media";
  return "post-text";
}

export function balanceFeedRhythm(items) {
  if (!Array.isArray(items) || items.length < 3) return items;

  const result = items.slice();

  for (let i = 2; i < result.length; i++) {
    const t1 = getRhythmType(result[i - 2]);
    const t2 = getRhythmType(result[i - 1]);
    const t3 = getRhythmType(result[i]);

    if (t1 === t2 && t2 === t3) {
      // Look ahead for the nearest item with a different rhythm type and
      // pull it forward, just enough to break the run of three.
      let swapIndex = -1;
      for (let j = i + 1; j < result.length; j++) {
        if (getRhythmType(result[j]) !== t3) {
          swapIndex = j;
          break;
        }
      }

      if (swapIndex !== -1) {
        const [swapItem] = result.splice(swapIndex, 1);
        result.splice(i, 0, swapItem);
      }
    }
  }

  return result;
}

export default balanceFeedRhythm;
