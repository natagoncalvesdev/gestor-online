export function CapaProduto({
  src,
  zoom = 1,
  x = 0,
  y = 0,
  className = "",
}: {
  src: string;
  zoom?: number;
  x?: number;
  y?: number;
  className?: string;
}) {
  return (
    <div className={`relative aspect-square overflow-hidden bg-secondary ${className}`}>
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: `translate(${x}%, ${y}%) scale(${zoom})`, transformOrigin: "center" }}
      />
    </div>
  );
}
