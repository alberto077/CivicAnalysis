type PolicyTitleSplitProps = {
  title: string;
  className?: string;
};

/** Renders a policy title with the segment after the first ":" in normal weight. */
export function PolicyTitleSplit({ title, className }: PolicyTitleSplitProps) {
  const idx = title.indexOf(":");
  if (idx === -1) {
    return <span className={["font-semibold", className].filter(Boolean).join(" ")}>{title}</span>;
  }
  const before = title.slice(0, idx);
  const after = title.slice(idx + 1);
  return (
    <span className={className}>
      <span className="font-semibold">{before}</span>
      <span className="font-normal">:{after}</span>
    </span>
  );
}
