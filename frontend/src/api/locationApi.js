import api from "./axios";

export const searchLocations = async (query) => {
  const response = await api.get("/location/search", { params: { q: query } });
  return response.data?.suggestions || [];
};

export const getLocationDetails = async (placeId) => {
  const response = await api.get("/location/details", { params: { placeId } });
  return response.data?.location;
};

export const reverseLocation = async (lat, lng) => {
  const response = await api.get("/location/reverse", { params: { lat, lng } });
  return response.data?.location;
};

