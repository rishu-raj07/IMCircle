import api from "./axios";

export const getConversations = async () => {
  const res = await api.get("/messages/conversations");
  return res.data;
};

export const createConversation = async (userId) => {
  const res = await api.post(`/messages/conversation/${userId}`);
  return res.data;
};

export const getMessages = async (conversationId) => {
  const res = await api.get(`/messages/${conversationId}`);
  return res.data;
};

export const sendMessage = async (conversationId, data) => {
  const res = await api.post(`/messages/${conversationId}`, data);
  return res.data;
};

export const markMessagesSeen = async (conversationId) => {
  const res = await api.patch(`/messages/${conversationId}/seen`);
  return res.data;
};

export const deleteMessages = async (messageIds = []) => {
  const res = await api.delete("/messages/messages/bulk", {
    data: { messageIds },
  });
  return res.data;
};

export const reactToMessage = async (messageId, reaction) => {
  const res = await api.patch(`/messages/message/${messageId}/reaction`, {
    reaction,
  });
  return res.data;
};

export const deleteConversation = async (conversationId) => {
  const res = await api.delete(`/messages/${conversationId}`);
  return res.data;
};

export const blockConversation = async (conversationId) => {
  const res = await api.patch(`/messages/${conversationId}/block`);
  return res.data;
};

export const unblockConversation = async (conversationId) => {
  const res = await api.patch(`/messages/${conversationId}/unblock`);
  return res.data;
};
