import api from "./axios";

// The user's accepted personal connections — "my circle" of people, as
// opposed to community membership. Used to prioritize people you already
// know at the top of "invite to this community" lists.
export const getMyCircleList = async () => {
  const res = await api.get("/connections/list");
  return res.data;
};
