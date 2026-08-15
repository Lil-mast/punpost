interface SectionLabelProps {
  children: string;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">
      {children}
    </p>
  );
}
