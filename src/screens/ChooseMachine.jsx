import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Card, Title, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { getVendingMachinesByOwner } from '../../components/api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChooseMachine = ({ setRoute }) => {
  const {
    data: machines,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['machines'],
    queryFn: getVendingMachinesByOwner,
  });

  const handleMachineSelect = async (machineId) => {
    try {
      await AsyncStorage.setItem('machineId', machineId);
      setRoute('home');
    } catch (error) {
      console.error('Error saving machine selection:', error);
      Alert.alert('Error', 'Failed to select machine');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading machines...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading machines {error.message}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => refetch()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Select Vending Machine</Title>
      
      <ScrollView style={styles.scrollView}>
        {machines?.data?.data?.length > 0 ? (
          machines.data.data.map((machine) => (
            <TouchableOpacity
              key={machine._id}
              onPress={() => handleMachineSelect(machine._id)}
            >
              <Card style={styles.machineCard}>
                <Card.Content>
                  <Title style={styles.machineName}>{machine.name}</Title>
                  <Text style={styles.machineDetails}>
                    Location: {machine.location || 'N/A'}
                  </Text>
                  <Text style={styles.machineDetails}>
                    Status: {machine.status || 'Active'}
                  </Text>
                  <Text style={styles.machineId}>
                    ID: {machine._id}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noMachinesContainer}>
            <Text style={styles.noMachinesText}>
              No vending machines found
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  machineCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 8,
  },
  machineName: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
  },
  machineDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  machineId: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#f97316',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noMachinesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  noMachinesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ChooseMachine;
