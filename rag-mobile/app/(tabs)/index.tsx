
import { View, StyleSheet } from 'react-native';
import Chatbot from '../../components/Chatbot';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Chatbot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
