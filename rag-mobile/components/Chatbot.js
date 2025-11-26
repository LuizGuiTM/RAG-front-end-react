// Remove prefixos SSE e limpa resposta para exibir só o texto útil da API
function cleanSSE(text) {
  if (!text) return '';
  // Remove linhas event: e data: [DONE]
  return text
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.startsWith('event:') && !line.includes('[DONE]'))
    .map(line => line.replace(/^data:\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
  // Cancela a transmissão e adiciona mensagem de cancelamento
  const handleCancel = () => {
    streamRef.current?.close();
    setRunning(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `b_cancel_${Date.now()}`,
        role: "assistant",
        content: "Transmissão cancelada.",
        createdAt: new Date().toISOString(),
      },
    ]);
    placeholderIdRef.current = null;
  };
// Estilos para o markdown
const markdownStyles = {
  body: { color: '#e6eef8', fontSize: 16 },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  link: { color: '#3ba0db' },
  code_inline: { backgroundColor: '#071228', borderRadius: 4, padding: 2, color: '#e6eef8' },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
};

import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from "react-native";
import Markdown from 'react-native-markdown-display';
import api from "../apiRag";

function formatTime(iso) {
  try {
    const dt = new Date(iso);
    return dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

export default function Chatbot() {
  const initialMessage = {
    id: "initial",
    role: "assistant",
    content:
      "Olá, eu sou a assistente de carreiras do NAC virtual dos cursos de administração e engenharia de computação, no que posso te ajudar?",
    createdAt: new Date().toISOString(),
  };
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const scrollViewRef = useRef(null);
  const streamRef = useRef(null);
  const placeholderIdRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        // No mobile, use AsyncStorage se quiser persistir
        // Aqui, apenas exemplo sem persistência
        await api.newSession();
      } catch {}
    })();
    return () => streamRef.current?.close();
  }, []);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || running) return;

    let firstChunk = null;
    setInput("");
    setRunning(true);

    const placeholderId = `a_${Date.now()}`;
    placeholderIdRef.current = placeholderId;

    setMessages((prev) => {
      // Garante que a mensagem inicial sempre esteja presente
      const base = prev.length === 0 ? [initialMessage] : prev;
      return [
        ...base,
        {
          id: `u_${Date.now()}`,
          role: "user",
          content: q,
          createdAt: new Date().toISOString(),
        },
        {
          id: placeholderId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        },
      ];
    });

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    streamRef.current?.close();
    streamRef.current = api.streamRag(q, history, {
      onChunk: (partial) => {
        if (!firstChunk) firstChunk = true;
        setMessages((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((m) => m.id === placeholderIdRef.current);
            if (idx !== -1) {
              copy[idx] = {
                ...copy[idx],
                content: cleanSSE(partial),
              };
            }
            return copy;
          });
        },
        onComplete: (finalText) => {
          const finalId = placeholderIdRef.current;
          setMessages((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex((m) => m.id === finalId);
            if (idx !== -1) {
              copy[idx] = {
                ...copy[idx],
                content: cleanSSE(finalText),
              };
            }
            return copy;
          });
          placeholderIdRef.current = null;
          setRunning(false);
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `err_${Date.now()}`,
              role: "assistant",
              content: `Erro ao obter resposta: ${err?.message || err?.toString() || 'erro desconhecido'}`,
              createdAt: new Date().toISOString(),
            },
          ]);
          setRunning(false);
          placeholderIdRef.current = null;
          if (err) console.error('Erro no Chatbot:', err);
        },
      });
    };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Assistente NAC — Carreiras</Text>
      </View>
      <ScrollView
        style={styles.messages}
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {messages.map((m) => (
          <View
            key={m.id}
            style={
              m.role === "user"
                ? styles.userMessageContainer
                : styles.assistantMessageContainer
            }
          >
            {m.role === "assistant" ? (
              <View style={styles.assistantRow}>
                <Image
                  source={require('../assets/chatbot.png')}
                  style={styles.avatar}
                  resizeMode="cover"
                />
                <View style={styles.assistantBubble}>
                  <Markdown style={markdownStyles}>{m.content}</Markdown>
                </View>
              </View>
            ) : (
              <View style={styles.userRow}>
                <View style={styles.userBubble}>
                  <Text style={styles.userMessage}>{m.content}</Text>
                </View>
              </View>
            )}
            <Text style={styles.time}>{formatTime(m.createdAt)}</Text>
            {m.id === placeholderIdRef.current && running && (
              <ActivityIndicator size="small" color="#888" style={{ marginTop: 4 }} />
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Digite sua mensagem..."
          editable={!running}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.button, running || !input.trim() ? styles.buttonDisabled : null]}
          onPress={handleSend}
          disabled={running || !input.trim()}
        >
          <Text style={styles.buttonText}>Enviar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, !running ? styles.buttonDisabled : null]}
          onPress={handleCancel}
          disabled={!running}
        >
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  assistantBubble: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    marginLeft: 4,
    maxWidth: '80%',
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: '#e6f3ff',
    borderRadius: 12,
    padding: 12,
    marginRight: 4,
    maxWidth: '80%',
    flexShrink: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    marginRight: 4,
  },
  header: {
    padding: 16,
    backgroundColor: '#101925',
    alignItems: 'center',
  },
  headerText: {
    color: '#dfb193',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messages: {
    flex: 1,
    padding: 16,
    backgroundColor: '#071228',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    maxWidth: '100%',
  },
  assistantMessageContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    maxWidth: '100%',
  },
  userMessage: {
    color: '#1f2937',
    fontSize: 16,
  },
  time: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#eee",
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 8,
    backgroundColor: "#fafafa",
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#1976d2",
    borderRadius: 8,
    marginLeft: 4,
  },
  buttonDisabled: {
    backgroundColor: "#b0b0b0",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
