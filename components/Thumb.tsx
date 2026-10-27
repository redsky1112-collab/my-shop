export default function Thumb({ src, alt, masked }: { src?: string | null; alt: string; masked?: boolean }) {
  if (masked) {
    return (
      <div className="thumb masked">
        <span className="r19">19</span>
      </div>
    );
  }
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="thumb" src={src} alt={alt} />;
  }
  return <div className="thumb placeholder">{alt.slice(0, 2)}</div>;
}
