import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Composer({ onSend, disabled, langName }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const v = value.trim();
    if (!v || disabled) return;
    onSend(v);
    setValue("");
  };
  return (
    <div className="flex gap-2 border-t border-border bg-card p-4">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={langName ? `Type in ${langName}…` : "Type your reply…"}
        disabled={disabled}
      />
      <Button size="icon" onClick={submit} disabled={disabled} aria-label="Send">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
