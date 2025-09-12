/**
 * Custom hook for fetching and managing observatories metadata
 * Provides station information from the FastAPI backend
 */

import { useState, useEffect } from 'react';
import { fetchObservatories, handleApiError } from '../services/api';

export function useObservatories() {
    const [observatories, setObservatories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadObservatories = async () => {
        try {
            setError(null);
            setLoading(true);
            const result = await fetchObservatories();
            setObservatories(result.data || []);
        } catch (err) {
            setError(handleApiError(err));
            setObservatories([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadObservatories();
    }, []);

    // Helper function to get station name by ID
    const getStationName = (stationId) => {
        const station = observatories.find(obs => obs.station_id === stationId);
        return station?.station_name || `Station ${stationId}`;
    };

    // Helper function to get station location by ID
    const getStationLocation = (stationId) => {
        const station = observatories.find(obs => obs.station_id === stationId);
        return station?.location || 'Unknown location';
    };

    // Helper function to get all station options for dropdowns
    const getStationOptions = () => {
        return observatories.map(station => ({
            value: station.station_id,
            label: station.station_name,
            location: station.location
        }));
    };

    return {
        observatories,
        loading,
        error,
        refresh: loadObservatories,
        getStationName,
        getStationLocation,
        getStationOptions
    };
}
