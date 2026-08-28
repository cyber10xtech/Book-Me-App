import { useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getProviderById } from "@/lib/mockData";

const ChatPage = () => {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ id: string; text: string; fromMe: boolean; time: string }[]>([
    { id: "1", text: "Hi! I just booked your service. Looking forward to it!", fromMe: true, time: "2:30 PM" },
    { id: "2", text: "Hi! Thank you for booking. See you soon!", fromMe: false, time: "2:31 PM" },
  ]);

  const provider = getProviderById(providerId || "");

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: message,
      fromMe: true,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    }]);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-10 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        {provider && (
          <div className="flex items-center gap-3">
            <img src={provider.avatarImage} alt="" className="w-9 h-9 rounded-full object-cover" />
            <div>
              <p className="font-bold text-sm text-foreground">{provider.name}</p>
              <p className="text-xs text-success">Online</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
              m.fromMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
            }`}>
              <p className="text-sm">{m.text}</p>
              <p className={`text-[10px] mt-1 ${m.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center gap-2 safe-bottom">
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 rounded-2xl bg-muted text-foreground text-sm outline-none"
        />
        <button onClick={handleSend} className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center">
          <Send className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
