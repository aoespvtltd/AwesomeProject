import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getappVersion, getProducts, machineId } from "../../components/api/api";
// import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, RefreshCcw } from "lucide-react-native";
import {
  Text,
  Card,
  DataTable,
  IconButton,
  ActivityIndicator,
  Surface,
} from "react-native-paper";
import ProductRow from "../../components/myComp/ProductRow";
import TestDownloadPage from "./test/testDownloadPage";
import { appVersion } from "../constants";

export default function AdminFillStock({route, setRoute}) {
  // const router = useRouter();
  const queryClient = useQueryClient();
  // const { machineId } = useLocalSearchParams();
  const [updateNeeded, setUpdateNeeded] = useState(false)

  
  const checkForUpdates = async () => {
    try {
      const response = await getappVersion();
      console.log(response.data.data)
      const serverVersion = response.data.data.version;
      
      if (serverVersion !== appVersion) {
        setUpdateNeeded(true)
      }
    } catch (error) {
      console.error('Version check failed:', error);
    }
  };

  const {
    data: productsFill,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["productsFill"],
    queryFn: async () => {
      const res = await getProducts(machineId);
      return res.data.data;
    },
    select: (data) => data.sort((a, b) => a.productNumber - b.productNumber),
  });

  useEffect(() => {
    checkForUpdates()
    return () => {
      queryClient.invalidateQueries("productsFill");
    };
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load products.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <IconButton
          icon={() => <ArrowLeft size={24} color="#6366f1" />}
          onPress={() => setRoute("home")}
          style={styles.backButton}
        />
        <Text style={styles.title}>Admin - Fill Stock</Text>
        {updateNeeded ? <TestDownloadPage /> : <Text></Text>}
      </Surface>

      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <DataTable>
            <DataTable.Header style={styles.tableHeader}>
              <DataTable.Title
                style={[styles.headerCell, { flex: 0.5 }]}
                textStyle={styles.headerText}
              >
                P.N.
              </DataTable.Title>
              <DataTable.Title
                style={[styles.headerCell, { flex: 2 }]}
                textStyle={styles.headerText}
              >
                Name
              </DataTable.Title>
              <DataTable.Title
                style={[styles.headerCell, { flex: 1.5, paddingLeft: 20 }]}
                textStyle={styles.headerText}
              >
                Stock
              </DataTable.Title>
              <DataTable.Title
                style={[styles.headerCell, { flex: 0.5 }]}
                numeric
                textStyle={styles.headerText}
              >
                Limit
              </DataTable.Title>
              <DataTable.Title
                style={[styles.headerCell, { flex: 1 }]}
                numeric
                textStyle={styles.headerText}
              >
                Action
              </DataTable.Title>
            </DataTable.Header>

            {productsFill?.map((product) => (
              <ProductRow key={product._id} product={product} />
            ))}
          </DataTable>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    backgroundColor: "white",
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    height: 48,
  },
  headerCell: {
    justifyContent: "center",
  },
  headerText:{
    color: "black"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
  },
});
