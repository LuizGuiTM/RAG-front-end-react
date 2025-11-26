import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Chatbot from "./components/Chatbot";

export default function App() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Retrieval Augmented Generation - Chatbot Customizável
      </Text>
      <Chatbot />
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2025 — Aplicação desenvolvida por Caio Municelli, Lorenzo Messias, Luiz de Souza e Ricardo Duarte, com orientação de Gabriel Lara, para o curso de Engenharia de Computação da Faculdade Engenheiro Salvador Arena. Todos os direitos reservados.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  footer: {
    marginTop: 30,
    padding: 10,
  },
  footerText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
});
