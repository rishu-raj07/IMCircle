import api from "./axios";
import { compressFormDataImages } from "../utils/mediaOptimization";

export const createJourney = async (data) => {
  const res = await api.post("/journeys", data);
  return res.data;
};

export const getJourneys = async () => {
  const res = await api.get("/journeys");
  return res.data;
};

export const getMyJourneys = async () => {
  const res = await api.get("/journeys/my");
  return res.data;
};

export const getUserJourneys = async (userId) => {
  const res = await api.get(`/journeys/user/${userId}`);
  return res.data;
};

export const getFollowingJourneys = async () => {
  const res = await api.get("/journeys/following");
  return res.data;
};

export const getJourneyFeed = async () => {
  const res = await api.get("/journeys/feed");
  return res.data;
};

export const getJourneyDiscoverFeed = async () => {
  const res = await api.get("/journeys/discover");
  return res.data;
};

export const getSingleJourney = async (journeyId) => {
  const res = await api.get(`/journeys/${journeyId}`);
  return res.data;
};

export const updateJourney = async (journeyId, data) => {
  const res = await api.patch(`/journeys/${journeyId}`, data);
  return res.data;
};

export const reportJourney = async (journeyId, reason) => {
  const res = await api.post(`/journeys/${journeyId}/report`, { reason });
  return res.data;
};

export const updateJourneyCover = async (journeyId, formData) => {
  const optimizedFormData =
    formData instanceof FormData
      ? await compressFormDataImages(formData, "journeyCover")
      : formData;

  const res = await api.patch(`/journeys/${journeyId}/cover`, optimizedFormData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const deleteJourney = async (journeyId) => {
  const res = await api.delete(`/journeys/${journeyId}`);
  return res.data;
};

export const createJourneyMilestone = async (journeyId, formData) => {
  const optimizedFormData =
    formData instanceof FormData
      ? await compressFormDataImages(formData, "journeyDay")
      : formData;

  const res = await api.post(`/journeys/${journeyId}/milestone`, optimizedFormData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const followJourney = async (journeyId) => {
  const res = await api.post(`/journeys/${journeyId}/follow`);
  return res.data;
};

export const unfollowJourney = async (journeyId) => {
  const res = await api.delete(`/journeys/${journeyId}/unfollow`);
  return res.data;
};

export const likeMilestone = async (milestoneId) => {
  const res = await api.patch(`/journeys/milestone/${milestoneId}/like`);
  return res.data;
};

export const unlikeMilestone = async (milestoneId) => {
  const res = await api.patch(`/journeys/milestone/${milestoneId}/unlike`);
  return res.data;
};

export const getMilestoneLikers = async (milestoneId) => {
  const res = await api.get(`/journeys/milestone/${milestoneId}/likes`);
  return res.data;
};

export const repostMilestone = async (milestoneId, caption = "") => {
  const res = await api.patch(`/journeys/milestone/${milestoneId}/repost`, {
    caption,
  });
  return res.data;
};

export const shareMilestone = async (milestoneId) => {
  const res = await api.patch(`/journeys/milestone/${milestoneId}/share`);
  return res.data;
};

export const saveMilestone = async (milestoneId) => {
  const res = await api.patch(`/journeys/milestone/${milestoneId}/save`);
  return res.data;
};

export const unsaveMilestone = async (milestoneId) => {
  const res = await api.patch(`/journeys/milestone/${milestoneId}/unsave`);
  return res.data;
};

export const commentMilestone = async (milestoneId, text) => {
  const res = await api.post(`/journeys/milestone/${milestoneId}/comment`, {
    text,
  });
  return res.data;
};

export const getMilestoneComments = async (milestoneId) => {
  const res = await api.get(`/journeys/milestone/${milestoneId}/comments`);
  return res.data;
};
