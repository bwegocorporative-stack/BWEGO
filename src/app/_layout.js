import { useEffect, useRef, useState } from "react";

import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from "expo-router";

import { Alert, Image, Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  atualizarFotoPerfil,
  limparSessaoTemporariaGaleria,
} from "../services/authSession";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [mostrarSplash, setMostrarSplash] = useState(true);
  const [fotoPendente, setFotoPendente] = useState(null);
  const [pickerVerificado, setPickerVerificado] = useState(false);
  const fotoProcessada = useRef(false);

  useEffect(() => {
    const temporizador = setTimeout(() => setMostrarSplash(false), 1800);
    return () => clearTimeout(temporizador);
  }, []);

  useEffect(() => {
    const recuperarSelecao = async () => {
      try {
        if (Platform.OS === "android") {
          const resultado = await ImagePicker.getPendingResultAsync();

          if (resultado && "code" in resultado) {
            Alert.alert(
              "Erro ao selecionar a foto",
              resultado.message || "Não foi possível recuperar a imagem."
            );
            await limparSessaoTemporariaGaleria();
          } else if (resultado && !resultado.canceled) {
            setFotoPendente(resultado.assets?.[0] || null);
          } else if (resultado) {
            await limparSessaoTemporariaGaleria();
          }
        }
      } catch (error) {
        Alert.alert(
          "Erro ao recuperar a foto",
          error.message || "Tenta selecionar a imagem novamente."
        );
      } finally {
        setPickerVerificado(true);
      }
    };

    recuperarSelecao();
  }, []);

  useEffect(() => {
    if (mostrarSplash || !pickerVerificado || !fotoPendente || fotoProcessada.current) {
      return;
    }

    fotoProcessada.current = true;

    const enviarFoto = async () => {
      try {
        await atualizarFotoPerfil(fotoPendente);

        router.replace("/tabs/perfil");
        Alert.alert("Foto atualizada", "A tua foto de perfil foi atualizada.");
      } catch (error) {
        router.replace("/tabs/perfil");
        Alert.alert(
          "Não foi possível atualizar a foto",
          error.message || "Tenta novamente."
        );
      } finally {
        await limparSessaoTemporariaGaleria();
      }
    };

    enviarFoto();
  }, [fotoPendente, mostrarSplash, pickerVerificado]);

  if (mostrarSplash) {
    return (
      <View style={styles.splash}>
        <View style={styles.brandBlock}>
          <View style={styles.logoFrame}>
            <View style={styles.logoMat}>
              <Image
                source={require("../../assets/images/bwe-go.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.corner, styles.topCorner]} />
            <View style={[styles.corner, styles.bottomCorner]} />
          </View>
          <Text style={styles.tagline}>A SUA VIAGEM COMEÇA AQUI</Text>
          <View style={styles.loadingTrack}>
            <View style={styles.loadingFill} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="motorista" />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/login" />
        <Stack.Screen name="recuperar-conta-cliente" />
        <Stack.Screen name="tabs" />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101820",
    paddingHorizontal: 24,
  },
  brandBlock: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  logoFrame: {
    width: "100%",
    padding: 8,
    borderWidth: 2,
    borderColor: "#F5B91B",
    borderRadius: 22,
    backgroundColor: "#173B70",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 12,
  },
  logoMat: {
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: "100%",
    height: 220,
  },
  corner: {
    position: "absolute",
    width: 22,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  topCorner: {
    top: -3,
    left: 24,
  },
  bottomCorner: {
    right: 24,
    bottom: -3,
  },
  tagline: {
    marginTop: 28,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  loadingTrack: {
    width: 46,
    height: 3,
    marginTop: 18,
    overflow: "hidden",
    borderRadius: 2,
    backgroundColor: "#40505C",
  },
  loadingFill: {
    width: "65%",
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#F5B91B",
  },
});
