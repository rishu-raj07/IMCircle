import api from "./axios";
import { compressFormDataImages } from "../utils/mediaOptimization";

export const createCircle = async (data) => {
  const optimizedData =
    data instanceof FormData ? await compressFormDataImages(data, "community") : data;

  const res = await api.post("/circles", optimizedData);
  return res.data;
};

export const getCircles = async () => {
  const res = await api.get("/circles");
  return res.data;
};

export const getMyCircles = async () => {
  const res = await api.get("/circles/my");
  return res.data;
};

export const getTrendingCircles = async () => {
  const res = await api.get("/circles/trending");
  return res.data;
};

// Paginated "browse all circles" list — public + invite-only only, never
// private. Defaults to 10 at a time to match the "View more" flow.
export const getBrowseCircles = async ({ page = 1, limit = 10 } = {}) => {
  const res = await api.get(`/circles/browse?page=${page}&limit=${limit}`);
  return res.data;
};

export const requestToJoinCircle = async (circleId) => {
  const res = await api.post(`/circles/${circleId}/request-join`);
  return res.data;
};

// All of my own pending join requests, across every invite-only circle —
// used to restore "Requested" button state after a page refresh.
export const getMySentCircleJoinRequests = async () => {
  const res = await api.get("/circles/join-requests/mine");
  return res.data;
};

export const getCircleJoinRequests = async (circleId) => {
  const res = await api.get(`/circles/${circleId}/join-requests`);
  return res.data;
};

export const acceptCircleJoinRequest = async (circleId, requestId) => {
  const res = await api.patch(`/circles/${circleId}/join-requests/${requestId}/accept`);
  return res.data;
};

export const rejectCircleJoinRequest = async (circleId, requestId) => {
  const res = await api.patch(`/circles/${circleId}/join-requests/${requestId}/reject`);
  return res.data;
};

export const getCircleById = async (circleId) => {
  const res = await api.get(`/circles/${circleId}`);
  return res.data;
};

export const getCircleMembers = async (circleId) => {
  const res = await api.get(`/circles/${circleId}/members`);
  return res.data;
};

export const joinCircle = async (circleId) => {
  const res = await api.post(`/circles/${circleId}/join`);
  return res.data;
};

export const makeCircleAdmin = async (circleId, userId) => {
  const res = await api.patch(`/circles/${circleId}/members/${userId}/make-admin`);
  return res.data;
};

export const removeCircleMember = async (circleId, userId) => {
  const res = await api.delete(`/circles/${circleId}/members/${userId}`);
  return res.data;
};

export const restrictCircleMember = async (circleId, userId) => {
  const res = await api.patch(`/circles/${circleId}/members/${userId}/restrict`);
  return res.data;
};

export const unrestrictCircleMember = async (circleId, userId) => {
  const res = await api.patch(`/circles/${circleId}/members/${userId}/unrestrict`);
  return res.data;
};

export const removeCircleAdmin = async (circleId, userId) => {
  const res = await api.patch(`/circles/${circleId}/members/${userId}/remove-admin`);
  return res.data;
};

export const deleteCircleCommunity = async (circleId) => {
  const res = await api.delete(`/circles/${circleId}`);
  return res.data;
};

export const inviteToCircle = async (circleId, userId) => {
  const res = await api.post(`/circles/${circleId}/invite/${userId}`);
  return res.data;
};

// Pending invites *I've already sent* for this circle — used to restore the
// "Invited" button state after a page refresh instead of it resetting.
export const getSentCircleInvites = async (circleId) => {
  const res = await api.get(`/circles/${circleId}/invites/sent`);
  return res.data;
};

export const getMyCircleInvites = async () => {
  const res = await api.get("/circles/invites/received");
  return res.data;
};

export const dismissCircleInvite = async (inviteId) => {
  const res = await api.patch(`/circles/invites/${inviteId}/dismiss`);
  return res.data;
};

export const leaveCircle = async (circleId) => {
  const res = await api.post(`/circles/${circleId}/leave`);
  return res.data;
};

export const getCirclePosts = async (circleId) => {
  const res = await api.get(`/circles/${circleId}/posts`);
  return res.data;
};

// Sends a chat message to a circle — text and/or a single image, optionally
// quoting an earlier message via replyTo.
export const createCirclePost = async (
  circleId,
  { content = "", imageFile = null, replyTo = "" } = {}
) => {
  if (imageFile) {
    const formData = new FormData();
    if (content) formData.append("content", content);
    if (replyTo) formData.append("replyTo", replyTo);
    formData.append("image", imageFile);

    const optimizedFormData = await compressFormDataImages(formData, "post");

    const res = await api.post(`/circles/${circleId}/posts`, optimizedFormData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  }

  const payload = { content };
  if (replyTo) payload.replyTo = replyTo;

  const res = await api.post(`/circles/${circleId}/posts`, payload);
  return res.data;
};

export const deleteCirclePostMessage = async (postId) => {
  const res = await api.delete(`/circle-posts/${postId}`);
  return res.data;
};

export const reactToCirclePost = async (postId, emoji) => {
  const res = await api.patch(`/circle-posts/${postId}/react`, { emoji });
  return res.data;
};
