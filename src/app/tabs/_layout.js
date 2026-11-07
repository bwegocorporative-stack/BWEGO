import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";

const navigation = [
  {
    name: "index",
    title: "Home",
    icon: "home-outline",
    activeIcon: "home",
    route: "/tabs",
  },
  {
    name: "viagens",
    title: "Viagens",
    icon: "car-outline",
    activeIcon: "car",
    route: "/tabs/viagens",
  },
  {
    name: "pedidos",
    title: "Pedidos",
    icon: "receipt-outline",
    activeIcon: "receipt",
    route: "/tabs/pedidos",
  },
  {
    name: "carteira",
    title: "Carteira",
    icon: "wallet-outline",
    activeIcon: "wallet",
    route: "/tabs/carteira",
  },
  {
    name: "perfil",
    title: "Perfil",
    icon: "person-outline",
    activeIcon: "person",
    route: "/tabs/perfil",
  },
];

function CustomTabBar({ state }) {
  const router = useRouter();

  return (
    <View style={styles.bottomNavigation}>
      {navigation.map((item, index) => {
        const ativo = state.index === index;

        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            activeOpacity={0.8}
            onPress={() => {
              router.navigate(item.route);
            }}
          >
            <View
              style={[styles.navIconContainer, ativo && styles.navIconActive]}
            >
              <Ionicons
                name={ativo ? item.activeIcon : item.icon}
                size={22}
                color={ativo ? "#173B70" : "#8995A6"}
              />
            </View>

            <Text style={[styles.navText, ativo && styles.navTextActive]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="viagens"
        options={{
          title: "Viagens",
        }}
      />

      <Tabs.Screen
        name="pedidos"
        options={{
          title: "Pedidos",
        }}
      />

      <Tabs.Screen
        name="carteira"
        options={{
          title: "Carteira",
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bottomNavigation: {
    height: 72,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E9EDF4",
    paddingBottom: 3,
    elevation: 12,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  navIconContainer: {
    width: 37,
    height: 31,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },

  navIconActive: {
    backgroundColor: "#FFF3D0",
  },

  navText: {
    fontSize: 10,
    color: "#8993A2",
    fontWeight: "600",
  },

  navTextActive: {
    color: "#173B70",
    fontWeight: "900",
  },
});
