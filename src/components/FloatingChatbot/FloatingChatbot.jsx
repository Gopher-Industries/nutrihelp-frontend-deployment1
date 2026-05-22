import React, { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaStop, FaSpinner, FaTimes, FaRobot, FaExpand, FaCompress } from "react-icons/fa";
import "./FloatingChatbot.css";

const AI_BASE_URL = process.env.REACT_APP_AI_API_BASE_URL || "https://nutrihelp-backend-deployment.onrender.com";
const CHAT_ENDPOINT = `${AI_BASE_URL}/ai-model/chatbot/chat`;
const TRANSCRIBE_ENDPOINT = `${AI_BASE_URL}/ai-model/chatbot/transcribe`;

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(d) {
  const h24 = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h24 >= 12 ? "pm" : "am";
  const h12 = ((h24 + 11) % 12) + 1;
  return `Today, ${h12}:${m}${ampm}`;
}

const WELCOME_MSG = () => ({
  id: uid(),
  side: "left",
  text: "Hi! I'm your NutriHelp assistant. Ask me anything about nutrition, meals, or your health goals.",
  time: formatTime(new Date()),
});

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const textareaRef = useRef(null);

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("nh-messages");
      return saved ? JSON.parse(saved) : [WELCOME_MSG()];
    } catch {
      return [WELCOME_MSG()];
    }
  });

  useEffect(() => {
    localStorage.setItem("nh-messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (isOpen && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const esc = (e) => {
      if (e.key === "Escape") {
        if (isExpanded) setIsExpanded(false);
        else setIsOpen(false);
      }
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [isExpanded]);

  async function callChatbot(userMessage) {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: userMessage }),
    });

    if (!response.ok) {
      const err = new Error("Backend error");
      err.type = "network";
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const reply = data.msg || data.message || String(data);

    if (!reply || reply.trim() === "") {
      const err = new Error("Empty response");
      err.type = "empty";
      throw err;
    }

    return reply;
  }

  async function sendMessage(e) {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text || isLoading) return;

    const userMsg = { id: uid(), side: "right", text, time: formatTime(new Date()) };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

    try {
      const botReply = await callChatbot(text);
      setMessages((prev) => [
        ...prev,
        { id: uid(), side: "left", text: botReply, time: formatTime(new Date()) },
      ]);
    } catch (err) {
      const errorText =
        err.type === "empty"
          ? "The assistant returned an empty response. Please try again."
          : err.type === "network"
          ? `Connection failed (${err.status ?? "no response"}). Please try again.`
          : "Something went wrong. Please try again.";

      setMessages((prev) => [
        ...prev,
        { id: uid(), side: "left", text: errorText, time: formatTime(new Date()), isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function clearHistory() {
    localStorage.removeItem("nh-messages");
    setMessages([WELCOME_MSG()]);
  }

  function formatText(text) {
    return text.split(/\*\*(.*?)\*\*/g).flatMap((part, i) => {
      if (i % 2 === 1) return [<strong key={`b${i}`}>{part}</strong>];
      return part.split(/\*(.*?)\*/g).map((p, j) =>
        j % 2 === 1 ? <em key={`e${i}-${j}`}>{p}</em> : p
      );
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await handleVoiceMessage(new Blob(chunksRef.current, { type: "audio/webm" }));
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert("Please allow microphone access to use voice input.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function handleVoiceMessage(audioBlob) {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch(TRANSCRIBE_ENDPOINT, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Transcription failed");
      const { transcript } = await res.json();

      setMessages((prev) => [
        ...prev,
        { id: uid(), side: "right", text: transcript, time: formatTime(new Date()) },
      ]);
      setIsTranscribing(false);
      setIsLoading(true);

      const botReply = await callChatbot(transcript);
      setMessages((prev) => [
        ...prev,
        { id: uid(), side: "left", text: botReply, time: formatTime(new Date()) },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          side: "left",
          text: `Voice input failed: ${err.message}`,
          time: formatTime(new Date()),
          isError: true,
        },
      ]);
    } finally {
      setIsTranscribing(false);
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* ── Popup panel ── */}
      {isOpen && (
        <div className={`fc-popup${isExpanded ? " fc-popup--expanded" : ""}`} role="dialog" aria-label="NutriHelp AI Assistant">
          {/* Header */}
          <div className="fc-header">
            <div className="fc-header-info">
              <span className="fc-avatar" aria-hidden="true">🍃</span>
              <div>
                <div className="fc-title">NutriHelp Assistant</div>
                <div className="fc-subtitle">Always here to help</div>
              </div>
            </div>
            <div className="fc-header-actions">
              <button className="fc-clear-btn" onClick={clearHistory} title="Clear chat history">
                Clear
              </button>
              <button
                className="fc-close-btn"
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={isExpanded ? "Minimize chat" : "Expand to full page"}
                title={isExpanded ? "Minimize" : "Expand to full page"}
              >
                {isExpanded ? <FaCompress /> : <FaExpand />}
              </button>
              <button
                className="fc-close-btn"
                onClick={() => { setIsOpen(false); setIsExpanded(false); }}
                aria-label="Close chat"
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="fc-messages" ref={messagesRef}>
            {messages.map((m) => (
              <div key={m.id} className={`fc-msg-row ${m.side}`}>
                <div className="fc-msg-wrap">
                  <div className={`fc-bubble ${m.side}${m.isError ? " fc-bubble--error" : ""}`}>
                    {formatText(m.text)}
                  </div>
                  <div className={`fc-meta ${m.side}`}>{m.time}</div>
                </div>
              </div>
            ))}

            {isTranscribing && (
              <div className="fc-msg-row left">
                <div className="fc-msg-wrap">
                  <div className="fc-bubble left">Listening…</div>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="fc-msg-row left">
                <div className="fc-msg-wrap">
                  <div className="fc-bubble left fc-typing">
                    <span /><span /><span />
                  </div>
                  <div className="fc-meta left fc-thinking">Thinking…</div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form className="fc-composer" onSubmit={sendMessage}>
            <div className="fc-input-wrap">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                placeholder="Type your message here…"
                disabled={isLoading}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>

            <button
              type="button"
              className={`fc-action-btn${isRecording ? " fc-recording" : ""}`}
              disabled={isLoading || isTranscribing}
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? "Stop recording" : "Record voice message"}
              title={isRecording ? "Stop recording" : "Voice input"}
            >
              {isTranscribing ? (
                <FaSpinner className="fc-spin" />
              ) : isRecording ? (
                <FaStop />
              ) : (
                <FaMicrophone />
              )}
            </button>

            <button
              className="fc-action-btn fc-send-btn"
              type="submit"
              disabled={isLoading || !draft.trim()}
              aria-label="Send message"
              title="Send"
            >
              ➤
            </button>
          </form>
        </div>
      )}

      {/* ── Floating action button ── */}
      <button
        className={`fc-fab${isOpen ? " fc-fab--open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
        title="NutriHelp AI Assistant"
      >
        {isOpen ? <FaTimes size={26} /> : <FaRobot size={26} />}
      </button>
    </>
  );
}
