import { initials, colorFor } from "./utils";

export function ClientAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      className={`${colorFor(name)} text-white font-semibold rounded-full inline-flex items-center justify-center shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}