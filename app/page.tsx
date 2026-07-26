import { Assistant } from "./assistant";
import { PasswordGate } from "@/components/auth/password-gate";

export default function Home() {
  return (
    <main className="h-dvh">
      <PasswordGate>
        <Assistant />
      </PasswordGate>
    </main>
  );
}
