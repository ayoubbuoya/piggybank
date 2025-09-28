import { ReactNode } from "react";

interface BentoCardProps {
  title: string;
  children: ReactNode;
  bg?: string;
  image?: string;
}

export default function BentoCard({
  title,
  children,
  bg = "#FD5A46",
  image,
}: BentoCardProps) {
  return (
    <div
      className="bento-bg brut-card overflow-hidden"
      style={{
        backgroundColor: bg,
        backgroundImage: image ? `url(${image})` : "none",
        backgroundPosition: "100% 100%",
        backgroundSize: "60% auto",
      }}
    >
      <div className="p-6 text-ink-950">
        <h3 className="text-2xl font-bold">{title}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
