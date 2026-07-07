import api from "./axios";

export const sendCircleRequest = async (userId) => {
  const res = await api.post(`/circle-requests/${userId}/send`);
  return res.data;
};

export const acceptCircleRequest = async (requestId) => {
  const res = await api.patch(`/circle-requests/${requestId}/accept`);
  return res.data;
};

export const rejectCircleRequest = async (requestId) => {
  const res = await api.patch(`/circle-requests/${requestId}/reject`);
  return res.data;
};

export const getReceivedCircleRequests = async () => {
  const res = await api.get("/circle-requests/received");
  return res.data;
};

export const getSentCircleRequests = async () => {
  const res = await api.get("/circle-requests/sent");
  return res.data;
};