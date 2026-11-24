export function CapaProduto({
  src,
  zoom = 1,
  x = 0,
  y = 0,
  className = "",
  proporcao = "aspect-square",
}: {
  src: string;
  zoom?: number;
  x?: number;
  y?: number;
  className?: string;
  proporcao?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-secondary ${proporcao} ${className}`}>
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: `translate(${x}%, ${y}%) scale(${zoom})`, transformOrigin: "center" }}
      />
    </div>
  );
}
