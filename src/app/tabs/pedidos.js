import { useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

const pedidos = [
  {
    id: "BG-00125",
    servico: "Bwé Market",
    descricao: "Compras de supermercado",
    data: "02 Nov 2026 · 10:30",
    preco: "12.500 Kz",
    estado: "Em preparação",
    icon: "cart-outline",
    cor: "#E89B35",
  },
  {
    id: "BG-00124",
    servico: "Bwé Delivery",
    descricao: "Entrega de encomenda",
    data: "01 Nov 2026 · 15:20",
    preco: "3.000 Kz",
    estado: "Entregue",
    icon: "bicycle-outline",
    cor: "#16A36A",
  },
  {
    id: "BG-00123",
    servico: "Bwé Farma",
    descricao: "Produtos de farmácia",
    data: "30 Out 2026 · 12:15",
    preco: "8.500 Kz",
    estado: "Cancelado",
    icon: "medkit-outline",
    cor: "#E65B5B",
  },
  {
    id: "BG-00122",
    servico: "Bwé Market",
    descricao: "Produtos alimentares",
    data: "28 Out 2026 · 09:40",
    preco: "6.200 Kz",
    estado: "Entregue",
    icon: "cart-outline",
    cor: "#16A36A",
  },
];

export default function PedidosScreen() {
  const [filtro, setFiltro] = useState("Todos");

  const filtros = ["Todos", "Em preparação", "Entregue", "Cancelado"];

  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (filtro === "Todos") return true;
    return pedido.estado === filtro;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BWÉ-GO</Text>
            <Text style={styles.title}>Os meus pedidos</Text>
            <Text style={styles.subtitle}>Acompanha as tuas encomendas.</Text>
          </View>

          <TouchableOpacity style={styles.notification}>
            <Ionicons name="notifications-outline" size={24} color="#101820" />
          </TouchableOpacity>
        </View>

        {/* RESUMO */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>04</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#E89B35" }]}>01</Text>
            <Text style={styles.summaryLabel}>Em curso</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#16A36A" }]}>02</Text>
            <Text style={styles.summaryLabel}>Entregues</Text>
          </View>
        </View>

        {/* SERVIÇOS */}
        <Text style={styles.sectionTitle}>Os nossos serviços</Text>

        <View style={styles.services}>
          <TouchableOpacity style={styles.serviceCard}>
            <View style={[styles.serviceIcon, { backgroundColor: "#E5F5ED" }]}>
              <Ionicons name="bicycle-outline" size={25} color="#16A36A" />
            </View>
            <Text style={styles.serviceTitle}>Delivery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.serviceCard}>
            <View style={[styles.serviceIcon, { backgroundColor: "#FCEFE2" }]}>
              <Ionicons name="medkit-outline" size={25} color="#E89B35" />
            </View>
            <Text style={styles.serviceTitle}>Farmácia</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.serviceCard}>
            <View style={[styles.serviceIcon, { backgroundColor: "#E8EEFF" }]}>
              <Ionicons name="cart-outline" size={25} color="#5475CF" />
            </View>
            <Text style={styles.serviceTitle}>Mercado</Text>
          </TouchableOpacity>
        </View>

        {/* FILTROS */}
        <Text style={styles.sectionTitle}>Histórico de pedidos</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          <View style={styles.filters}>
            {filtros.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setFiltro(item)}
                style={[
                  styles.filterButton,
                  filtro === item && styles.filterActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filtro === item && styles.filterTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* LISTA DE PEDIDOS */}
        {pedidosFiltrados.length > 0 ? (
          pedidosFiltrados.map((pedido) => (
            <TouchableOpacity
              key={pedido.id}
              style={styles.orderCard}
              activeOpacity={0.8}
            >
              <View style={styles.orderHeader}>
                <View
                  style={[
                    styles.orderIcon,
                    { backgroundColor: `${pedido.cor}18` },
                  ]}
                >
                  <Ionicons name={pedido.icon} size={27} color={pedido.cor} />
                </View>

                <View style={styles.orderInfo}>
                  <Text style={styles.orderTitle}>{pedido.servico}</Text>

                  <Text style={styles.orderDescription}>
                    {pedido.descricao}
                  </Text>

                  <Text style={styles.orderId}>Pedido #{pedido.id}</Text>
                </View>

                <Text style={styles.orderPrice}>{pedido.preco}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.orderFooter}>
                <View style={styles.orderStatus}>
                  <View
                    style={[styles.statusDot, { backgroundColor: pedido.cor }]}
                  />

                  <Text style={[styles.statusText, { color: pedido.cor }]}>
                    {pedido.estado}
                  </Text>
                </View>

                <TouchableOpacity style={styles.detailsButton}>
                  <Text style={styles.detailsText}>Ver pedido</Text>

                  <Ionicons name="chevron-forward" size={16} color="#16A36A" />
                </TouchableOpacity>
              </View>

              <Text style={styles.orderDate}>
                <Ionicons name="calendar-outline" size={12} color="#999" />{" "}
                {pedido.data}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={55} color="#BBBBBB" />

            <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>

            <Text style={styles.emptyDescription}>
              Ainda não tens pedidos nesta categoria.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },

  header: {
    marginTop: 55,
    marginBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: {
    fontSize: 11,
    fontWeight: "900",
    color: "#16A36A",
    letterSpacing: 2,
  },

  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#101820",
    marginTop: 5,
  },

  subtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
  },

  notification: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#F4F6F5",
    justifyContent: "center",
    alignItems: "center",
  },

  summary: {
    flexDirection: "row",
    backgroundColor: "#F8FAF9",
    borderRadius: 20,
    paddingVertical: 22,
    justifyContent: "space-around",
    alignItems: "center",
  },

  summaryItem: {
    alignItems: "center",
    flex: 1,
  },

  summaryNumber: {
    fontSize: 23,
    fontWeight: "900",
    color: "#101820",
  },

  summaryLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 6,
  },

  separator: {
    height: 40,
    width: 1,
    backgroundColor: "#E5E5E5",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#101820",
    marginTop: 28,
    marginBottom: 15,
  },

  services: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  serviceCard: {
    flex: 1,
    backgroundColor: "#F8FAF9",
    borderRadius: 17,
    paddingVertical: 16,
    alignItems: "center",
  },

  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  serviceTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#101820",
    marginTop: 10,
  },

  filterScroll: {
    flexGrow: 0,
    marginBottom: 18,
  },

  filters: {
    flexDirection: "row",
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F4F6F5",
  },

  filterActive: {
    backgroundColor: "#16A36A",
  },

  filterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#777",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  orderCard: {
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
    backgroundColor: "#FFFFFF",
  },

  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  orderIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  orderInfo: {
    flex: 1,
    marginLeft: 12,
  },

  orderTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#101820",
  },

  orderDescription: {
    fontSize: 11,
    color: "#777",
    marginTop: 4,
  },

  orderId: {
    fontSize: 10,
    color: "#999",
    marginTop: 5,
  },

  orderPrice: {
    fontSize: 12,
    fontWeight: "900",
    color: "#101820",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 13,
  },

  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  orderStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 10,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  detailsText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#16A36A",
  },

  orderDate: {
    fontSize: 10,
    color: "#999",
    marginTop: 13,
  },

  empty: {
    alignItems: "center",
    paddingVertical: 45,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#101820",
    marginTop: 15,
  },

  emptyDescription: {
    fontSize: 12,
    color: "#888",
    marginTop: 7,
  },
});
