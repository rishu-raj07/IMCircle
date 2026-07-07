import { useEffect, useRef, useState } from "react";

function LazyVideo({
  src,
  poster,
  className = "",
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  ...props
}) {
  const wrapperRef = useRef(null);
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setVisible(isVisible);

        if (!isVisible) {
          videoRef.current?.pause?.();
        } else if (autoPlay) {
          videoRef.current?.play?.().catch(() => {});
        }
      },
      { rootMargin: "120px 0px", threshold: 0.15 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [autoPlay]);

  return (
    <span ref={wrapperRef} className="block">
      <video
        ref={videoRef}
        src={visible ? src : undefined}
        poster={poster}
        preload={visible ? "metadata" : "none"}
        className={className}
        muted={muted}
        loop={loop}
        controls={controls}
        playsInline
        {...props}
      />
    </span>
  );
}

export default LazyVideo;
