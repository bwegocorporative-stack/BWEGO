import { StyleSheet, Text, View } from "react-native";

export default function TripMap({ style }) {
  return (
    <View
      style={[styles.map, style]}
      accessibilityRole="image"
      accessibilityLabel="O mapa de viagens está disponível na aplicação móvel."
    >
      <Text style={styles.message}>
        O mapa de viagens está disponível na aplicação móvel.
      </Text>
    </View>
  );
}

export function Marker() {
  return null;
}

export function Polyline() {
  return null;
}

const styles = StyleSheet.create({
  map: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EEF4",
    padding: 20,
  },
  message: {
    color: "#475467",
    fontSize: 14,
    textAlign: "center",
  },
});
