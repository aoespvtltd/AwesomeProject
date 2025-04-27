import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { DataTable, Button, Text, IconButton } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProduct } from '../../components/api/api';
import { Minus, Plus } from 'lucide-react-native';

export default function ProductRow({ product }) {
  const [localStock, setLocalStock] = useState(product.stock);
  const [isEdited, setIsEdited] = useState(false);
  const queryClient = useQueryClient();

  const updateStockMutation = useMutation({
    mutationFn: async () => {
      const res = await updateProduct(product._id, localStock);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEdited(false);
    },
    onError: (error) => {
      console.log(error);
      setLocalStock(product.stock);
    },
  });

  const handleIncrement = () => {
    if (localStock < product.stockLimit) {
      setLocalStock((prev) => prev + 1);
      setIsEdited(true);
    }
  };

  const handleDecrement = () => {
    if (localStock > 0) {
      setLocalStock((prev) => prev - 1);
      setIsEdited(true);
    }
  };

  const handleUpdate = () => {
    if (isEdited) {
      updateStockMutation.mutate();
    }
  };

  return (
    <DataTable.Row style={styles.row}>
      <DataTable.Cell style={{ flex: 0.5 }}>
        <Text style={styles.productNumber}>{product.productNumber}</Text>
      </DataTable.Cell>
      <DataTable.Cell style={{ flex: 2 }}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.name}
        </Text>
      </DataTable.Cell>
      <DataTable.Cell style={{ flex: 1.5 }}>
        <View style={styles.stockControl}>
          <IconButton
            icon={() => <Minus size={16} color="#6366f1" />}
            onPress={handleDecrement}
            disabled={localStock <= 0}
            style={styles.stockButton}
          />
          <Text style={styles.stockValue}>{localStock}</Text>
          <IconButton
            icon={() => <Plus size={16} color="#6366f1" />}
            onPress={handleIncrement}
            disabled={localStock >= product.stockLimit}
            style={styles.stockButton}
          />
        </View>
      </DataTable.Cell>
      <DataTable.Cell style={{ flex: 0.5 }} numeric>
        <Text style={styles.limitText}>{product.stockLimit}</Text>
      </DataTable.Cell>
      <DataTable.Cell style={{ flex: 1 }} numeric>
      <TouchableOpacity
      // mode="contained"
      onPress={handleUpdate}
      disabled={!isEdited || updateStockMutation.isLoading}
      
      style={[styles.button, (!isEdited || updateStockMutation.isLoading) ? styles.disabledButton : null]}
      // style={styles.updateButton}
      labelStyle={styles.buttonLabel}
      contentStyle={styles.buttonContent}
      // buttonColor={isEdited ? '#6366f1' : '#cbd5e1'}
    >
      <Text>{updateStockMutation.isLoading ? 'Updating...' : 'Update'}</Text>
    </TouchableOpacity>
      {/* {isEdited == true ? <Button
      mode="contained"
      onPress={handleUpdate}
      disabled={!isEdited || updateStockMutation.isLoading}
      style={styles.updateButton}
      labelStyle={styles.buttonLabel}
      contentStyle={styles.buttonContent}
      buttonColor={"gray"}
    >
      {updateStockMutation.isLoading ? 'Updating...' : 'Update'}
    </Button> : 
      <Button
      mode="contained"
      onPress={handleUpdate}
      disabled={!isEdited || updateStockMutation.isLoading}
      style={styles.updateButton}
      labelStyle={styles.buttonLabel}
      contentStyle={styles.buttonContent}
      buttonColor={"blue"}
    >
      {updateStockMutation.isLoading ? 'Updating...' : 'Update'}
    </Button>} */}


      </DataTable.Cell>
    </DataTable.Row>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    backgroundColor: 'white',
    // backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  productNumber: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  productName: {
    fontSize: 14,
    color: '#1e293b',
    paddingRight: 8,
  },
  stockControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  stockButton: {
    margin: 0,
    backgroundColor: '#f1f5f9',
  },
  stockValue: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  limitText: {
    fontSize: 14,
    color: '#475569',
    textAlign: "center",
    // backgroundColor: "red",
    width: "100%"
  },
  updateButton: {
    height: 36,
    width: 80,
    backgroundColor: "#f97316"
  },
  buttonContent: {
    height: 36,
  },
  
  button: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
    // marginLeft: 4,
    backgroundColor: "#f97316",
    justifyContent: "center",
    width: "100%",
  },
  disabledButton: {
    backgroundColor: "#d3d3d3",
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    marginLeft: 8,
  },
  icon: {
    marginRight: 4,
  },
});

